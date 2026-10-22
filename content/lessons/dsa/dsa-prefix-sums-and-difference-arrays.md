---
id: dsa-prefix-sums-and-difference-arrays
title: "Prefix sums and difference arrays"
estimatedMinutes: 12
difficulty: medium
tags: [dsa, prefix-sum, difference-array, hash-map]
---

## Why it matters
Prefix sums answer "sum of any range" in $O(1)$ after $O(n)$ preprocessing, and combined with a hash map they solve "count subarrays with sum $k$" in one pass. Difference arrays are the inverse: they apply many range updates in $O(1)$ each. Together they replace nested loops in a large share of array questions. The basic prefix idea is introduced in Arrays and strings; here we extend it.

## Concept
**Prefix sums.** Let $P_0 = 0$ and $P_{i+1} = P_i + a_i$. Then $\sum_{l}^{r} a = P_{r+1} - P_l$ (inclusive $l..r$). Building takes $O(n)$, each query $O(1)$.

**Prefix sum + hash map (subarray sum equals $k$).** A subarray $(l, r]$ sums to $k$ exactly when $P_r - P_l = k$. Scan left to right keeping a map `count[prefix]`; at each $r$ add `count[P_r - k]`, then record $P_r$. Seed with `count[0] = 1` for subarrays starting at index 0. $O(n)$ time and space, and it works with negatives (unlike sliding window).

Variants: sum divisible by $k$ (key = `P % k`), equal 0s and 1s (map 0 to $-1$, find sum 0), longest subarray with sum $k$ (store the **first** index of each prefix).

**2D prefix sums.** $P[i+1][j+1] = a[i][j] + P[i][j+1] + P[i+1][j] - P[i][j]$. Rectangle $(r_1,c_1)..(r_2,c_2)$ inclusive:
$$S = P[r_2+1][c_2+1] - P[r_1][c_2+1] - P[r_2+1][c_1] + P[r_1][c_1]$$
(inclusion-exclusion).

**Difference arrays.** To add $v$ to every element of $[l, r]$: `d[l] += v` and `d[r+1] -= v`. After all updates, the prefix sum of `d` gives the final array. Each update is $O(1)$, finalization $O(n)$; total $O(n + q)$ versus $O(nq)$ naive. Used in flight bookings, car pooling, and sweep-line event counting.

**Relationship.** Prefix sum and difference are inverse operations: differencing an array and then prefix-summing returns the original.

**Pitfalls.** Off-by-one between `P` of length $n+1$ and `a` of length $n$. Forgetting `count[0] = 1`. Using sliding window when negatives are present. Offline only: a prefix array does not support point updates (use a Fenwick tree for that).

## Worked example
**Subarray sum equals k**, `nums = [3, 4, 7, 2, -3, 1, 4, 2]`, `k = 7`. Prefix sums $P$ = `[0, 3, 7, 14, 16, 13, 14, 18, 20]`. At each step add `count[P - 7]` before recording $P$.

```text
P    need(P-7)  count[need]  total   subarray found
3    -4         0            0
7    0          1            1       [3,4]
14   7          1            2       [7]
16   9          0            2
13   6          0            2
14   7          1            3       [7,2,-3,1]
18   11         0            3
20   13         1            4       [1,4,2]
```

Answer **4** in one pass (the seed `count[0]=1` produced `[3,4]`).

**Difference array**, $n=5$ zeros, updates `(1,3,+2)`, `(2,4,+3)`, `(0,1,-1)`: `d = [-1, 2, 4, 0, -2, -3]`, prefix sums give `[-1, 1, 5, 5, 3]`.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You need the number of subarrays with sum exactly k, and the array has negative numbers. Which approach is correct in O(n)?",
  "options": [
    "Sliding window with shrinking",
    "Prefix sums with a hash map of counts",
    "Sort then two pointers",
    "Binary search on the answer"
  ],
  "answer": 1,
  "explanation": "Sliding window needs non-negative values to be monotonic. The prefix-sum + hash map approach makes no such assumption."
}
```

```quiz
{
  "id": "q2",
  "question": "To add v to all elements in a[l..r] with a difference array d (length n+1), you do:",
  "options": [
    "d[l] += v; d[r] -= v",
    "d[l] += v; d[r+1] -= v",
    "d[l..r] += v",
    "d[r+1] += v; d[l] -= v"
  ],
  "answer": 1,
  "explanation": "After taking prefix sums of d, +v starts at l and the -v at r+1 cancels it exactly after index r."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement (1) class `RangeSum(nums)` with `sum_range(l, r)` (inclusive). (2) `subarray_sum_k(nums, k)`: number of contiguous subarrays summing to `k`. (3) `apply_updates(n, updates)`: start from `n` zeros; each update `(l, r, v)` adds `v` to indices `l..r` inclusive; return the final list using a difference array. (4) class `Matrix2D(grid)` with `region_sum(r1, c1, r2, c2)` inclusive. Handle empty inputs gracefully where it makes sense.",
  "starterCode": "class RangeSum:\n    def __init__(self, nums):\n        pass\n\n    def sum_range(self, l, r):\n        pass\n\ndef subarray_sum_k(nums, k):\n    pass\n\ndef apply_updates(n, updates):\n    pass\n\nclass Matrix2D:\n    def __init__(self, grid):\n        pass\n\n    def region_sum(self, r1, c1, r2, c2):\n        pass\n\nprint(subarray_sum_k([3, 4, 7, 2, -3, 1, 4, 2], 7), apply_updates(5, [(1, 3, 2), (2, 4, 3), (0, 1, -1)]))",
  "tests": "rs = RangeSum([-2, 0, 3, -5, 2, -1])\nassert rs.sum_range(0, 2) == 1 and rs.sum_range(2, 5) == -1 and rs.sum_range(0, 5) == -3\nassert rs.sum_range(3, 3) == -5\nassert RangeSum([]).P == [0]\nassert subarray_sum_k([3, 4, 7, 2, -3, 1, 4, 2], 7) == 4\nassert subarray_sum_k([1, 1, 1], 2) == 2\nassert subarray_sum_k([], 0) == 0\nassert subarray_sum_k([0, 0, 0], 0) == 6\nassert subarray_sum_k([1, -1, 0], 0) == 3\nassert subarray_sum_k([5], 5) == 1\nassert subarray_sum_k([5], 4) == 0\nassert subarray_sum_k([-1, -1, 1], 0) == 1\nassert apply_updates(5, [(1, 3, 2), (2, 4, 3), (0, 1, -1)]) == [-1, 1, 5, 5, 3]\nassert apply_updates(3, []) == [0, 0, 0]\nassert apply_updates(0, []) == []\nassert apply_updates(4, [(0, 3, 1), (3, 3, 5)]) == [1, 1, 1, 6]\ng = [[3, 0, 1, 4, 2], [5, 6, 3, 2, 1], [1, 2, 0, 1, 5], [4, 1, 0, 1, 7], [1, 0, 3, 0, 5]]\nm = Matrix2D(g)\nassert m.region_sum(2, 1, 4, 3) == 8\nassert m.region_sum(1, 1, 2, 2) == 11\nassert m.region_sum(1, 2, 2, 4) == 12\nassert m.region_sum(0, 0, 4, 4) == sum(map(sum, g))\nassert m.region_sum(3, 3, 3, 3) == 1\nassert Matrix2D([[7]]).region_sum(0, 0, 0, 0) == 7\nMatrix2D([])\n",
  "solution": "class RangeSum:\n    def __init__(self, nums):\n        self.P = [0]\n        for v in nums:\n            self.P.append(self.P[-1] + v)\n\n    def sum_range(self, l, r):\n        return self.P[r + 1] - self.P[l]\n\ndef subarray_sum_k(nums, k):\n    counts = {0: 1}\n    s = 0\n    res = 0\n    for v in nums:\n        s += v\n        res += counts.get(s - k, 0)\n        counts[s] = counts.get(s, 0) + 1\n    return res\n\ndef apply_updates(n, updates):\n    d = [0] * (n + 1)\n    for l, r, v in updates:\n        d[l] += v\n        d[r + 1] -= v\n    out = []\n    run = 0\n    for i in range(n):\n        run += d[i]\n        out.append(run)\n    return out\n\nclass Matrix2D:\n    def __init__(self, grid):\n        R = len(grid)\n        C = len(grid[0]) if R else 0\n        self.P = [[0] * (C + 1) for _ in range(R + 1)]\n        for i in range(R):\n            for j in range(C):\n                self.P[i + 1][j + 1] = grid[i][j] + self.P[i][j + 1] + self.P[i + 1][j] - self.P[i][j]\n\n    def region_sum(self, r1, c1, r2, c2):\n        P = self.P\n        return P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1]",
  "hints": [
    "Build `P` with a leading 0 so `sum_range(l, r) = P[r+1] - P[l]`.",
    "subarray_sum_k: `counts = {0: 1}`; running prefix `s`; `res += counts.get(s - k, 0)`; then `counts[s] += 1`.",
    "apply_updates: allocate `n + 1` slots so `r + 1` is always valid; prefix-sum and drop the last.",
    "2D: build an `(R+1) x (C+1)` table, then use the inclusion-exclusion formula."
  ]
}
```


> [!TIP] Interview tips
> - Say "prefix sum + hash map" the moment you see "count subarrays with sum k" and negatives allowed.
> - Define `P[0] = 0` explicitly and state whether ranges are inclusive; most bugs are off-by-one.
> - Mention the trade-off: static data only; for updates between queries use a Fenwick/segment tree.
> - Difference arrays are the answer to "many range updates, one read at the end".
