---
id: statistics-skewness-kurtosis
title: Skewness, kurtosis
estimatedMinutes: 8
difficulty: easy
tags: [statistics, descriptive, distribution-shape]
---

## Why it matters
Shape determines which summaries and tests are trustworthy. A heavily skewed or heavy-tailed metric needs more data for the CLT to kick in, and makes means and SDs misleading.

## Concept
- **Skewness** measures asymmetry: $\frac{1}{n}\sum \left(\frac{x_i - \bar x}{s}\right)^3$.
  - > 0: right-skewed (long tail of large values): income, revenue, latency.
  - < 0: left-skewed: exam scores with a ceiling, age at retirement.
- **Kurtosis** measures tail heaviness: $\frac{1}{n}\sum \left(\frac{x_i - \bar x}{s}\right)^4$. A normal distribution has kurtosis 3; **excess kurtosis** = kurtosis − 3.
  - High excess kurtosis: rare extreme values are more common than a normal would predict (returns, ad spend per user).

Rule of thumb: |skew| > 1 is "highly skewed". Always look at a histogram too; one number can hide a lot.

## Worked example
Revenue per buyer often has skewness around 3–10 and huge kurtosis because of a few "whales". Consequences:

- The mean is unstable: one whale can move it noticeably.
- A/B tests on revenue need much larger samples than tests on conversion.
- Common fixes: log-transform, winsorize (cap at the 99th percentile), or test the median / use a bootstrap.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A metric has mean 120, median 80 and skewness 4. Which statement is most likely?",
  "options": ["The distribution is symmetric", "There is a long right tail of large values", "There is a long left tail", "There are no outliers"],
  "answer": 1,
  "explanation": "Positive skew and mean > median both point to a long right tail."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `skewness(values)` and `excess_kurtosis(values)` using population moments (divide by n, and use the population SD).",
  "starterCode": "def skewness(values):\n    pass\n\ndef excess_kurtosis(values):\n    pass\n\nprint(skewness([1, 2, 3, 4, 100]), excess_kurtosis([1, 2, 3, 4, 100]))",
  "tests": "assert abs(skewness([1, 2, 3, 4, 5])) < 1e-12\nassert skewness([1, 2, 3, 4, 100]) > 1\nassert skewness([-100, 1, 2, 3, 4]) < -1\nassert abs(excess_kurtosis([1, 2, 3, 4, 5]) - (-1.3)) < 1e-9",
  "solution": "def _moments(values):\n    n = len(values)\n    m = sum(values) / n\n    sd = (sum((x - m) ** 2 for x in values) / n) ** 0.5\n    return n, m, sd\n\ndef skewness(values):\n    n, m, sd = _moments(values)\n    return sum(((x - m) / sd) ** 3 for x in values) / n\n\ndef excess_kurtosis(values):\n    n, m, sd = _moments(values)\n    return sum(((x - m) / sd) ** 4 for x in values) / n - 3",
  "hints": ["Standardize each value with the population SD first.", "Excess kurtosis subtracts 3 so a normal distribution scores 0."]
}
```

> [!TIP] Interview tips
> - Say "let me check the distribution" before choosing a summary or test; it's a habit interviewers look for.
> - For heavy-tailed revenue, name concrete fixes: log, winsorizing, CUPED, or bootstrapped CIs.
> - Don't over-index on exact skew values; describe the shape and its consequences.
