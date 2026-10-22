---
id: dsa-dynamic-programming
title: Dynamic Programming
estimatedMinutes: 15
difficulty: hard
tags: [dsa, dynamic-programming, memoization, optimization]
---

## Why it matters
Dynamic programming (DP) is the make-or-break topic in coding rounds: coin change, longest increasing subsequence, edit distance, knapsack. Interviewers look for a clear state definition, a recurrence, base cases, and the resulting complexity.

## Concept
DP applies when a problem has **optimal substructure** (the best answer is built from best answers to subproblems) and **overlapping subproblems** (the same subproblem recurs, so naive recursion is exponential).

**Recipe**
1. **State**: what do you need to know to describe a subproblem? Define `dp[i]` or `dp[i][j]` in words ("fewest coins to make amount `i`").
2. **Recurrence**: how does a state follow from smaller ones?
3. **Base cases** and **order of evaluation**.
4. **Answer**: which cell is it? **Complexity** = (number of states) $\times$ (work per transition).

**Top-down** (memoized recursion, `functools.lru_cache`): easy to write, computes only the needed states, but recursion depth can be a problem. **Bottom-up** (table): iterative, enables **space optimization** (keep only the last row or the last few values).

**Classic recurrences**
- **Coin change** (min coins): $dp[a] = 1 + \min_{c \le a} dp[a - c]$, $dp[0] = 0$. $O(A \cdot |coins|)$ time, $O(A)$ space.
- **Longest increasing subsequence**: $O(n^2)$ with $dp[i] = 1 + \max_{j<i,\, a_j<a_i} dp[j]$; $O(n \log n)$ by keeping a `tails` array and binary searching (`bisect_left`).
- **Edit distance**: $dp[i][j] = dp[i-1][j-1]$ if $a_i = b_j$, else $1 + \min(dp[i-1][j],\ dp[i][j-1],\ dp[i-1][j-1])$ (delete, insert, replace). $O(mn)$.
- **LCS**: match $\to dp[i-1][j-1] + 1$, else $\max(dp[i-1][j], dp[i][j-1])$.
- **0/1 knapsack**: iterate capacity **downwards** in a 1D table so each item is used once; unbounded knapsack iterates upwards.
- Others: house robber $dp[i] = \max(dp[i-1],\ dp[i-2] + a_i)$, climbing stairs (Fibonacci), grid paths.

**Counting vs optimizing**: replace $\min$ by $+$ to count ways (order of loops matters: coins outer counts combinations, amount outer counts permutations). **Greedy** works only when a local choice is provably safe; for coin change with arbitrary coins it is not.

## Worked example
Fewest coins for amount 11 with coins `[1, 2, 5]`. Fill $dp[0..11]$ with $dp[0] = 0$:

| a | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| dp | 0 | 1 | 1 | 2 | 2 | 1 | 2 | 2 | 3 | 3 | 2 | 3 |

Examples: $dp[3] = 1 + \min(dp[2], dp[1]) = 2$. $dp[8] = 1 + \min(dp[7], dp[6], dp[3]) = 1 + \min(2, 2, 2) = 3$. $dp[11] = 1 + \min(dp[10], dp[9], dp[6]) = 1 + \min(2, 3, 2) = 3$ (5 + 5 + 1). Cost: $12 \times 3$ transitions.

Greedy counterexample: coins `[1, 3, 4]`, amount 6. Greedy takes 4 + 1 + 1 = 3 coins; DP finds 3 + 3 = **2** coins.

Edit distance `"kitten"` to `"sitting"` is 3 (substitute k to s, substitute e to i, insert g).

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which two properties make a problem suitable for dynamic programming?",
  "options": [
    "Optimal substructure and overlapping subproblems",
    "Sorted input and a greedy choice",
    "Graph structure and non-negative weights",
    "Divisible input and independent subproblems"
  ],
  "answer": 1,
  "explanation": "Optimal substructure lets you compose a solution from subsolutions, and overlapping subproblems mean caching them avoids exponential recomputation. Independent subproblems (merge sort) do not need DP."
}
```

```quiz
{
  "id": "q2",
  "question": "In a 1D 0/1 knapsack table, in which direction must you iterate over capacity so each item is used at most once?",
  "options": [
    "From high capacity down to the item weight",
    "From low capacity up",
    "Either; the order does not matter",
    "Randomly"
  ],
  "answer": 0,
  "explanation": "Going downwards means `dp[c - w]` still holds the value from before the current item; going upwards would reuse the same item (unbounded knapsack)."
}
```

## Practice

```python-exercise
{"id": "ex1", "prompt": "Implement (1) `coin_change(coins, amount)`: the fewest coins summing to `amount`, or `-1` if impossible (`amount == 0` gives 0), (2) `edit_distance(a, b)`: minimum insert/delete/replace operations to turn `a` into `b`, and (3) `lis_length(nums)`: the length of the longest strictly increasing subsequence in $O(n \\log n)$.", "starterCode": "def coin_change(coins, amount):\n    pass\n\ndef edit_distance(a, b):\n    pass\n\ndef lis_length(nums):\n    pass\n\nprint(coin_change([1, 2, 5], 11))\nprint(edit_distance(\"kitten\", \"sitting\"))\nprint(lis_length([10, 9, 2, 5, 3, 7, 101, 18]))", "tests": "import random\nassert coin_change([1, 2, 5], 11) == 3\nassert coin_change([2], 3) == -1\nassert coin_change([1], 0) == 0\nassert coin_change([], 0) == 0\nassert coin_change([], 5) == -1\nassert coin_change([1, 3, 4], 6) == 2\nassert coin_change([186, 419, 83, 408], 6249) == 20\nassert coin_change([2, 5, 10, 1], 27) == 4\nassert coin_change([5], 5) == 1\nassert edit_distance(\"\", \"\") == 0\nassert edit_distance(\"abc\", \"\") == 3\nassert edit_distance(\"\", \"abc\") == 3\nassert edit_distance(\"kitten\", \"sitting\") == 3\nassert edit_distance(\"horse\", \"ros\") == 3\nassert edit_distance(\"intention\", \"execution\") == 5\nassert edit_distance(\"same\", \"same\") == 0\nassert edit_distance(\"a\", \"b\") == 1\nassert edit_distance(\"abc\", \"yabd\") == 2\nassert lis_length([]) == 0\nassert lis_length([7]) == 1\nassert lis_length([10, 9, 2, 5, 3, 7, 101, 18]) == 4\nassert lis_length([0, 1, 0, 3, 2, 3]) == 4\nassert lis_length([7, 7, 7, 7]) == 1\nassert lis_length([1, 2, 3, 4, 5]) == 5\nassert lis_length([5, 4, 3, 2, 1]) == 1\nrng = random.Random(3)\nfor _ in range(40):\n    arr = [rng.randint(0, 12) for _ in range(rng.randint(0, 14))]\n    n = len(arr)\n    dp = [1] * n\n    for i in range(n):\n        for j in range(i):\n            if arr[j] < arr[i]:\n                dp[i] = max(dp[i], dp[j] + 1)\n    assert lis_length(arr) == (max(dp) if n else 0)", "solution": "from bisect import bisect_left\n\ndef coin_change(coins, amount):\n    INF = float('inf')\n    dp = [0] + [INF] * amount\n    for a in range(1, amount + 1):\n        for c in coins:\n            if 0 < c <= a and dp[a - c] + 1 < dp[a]:\n                dp[a] = dp[a - c] + 1\n    return dp[amount] if dp[amount] != INF else -1\n\ndef edit_distance(a, b):\n    prev = list(range(len(b) + 1))\n    for i in range(1, len(a) + 1):\n        cur = [i] + [0] * len(b)\n        for j in range(1, len(b) + 1):\n            if a[i - 1] == b[j - 1]:\n                cur[j] = prev[j - 1]\n            else:\n                cur[j] = 1 + min(prev[j], cur[j - 1], prev[j - 1])\n        prev = cur\n    return prev[len(b)]\n\ndef lis_length(nums):\n    tails = []\n    for x in nums:\n        i = bisect_left(tails, x)\n        if i == len(tails):\n            tails.append(x)\n        else:\n            tails[i] = x\n    return len(tails)", "hints": ["coin_change: `dp = [0] + [inf] * amount`; for each `a`, try each coin `c <= a`.", "edit_distance: `dp[i][j]` for prefixes `a[:i]`, `b[:j]`; base `dp[i][0] = i` and `dp[0][j] = j`. You can keep just two rows.", "LIS: maintain `tails`; for each x use `bisect_left(tails, x)` (strict increase) and replace or append."]}
```

> [!TIP] Interview tips
> - Start by naming the state in one sentence, then the recurrence, then base cases; only then code. Say the complexity as states times transitions.
> - Offer the brute-force recursion first, add memoization, then convert to a table and reduce space.
> - Know that greedy fails for general coin change, and that LIS has an $O(n \log n)$ patience-sorting version.
> - Mind loop order and direction (knapsack, counting combinations vs permutations) and base cases such as amount 0 or empty strings.
