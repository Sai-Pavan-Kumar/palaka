export type CodeTemplate = {
  id: string
  label: string
  source: string
  // What to run after the code is defined, the way LeetCode calls a solution.
  call: string
}

// Kept short on purpose: every line ends up on the board in a video, and a
// program that needs scrolling cannot be recorded.
export const CODE_TEMPLATES: CodeTemplate[] = [
  {
    id: 'factorial',
    label: 'Factorial',
    source: `def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)`,
    call: 'factorial(4)',
  },
  {
    id: 'fibonacci',
    label: 'Fibonacci',
    source: `def fib(n):
    a, b = 0, 1
    for i in range(n):
        print(a)
        a, b = b, a + b
    return a`,
    call: 'fib(6)',
  },
  {
    id: 'bubble-sort',
    label: 'Bubble sort',
    source: `class Solution:
    def sortArray(self, nums: List[int]) -> List[int]:
        n = len(nums)
        for i in range(n):
            for j in range(n - 1 - i):
                if nums[j] > nums[j + 1]:
                    nums[j], nums[j + 1] = nums[j + 1], nums[j]
        return nums`,
    call: 'Solution().sortArray([5, 2, 4, 1])',
  },
  {
    id: 'binary-search',
    label: 'Binary search',
    source: `class Solution:
    def search(self, nums: List[int], target: int) -> int:
        lo, hi = 0, len(nums) - 1
        while lo <= hi:
            mid = (lo + hi) // 2
            if nums[mid] == target:
                return mid
            if nums[mid] < target:
                lo = mid + 1
            else:
                hi = mid - 1
        return -1`,
    call: 'Solution().search([-1, 0, 3, 5, 9, 12, 15, 21], 15)',
  },
  {
    id: 'two-pointers',
    label: 'Two pointers',
    source: `class Solution:
    def twoSum(self, numbers: List[int], target: int) -> List[int]:
        left, right = 0, len(numbers) - 1
        while left < right:
            total = numbers[left] + numbers[right]
            if total == target:
                return [left + 1, right + 1]
            if total < target:
                left += 1
            else:
                right -= 1
        return []`,
    call: 'Solution().twoSum([1, 3, 4, 6, 8, 11], 10)',
  },
  {
    id: 'reverse-list',
    label: 'Reverse linked list',
    source: `class Solution:
    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:
        prev, curr = None, head
        while curr:
            nxt = curr.next
            curr.next = prev
            prev = curr
            curr = nxt
        return prev`,
    call: 'Solution().reverseList(build_list([1, 2, 3, 4]))',
  },
  {
    id: 'bfs',
    label: 'BFS',
    source: `def bfs(graph, src):
    visited = {src}
    queue = deque([src])
    order = []
    while queue:
        node = queue.popleft()
        order.append(node)
        for nxt in graph[node]:
            if nxt not in visited:
                visited.add(nxt)
                queue.append(nxt)
    return order`,
    call: 'bfs({0: [1, 2], 1: [0, 3, 4], 2: [0, 5], 3: [1], 4: [1, 5], 5: [2, 4]}, 0)',
  },
]
