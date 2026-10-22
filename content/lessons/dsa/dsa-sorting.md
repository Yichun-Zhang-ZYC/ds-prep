---
id: dsa-sorting
title: Sorting (quick sort, merge sort)
estimatedMinutes: 15
difficulty: medium
tags: [dsa, sorting, divide-and-conquer, quickselect]
---

## Why it matters
Sorting is the building block behind half of all interview problems (intervals, two pointers, binary search, top-k). Interviewers expect you to implement merge sort and quicksort from memory, state their complexity, and explain stability and worst cases.

## Concept
**Comparison sorts** cannot beat $\Omega(n \log n)$ in the worst case (a decision tree with $n!$ leaves has height $\log_2 n! = \Theta(n \log n)$).

**Merge sort** (divide and conquer): split in half, sort each half recursively, merge two sorted halves with two pointers.
- Time $O(n \log n)$ in every case; space $O(n)$ for the merge buffer; **stable** (take from the left half on ties).
- The merge step also counts **inversions** (pairs $i<j$ with $a_i > a_j$): when you take from the right half, all remaining left elements form inversions with it.

**Quicksort**: pick a pivot, partition into `< pivot` and `>= pivot`, recurse on both sides.
- Average $O(n \log n)$, worst $O(n^2)$ (already sorted input with a first/last pivot). Random or median-of-three pivots make the worst case very unlikely.
- In place, $O(\log n)$ expected stack space; **not stable**. Use three-way partitioning when there are many duplicates.

**Quickselect** (kth smallest): partition once, recurse only into the side containing index $k$. Average $O(n)$, worst $O(n^2)$.

**Others**: heapsort is $O(n \log n)$ in place, not stable. Counting/radix sort is $O(n + k)$ for small integer keys. Python's `sorted` is **Timsort**: stable, $O(n \log n)$ worst case, $O(n)$ on nearly sorted data.

**Stable** means equal keys keep their original order, which matters for multi-key sorts (sort by name, then stable sort by department).

## Worked example
Merge sort on `[5, 2, 4, 7, 1, 3, 2, 6]`:
1. Split into `[5,2,4,7]` and `[1,3,2,6]`, then recursively sort each: `[2,4,5,7]` and `[1,2,3,6]`.
2. Merge with pointers `i` (left) and `j` (right). Compare 2 vs 1: take 1. Compare 2 vs 2: tie, take the **left** 2 (stability). Then the right 2, then 3, 4, 5, 6, 7.
3. Result `[1,2,2,3,4,5,6,7]`, about $8 \log_2 8 = 24$ basic steps.

Inversions of the original array: 5 contributes 5 (vs 2,4,1,3,2), 2 contributes 1, 4 contributes 3, 7 contributes 4, 3 contributes 1, for a total of **14**. The final merge counts the cross-half ones: taking 1 adds 4 (all of 2,4,5,7 remain), taking the right 2 adds 3 (4,5,7), taking 3 adds 3, taking 6 adds 1, giving 11. The recursive calls on the halves found $2 + 1 = 3$ more, and $11 + 3 = 14$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which statement about quicksort is correct?",
  "options": [
    "It is stable and O(n log n) worst case",
    "It is in place, O(n log n) on average and O(n^2) in the worst case",
    "It needs O(n) extra space like merge sort",
    "It is always faster than merge sort"
  ],
  "answer": 1,
  "explanation": "Quicksort partitions in place, averages $O(n \\log n)$, and degrades to $O(n^2)$ with consistently bad pivots. It is not stable."
}
```

```quiz
{
  "id": "q2",
  "question": "You need the kth largest of n numbers once, with no need for the full order. Best average-case approach?",
  "options": [
    "Sort, then index: O(n log n)",
    "Heapsort",
    "Quickselect: O(n) average",
    "Merge sort then binary search"
  ],
  "answer": 2,
  "explanation": "Quickselect recurses into one side only, so the expected work is $n + n/2 + n/4 + \\dots = O(n)$."
}
```

## Practice

```python-exercise
{"id": "ex1", "prompt": "Implement (1) `merge_sort(a)` returning a new sorted list (stable, do not mutate the input), (2) `count_inversions(a)` returning the number of pairs `i < j` with `a[i] > a[j]` in $O(n \\log n)$, and (3) `quickselect(a, k)` returning the kth smallest element (0-indexed) in expected $O(n)$ without mutating `a`. Raise `IndexError` if `k` is out of range.", "starterCode": "def merge_sort(a):\n    pass\n\ndef count_inversions(a):\n    pass\n\ndef quickselect(a, k):\n    pass\n\nprint(merge_sort([5, 2, 4, 7, 1, 3, 2, 6]))\nprint(count_inversions([5, 2, 4, 7, 1, 3, 2, 6]))\nprint(quickselect([5, 2, 4, 7, 1, 3, 2, 6], 3))", "tests": "import random\nrng = random.Random(0)\nassert merge_sort([]) == []\nassert merge_sort([1]) == [1]\nassert merge_sort([5, 2, 4, 7, 1, 3, 2, 6]) == [1, 2, 2, 3, 4, 5, 6, 7]\nassert merge_sort([3, 3, 3]) == [3, 3, 3]\norig = [3, 1, 2]\nmerge_sort(orig)\nassert orig == [3, 1, 2]\nfor _ in range(50):\n    arr = [rng.randint(-20, 20) for _ in range(rng.randint(0, 40))]\n    snap = list(arr)\n    assert merge_sort(arr) == sorted(arr)\n    brute = sum(1 for i in range(len(arr)) for j in range(i + 1, len(arr)) if arr[i] > arr[j])\n    assert count_inversions(arr) == brute\n    if arr:\n        k = rng.randrange(len(arr))\n        assert quickselect(arr, k) == sorted(arr)[k]\n    assert arr == snap\nassert count_inversions([]) == 0\nassert count_inversions([1, 2, 3]) == 0\nassert count_inversions([3, 2, 1]) == 3\nassert count_inversions([2, 2, 2]) == 0\nassert count_inversions([5, 2, 4, 7, 1, 3, 2, 6]) == 14\ndata = [5, 2, 4, 7, 1, 3, 2, 6]\nassert quickselect(data, 0) == 1 and quickselect(data, 7) == 7 and quickselect(data, 3) == 3\nassert data == [5, 2, 4, 7, 1, 3, 2, 6]\nassert quickselect([4, 4, 4, 4], 2) == 4\nfor bad in (-1, 8):\n    try:\n        quickselect(data, bad)\n        assert False\n    except IndexError:\n        pass\ntry:\n    quickselect([], 0)\n    assert False\nexcept IndexError:\n    pass", "solution": "def merge_sort(a):\n    if len(a) <= 1:\n        return list(a)\n    mid = len(a) // 2\n    left, right = merge_sort(a[:mid]), merge_sort(a[mid:])\n    out, i, j = [], 0, 0\n    while i < len(left) and j < len(right):\n        if left[i] <= right[j]:\n            out.append(left[i]); i += 1\n        else:\n            out.append(right[j]); j += 1\n    out.extend(left[i:])\n    out.extend(right[j:])\n    return out\n\ndef count_inversions(a):\n    def rec(x):\n        if len(x) <= 1:\n            return list(x), 0\n        mid = len(x) // 2\n        left, cl = rec(x[:mid])\n        right, cr = rec(x[mid:])\n        out, i, j, cnt = [], 0, 0, cl + cr\n        while i < len(left) and j < len(right):\n            if left[i] <= right[j]:\n                out.append(left[i]); i += 1\n            else:\n                out.append(right[j]); j += 1\n                cnt += len(left) - i\n        out.extend(left[i:])\n        out.extend(right[j:])\n        return out, cnt\n    return rec(a)[1]\n\ndef quickselect(a, k):\n    if not 0 <= k < len(a):\n        raise IndexError('k out of range')\n    cur = list(a)\n    while True:\n        pivot = cur[len(cur) // 2]\n        less = [x for x in cur if x < pivot]\n        equal = [x for x in cur if x == pivot]\n        if k < len(less):\n            cur = less\n        elif k < len(less) + len(equal):\n            return pivot\n        else:\n            k -= len(less) + len(equal)\n            cur = [x for x in cur if x > pivot]", "hints": ["In the merge, use `<=` when comparing left vs right so ties come from the left (stable).", "Counting inversions: when you take `right[j]`, add `len(left) - i`.", "Quickselect: partition into less / equal / greater lists; if k falls in the equal block, return the pivot."]}
```

> [!TIP] Interview tips
> - State the complexities, space cost and stability up front; mention the $\Omega(n \log n)$ comparison lower bound.
> - Quicksort pitfalls: sorted input with a naive pivot is $O(n^2)$; fix with a random pivot, and use three-way partitioning for duplicates.
> - In practice say "I would call `sorted` / `sort` (Timsort)" unless asked to implement it, and know the `key=` trick for multi-key sorting.
> - Quickselect or a size-k heap answers "kth largest" faster than a full sort.
