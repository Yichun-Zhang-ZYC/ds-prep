---
id: statistics-mean-median-mode
title: Mean, median, mode
estimatedMinutes: 8
difficulty: easy
tags: [statistics, descriptive, central-tendency]
---

## Why it matters
"What's the typical order value?" has three possible answers, and on skewed business data they can differ a lot. Interviewers want you to pick the right one and explain why.

## Concept
| Measure | Definition | Sensitive to outliers? | Good for |
|---|---|---|---|
| Mean | sum / count | very | totals, symmetric data, anything you'll multiply back (revenue = mean × users) |
| Median | middle value when sorted | no | "typical" value on skewed data (income, latency, order value) |
| Mode | most frequent value | no | categories, discrete counts ("most common plan") |

On a **right-skewed** distribution: mode < median < mean. A few large values pull the mean up; the median doesn't move.

The mean is still the right number when the business cares about totals: average revenue per user × users = total revenue. The median can't do that.

## Worked example
Order values: 12, 15, 18, 20, 22, 25, 400.

- Mean = 512 / 7 ≈ 73.1
- Median = 20
- Mode: none repeats (every value once)

"Typical order" → 20. "Expected revenue from 1,000 more orders like these" → about 73,100, which uses the mean.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Salaries at a startup are mostly 80k–120k, plus the founder at 2M. Which is the best single number for a candidate asking about a typical salary?",
  "options": ["Mean", "Median", "Mode", "Maximum"],
  "answer": 1,
  "explanation": "The founder's salary drags the mean far above what most employees earn. The median ignores that one extreme value."
}
```

```quiz
{
  "id": "q2",
  "question": "A distribution has mean 50 and median 35. What is its most likely shape?",
  "options": ["Symmetric", "Right-skewed (long tail of large values)", "Left-skewed", "Uniform"],
  "answer": 1,
  "explanation": "Mean > median means large values in the right tail pull the mean up."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `summary(values)` returning a tuple `(mean, median, mode)` without the `statistics` module. For the mode, return the smallest of the most frequent values.",
  "starterCode": "def summary(values):\n    pass\n\nprint(summary([12, 15, 18, 20, 22, 25, 400]))",
  "tests": "m, med, mo = summary([12, 15, 18, 20, 22, 25, 400])\nassert abs(m - 512/7) < 1e-12 and med == 20 and mo == 12\nassert summary([1, 2, 2, 3, 4, 4]) == (16/6, 2.5, 2)\nassert summary([5]) == (5, 5, 5)",
  "solution": "def summary(values):\n    xs = sorted(values)\n    n = len(xs)\n    mean = sum(xs) / n\n    mid = n // 2\n    median = xs[mid] if n % 2 else (xs[mid - 1] + xs[mid]) / 2\n    counts = {}\n    for x in xs:\n        counts[x] = counts.get(x, 0) + 1\n    best = max(counts.values())\n    mode = min(x for x, c in counts.items() if c == best)\n    return mean, median, mode",
  "hints": ["Sort first; for an even count, the median is the average of the two middle values.", "Count occurrences with a dict, then take the smallest value with the top count."]
}
```

> [!TIP] Interview tips
> - Before reporting an average, ask (or check) whether the data is skewed. Revenue and time metrics almost always are.
> - Say when the mean is still the right choice: totals and per-user economics.
> - On dashboards, showing mean and median side by side is a cheap way to signal skew.
