---
id: dsa-binary-search
title: "Binary Search"
estimatedMinutes: 13
difficulty: medium
tags: [dsa, binary-search, search]
---

## Why it matters
Binary search turns $O(n)$ into $O(\log n)$ whenever you can discard half the candidates with one comparison. Interviewers use it to test careful boundary handling, and it generalizes to "search on the answer" problems far beyond sorted arrays.

## Concept
On a **sorted** array, compare the middle element with the target and discard the half that cannot contain it. $n = 10^9$ needs only about 30 comparisons. Time $O(\log n)$, space $O(1)$ (iterative).

The most reliable template is the **lower bound**: the first index whose value is $\ge$ target (the insertion point, same as `bisect_left`):

```python
lo, hi = 0, len(a)          # search in [lo, hi)
while lo < hi:
    mid = (lo + hi) // 2
    if a[mid] < target:
        lo = mid + 1
    else:
        hi = mid
return lo                   # a[lo] >= target, or lo == len(a)
```

- **Exists?** check `lo < len(a) and a[lo] == target`.
- **First and last occurrence**: `lower_bound(t)` and `lower_bound(t + 1) - 1` for integers (or `bisect_right`).
- **Search on the answer**: if a predicate `ok(x)` is monotone (False...False True...True), binary search the smallest `x` with `ok(x)`. Examples: minimum shipping capacity, square root, koko eating bananas.
- **Rotated sorted array**: at each `mid`, one half is sorted; decide whether the target lies in the sorted half.

Pitfalls: infinite loops from `lo = mid` with a floor midpoint, off-by-one on `hi` (use half-open `[lo, hi)` consistently), and duplicates. In fixed-width languages use `lo + (hi - lo) // 2` to avoid overflow (not an issue in Python).

The input must be monotone with respect to the question you ask; if it is not sorted, sort it first ($O(n \log n)$) or use a different method.

## Worked example
**Search in a rotated sorted array**: `nums = [4, 5, 6, 7, 0, 1, 2]`, `target = 0`. Use closed bounds `[lo, hi]`. At each step the half containing a sorted run is identified by comparing `nums[lo]` with `nums[mid]`.

```text
lo=0 hi=6 mid=3 (7)  left half [4..7] is sorted (4 <= 7)
                     target 0 not in [4, 7) -> go right: lo=4
lo=4 hi=6 mid=5 (1)  left half [0..1] is sorted (0 <= 1)
                     target 0 in [0, 1)     -> go left:  hi=4
lo=4 hi=4 mid=4 (0)  found, return 4
```

Three probes for 7 elements, $O(\log n)$. Plain lower-bound sanity check: `a = [1, 3, 5, 7]`, target 4: `lo=0 hi=4` mid=2 (5 >= 4) so `hi=2`; mid=1 (3 < 4) so `lo=2`; stop, return 2, the insertion point.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "With half-open range [lo, hi) and lower-bound logic, which update is correct when a[mid] < target?",
  "options": [
    "hi = mid",
    "hi = mid - 1",
    "lo = mid",
    "lo = mid + 1"
  ],
  "answer": 3,
  "explanation": "a[mid] is too small, so the answer is strictly to the right: lo = mid + 1. Using lo = mid could loop forever."
}
```

```quiz
{
  "id": "q2",
  "question": "Which problem is solved by binary search on the answer?",
  "options": [
    "Find the maximum element of an unsorted array",
    "Minimum ship capacity so all packages arrive within D days (feasibility is monotone in capacity)",
    "Count the nodes of a linked list",
    "Reverse a string"
  ],
  "answer": 1,
  "explanation": "Feasible(capacity) flips from False to True as capacity grows, so the smallest feasible capacity can be found with binary search over the capacity range."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement (1) `lower_bound(a, target)`: the first index with `a[i] >= target` in a sorted list (`len(a)` if none). (2) `search_range(nums, target)`: `[first, last]` indices of `target` in a sorted list of integers, or `[-1, -1]`; use $O(\\log n)$. (3) `search_rotated(nums, target)`: index of `target` in a rotated sorted list of **distinct** integers, or -1, in $O(\\log n)$. Do not use the `bisect` module.",
  "starterCode": "def lower_bound(a, target):\n    pass\n\ndef search_range(nums, target):\n    pass\n\ndef search_rotated(nums, target):\n    pass\n\nprint(lower_bound([1, 3, 5, 7], 4), search_range([5, 7, 7, 8, 8, 10], 8), search_rotated([4, 5, 6, 7, 0, 1, 2], 0))",
  "tests": "import bisect\nfor a in ([], [1], [1, 1, 1], [1, 3, 5, 7], [2, 2, 3, 3, 3, 9]):\n    for t in range(0, 11):\n        assert lower_bound(a, t) == bisect.bisect_left(a, t), (a, t)\nassert search_range([5, 7, 7, 8, 8, 10], 8) == [3, 4]\nassert search_range([5, 7, 7, 8, 8, 10], 6) == [-1, -1]\nassert search_range([], 0) == [-1, -1]\nassert search_range([1], 1) == [0, 0]\nassert search_range([2, 2, 2, 2], 2) == [0, 3]\nassert search_range([1, 2, 3], 4) == [-1, -1]\nassert search_range([1, 2, 3], 0) == [-1, -1]\nassert search_rotated([4, 5, 6, 7, 0, 1, 2], 0) == 4\nassert search_rotated([4, 5, 6, 7, 0, 1, 2], 3) == -1\nassert search_rotated([1], 0) == -1\nassert search_rotated([1], 1) == 0\nassert search_rotated([], 5) == -1\nassert search_rotated([3, 1], 1) == 1\nassert search_rotated([5, 1, 3], 5) == 0\nbase = [1, 2, 3, 4, 5, 6, 7, 8]\nfor k in range(len(base)):\n    rot = base[k:] + base[:k]\n    for t in range(0, 10):\n        want = rot.index(t) if t in rot else -1\n        assert search_rotated(rot, t) == want, (rot, t)\n",
  "solution": "def lower_bound(a, target):\n    lo, hi = 0, len(a)\n    while lo < hi:\n        mid = (lo + hi) // 2\n        if a[mid] < target:\n            lo = mid + 1\n        else:\n            hi = mid\n    return lo\n\ndef search_range(nums, target):\n    first = lower_bound(nums, target)\n    if first == len(nums) or nums[first] != target:\n        return [-1, -1]\n    return [first, lower_bound(nums, target + 1) - 1]\n\ndef search_rotated(nums, target):\n    lo, hi = 0, len(nums) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if nums[mid] == target:\n            return mid\n        if nums[lo] <= nums[mid]:\n            if nums[lo] <= target < nums[mid]:\n                hi = mid - 1\n            else:\n                lo = mid + 1\n        else:\n            if nums[mid] < target <= nums[hi]:\n                lo = mid + 1\n            else:\n                hi = mid - 1\n    return -1",
  "hints": [
    "lower_bound: search the half-open range [0, len(a)); if a[mid] < target move lo to mid + 1, otherwise hi = mid.",
    "search_range: the last index equals lower_bound(target + 1) - 1 for integers; first check the target is actually present.",
    "Rotated: if nums[lo] <= nums[mid] the left half is sorted; test whether target lies inside it, otherwise search the other half."
  ]
}
```

> [!TIP] Interview tips
> - Pick one template (half-open `[lo, hi)` with lower bound) and stick to it; mixing conventions is the main source of bugs.
> - Say the invariant: "the answer is always inside `[lo, hi]`", and show that each branch shrinks the range.
> - When the problem says "minimum X such that feasible(X)", recognize it as binary search on the answer and define the monotone predicate first.
> - In Python, mention `bisect.bisect_left/right` exist, but be ready to write the loop by hand.
