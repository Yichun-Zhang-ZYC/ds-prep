---
id: dsa-sliding-window
title: "Sliding Window"
estimatedMinutes: 12
difficulty: medium
tags: [dsa, sliding-window, arrays, strings]
---

## Why it matters
"Longest/shortest/best contiguous subarray or substring such that..." is one of the most common interview prompts. A sliding window answers it in $O(n)$ instead of $O(n^2)$ by reusing the work from the previous window.

## Concept
A **window** is a contiguous range `[l, r]`. You expand `r` to include new elements and shrink `l` to restore a condition, so each index enters and leaves the window at most once: $O(n)$ total.

Two flavors:
- **Fixed size $k$**: add `a[r]`, remove `a[r - k]`, update the running sum/count. Example: max sum of any $k$ consecutive elements.
- **Variable size**: grow until the window is invalid (or valid), then shrink from the left.
  - *Longest valid window*: expand always, shrink only while invalid, record the length after fixing.
  - *Shortest window meeting a condition*: expand until valid, then shrink while still valid and record each time.

Template (variable size):

```python
l = 0
for r in range(len(a)):
    add(a[r])
    while invalid():
        remove(a[l]); l += 1
    best = max(best, r - l + 1)
```

State to maintain: a running sum, a frequency map or set of the window contents, a count of distinct characters, or a deque for window max/min.

**When it applies**: the answer is a contiguous subarray/substring and the validity condition is *monotone* (shrinking a valid window keeps it valid, or growing an invalid one keeps it invalid). With negative numbers a "sum $\ge$ target" window is not monotone; use prefix sums with a hash map or deque instead.

Complexity: $O(n)$ time; $O(1)$ space for sums, $O(\min(n, |\Sigma|))$ for a character map.

## Worked example
**Longest substring without repeating characters** on `"abcabcbb"`. Keep a map `last[ch]` = most recent index, and move `l` to `last[ch] + 1` when `ch` repeats inside the window.

```text
r=0 'a'  l=0  window "a"    len 1  best 1
r=1 'b'  l=0  window "ab"   len 2  best 2
r=2 'c'  l=0  window "abc"  len 3  best 3
r=3 'a'  last[a]=0 >= l  -> l=1  window "bca"  len 3
r=4 'b'  last[b]=1 >= l  -> l=2  window "cab"  len 3
r=5 'c'  last[c]=2 >= l  -> l=3  window "abc"  len 3
r=6 'b'  last[b]=4 >= l  -> l=5  window "cb"   len 2
r=7 'b'  last[b]=6 >= l  -> l=7  window "b"    len 1
```

Answer 3, one pass, $O(n)$ time. The check `last[ch] >= l` matters: an old occurrence of `ch` left of `l` is no longer in the window and must not move `l` backwards.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why is the variable-size sliding window O(n) despite having a while loop inside the for loop?",
  "options": [
    "The while loop never runs",
    "Each element is added once and removed at most once, so total pointer moves are at most 2n",
    "It is actually O(n log n)",
    "Because the input is sorted"
  ],
  "answer": 1,
  "explanation": "l only moves forward and never exceeds r, so across the entire run the inner loop does at most n iterations in total."
}
```

```quiz
{
  "id": "q2",
  "question": "For which problem does the standard sliding window (shrinking when the sum is too large) fail?",
  "options": [
    "Longest substring with at most 2 distinct characters",
    "Min length subarray with sum >= target, all positive numbers",
    "Count subarrays with sum exactly k when numbers can be negative",
    "Max sum of k consecutive elements"
  ],
  "answer": 2,
  "explanation": "With negatives, adding an element can decrease the sum, so validity is not monotone and the window cannot be shrunk safely. Use prefix sums + hash map."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement (1) `length_of_longest_substring(s)`: length of the longest substring without repeating characters. (2) `min_subarray_len(target, nums)`: minimal length of a contiguous subarray of positive integers with sum $\\ge$ target, or 0 if none. (3) `max_sum_k(nums, k)`: maximum sum of any `k` consecutive elements (return `None` if `len(nums) < k` or `k <= 0`).",
  "starterCode": "def length_of_longest_substring(s):\n    pass\n\ndef min_subarray_len(target, nums):\n    pass\n\ndef max_sum_k(nums, k):\n    pass\n\nprint(length_of_longest_substring(\"abcabcbb\"), min_subarray_len(7, [2, 3, 1, 2, 4, 3]), max_sum_k([2, 1, 5, 1, 3, 2], 3))",
  "tests": "assert length_of_longest_substring(\"abcabcbb\") == 3\nassert length_of_longest_substring(\"bbbbb\") == 1\nassert length_of_longest_substring(\"pwwkew\") == 3\nassert length_of_longest_substring(\"\") == 0\nassert length_of_longest_substring(\"a\") == 1\nassert length_of_longest_substring(\"abba\") == 2\nassert length_of_longest_substring(\"tmmzuxt\") == 5\nassert length_of_longest_substring(\"dvdf\") == 3\nassert min_subarray_len(7, [2, 3, 1, 2, 4, 3]) == 2\nassert min_subarray_len(4, [1, 4, 4]) == 1\nassert min_subarray_len(11, [1, 1, 1, 1, 1, 1, 1, 1]) == 0\nassert min_subarray_len(15, [1, 2, 3, 4, 5]) == 5\nassert min_subarray_len(1, []) == 0\nassert min_subarray_len(5, [5]) == 1\nassert max_sum_k([2, 1, 5, 1, 3, 2], 3) == 9\nassert max_sum_k([-3, -1, -2], 2) == -3\nassert max_sum_k([4], 1) == 4\nassert max_sum_k([1, 2], 3) is None\nassert max_sum_k([1, 2], 0) is None\n",
  "solution": "def length_of_longest_substring(s):\n    last = {}\n    l = 0\n    best = 0\n    for r, ch in enumerate(s):\n        if ch in last and last[ch] >= l:\n            l = last[ch] + 1\n        last[ch] = r\n        best = max(best, r - l + 1)\n    return best\n\ndef min_subarray_len(target, nums):\n    l = 0\n    total = 0\n    best = len(nums) + 1\n    for r, x in enumerate(nums):\n        total += x\n        while total >= target:\n            best = min(best, r - l + 1)\n            total -= nums[l]\n            l += 1\n    return best if best <= len(nums) else 0\n\ndef max_sum_k(nums, k):\n    if k <= 0 or len(nums) < k:\n        return None\n    window = sum(nums[:k])\n    best = window\n    for r in range(k, len(nums)):\n        window += nums[r] - nums[r - k]\n        best = max(best, window)\n    return best",
  "hints": [
    "Longest substring: store the last index of each character and jump l past a previous occurrence only if it is inside the window (last[ch] >= l).",
    "Shortest window: expand r; while the sum is >= target, record the length, then shrink from the left.",
    "Fixed window: compute the first sum, then slide by adding the new element and subtracting the one that left."
  ]
}
```

> [!TIP] Interview tips
> - Say why it is $O(n)$: each pointer only moves forward, so at most $2n$ pointer moves, even though there is a loop inside a loop.
> - Identify the invariant: what does the window guarantee after each iteration?
> - Pitfall: negative numbers break the classic shrink logic for sum problems; switch to prefix sums plus a hash map.
> - Pitfall: updating the answer at the wrong moment (before shrinking vs after). For shortest-window problems, record inside the shrink loop.
