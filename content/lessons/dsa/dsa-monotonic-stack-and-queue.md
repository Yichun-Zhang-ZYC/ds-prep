---
id: dsa-monotonic-stack-and-queue
title: "Monotonic stack and queue"
estimatedMinutes: 14
difficulty: hard
tags: [dsa, monotonic-stack, monotonic-queue, deque]
---

## Why it matters
Whenever a question asks for "the nearest element to the left/right that is bigger/smaller" or "the max of every window of size $k$", the brute force is $O(n^2)$ and the intended answer is a monotonic stack or deque in $O(n)$. These are hard-medium staples (largest rectangle in histogram, trapping rain water, sliding window maximum). The basic next-greater idea appears in Stacks and queues; this lesson goes further.

## Concept
**Monotonic stack**: keep indices on a stack whose values are always increasing (or decreasing). When a new element violates the order, pop until it holds; each pop is the moment you learn the **answer for the popped element** (its next greater/smaller element is the current index). Each index is pushed and popped once, so $O(n)$.

**Monotonic deque** (sliding window max/min): keep indices whose values are decreasing from front to back.
1. Pop from the back while `a[back] <= a[i]` (they can never be a window max again, since `a[i]` is newer and at least as large).
2. Push `i` at the back.
3. Pop from the front if its index has left the window (`front <= i - k`).
4. The front is the window maximum.

Each index enters and leaves once, so $O(n)$ total instead of $O(nk)$.

**Which direction?**

| Want | Stack order (bottom to top) | Pop when |
|---|---|---|
| next greater to the right | decreasing | `a[i] > a[top]` |
| next smaller to the right | increasing | `a[i] < a[top]` |
| previous greater/smaller | same stack; read the new top **before** pushing | |

**Contribution technique.** For "sum over all subarrays of min/max", compute for each element the span in which it is the min: `left` = distance to the previous smaller, `right` = distance to the next smaller-or-equal. It then contributes `a[i] * left * right`. Use strict on one side and non-strict on the other so equal values are not double counted.

**Pitfalls.** Storing values instead of indices (you lose distances). Not flushing the stack at the end (use a sentinel or a second loop). Off-by-one in widths: width of a popped bar is `i - new_top - 1`, or `i` if the stack is empty.

## Worked example
**Largest rectangle in a histogram**, `h = [2, 1, 5, 6, 2, 3]`. Keep indices with increasing heights; when `h[i]` is smaller, pop and compute the rectangle that uses the popped bar as its height. Width = `i - (new top) - 1`, or `i` if the stack is empty.

```text
i=0 h=2  push                      stack [0]
i=1 h=1  pop 0 (h=2): width=1 area=2   push        stack [1]
i=2 h=5  push                      stack [1,2]
i=3 h=6  push                      stack [1,2,3]
i=4 h=2  pop 3 (h=6): width=4-2-1=1 area=6
         pop 2 (h=5): width=4-1-1=2 area=10  <- best
         push                      stack [1,4]
i=5 h=3  push                      stack [1,4,5]
end(i=6) pop 5 (h=3): width=6-4-1=1 area=3
         pop 4 (h=2): width=6-1-1=4 area=8
         pop 1 (h=1): stack empty, width=6 area=6
```

Answer **10** (bars of height 5 and 6, width 2), in one pass: 6 pushes and 6 pops.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why is the monotonic-stack solution to next-greater-element O(n) even though it has a loop inside a loop?",
  "options": [
    "The inner loop runs at most log n times",
    "Each index is pushed once and popped at most once",
    "The stack never holds more than 2 items",
    "Sorting is done first"
  ],
  "answer": 1,
  "explanation": "Total pops can never exceed total pushes (n), so the combined work of all inner loops is O(n) amortized."
}
```

```quiz
{
  "id": "q2",
  "question": "In the sliding-window-maximum deque, why can you discard back elements that are <= the new element?",
  "options": [
    "They are outside the window",
    "They are older and not larger, so they can never be the maximum of a window that also contains the new element",
    "They were already counted",
    "Deques must be sorted ascending"
  ],
  "answer": 1,
  "explanation": "Any window containing the older element and still alive later also contains the newer, at-least-as-large element, because it expires later."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement (1) `next_greater(nums)`: for each element the next strictly greater value to its right, or -1. (2) `largest_rectangle(heights)`: area of the largest rectangle in a histogram (0 for empty). (3) `sliding_window_max(nums, k)`: list of each window's maximum in $O(n)$ (empty list if `k <= 0` or `k > len(nums)`). (4) `sum_subarray_mins(nums)`: the sum of `min(sub)` over all contiguous subarrays (exact integer, no modulus), $O(n)$.",
  "starterCode": "from collections import deque\n\ndef next_greater(nums):\n    pass\n\ndef largest_rectangle(heights):\n    pass\n\ndef sliding_window_max(nums, k):\n    pass\n\ndef sum_subarray_mins(nums):\n    pass\n\nprint(largest_rectangle([2, 1, 5, 6, 2, 3]), sliding_window_max([1, 3, -1, -3, 5, 3, 6, 7], 3))",
  "tests": "assert next_greater([2, 1, 2, 4, 3]) == [4, 2, 4, -1, -1]\nassert next_greater([]) == []\nassert next_greater([5]) == [-1]\nassert next_greater([3, 3, 3]) == [-1, -1, -1]\nassert next_greater([1, 2, 3]) == [2, 3, -1]\nassert next_greater([3, 2, 1]) == [-1, -1, -1]\nassert largest_rectangle([2, 1, 5, 6, 2, 3]) == 10\nassert largest_rectangle([]) == 0\nassert largest_rectangle([4]) == 4\nassert largest_rectangle([2, 4]) == 4\nassert largest_rectangle([3, 3, 3]) == 9\nassert largest_rectangle([0, 0]) == 0\nassert largest_rectangle([1, 2, 3, 4, 5]) == 9\nassert largest_rectangle([5, 4, 3, 2, 1]) == 9\nassert sliding_window_max([1, 3, -1, -3, 5, 3, 6, 7], 3) == [3, 3, 5, 5, 6, 7]\nassert sliding_window_max([1], 1) == [1]\nassert sliding_window_max([4, 2], 2) == [4]\nassert sliding_window_max([1, 2, 3], 1) == [1, 2, 3]\nassert sliding_window_max([2, 2, 2], 2) == [2, 2]\nassert sliding_window_max([9, 8, 7, 6], 2) == [9, 8, 7]\nassert sliding_window_max([1, 2], 3) == [] and sliding_window_max([1, 2], 0) == [] and sliding_window_max([], 1) == []\nassert sum_subarray_mins([3, 1, 2, 4]) == 17\nassert sum_subarray_mins([]) == 0\nassert sum_subarray_mins([5]) == 5\nassert sum_subarray_mins([2, 2, 2]) == 2 * 6\nimport itertools\narr = [4, 1, 3, 1, 5, 2, 2]\nbrute = sum(min(arr[i:j]) for i in range(len(arr)) for j in range(i + 1, len(arr) + 1))\nassert sum_subarray_mins(arr) == brute\nassert sliding_window_max(list(range(20000)), 100)[-1] == 19999\n",
  "solution": "from collections import deque\n\ndef next_greater(nums):\n    res = [-1] * len(nums)\n    st = []\n    for i, x in enumerate(nums):\n        while st and nums[st[-1]] < x:\n            res[st.pop()] = x\n        st.append(i)\n    return res\n\ndef largest_rectangle(heights):\n    best = 0\n    st = []\n    hs = list(heights) + [0]\n    for i, h in enumerate(hs):\n        while st and hs[st[-1]] >= h:\n            height = hs[st.pop()]\n            width = i if not st else i - st[-1] - 1\n            best = max(best, height * width)\n        st.append(i)\n    return best\n\ndef sliding_window_max(nums, k):\n    if k <= 0 or k > len(nums):\n        return []\n    dq = deque()\n    out = []\n    for i, x in enumerate(nums):\n        while dq and nums[dq[-1]] <= x:\n            dq.pop()\n        dq.append(i)\n        if dq[0] <= i - k:\n            dq.popleft()\n        if i >= k - 1:\n            out.append(nums[dq[0]])\n    return out\n\ndef sum_subarray_mins(nums):\n    n = len(nums)\n    left = [0] * n\n    right = [0] * n\n    st = []\n    for i in range(n):\n        while st and nums[st[-1]] > nums[i]:\n            st.pop()\n        left[i] = i - (st[-1] if st else -1)\n        st.append(i)\n    st = []\n    for i in range(n - 1, -1, -1):\n        while st and nums[st[-1]] >= nums[i]:\n            st.pop()\n        right[i] = (st[-1] if st else n) - i\n        st.append(i)\n    return sum(nums[i] * left[i] * right[i] for i in range(n))",
  "hints": [
    "Store indices on the stack; when `nums[i] > nums[stack[-1]]`, set the answer of the popped index to `nums[i]`.",
    "Histogram: append a 0 sentinel so everything is popped; width = `i` if the stack is empty else `i - stack[-1] - 1`.",
    "Deque for window max: pop back while `nums[back] <= nums[i]`, pop front when `front <= i - k`.",
    "Subarray mins: left bound uses strictly smaller, right bound uses smaller-or-equal (or vice versa) so ties are counted once; contribution = `nums[i] * (i - left) * (right - i)`."
  ]
}
```


> [!TIP] Interview tips
> - State the invariant first ("stack is decreasing") and what a pop means ("I just found this element's answer").
> - Argue amortization: every index is pushed and popped once, so the nested loop is still O(n).
> - Largest rectangle and trapping rain water are the two most-asked follow-ups; both can also be done with two pointers or prefix arrays, so mention an alternative.
> - Handle ties deliberately (strict vs non-strict) and test with all-equal arrays.
