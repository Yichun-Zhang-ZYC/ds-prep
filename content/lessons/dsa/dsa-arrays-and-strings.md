---
id: dsa-arrays-and-strings
title: "Arrays & Strings"
estimatedMinutes: 12
difficulty: easy
tags: [dsa, arrays, strings, prefix-sum]
---

## Why it matters
Arrays and strings are the most common interview inputs, and most problems on them are decided by one idea: avoid re-scanning by precomputing something (prefix sums, running max, a count table) or by modifying in place.

## Concept
**Arrays** (Python lists) give $O(1)$ index access and $O(1)$ amortized append/pop at the end, but $O(n)$ insert/delete at the front or middle because elements shift. **Strings** are immutable in Python: every "modification" builds a new string, so slicing and concatenation cost $O(k)$ for $k$ characters copied.

Core patterns:
- **Prefix / suffix arrays**: $\text{prefix}[i] = a_0 + \dots + a_{i-1}$ lets you answer any range sum in $O(1)$: $\sum_{l}^{r-1} a = \text{prefix}[r] - \text{prefix}[l]$. The same idea works for products, max, and counts.
- **Running state in one pass**: Kadane's maximum subarray keeps `best_ending_here = max(x, best_ending_here + x)`.
- **In-place with a write pointer**: compact or filter an array in $O(n)$ time and $O(1)$ space by writing kept elements to the front.
- **Frequency tables**: a list of 26 counts (or a `Counter`) for anagram and character problems.
- **Sort first** when order does not matter: it often reduces a problem to neighbors comparison, at $O(n \log n)$.
- **Build strings with a list and `join`**, not repeated `+=`.

Edge cases to always check: empty input, a single element, all equal elements, negative numbers, zeros (important for products), and duplicates.

## Worked example
**Product of array except self** without division, in $O(n)$ time and $O(1)$ extra space (output not counted). For `nums = [1, 2, 3, 4]` the answer at index $i$ is (product of everything left of $i$) × (product of everything right of $i$).

```text
Pass 1 (left to right): out[i] = product of nums[0..i-1]
  i=0: out=[1, _, _, _]        left=1
  i=1: out=[1, 1, _, _]        left=1*1=1
  i=2: out=[1, 1, 2, _]        left=1*2=2
  i=3: out=[1, 1, 2, 6]        left=2*3=6
Pass 2 (right to left): multiply by product of nums[i+1..]
  i=3: out[3]=6*1=6            right=1*4=4
  i=2: out[2]=2*4=8            right=4*3=12
  i=1: out[1]=1*12=12          right=12*2=24
  i=0: out[0]=1*24=24
```

Result `[24, 12, 8, 6]`. Dividing the total product (24) by each element would fail when a zero appears, which is exactly why the two-pass prefix/suffix approach is preferred.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "With `prefix[i]` = sum of the first i elements, the sum of `a[2..5]` (inclusive) is:",
  "options": [
    "prefix[5] - prefix[2]",
    "prefix[6] - prefix[2]",
    "prefix[5] - prefix[1]",
    "prefix[6] - prefix[1]"
  ],
  "answer": 1,
  "explanation": "Inclusive range [2, 5] is the half-open range [2, 6), so the sum is prefix[6] - prefix[2]."
}
```

```quiz
{
  "id": "q2",
  "question": "Why is building a string with `s += ch` in a loop of n iterations a potential problem in Python?",
  "options": [
    "Strings cannot be concatenated",
    "Each concatenation can copy the whole string, giving O(n^2) total",
    "It uses O(1) extra space only",
    "It changes the characters already built"
  ],
  "answer": 1,
  "explanation": "Python strings are immutable, so concatenation may copy. Collect pieces in a list and use ''.join(pieces) for O(n)."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement two classics. (1) `product_except_self(nums)`: return a list where element $i$ is the product of all other elements, without using division, in $O(n)$ time. (2) `longest_common_prefix(strs)`: return the longest common prefix of a list of strings (`\"\"` if none or if the list is empty).",
  "starterCode": "def product_except_self(nums):\n    pass\n\ndef longest_common_prefix(strs):\n    pass\n\nprint(product_except_self([1, 2, 3, 4]), longest_common_prefix([\"flower\", \"flow\", \"flight\"]))",
  "tests": "assert product_except_self([1, 2, 3, 4]) == [24, 12, 8, 6]\nassert product_except_self([-1, 1, 0, -3, 3]) == [0, 0, 9, 0, 0]\nassert product_except_self([0, 0, 2]) == [0, 0, 0]\nassert product_except_self([5]) == [1]\nassert product_except_self([2, 3]) == [3, 2]\nassert product_except_self([]) == []\nassert longest_common_prefix([\"flower\", \"flow\", \"flight\"]) == \"fl\"\nassert longest_common_prefix([\"dog\", \"racecar\", \"car\"]) == \"\"\nassert longest_common_prefix([\"same\", \"same\"]) == \"same\"\nassert longest_common_prefix([\"a\"]) == \"a\"\nassert longest_common_prefix([\"\", \"abc\"]) == \"\"\nassert longest_common_prefix([\"ab\", \"abc\", \"a\"]) == \"a\"\nassert longest_common_prefix([]) == \"\"\n",
  "solution": "def product_except_self(nums):\n    n = len(nums)\n    out = [1] * n\n    left = 1\n    for i in range(n):\n        out[i] = left\n        left *= nums[i]\n    right = 1\n    for i in range(n - 1, -1, -1):\n        out[i] *= right\n        right *= nums[i]\n    return out\n\ndef longest_common_prefix(strs):\n    if not strs:\n        return \"\"\n    first = min(strs)\n    last = max(strs)\n    i = 0\n    while i < len(first) and i < len(last) and first[i] == last[i]:\n        i += 1\n    return first[:i]",
  "hints": [
    "Pass 1 stores the product of everything to the left of each index; pass 2 multiplies in the product of everything to the right.",
    "Common prefix: the lexicographically smallest and largest strings differ the most, so only compare those two.",
    "Alternatively compare column by column and stop at the first mismatch or the shortest length."
  ]
}
```

> [!TIP] Interview tips
> - Clarify constraints first: sorted or not, duplicates, negatives, can you modify the input, what is the size.
> - Pitfall: off-by-one errors in prefix sums. Define `prefix[i]` as the sum of the first `i` elements and the range sum is `prefix[r] - prefix[l]` for `[l, r)`.
> - Pitfall: `s = s + c` or slicing inside loops silently makes the solution $O(n^2)$ for strings.
> - Test your code out loud on an empty array, one element, and an input with zeros or negatives before saying you are done.
