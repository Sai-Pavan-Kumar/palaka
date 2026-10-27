# Runs a pasted solution under sys.settrace and records one snapshot per
# executed line, so the board can step forward and back without re-running.
# Only frames compiled as "<user>" are recorded: the prelude, the call line
# and the standard library stay invisible to the viewer.
import io
import json
import math
import heapq
import sys
import types
from collections import Counter, defaultdict, deque
from typing import Dict, List, Optional, Set, Tuple

MAX_STEPS = 5000
MAX_CALL_DEPTH = 50
MAX_ITEMS = 50
MAX_NEST = 3
MAX_LIST_NODES = 30
MAX_STDOUT = 2000


class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

    def __repr__(self):
        return f"ListNode({self.val})"


class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

    def __repr__(self):
        return f"TreeNode({self.val})"


def build_list(values):
    head = None
    for value in reversed(values):
        head = ListNode(value, head)
    return head


def build_tree(values):
    # LeetCode level order: [1, None, 2] means 1 has only a right child.
    if not values or values[0] is None:
        return None
    nodes = [None if v is None else TreeNode(v) for v in values]
    children = iter(nodes[1:])
    for node in nodes:
        if node is None:
            continue
        node.left = next(children, None)
        node.right = next(children, None)
    return nodes[0]


PRELUDE = {
    "List": List, "Optional": Optional, "Dict": Dict, "Set": Set,
    "Tuple": Tuple, "deque": deque, "defaultdict": defaultdict,
    "Counter": Counter, "heapq": heapq, "math": math,
    "ListNode": ListNode, "TreeNode": TreeNode,
    "build_list": build_list, "build_tree": build_tree,
}


# BaseException so a solution's own "except Exception" cannot swallow the stop.
class StepLimit(BaseException):
    pass


class DepthLimit(BaseException):
    pass


def is_list_node(value):
    return hasattr(value, "val") and hasattr(value, "next") and not callable(value)


# Every node gets a small number the first time it is seen, kept for the
# whole run, so the board can follow one node while arrows around it change
# (the point of "reverse a linked list"). Holding the node keeps id() unique.
NODE_IDS = {}
NODE_KEEP = []


def node_id(node):
    key = id(node)
    if key not in NODE_IDS:
        NODE_IDS[key] = len(NODE_IDS) + 1
        NODE_KEEP.append(node)
    return NODE_IDS[key]


def describe_chain(node):
    items, ids, seen = [], [], set()
    while node is not None and len(items) < MAX_LIST_NODES:
        if id(node) in seen:
            return {"t": "listnode", "items": items, "ids": ids, "cycle": True}
        seen.add(id(node))
        items.append(describe(node.val, MAX_NEST))
        ids.append(node_id(node))
        node = node.next
    return {"t": "listnode", "items": items, "ids": ids, "cycle": False,
            "more": node is not None}


def describe(value, nest=0):
    if value is None:
        return {"t": "none", "r": "None"}
    if isinstance(value, bool):
        return {"t": "bool", "r": repr(value)}
    if isinstance(value, (int, float)):
        return {"t": "num", "r": repr(value)}
    if isinstance(value, str):
        return {"t": "str", "r": repr(value)}
    if nest >= MAX_NEST:
        return {"t": "obj", "r": "…"}
    if isinstance(value, dict):
        entries = list(value.items())[:MAX_ITEMS]
        return {"t": "dict", "n": len(value), "entries": [
            [describe(k, nest + 1), describe(v, nest + 1)] for k, v in entries]}
    if isinstance(value, (list, tuple, set, frozenset, deque)):
        kind = {list: "list", tuple: "tuple", deque: "deque"}.get(type(value), "set")
        items = list(value)[:MAX_ITEMS]
        return {"t": kind, "n": len(value), "items": [describe(v, nest + 1) for v in items]}
    if is_list_node(value):
        return describe_chain(value)
    return {"t": "obj", "r": repr(value)[:80]}


def is_shown(name, value, hidden):
    if name.startswith("_") or name == "self" or name in hidden:
        return False
    return not callable(value) and not isinstance(value, types.ModuleType)


def frame_vars(frame, hidden):
    is_module = frame.f_code.co_name == "<module>"
    names = frame.f_globals if is_module else frame.f_locals
    return {k: describe(v) for k, v in list(names.items()) if is_shown(k, v, hidden)}


def arg_names(code):
    count = code.co_argcount + code.co_kwonlyargcount
    return [name for name in code.co_varnames[:count] if name != "self"]


def user_frames(frame, hidden):
    stack = []
    while frame is not None:
        if frame.f_code.co_filename == "<user>":
            stack.append({"fn": frame.f_code.co_name, "line": frame.f_lineno,
                          "args": arg_names(frame.f_code),
                          "vars": frame_vars(frame, hidden)})
        frame = frame.f_back
    stack.reverse()
    return stack


def error_line(error):
    line = None
    tb = error.__traceback__
    while tb is not None:
        if tb.tb_frame.f_code.co_filename == "<user>":
            line = tb.tb_lineno
        tb = tb.tb_next
    return line


def compile_call(call):
    try:
        return compile(call, "<call>", "eval"), True
    except SyntaxError:
        return compile(call, "<call>", "exec"), False


def make_tracer(steps, out, hidden):
    def tracer(frame, event, arg):
        if frame.f_code.co_filename != "<user>":
            return None
        if event not in ("line", "return", "exception"):
            return tracer
        if len(steps) >= MAX_STEPS:
            raise StepLimit()
        frames = user_frames(frame, hidden)
        if len(frames) > MAX_CALL_DEPTH:
            raise DepthLimit()
        snap = {"line": frame.f_lineno, "event": event, "frames": frames,
                "stdout": out.getvalue()[-MAX_STDOUT:]}
        if event == "return":
            snap["ret"] = describe(arg)
        steps.append(snap)
        return tracer
    return tracer


def failure(error):
    if isinstance(error, StepLimit):
        return {"line": None, "message": f"Stopped after {MAX_STEPS} steps. Showing the first {MAX_STEPS}."}
    if isinstance(error, DepthLimit):
        return {"line": None, "message": f"Calls went deeper than {MAX_CALL_DEPTH}. Is the recursion missing a base case?"}
    return {"line": error_line(error), "message": f"{type(error).__name__}: {error}"}


def execute(source, call, steps, out):
    scope = {"__name__": "__main__", **PRELUDE}
    hidden = set(scope)
    code = compile(source, "<user>", "exec")
    call_code, is_expression = compile_call(call) if call.strip() else (None, False)
    sys.settrace(make_tracer(steps, out, hidden))
    try:
        exec(code, scope)
        if call_code is None:
            return None, False
        if is_expression:
            return eval(call_code, scope), True
        exec(call_code, scope)
        return None, False
    finally:
        sys.settrace(None)


def run_traced(source, call):
    steps, out = [], io.StringIO()
    NODE_IDS.clear()
    NODE_KEEP.clear()
    old_stdout, sys.stdout = sys.stdout, out
    result, has_result, error = None, False, None
    try:
        result, has_result = execute(source, call, steps, out)
    except SyntaxError as syntax:
        where = "the Run with line" if syntax.filename == "<call>" else "the code"
        error = {"line": syntax.lineno if syntax.filename == "<user>" else None,
                 "message": f"SyntaxError in {where}: {syntax.msg}"}
    except BaseException as caught:
        error = failure(caught)
    finally:
        sys.stdout = old_stdout
    return json.dumps({
        "steps": steps,
        "error": error,
        "result": describe(result) if has_result else None,
        "stdout": out.getvalue()[-MAX_STDOUT:],
    })
