---
id: dsa-hash-maps-and-sets
title: "Hash Maps & Sets"
estimatedMinutes: 12
difficulty: easy
tags: [dsa, hash-map, set, prefix-sum]
---

## Why it matters
A hash map turns "have I seen this before?" and "how many of these?" into $O(1)$ lookups, which is why it is the first tool for cutting an $O(n^2)$ brute force down to $O(n)$. It appears in a large share of interview problems.

## Concept
A **hash map** (`dict`) stores key → value pairs; a **hash set** (`set`) stores keys only. Insert, delete and lookup are $O(1)$ **average** and $O(n)$ worst case (many collisions). Keys must be hashable and immutable: ints, strings, tuples yes; lists and dicts no (use `tuple(...)` or `frozenset`).

Recurring patterns:
- **Existence / dedupe**: `if x in seen` before adding. Checking membership in a list is $O(n)$, in a set $O(1)$.
- **Complement lookup**: to find a pair with $a + b = k$, store values seen so far and look for $k - a$ (Two Sum).
- **Frequency counting**: `Counter(s)` for anagrams, majority element, top-k frequent.
- **Grouping by a canonical key**: group anagrams by `tuple(sorted(word))`.
- **Prefix sum + map**: subarray with sum $k$ exists ending at $j$ iff $\text{prefix}_j - k$ was seen as an earlier prefix. Store prefix-sum → count.
- **Index map**: value → last index, for "nearest previous equal" or window problems.

Complexity: usually $O(n)$ time and $O(n)$ extra space; the trade is memory for speed. Python dicts preserve insertion order (3.7+). Use `dict.get(k, 0)`, `defaultdict`, or `Counter` to avoid key errors.

## Worked example
**Subarray sum equals k** with `nums = [1, 2, 3]`, `k = 3`. Keep `count[prefix]` for prefix sums seen so far, starting with `{0: 1}` (empty prefix). At each element, add `count[prefix - k]` to the answer.

```text
x=1: prefix=1, need prefix-k = -2  -> not seen, ans=0.  count={0:1, 1:1}
x=2: prefix=3, need 0              -> seen once, ans=1 ([1,2]). count={0:1, 1:1, 3:1}
x=3: prefix=6, need 3              -> seen once, ans=2 ([3]).   count={0:1, 1:1, 3:1, 6:1}
```

Answer 2, in one pass: $O(n)$ time, $O(n)$ space, versus $O(n^2)$ for checking all subarrays. The initial `{0: 1}` is what lets subarrays that start at index 0 be counted. A sliding window would not work here because the numbers may be negative.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which is NOT a valid Python dict key?",
  "options": [
    "(1, 2)",
    "\"abc\"",
    "[1, 2]",
    "frozenset({1, 2})"
  ],
  "answer": 2,
  "explanation": "Lists are mutable and therefore unhashable. Tuples, strings and frozensets are fine."
}
```

```quiz
{
  "id": "q2",
  "question": "Why does the 'subarray sum equals k' hash-map solution beat a sliding window when the array can contain negative numbers?",
  "options": [
    "Hash maps are always faster",
    "With negatives, extending or shrinking a window does not monotonically change the sum, so windows can't be pruned; prefix sums don't need monotonicity",
    "Sliding windows need O(n^2) space",
    "Prefix sums only work on sorted arrays"
  ],
  "answer": 1,
  "explanation": "Sliding window relies on the sum growing when you extend the window. Negatives break that, but the prefix-sum identity holds for any numbers."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement (1) `two_sum(nums, target)`: return the indices `[i, j]` with `i < j` and `nums[i] + nums[j] == target` (exactly one solution exists; you may not use the same element twice). (2) `subarray_sum(nums, k)`: return the number of contiguous subarrays whose sum equals `k` (values may be negative). (3) `longest_consecutive(nums)`: length of the longest run of consecutive integers (e.g. 1,2,3,4) in $O(n)$.",
  "starterCode": "def two_sum(nums, target):\n    pass\n\ndef subarray_sum(nums, k):\n    pass\n\ndef longest_consecutive(nums):\n    pass\n\nprint(two_sum([2, 7, 11, 15], 9), subarray_sum([1, 2, 3], 3), longest_consecutive([100, 4, 200, 1, 3, 2]))",
  "tests": "assert two_sum([2, 7, 11, 15], 9) == [0, 1]\nassert two_sum([3, 2, 4], 6) == [1, 2]\nassert two_sum([3, 3], 6) == [0, 1]\nassert two_sum([-1, -2, -3, -4, -5], -8) == [2, 4]\nassert two_sum([0, 4, 3, 0], 0) == [0, 3]\nassert subarray_sum([1, 1, 1], 2) == 2\nassert subarray_sum([1, 2, 3], 3) == 2\nassert subarray_sum([1, -1, 0], 0) == 3\nassert subarray_sum([], 0) == 0\nassert subarray_sum([5], 5) == 1\nassert subarray_sum([0, 0, 0], 0) == 6\nassert subarray_sum([-1, -1, 1], 0) == 1\nassert longest_consecutive([100, 4, 200, 1, 3, 2]) == 4\nassert longest_consecutive([0, 3, 7, 2, 5, 8, 4, 6, 0, 1]) == 9\nassert longest_consecutive([]) == 0\nassert longest_consecutive([5]) == 1\nassert longest_consecutive([1, 1, 1]) == 1\nassert longest_consecutive([-2, -1, 0, 10]) == 3\n",
  "solution": "def two_sum(nums, target):\n    seen = {}\n    for j, x in enumerate(nums):\n        if target - x in seen:\n            return [seen[target - x], j]\n        seen[x] = j\n    return []\n\ndef subarray_sum(nums, k):\n    count = {0: 1}\n    prefix = 0\n    ans = 0\n    for x in nums:\n        prefix += x\n        ans += count.get(prefix - k, 0)\n        count[prefix] = count.get(prefix, 0) + 1\n    return ans\n\ndef longest_consecutive(nums):\n    s = set(nums)\n    best = 0\n    for x in s:\n        if x - 1 not in s:\n            y = x\n            while y + 1 in s:\n                y += 1\n            best = max(best, y - x + 1)\n    return best",
  "hints": [
    "Two Sum: before storing nums[j], check whether target - nums[j] is already in the map.",
    "Subarray sum: query count[prefix - k] first, then add the current prefix to the map. Seed with {0: 1}.",
    "Longest consecutive: only start counting from numbers whose predecessor (x - 1) is absent; that makes the total work O(n)."
  ]
}
```

> [!TIP] Interview tips
> - Mention the complexity trade: hash map gives $O(1)$ average lookup for $O(n)$ extra memory.
> - Pitfall: using a list as a dict key (unhashable); convert to a tuple first.
> - Pitfall: for prefix-sum counting, forgetting to seed the map with `{0: 1}` and updating the map before querying it.
> - Follow-up: "what if the data doesn't fit in memory?" Talk about sorting plus two pointers, or partitioning by hash.
