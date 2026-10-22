---
id: dsa-recursion-and-backtracking
title: Recursion & Backtracking
estimatedMinutes: 15
difficulty: hard
tags: [dsa, recursion, backtracking, combinatorics]
---

## Why it matters
"Generate all subsets / permutations / valid combinations" and "place N queens" are the standard backtracking questions. They test whether you can frame a search as choose, explore, un-choose, prune early, and reason about the exponential cost.

## Concept
**Recursion** solves a problem by reducing it to smaller copies: a **base case** that stops, plus a **recursive step** that makes progress toward it. Cost = (number of calls) $\times$ (work per call); the call stack uses $O(\text{depth})$ space.

**Backtracking** = DFS over a **decision tree** of partial solutions. Template:

```python
def backtrack(state, choices):
    if is_complete(state):
        record(state); return
    for c in choices:
        if not valid(state, c):   # prune early
            continue
        apply(state, c)           # choose
        backtrack(state, next_choices)  # explore
        undo(state, c)            # un-choose
```

**Standard problems and sizes**
| Problem | Leaves / output size | Time |
|---|---|---|
| Subsets of $n$ items | $2^n$ | $O(n \cdot 2^n)$ |
| Permutations of $n$ items | $n!$ | $O(n \cdot n!)$ |
| Combination sum (reuse allowed) | depends on target | exponential, pruned |
| N-Queens | $\le n!$, pruned heavily | far fewer nodes |

**Avoiding duplicates**: sort the input, then skip a value equal to the previous one at the same recursion level (`i > start and a[i] == a[i-1]`). To allow reuse of an element recurse with `i`; to forbid it recurse with `i + 1`.

**Pruning**: stop when the partial sum exceeds the target (sort first so you can `break`), track used columns/diagonals in sets for N-Queens (an $O(1)$ attack check; diagonals are `r - c` and `r + c`).

**Gotchas**: append a **copy** of the current path (`path[:]`), not the list itself; mutating shared state requires undoing it; recursion depth is limited (~1000 in Python). **Memoize** if the same subproblem repeats; that turns backtracking into dynamic programming.

## Worked example
`combination_sum([2, 3, 6, 7], 7)` (each number reusable). Sorted candidates, `start` = smallest index allowed, remaining target in brackets:
1. Choose 2 (remaining 5), choose 2 again (remaining 3), choose 2 again: remaining 1, and every candidate is larger, so prune; back up.
2. At remaining 3 choose 3: remaining 0, record `[2, 2, 3]`. Choosing 6 or 7 overshoots, so prune (and break, since the list is sorted).
3. Back at remaining 5 (path `[2]`), choose 3: remaining 2; no candidate from index 1 up is $\le 2$, dead end. Choose 6, 7: overshoot.
4. Path `[]`: choose 3 (remaining 4): then 3 gives remaining 1, dead end; 6 overshoots. Choose 6: remaining 1, dead end. Choose 7: remaining 0, record `[7]`.

Result `[[2, 2, 3], [7]]`. Subsets of `[1, 2, 3]` follow the same tree and yield $2^3 = 8$ sets; N-Queens for $n = 4$ finds **2** solutions after pruning, and $n = 6$ has 4, $n = 8$ has 92.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "How many subsets does a set of n distinct elements have, and what is the time to list all of them?",
  "options": [
    "n!, O(n * n!)",
    "2^n, O(n * 2^n)",
    "n^2, O(n^2)",
    "2^n, O(2^n) regardless of copying"
  ],
  "answer": 1,
  "explanation": "Each element is in or out: $2^n$ subsets. Copying each path of length up to $n$ adds the factor $n$."
}
```

```quiz
{
  "id": "q2",
  "question": "In backtracking, why do you append `path[:]` (a copy) instead of `path` to the result?",
  "options": [
    "It is faster",
    "To keep the result sorted",
    "The same list is mutated by later undo steps, so all recorded answers would end up identical/empty",
    "Python forbids appending lists"
  ],
  "answer": 2,
  "explanation": "`path` is one shared mutable list that keeps being modified while exploring; recording it directly stores a reference that ends up empty or wrong."
}
```

## Practice

```python-exercise
{"id": "ex1", "prompt": "Implement (1) `subsets(nums)`: all subsets of distinct integers (any order), (2) `permutations(nums)`: all orderings of distinct integers, (3) `combination_sum(candidates, target)`: all unique combinations of distinct positive integers summing to `target`, each number reusable, and (4) `n_queens_count(n)`: the number of ways to place `n` non-attacking queens on an `n x n` board. Return lists of lists for 1-3 (tests sort them).", "starterCode": "def subsets(nums):\n    pass\n\ndef permutations(nums):\n    pass\n\ndef combination_sum(candidates, target):\n    pass\n\ndef n_queens_count(n):\n    pass\n\nprint(sorted(subsets([1, 2, 3])))\nprint(combination_sum([2, 3, 6, 7], 7))\nprint(n_queens_count(4))", "tests": "from itertools import permutations as iperm, combinations\ndef norm(x):\n    return sorted(sorted(s) for s in x)\nassert subsets([]) == [[]]\nassert norm(subsets([1])) == [[], [1]]\ns = subsets([1, 2, 3])\nassert len(s) == 8 and norm(s) == norm([list(c) for k in range(4) for c in combinations([1, 2, 3], k)])\nassert len(subsets(list(range(8)))) == 256\nassert permutations([]) == [[]]\nassert permutations([1]) == [[1]]\nassert sorted(permutations([1, 2, 3])) == sorted(list(p) for p in iperm([1, 2, 3]))\nassert len(permutations([1, 2, 3, 4, 5])) == 120\nassert combination_sum([2, 3, 6, 7], 7) == [[2, 2, 3], [7]] or norm(combination_sum([2, 3, 6, 7], 7)) == [[2, 2, 3], [7]]\nassert norm(combination_sum([2, 3, 5], 8)) == [[2, 2, 2, 2], [2, 3, 3], [3, 5]]\nassert combination_sum([2], 1) == []\nassert combination_sum([], 5) == []\nassert combination_sum([1], 3) == [[1, 1, 1]]\nassert combination_sum([7, 3, 2], 7) != [] and norm(combination_sum([7, 3, 2], 7)) == [[2, 2, 3], [7]]\nassert combination_sum([5], 0) == [[]]\nassert [n_queens_count(n) for n in range(1, 9)] == [1, 0, 0, 2, 10, 4, 40, 92]\nassert n_queens_count(0) == 1", "solution": "def subsets(nums):\n    res = []\n    path = []\n    def bt(start):\n        res.append(path[:])\n        for i in range(start, len(nums)):\n            path.append(nums[i])\n            bt(i + 1)\n            path.pop()\n    bt(0)\n    return res\n\ndef permutations(nums):\n    res, path = [], []\n    used = [False] * len(nums)\n    def bt():\n        if len(path) == len(nums):\n            res.append(path[:])\n            return\n        for i in range(len(nums)):\n            if used[i]:\n                continue\n            used[i] = True\n            path.append(nums[i])\n            bt()\n            path.pop()\n            used[i] = False\n    bt()\n    return res\n\ndef combination_sum(candidates, target):\n    cands = sorted(candidates)\n    res, path = [], []\n    def bt(start, remaining):\n        if remaining == 0:\n            res.append(path[:])\n            return\n        for i in range(start, len(cands)):\n            if cands[i] > remaining:\n                break\n            path.append(cands[i])\n            bt(i, remaining - cands[i])\n            path.pop()\n    bt(0, target)\n    return res\n\ndef n_queens_count(n):\n    cols, d1, d2 = set(), set(), set()\n    def bt(r):\n        if r == n:\n            return 1\n        total = 0\n        for c in range(n):\n            if c in cols or (r - c) in d1 or (r + c) in d2:\n                continue\n            cols.add(c); d1.add(r - c); d2.add(r + c)\n            total += bt(r + 1)\n            cols.remove(c); d1.remove(r - c); d2.remove(r + c)\n        return total\n    return bt(0)", "hints": ["Subsets: at each index choose to include or skip, or loop from `start` and record at every node.", "Permutations: loop over unused elements with a `used` boolean list; record when the path length equals `n`.", "Combination sum: sort, recurse with `start = i` (reuse) and `break` once the candidate exceeds the remaining target.", "N-Queens: place one queen per row and keep sets of used columns, `r - c` and `r + c`."]}
```

> [!TIP] Interview tips
> - Narrate the template: choose, explore, un-choose; say what the decision tree looks like and how big it is ($2^n$, $n!$).
> - Prune early and say how; mention sorting to skip duplicates and to `break` loops.
> - Always copy the path when recording and undo every mutation; most bugs live there.
> - If subproblems repeat (e.g. count ways, not list them), add memoization and call it dynamic programming.
