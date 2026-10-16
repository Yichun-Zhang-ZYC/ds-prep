---
id: python-simulations
title: Simulations (Monte Carlo)
estimatedMinutes: 15
difficulty: medium
tags: [python, coding-interview, simulation, probability]
---

## Why it matters
"Simulate it" is the universal backup for probability puzzles, and simulation is how DS teams check power, validate statistical methods (A/A tests), and estimate quantities without closed forms. Interviewers often ask you to verify an answer by simulation.

## Concept
**Monte Carlo**: estimate a quantity by averaging over many random draws. By the law of large numbers the estimate converges; its standard error shrinks like $1/\sqrt{N}$ (4× more draws → half the error).

Recipe:
1. Write a function that simulates **one trial** and returns the outcome.
2. Run it N times (or vectorize all trials at once with NumPy).
3. Average, and report a standard error: for a proportion $\hat p$, SE $= \sqrt{\hat p(1-\hat p)/N}$.

```python
rng = np.random.default_rng(42)          # seeded generator for reproducibility
rolls = rng.integers(1, 7, size=(100_000, 2))
p_sum_7 = (rolls.sum(axis=1) == 7).mean()   # ≈ 1/6
```

Useful patterns:
- **Vectorize trials**: generate a (trials × steps) array instead of nested loops.
- **Power analysis**: simulate experiments under an assumed effect, run the test, and count how often p < 0.05.
- **A/A tests**: with no effect, the false-positive rate should be ≈ α; if not, the method is broken.
- **Bootstrap**: resample observed data with replacement to get a sampling distribution.
- **Random walks / queues / inventory**: simulate processes step by step.

Pitfalls: forgetting to seed; too few trials for rare events (you need many more draws when p is tiny); reusing the same random numbers across conditions unintentionally; Python loops over millions of trials (vectorize or reduce N).

## Worked example
Birthday problem with 23 people: simulate 20,000 groups, check for any shared birthday.

```python
b = rng.integers(0, 365, size=(20_000, 23))
s = np.sort(b, axis=1)
p = (np.diff(s, axis=1) == 0).any(axis=1).mean()   # ≈ 0.507
```
Exact answer 0.507; SE ≈ $\sqrt{0.25/20000} \approx 0.0035$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Your Monte Carlo estimate has standard error 0.01 with 10,000 trials. How many trials give SE ≈ 0.005?",
  "options": ["20,000", "40,000", "100,000", "5,000"],
  "answer": 1,
  "explanation": "SE ∝ 1/√N, so halving the error needs 4× the trials."
}
```

```quiz
{
  "id": "q2",
  "question": "You simulate 1,000 A/A tests at α = 0.05 and 180 are 'significant'. What does that suggest?",
  "options": ["The product has a real effect", "The testing method has an inflated false-positive rate (e.g. peeking, wrong variance, unit mismatch)", "1,000 simulations are too many", "Nothing; that's expected"],
  "answer": 1,
  "explanation": "Expect ~50 (5%). 18% means the procedure is invalid."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Using `np.random.default_rng(seed)` and vectorized NumPy (no Python loop over trials): `prob_sum_at_least(k, n_dice, trials, seed)` estimates P(sum of n_dice dice ≥ k). `birthday_prob(n_people, trials, seed)` estimates P(at least two share a birthday, 365 days). `simulated_power(p_a, p_b, n, trials, seed)` simulates `trials` A/B tests with n users per arm, runs a two-proportion z-test (pooled SE, two-sided, |z| > 1.96), and returns the fraction significant.",
  "setup": "import numpy as np",
  "packages": ["numpy"],
  "starterCode": "import numpy as np\n\ndef prob_sum_at_least(k, n_dice, trials, seed):\n    pass\n\ndef birthday_prob(n_people, trials, seed):\n    pass\n\ndef simulated_power(p_a, p_b, n, trials, seed):\n    pass\n\nprint(birthday_prob(23, 20000, 0))",
  "tests": "p = prob_sum_at_least(7, 2, 50000, 1)\nassert abs(p - 21 / 36) < 0.01\nassert prob_sum_at_least(13, 2, 1000, 1) == 0.0\nb = birthday_prob(23, 20000, 0)\nassert abs(b - 0.507) < 0.015\nassert birthday_prob(1, 100, 0) == 0.0\naa = simulated_power(0.1, 0.1, 2000, 2000, 2)\nassert 0.03 < aa < 0.075\npw = simulated_power(0.10, 0.12, 4000, 2000, 3)\nassert 0.8 < pw < 0.95",
  "solution": "import numpy as np\n\ndef prob_sum_at_least(k, n_dice, trials, seed):\n    rng = np.random.default_rng(seed)\n    rolls = rng.integers(1, 7, size=(trials, n_dice))\n    return float((rolls.sum(axis=1) >= k).mean())\n\ndef birthday_prob(n_people, trials, seed):\n    rng = np.random.default_rng(seed)\n    b = np.sort(rng.integers(0, 365, size=(trials, n_people)), axis=1)\n    if n_people < 2:\n        return 0.0\n    return float((np.diff(b, axis=1) == 0).any(axis=1).mean())\n\ndef simulated_power(p_a, p_b, n, trials, seed):\n    rng = np.random.default_rng(seed)\n    xa = rng.binomial(n, p_a, size=trials)\n    xb = rng.binomial(n, p_b, size=trials)\n    pa, pb = xa / n, xb / n\n    pool = (xa + xb) / (2 * n)\n    se = np.sqrt(pool * (1 - pool) * 2 / n)\n    z = np.where(se > 0, (pb - pa) / np.where(se > 0, se, 1), 0)\n    return float((np.abs(z) > 1.96).mean())",
  "hints": ["Draw everything at once: shape (trials, n_dice) or (trials, n_people).", "For power, draw conversion counts with rng.binomial(n, p, size=trials) per arm."]
}
```

> [!TIP] Interview tips
> - Offer to verify a probability answer by simulation; write one-trial logic first, then vectorize.
> - Always seed the RNG and report a standard error (∝ 1/√N).
> - Mention simulation for power analysis and A/A validation of experiment pipelines.
