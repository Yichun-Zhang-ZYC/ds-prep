---
id: dsa-complexity
title: "Complexity (Big-O, time & space)"
estimatedMinutes: 10
difficulty: easy
tags: [dsa, big-o, complexity]
---

## Why it matters
Every coding interview ends with "what's the time and space complexity?" Being able to read it off the code, and to say how it scales when the input grows 10x or 1000x, is the baseline skill that every other DSA topic builds on.

## Concept
**Big-O** describes how the number of basic steps (or memory cells) grows with input size $n$, ignoring constants and lower-order terms. $O(f(n))$ is an upper bound on growth; interviewers almost always mean the **worst case** unless they say average or amortized.

Common classes, slowest-growing first:
- $O(1)$ hash lookup, array index, stack push/pop.
- $O(\log n)$ binary search, balanced-tree lookup, heap push/pop, halving the problem each step.
- $O(n)$ one pass over the input.
- $O(n \log n)$ efficient sorting, divide and conquer with linear merge.
- $O(n^2)$ nested loops over the input, all pairs.
- $O(2^n)$ all subsets, naive recursive Fibonacci; $O(n!)$ all permutations.

**Rules of thumb**:
- Sequential blocks add, nested blocks multiply: $O(a) + O(b) = O(a + b)$, loop inside loop is $O(a \cdot b)$. Use different letters when inputs differ ($n$ and $m$).
- Drop constants: $O(2n + 5) = O(n)$. Keep the dominant term: $O(n^2 + n) = O(n^2)$.
- A loop that halves or doubles its variable is $O(\log n)$.
- Recursion: (number of calls) × (work per call). Recursion depth also costs stack space.
- **Space** counts extra memory beyond the input: a new list of size $n$ is $O(n)$, a few variables are $O(1)$, recursion depth $d$ is $O(d)$.
- **Amortized** cost averages over a sequence: appending to a dynamic array is $O(1)$ amortized even though an occasional resize costs $O(n)$.
- String `s += c` in a loop is $O(n^2)$ in many languages because each concatenation copies; build a list and `"".join` instead.

A rough budget: about $10^8$ simple operations fit in a few seconds, so $n = 10^5$ needs $O(n \log n)$ or better, and $n = 20$ allows $O(2^n)$.

## Worked example
Analyze this code:

```python
def f(arr):
    n = len(arr)
    total = 0
    for x in arr:                # n iterations
        total += x
    i = 1
    while i < n:                 # i = 1, 2, 4, ... doubles each time
        total += arr[i]
        i *= 2
    for i in range(n):           # n * n iterations
        for j in range(n):
            if arr[i] == arr[j]:
                total += 1
    return total
```

Trace with $n = 8$: the first loop runs 8 times; the while loop sees $i = 1, 2, 4$ and stops at 8, so 3 steps ($\log_2 8$); the nested loops run $8 \times 8 = 64$ times. Total $8 + 3 + 64 = 75$. In general $n + \log n + n^2$, and the dominant term gives $O(n^2)$ time. Extra space is a handful of scalars, so $O(1)$.

Doubling $n$ to 16 gives $16 + 4 + 256 = 276$, almost 4x the work: that ratio is the signature of a quadratic algorithm.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What is the time complexity of this code? `i = n; while i > 1: i //= 2` followed by `for j in range(n): work()`",
  "options": [
    "O(log n)",
    "O(n)",
    "O(n log n)",
    "O(n^2)"
  ],
  "answer": 1,
  "explanation": "The while loop is O(log n) and the for loop is O(n). They run one after the other (the for is not inside the while), so the costs add: O(log n + n) = O(n)."
}
```

```quiz
{
  "id": "q2",
  "question": "Appending n items one by one to a Python list costs:",
  "options": [
    "O(n) total, O(1) amortized per append",
    "O(n^2) total",
    "O(log n) total",
    "O(n) per append"
  ],
  "answer": 0,
  "explanation": "Occasional resizes copy the array, but with geometric growth the total copy work is O(n), so each append is O(1) amortized."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `fast_pow(x, n)` for integer $n \\ge 0$ using exponentiation by squaring in $O(\\log n)$ multiplications. Return a tuple `(result, mults)` where `mults` counts every multiplication you perform (so the tests can verify the complexity). Then implement `fib(n)` in $O(n)$ time and $O(1)$ extra space (iterative, not the $O(2^n)$ naive recursion).",
  "starterCode": "def fast_pow(x, n):\n    # return (x ** n, number_of_multiplications)\n    pass\n\ndef fib(n):\n    # fib(0)=0, fib(1)=1\n    pass\n\nprint(fast_pow(3, 13), fib(10))",
  "tests": "for x in (0, 1, 2, 3, -2):\n    for n in range(0, 40):\n        r, m = fast_pow(x, n)\n        assert r == x ** n, (x, n)\n        assert m <= 2 * max(1, n.bit_length()), (x, n, m)\nassert fast_pow(5, 0) == (1, 0)\nr, m = fast_pow(2, 10 ** 4)\nassert r == 2 ** (10 ** 4) and m <= 2 * 14\nassert [fib(i) for i in range(10)] == [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]\nassert fib(90) == 2880067194370816120\n",
  "solution": "def fast_pow(x, n):\n    result, base, mults = 1, x, 0\n    while n:\n        if n & 1:\n            result *= base\n            mults += 1\n        base *= base\n        mults += 1\n        n >>= 1\n    return result, mults\n\ndef fib(n):\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a",
  "hints": [
    "Write n in binary: if the lowest bit is 1, multiply the result by the current base; then square the base and shift n right.",
    "The loop runs bit_length(n) times, with at most 2 multiplications per iteration.",
    "For fib keep only the last two values."
  ]
}
```

> [!TIP] Interview tips
> - Always state both time and space, and say which case (worst, average, amortized) you mean.
> - Say what $n$ is when there are several inputs: `O(n + m)` for two arrays, `O(rows * cols)` for a grid.
> - Pitfall: forgetting hidden costs, such as `list.insert(0, x)`, `x in list`, slicing, and `sorted()` inside a loop.
> - If your first idea is $O(n^2)$, mention it, then say what data structure (hash map, sort, two pointers) brings it down; that is exactly what interviewers want to hear.
