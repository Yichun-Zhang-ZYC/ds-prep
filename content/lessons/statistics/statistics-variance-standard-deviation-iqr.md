---
id: statistics-variance-standard-deviation-iqr
title: Variance, standard deviation, IQR
estimatedMinutes: 10
difficulty: easy
tags: [statistics, descriptive, spread]
---

## Why it matters
Spread decides everything downstream: how noisy a metric is, how many users an A/B test needs, what counts as an outlier. Interviewers ask about n vs n−1, and when to prefer the IQR.

## Concept
| Measure | Formula | Notes |
|---|---|---|
| Variance | $s^2 = \frac{1}{n-1}\sum (x_i - \bar x)^2$ | squared units |
| Standard deviation | $s = \sqrt{s^2}$ | same units as the data |
| IQR | $Q_3 - Q_1$ | spread of the middle 50%; robust to outliers |
| Coefficient of variation | $s / \bar x$ | compares spread across metrics with different scales |

**Why n − 1?** The sample mean is fitted to the same data, so deviations from it are a bit too small. Dividing by $n - 1$ (Bessel's correction) makes $s^2$ an unbiased estimate of the population variance. Use $n$ when you have the whole population.

Like the mean, the SD is pulled by outliers. The IQR is the median's counterpart for spread.

## Worked example
Daily sign-ups: 40, 42, 45, 47, 51, 200.

- Mean ≈ 70.8, sample SD ≈ 63.4: one spike dominates.
- Q1 = 42.75, Q3 = 50, IQR ≈ 7.25 (quartiles via linear interpolation): the typical day-to-day variation is small.

Report the IQR (or the SD without the spike) if the question is "how much does a normal day vary?".

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You add 10 to every value in a dataset. What happens to the standard deviation?",
  "options": ["Increases by 10", "Stays the same", "Increases by √10", "Doubles"],
  "answer": 1,
  "explanation": "Shifting every value moves the mean by the same amount; distances from the mean don't change."
}
```

```quiz
{
  "id": "q2",
  "question": "When should you divide by n instead of n − 1?",
  "options": ["Always", "When the data is the entire population, not a sample", "When n > 30", "When the data is normal"],
  "answer": 1,
  "explanation": "n − 1 corrects for estimating the mean from a sample. With the full population, the mean is known exactly."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `sample_sd(values)` (divide by n − 1) and `iqr(values)` using quartiles from linear interpolation: the q-quantile is at position `q * (n - 1)` in the sorted list (0-based), interpolating between neighbors.",
  "starterCode": "def sample_sd(values):\n    pass\n\ndef quantile(values, q):\n    pass\n\ndef iqr(values):\n    pass\n\nprint(sample_sd([40, 42, 45, 47, 51, 200]), iqr([40, 42, 45, 47, 51, 200]))",
  "tests": "import statistics\nxs = [40, 42, 45, 47, 51, 200]\nassert abs(sample_sd(xs) - statistics.stdev(xs)) < 1e-9\nassert abs(quantile([1, 2, 3, 4], 0.5) - 2.5) < 1e-12\nassert abs(iqr(xs) - 7.25) < 1e-9\nassert abs(iqr([1, 2, 3, 4, 5]) - 2) < 1e-12",
  "solution": "def sample_sd(values):\n    n = len(values)\n    m = sum(values) / n\n    return (sum((x - m) ** 2 for x in values) / (n - 1)) ** 0.5\n\ndef quantile(values, q):\n    xs = sorted(values)\n    pos = q * (len(xs) - 1)\n    lo = int(pos)\n    hi = min(lo + 1, len(xs) - 1)\n    return xs[lo] + (pos - lo) * (xs[hi] - xs[lo])\n\ndef iqr(values):\n    return quantile(values, 0.75) - quantile(values, 0.25)",
  "hints": ["Position q·(n − 1) may fall between two indices; interpolate linearly.", "IQR = Q(0.75) − Q(0.25)."]
}
```

> [!TIP] Interview tips
> - Say "sample SD, n − 1" when you compute from data; it's an easy signal of rigor.
> - For skewed or spiky metrics, report median and IQR alongside mean and SD.
> - Connect spread to sample size: required sample size in an A/B test scales with variance.
