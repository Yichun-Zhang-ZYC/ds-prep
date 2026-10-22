---
id: dsa-two-pointers
title: "Two Pointers"
estimatedMinutes: 12
difficulty: medium
tags: [dsa, two-pointers, sorting]
---

## Why it matters
Two pointers is the standard way to replace an $O(n^2)$ pair search with an $O(n)$ scan, using extra structure (sorted order, or a fast/slow speed difference) instead of extra memory. It is a favorite for easy-to-medium rounds.

## Concept
Two indices move through the data, and each move **provably eliminates** possibilities. Main variants:
- **Opposite ends** (`l = 0`, `r = n - 1`, move inward): on a **sorted** array, pair-sum problems. If `a[l] + a[r]` is too small, only moving `l` right can increase it; too big, move `r` left. Also palindromes and container-with-most-water.
- **Same direction, fast/slow** (read pointer and write pointer): remove duplicates in place, move zeros, partition. The slow pointer marks the end of the "kept" region.
- **Two sequences**: one pointer per sorted array, as in merging or intersecting.
- **Fix one, two-pointer the rest**: 3Sum is a loop over $i$ plus an opposite-ends scan, $O(n^2)$ total after sorting.

Complexity: each pointer moves at most $n$ steps, so the scan is $O(n)$; sorting first adds $O(n \log n)$. Space is $O(1)$ beyond the output.

Why the opposite-ends argument is valid for max-area: the area is $\min(h_l, h_r) \cdot (r - l)$. Moving the **taller** wall inward can only shrink the width and cannot raise the min, so it can never help; hence always move the shorter wall.

Skipping duplicates (for 3Sum) after sorting avoids repeated triples without needing a set.

## Worked example
**Container with most water** for `h = [1, 8, 6, 2, 5, 4, 8, 3, 7]`. Start with `l=0`, `r=8` and move the shorter wall.

```text
l=0 r=8  h=1,7  area=min(1,7)*8=8   best=8   move l (1<7)
l=1 r=8  h=8,7  area=7*7=49         best=49  move r (7<8)
l=1 r=7  h=8,3  area=3*6=18                  move r
l=1 r=6  h=8,8  area=8*5=40                  move either (r)
l=1 r=5  h=8,4  area=4*4=16                  move r
l=1 r=4  h=8,5  area=5*3=15                  move r
l=1 r=3  h=8,2  area=2*2=4                   move r
l=1 r=2  h=8,6  area=6*1=6                   move r, stop
```

Best is 49 after 8 steps, instead of checking all 36 pairs. In general: $n - 1$ steps versus $\binom{n}{2}$ pairs.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "On a sorted array with l=0, r=n-1, a[l]+a[r] < target. What should you do?",
  "options": [
    "Decrement r",
    "Increment l",
    "Increment r",
    "Restart with a hash map"
  ],
  "answer": 1,
  "explanation": "a[l] is the smallest remaining value; no partner a[r'] with r' <= r can reach the target, so l can be safely discarded. Moving l right increases the sum."
}
```

```quiz
{
  "id": "q2",
  "question": "What is the time complexity of 3Sum with sort + two pointers?",
  "options": [
    "O(n)",
    "O(n log n)",
    "O(n^2)",
    "O(n^3)"
  ],
  "answer": 2,
  "explanation": "Sorting is O(n log n); for each of n fixed elements an O(n) two-pointer scan runs, giving O(n^2) overall."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement (1) `three_sum(nums)`: return all unique triplets `[a, b, c]` (sorted ascending inside each triplet) summing to 0, as a list of lists sorted lexicographically. (2) `max_area(heights)`: the container-with-most-water answer, $O(n)$ (return 0 for fewer than 2 bars). (3) `remove_duplicates(nums)`: given a **sorted** list, compact unique values to the front in place and return the new length.",
  "starterCode": "def three_sum(nums):\n    pass\n\ndef max_area(heights):\n    pass\n\ndef remove_duplicates(nums):\n    pass\n\nprint(three_sum([-1, 0, 1, 2, -1, -4]), max_area([1, 8, 6, 2, 5, 4, 8, 3, 7]))",
  "tests": "assert three_sum([-1, 0, 1, 2, -1, -4]) == [[-1, -1, 2], [-1, 0, 1]]\nassert three_sum([0, 0, 0, 0]) == [[0, 0, 0]]\nassert three_sum([1, 2, 3]) == []\nassert three_sum([]) == []\nassert three_sum([0, 0]) == []\nassert three_sum([-2, 0, 1, 1, 2]) == [[-2, 0, 2], [-2, 1, 1]]\nassert max_area([1, 8, 6, 2, 5, 4, 8, 3, 7]) == 49\nassert max_area([1, 1]) == 1\nassert max_area([5]) == 0\nassert max_area([]) == 0\nassert max_area([4, 3, 2, 1, 4]) == 16\nassert max_area([1, 2, 1]) == 2\na = [0, 0, 1, 1, 1, 2, 2, 3, 3, 4]\nk = remove_duplicates(a)\nassert k == 5 and a[:k] == [0, 1, 2, 3, 4]\nb = []\nassert remove_duplicates(b) == 0\nc = [7]\nassert remove_duplicates(c) == 1 and c[:1] == [7]\nd = [2, 2, 2]\nassert remove_duplicates(d) == 1 and d[0] == 2\n",
  "solution": "def three_sum(nums):\n    nums = sorted(nums)\n    n = len(nums)\n    out = []\n    for i in range(n - 2):\n        if i > 0 and nums[i] == nums[i - 1]:\n            continue\n        l, r = i + 1, n - 1\n        while l < r:\n            s = nums[i] + nums[l] + nums[r]\n            if s < 0:\n                l += 1\n            elif s > 0:\n                r -= 1\n            else:\n                out.append([nums[i], nums[l], nums[r]])\n                l += 1\n                r -= 1\n                while l < r and nums[l] == nums[l - 1]:\n                    l += 1\n                while l < r and nums[r] == nums[r + 1]:\n                    r -= 1\n    return out\n\ndef max_area(heights):\n    l, r = 0, len(heights) - 1\n    best = 0\n    while l < r:\n        best = max(best, min(heights[l], heights[r]) * (r - l))\n        if heights[l] < heights[r]:\n            l += 1\n        else:\n            r -= 1\n    return best\n\ndef remove_duplicates(nums):\n    if not nums:\n        return 0\n    w = 1\n    for r in range(1, len(nums)):\n        if nums[r] != nums[w - 1]:\n            nums[w] = nums[r]\n            w += 1\n    return w",
  "hints": [
    "3Sum: sort, loop i, then run l/r inward; after a hit, move both pointers and skip equal neighbors.",
    "Container: always move the pointer at the shorter wall.",
    "remove_duplicates: the write index w points at the next free slot; copy nums[r] only when it differs from the last kept value."
  ]
}
```

> [!TIP] Interview tips
> - State the invariant: why moving a pointer can never skip the optimal answer. That is the proof interviewers listen for.
> - If the array is unsorted and you must return original indices (Two Sum), use a hash map instead; sorting loses indices.
> - Pitfall: infinite loops or crossing pointers; decide `l < r` vs `l <= r` carefully.
> - For 3Sum, sort, skip duplicate values of the fixed element and of both pointers after finding a match.
