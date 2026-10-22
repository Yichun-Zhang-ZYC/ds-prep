---
id: dsa-greedy-algorithms
title: "Greedy algorithms"
estimatedMinutes: 13
difficulty: medium
tags: [dsa, greedy, proof, jump-game]
---

## Why it matters
Greedy solutions are short and fast ($O(n)$ or $O(n \log n)$), but easy to get wrong: a plausible rule that fails on one counterexample. Interviewers use greedy problems to see whether you can justify a local choice, not just code it. Intervals and heaps (see those lessons) are common greedy settings; this lesson covers the argument and the array-style classics.

## Concept
A **greedy algorithm** builds a solution by repeatedly taking the locally best choice and never reconsidering. It is correct only when the problem has two properties:
- **Greedy-choice property**: some optimal solution contains the greedy first choice.
- **Optimal substructure**: after that choice, the remainder is the same kind of problem.

**How to justify it (say this aloud)**
- **Exchange argument**: take any optimal solution; swap its first choice for the greedy one without making it worse. Example: in interval scheduling, picking the earliest-finishing interval leaves at least as much room as any other first pick.
- **Stays-ahead argument**: show the greedy partial solution is never behind any other solution after $k$ steps (jump game: the greedy farthest reach is at least any other path's reach).
- **Counterexample hunt**: before committing, try coin change with coins `{1, 3, 4}` and amount 6. Greedy gives $4+1+1$ (3 coins) but optimal is $3+3$ (2 coins), so that problem needs DP. Greedy is fine for US coins `{1, 5, 10, 25}` only because of their structure.

**Greedy vs DP.** If a choice can be undone later or choices interact in non-local ways (0/1 knapsack), use DP. Fractional knapsack is greedy by value/weight ratio.

**Classic patterns**
- **Reach/farthest tracking**: Jump Game ($O(n)$), Jump Game II (count BFS "levels" of reach).
- **Running balance with reset**: Gas Station; if the tank goes negative at $i$, no start in the failed segment works, so restart at $i+1$.
- **Last occurrence**: Partition Labels (extend the current cut to the last index of each seen letter).
- **Sort then sweep**: interval scheduling, assign cookies, merge, task scheduler; sorting is usually the dominant cost.
- **Heap-assisted greedy**: always take the cheapest/largest available (Huffman, meeting rooms).

**Pitfall.** Greedy "works on the examples" is not a proof. Always try small adversarial cases and ties.

## Worked example
**Gas Station**: `gas = [1,2,3,4,5]`, `cost = [3,4,5,1,2]`, circular route; find the start index that completes the loop (or -1).

Net gain per station `gas - cost` = `[-2, -2, -2, 3, 3]`, total $= 0 \ge 0$, so a solution exists. Sweep with a tank, restarting when it goes negative:

```text
start=0  i=0 tank=-2  <0 -> restart start=1, tank=0
start=1  i=1 tank=-2  <0 -> restart start=2, tank=0
start=2  i=2 tank=-2  <0 -> restart start=3, tank=0
start=3  i=3 tank=3   i=4 tank=6   end of array
```

Answer **3**. Why restarting at $i+1$ is safe: if starting at $s$ first fails at $i$, any start $s' \in (s, i]$ reaches $s'$ with a non-negative tank from $s$, so it would arrive at $i$ with even less, and also fail. Total work is one $O(n)$ pass instead of $O(n^2)$ trying each start.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Coins {1, 3, 4}, amount 6. What does the greedy 'largest coin first' rule return, and what is optimal?",
  "options": [
    "2 coins (3+3), optimal is 2",
    "3 coins (4+1+1), optimal is 2 coins (3+3)",
    "3 coins, optimal is 3",
    "It fails to find any answer"
  ],
  "answer": 1,
  "explanation": "Greedy takes 4 then 1 + 1 = 3 coins, but 3 + 3 uses only 2. Coin change with arbitrary denominations needs DP."
}
```

```quiz
{
  "id": "q2",
  "question": "Which is the strongest justification for a greedy algorithm in an interview?",
  "options": [
    "It passes the sample cases",
    "It is faster than DP",
    "An exchange (or stays-ahead) argument shows an optimal solution can use the greedy choice",
    "Sorting the input first"
  ],
  "answer": 2,
  "explanation": "Passing examples is not a proof. An exchange argument shows swapping any optimal solution's first choice for the greedy one does not make it worse."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement (1) `can_jump(nums)`: you start at index 0 and `nums[i]` is the max jump length from `i`; return whether you can reach the last index. (2) `min_jumps(nums)`: minimum number of jumps to reach the last index (assume reachable; 0 for a single element). (3) `can_complete_circuit(gas, cost)`: starting index of the unique solution to the gas station problem, or -1. (4) `partition_labels(s)`: split `s` into as many parts as possible so each letter appears in at most one part; return the part sizes.",
  "starterCode": "def can_jump(nums):\n    pass\n\ndef min_jumps(nums):\n    pass\n\ndef can_complete_circuit(gas, cost):\n    pass\n\ndef partition_labels(s):\n    pass\n\nprint(can_jump([2, 3, 1, 1, 4]), min_jumps([2, 3, 1, 1, 4]), can_complete_circuit([1, 2, 3, 4, 5], [3, 4, 5, 1, 2]))",
  "tests": "assert can_jump([2, 3, 1, 1, 4]) is True\nassert can_jump([3, 2, 1, 0, 4]) is False\nassert can_jump([0]) is True\nassert can_jump([0, 1]) is False\nassert can_jump([1, 0, 0]) is False\nassert can_jump([5, 0, 0, 0, 0, 0]) is True\nassert min_jumps([2, 3, 1, 1, 4]) == 2\nassert min_jumps([0]) == 0\nassert min_jumps([1, 1, 1, 1]) == 3\nassert min_jumps([2, 3, 0, 1, 4]) == 2\nassert min_jumps([10, 1, 1, 1]) == 1\nassert min_jumps([1, 2]) == 1\nassert can_complete_circuit([1, 2, 3, 4, 5], [3, 4, 5, 1, 2]) == 3\nassert can_complete_circuit([2, 3, 4], [3, 4, 3]) == -1\nassert can_complete_circuit([5], [4]) == 0\nassert can_complete_circuit([5], [6]) == -1\nassert can_complete_circuit([3, 1, 1], [1, 2, 2]) == 0\nassert can_complete_circuit([1, 1, 5], [2, 2, 1]) == 2\nassert partition_labels(\"ababcbacadefegdehijhklij\") == [9, 7, 8]\nassert partition_labels(\"\") == []\nassert partition_labels(\"a\") == [1]\nassert partition_labels(\"abc\") == [1, 1, 1]\nassert partition_labels(\"aaaa\") == [4]\nassert partition_labels(\"abca\") == [4]\nassert partition_labels(\"eccbbbbdec\") == [10]\n",
  "solution": "def can_jump(nums):\n    farthest = 0\n    for i, v in enumerate(nums):\n        if i > farthest:\n            return False\n        farthest = max(farthest, i + v)\n    return True\n\ndef min_jumps(nums):\n    jumps = 0\n    cur_end = 0\n    farthest = 0\n    for i in range(len(nums) - 1):\n        farthest = max(farthest, i + nums[i])\n        if i == cur_end:\n            jumps += 1\n            cur_end = farthest\n    return jumps\n\ndef can_complete_circuit(gas, cost):\n    if sum(gas) < sum(cost):\n        return -1\n    start = 0\n    tank = 0\n    for i in range(len(gas)):\n        tank += gas[i] - cost[i]\n        if tank < 0:\n            start = i + 1\n            tank = 0\n    return start\n\ndef partition_labels(s):\n    last = {ch: i for i, ch in enumerate(s)}\n    out = []\n    start = end = 0\n    for i, ch in enumerate(s):\n        end = max(end, last[ch])\n        if i == end:\n            out.append(end - start + 1)\n            start = i + 1\n    return out",
  "hints": [
    "can_jump: track `farthest`; if `i > farthest` you are stuck.",
    "min_jumps: keep `cur_end` (reach of the current jump) and `farthest`; when `i == cur_end`, take a jump and set `cur_end = farthest`. Stop the loop before the last index.",
    "Gas station: if `sum(gas) < sum(cost)` return -1; otherwise sweep a tank and reset the start when it goes negative.",
    "partition_labels: precompute `last[ch]`; extend `end = max(end, last[ch])` and cut when `i == end`."
  ]
}
```


> [!TIP] Interview tips
> - Always give the exchange or stays-ahead argument in one or two sentences; that is what is being graded.
> - Offer a counterexample for the tempting-but-wrong greedy (coin change {1,3,4}) to show you know when greedy fails.
> - If greedy needs sorting, state the $O(n \log n)$ cost and the tie-break rule.
> - When unsure greedy is valid, say you would brute-force small inputs to compare against it.
