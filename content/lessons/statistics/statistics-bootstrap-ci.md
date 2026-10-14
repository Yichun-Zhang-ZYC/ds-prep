---
id: statistics-bootstrap-ci
title: Bootstrap CI
estimatedMinutes: 12
difficulty: medium
tags: [statistics, bootstrap, resampling, confidence-intervals]
---

## Why it matters
What's the CI for a median, a ratio metric, or revenue per user with whales? There's often no neat formula. The bootstrap gives an interval for almost any statistic, and "how would you get a CI for X?" often expects it as the answer.

## Concept
Treat the sample as a stand-in for the population and resample from it:

1. Draw $n$ observations **with replacement** from the data.
2. Compute the statistic on that resample.
3. Repeat $B$ times (1,000–10,000).
4. **Percentile CI**: the 2.5th and 97.5th percentiles of the $B$ statistics.

Caveats:
- Resample the **independent unit**. If a user has many sessions, resample users (with all their sessions), not sessions.
- The bootstrap can't fix a biased sample, and it struggles with very small $n$ or extreme statistics (like the max).

## Worked example
Median order value of 8 orders: 12, 15, 18, 20, 22, 25, 40, 400. Resample 8 values with replacement 5,000 times, compute each median, and take the 2.5% / 97.5% percentiles. The result is a wide interval (roughly 15 to 40): with 8 orders, the median is genuinely uncertain, and the bootstrap shows it honestly.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Your data has 10,000 users with ~20 events each. You want a CI for click-through rate (clicks / views). What should you resample?",
  "options": ["Individual events", "Users, keeping each user's events together", "Days", "It doesn't matter"],
  "answer": 1,
  "explanation": "Events from the same user are correlated. Resampling events understates the variance; resample users."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `bootstrap_ci(values, stat, b, seed, alpha=0.05)` returning the percentile CI `(low, high)` for any function `stat` (e.g. a median). Use `random.Random(seed).choices(values, k=len(values))` for each resample, sort the b results, and take the values at indexes `int(alpha/2 * b)` and `int((1 - alpha/2) * b) - 1`.",
  "starterCode": "import random, statistics\n\ndef bootstrap_ci(values, stat, b, seed, alpha=0.05):\n    pass\n\norders = [12, 15, 18, 20, 22, 25, 40, 400]\nprint(bootstrap_ci(orders, statistics.median, 5000, 0))",
  "tests": "import statistics, random\nlo, hi = bootstrap_ci([5] * 10, statistics.mean, 500, 1)\nassert lo == 5 and hi == 5\nrng = random.Random(3)\ndata = [rng.gauss(100, 15) for _ in range(400)]\nlo, hi = bootstrap_ci(data, statistics.mean, 2000, 2)\nm = statistics.mean(data)\nse = statistics.stdev(data) / 20\nassert abs((hi - lo) - 2 * 1.96 * se) < 0.6 * se, (lo, hi)\nassert lo < m < hi",
  "solution": "import random, statistics\n\ndef bootstrap_ci(values, stat, b, seed, alpha=0.05):\n    rng = random.Random(seed)\n    n = len(values)\n    stats = sorted(stat(rng.choices(values, k=n)) for _ in range(b))\n    return stats[int(alpha / 2 * b)], stats[int((1 - alpha / 2) * b) - 1]",
  "hints": ["Each resample has the same size as the original data.", "For roughly normal data, the bootstrap CI for the mean should match ±1.96·SE."]
}
```

> [!TIP] Interview tips
> - Say "bootstrap" for medians, ratios, percentiles and heavy-tailed revenue.
> - Always name the resampling unit (users, not events) and why.
> - Mention cost: B × the computation; for huge data, use the delta method or a Poisson bootstrap instead.
