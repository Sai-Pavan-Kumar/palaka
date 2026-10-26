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
]
