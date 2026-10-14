---
id: statistics-outliers
title: Outliers
estimatedMinutes: 10
difficulty: easy
tags: [statistics, data-quality, outliers]
---

## Why it matters
"What would you do with outliers?" has no single right answer, which is exactly why interviewers ask it. They want a process: detect, investigate, then decide, rather than "just remove them".

## Concept
Detection rules:
- **IQR rule (Tukey)**: outside $[Q_1 - 1.5\,\text{IQR},\; Q_3 + 1.5\,\text{IQR}]$. Robust, works on skewed data.
- **z-score**: $|x - \bar x| / s > 3$. Assumes roughly normal data; the outliers themselves inflate $\bar x$ and $s$, which can hide them.
- **Domain rules**: negative ages, sessions longer than 24 h, orders above credit limits.

What to do depends on the cause:

| Cause | Action |
|---|---|
| Data error (bug, test account, bot) | fix or remove, and document it |
| Real but rare (a whale customer) | keep; use robust stats (median, winsorizing, log) |
| Different population (B2B in a B2C dataset) | analyze separately |

## Worked example
Order values: 18, 20, 21, 22, 24, 25, 27, 250.

Q1 = 20.75, Q3 = 25.5, IQR = 4.75, upper fence = 25.5 + 7.125 = 32.6. So 250 is flagged.

Investigate: if it's a bulk order from a real business customer, keep it but report the median, or winsorize at the 99th percentile for the A/B test. If it's a test account, remove it.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why can the z-score rule miss outliers in small samples?",
  "options": ["z-scores can't be negative", "The outliers inflate the mean and SD, shrinking their own z-scores", "It only works for categorical data", "It flags too many points"],
  "answer": 1,
  "explanation": "This is called masking. Robust rules based on the median and IQR (or MAD) avoid it."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `iqr_outliers(values)` returning the sorted list of values outside the Tukey fences (1.5 × IQR). Compute quartiles by linear interpolation at position q·(n − 1) of the sorted list.",
  "starterCode": "def iqr_outliers(values):\n    pass\n\nprint(iqr_outliers([18, 20, 21, 22, 24, 25, 27, 250]))",
  "tests": "assert iqr_outliers([18, 20, 21, 22, 24, 25, 27, 250]) == [250]\nassert iqr_outliers([1, 2, 3, 4, 5]) == []\nassert iqr_outliers([-50, 10, 11, 12, 13, 14, 90]) == [-50, 90]",
  "solution": "def _q(xs, q):\n    pos = q * (len(xs) - 1)\n    lo = int(pos)\n    hi = min(lo + 1, len(xs) - 1)\n    return xs[lo] + (pos - lo) * (xs[hi] - xs[lo])\n\ndef iqr_outliers(values):\n    xs = sorted(values)\n    q1, q3 = _q(xs, 0.25), _q(xs, 0.75)\n    k = 1.5 * (q3 - q1)\n    return [x for x in xs if x < q1 - k or x > q3 + k]",
  "hints": ["Fences: Q1 − 1.5·IQR and Q3 + 1.5·IQR.", "Return the values outside the fences in sorted order."]
}
```

> [!TIP] Interview tips
> - Answer with a process: detect → investigate the cause → decide (fix, keep with robust stats, or segment).
> - Never silently drop data; document what was removed and why.
> - For experiments, decide outlier handling **before** looking at results to avoid p-hacking.
