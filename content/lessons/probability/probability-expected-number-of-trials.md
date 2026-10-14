---
id: probability-expected-number-of-trials
title: Expected number of trials
estimatedMinutes: 15
difficulty: hard
tags: [probability, expectation, coupon-collector, brain-teasers]
---

## Why it matters
"How many rolls to see all six faces?" or "how many flips until HH vs HT?" are favorite harder questions. They combine geometric waiting times, linearity of expectation and first-step analysis.

## Concept
Three patterns cover most questions:

1. **Single event with probability p**: expected trials = $1/p$ (geometric).
2. **Coupon collector** (collect all $n$ equally likely types): break the wait into stages. When you have $k$ types, a new one appears with probability $(n - k)/n$, so

$$
E[T] = \sum_{k=0}^{n-1} \frac{n}{n - k} = n\left(1 + \tfrac{1}{2} + \dots + \tfrac{1}{n}\right) \approx n \ln n
$$

3. **Patterns in sequences** (wait for HH): define states by progress and use first-step equations. Overlapping patterns take longer: HH needs 6 flips on average, HT only 4.

## Worked example
Expected rolls of a die to see all six faces:

$$
6\left(1 + \tfrac12 + \tfrac13 + \tfrac14 + \tfrac15 + \tfrac16\right) = 6 \times 2.45 = 14.7
$$

The last face alone takes 6 rolls on average, which is why the final coupons are the slow part.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why does HH take longer to appear than HT on average (6 vs 4 flips)?",
  "options": ["H is less likely than T", "After a failed attempt at HH (an HT), you lose all progress; after a failed HT attempt (HH), you still have an H", "They take the same time", "HT can only appear at even positions"],
  "answer": 1,
  "explanation": "With HT, a second H keeps you one step away; with HH, a T sends you back to the start."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `coupon_collector(n)` returning the exact expected number of draws to collect all `n` equally likely types, and `simulate_coupons(n, trials, seed)` that estimates it.",
  "starterCode": "import random\n\ndef coupon_collector(n):\n    pass\n\ndef simulate_coupons(n, trials, seed):\n    pass\n\nprint(coupon_collector(6), simulate_coupons(6, 20000, 3))",
  "tests": "assert abs(coupon_collector(6) - 14.7) < 1e-9\nassert coupon_collector(1) == 1\nest = simulate_coupons(6, 20000, 3)\nassert abs(est - 14.7) < 0.3, est",
  "solution": "import random\n\ndef coupon_collector(n):\n    return sum(n / (n - k) for k in range(n))\n\ndef simulate_coupons(n, trials, seed):\n    rng = random.Random(seed)\n    total = 0\n    for _ in range(trials):\n        seen = set()\n        draws = 0\n        while len(seen) < n:\n            seen.add(rng.randrange(n))\n            draws += 1\n        total += draws\n    return total / trials",
  "hints": ["Stage k (with k types already) is geometric with success probability (n − k)/n.", "Sum the stage means n/(n − k) for k = 0..n−1."]
}
```

> [!TIP] Interview tips
> - Split long waits into stages with known geometric means and add them (linearity of expectation).
> - For pattern questions, write the states ("no progress", "have H") and solve the small linear system out loud.
> - Product angle: coupon-collector math explains why "collect all badges" mechanics get slow at the end.
