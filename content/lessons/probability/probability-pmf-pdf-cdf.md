---
id: probability-pmf-pdf-cdf
title: PMF / PDF / CDF
estimatedMinutes: 10
difficulty: easy
tags: [probability, distributions, cdf]
---

## Why it matters
Percentiles, p-values and "probability that latency is under 200 ms" are all CDF questions. Knowing how PMF, PDF and CDF relate lets you move between "probability of a value" and "probability up to a value" quickly.

## Concept
| Function | For | Definition | Key property |
|---|---|---|---|
| PMF $p(x)$ | discrete | $P(X = x)$ | sums to 1 |
| PDF $f(x)$ | continuous | density; $P(a \le X \le b) = \int_a^b f$ | integrates to 1 |
| CDF $F(x)$ | both | $P(X \le x)$ | non-decreasing, from 0 to 1 |

Relationships: for continuous variables $F'(x) = f(x)$; for discrete ones $F$ is a step function that jumps by $p(x)$ at each value.

Two everyday uses of the CDF:
- $P(a < X \le b) = F(b) - F(a)$.
- The **quantile** (inverse CDF) $F^{-1}(q)$ gives the value below which a fraction $q$ of outcomes falls; the median is $F^{-1}(0.5)$.

## Worked example
A fair die: $p(x) = 1/6$ for $x = 1, \dots, 6$, so $F(4) = P(X \le 4) = 4/6$.

Exponential waiting time with rate $\lambda = 2$ per minute: $F(t) = 1 - e^{-2t}$. The probability of waiting between 0.5 and 1 minute is

$$
F(1) - F(0.5) = e^{-1} - e^{-2} \approx 0.368 - 0.135 = 0.233
$$

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "For a continuous X with CDF F, what is P(X > 3)?",
  "options": ["F(3)", "1 − F(3)", "f(3)", "F(3) − F(0)"],
  "answer": 1,
  "explanation": "P(X > 3) = 1 − P(X ≤ 3) = 1 − F(3)."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `empirical_cdf(values, x)` that returns the share of `values` that are **≤ x** (the empirical CDF), and `empirical_quantile(values, q)` that returns the smallest value v in `values` with `empirical_cdf(values, v) >= q`.",
  "starterCode": "def empirical_cdf(values, x):\n    pass\n\ndef empirical_quantile(values, q):\n    pass\n\nlatency = [120, 80, 200, 150, 95, 300, 110, 130]\nprint(empirical_cdf(latency, 150), empirical_quantile(latency, 0.5))",
  "tests": "latency = [120, 80, 200, 150, 95, 300, 110, 130]\nassert abs(empirical_cdf(latency, 150) - 6/8) < 1e-12\nassert empirical_cdf(latency, 10) == 0\nassert empirical_quantile(latency, 0.5) == 120\nassert empirical_quantile(latency, 1.0) == 300",
  "solution": "def empirical_cdf(values, x):\n    return sum(v <= x for v in values) / len(values)\n\ndef empirical_quantile(values, q):\n    for v in sorted(values):\n        if empirical_cdf(values, v) >= q:\n            return v",
  "hints": ["The empirical CDF is a count of values ≤ x divided by the total.", "Walk through the sorted values and return the first one whose CDF reaches q."]
}
```

> [!TIP] Interview tips
> - Translate word problems into CDF form: "at most", "at least", "between" → $F(b)$, $1 - F(a)$, $F(b) - F(a)$.
> - p95 / p99 latency are quantiles of the latency CDF; that phrasing connects probability to engineering metrics.
> - Remember that a PDF value is not a probability; only areas are.
