---
id: probability-log-normal
title: Log-normal
estimatedMinutes: 10
difficulty: medium
tags: [probability, distributions, skewed-data, transforms]
---

## Why it matters
Revenue per buyer, session length, house prices and latency are right-skewed: most values are modest, a few are huge. The log-normal is the standard model, and "should I log-transform this metric?" is a common interview follow-up.

## Concept
$X$ is **log-normal** if $\ln X \sim N(\mu, \sigma^2)$. Products of many small independent factors (growth rates, multiplicative effects) tend to be log-normal, just as sums tend to be normal.

$$
\text{median}(X) = e^{\mu}, \qquad E[X] = e^{\mu + \sigma^2/2}
$$

The mean is above the median, and the gap grows with $\sigma$: a few large values drag the mean up.

Working on the log scale turns multiplicative differences into additive ones, makes the data roughly symmetric, and reduces the influence of outliers. But a test on the log scale compares **geometric means (medians)**, not arithmetic means, so say which one the business cares about.

## Worked example
Order values have $\ln X \sim N(3.5, 0.8^2)$.

$$
\text{median} = e^{3.5} \approx 33.1, \qquad \text{mean} = e^{3.5 + 0.32} \approx 45.6
$$

A report quoting the mean ($45.6) describes a "typical" order that's larger than what most customers actually spend.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which statement about a log-normal variable is true?",
  "options": ["Mean = median", "Mean > median", "Mean < median", "It can be negative"],
  "answer": 1,
  "explanation": "E[X] = e^(μ + σ²/2) > e^μ = median for any σ > 0. Log-normal values are always positive."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `lognormal_median(mu, sigma)` and `lognormal_mean(mu, sigma)`. Then write `geometric_mean(values)`, which equals exp(mean of logs).",
  "starterCode": "import math\n\ndef lognormal_median(mu, sigma):\n    pass\n\ndef lognormal_mean(mu, sigma):\n    pass\n\ndef geometric_mean(values):\n    pass\n\nprint(lognormal_median(3.5, 0.8), lognormal_mean(3.5, 0.8), geometric_mean([1, 10, 100]))",
  "tests": "import math\nassert abs(lognormal_median(3.5, 0.8) - math.exp(3.5)) < 1e-9\nassert abs(lognormal_mean(3.5, 0.8) - math.exp(3.82)) < 1e-9\nassert abs(geometric_mean([1, 10, 100]) - 10) < 1e-9\nassert lognormal_mean(0, 1) > lognormal_median(0, 1)",
  "solution": "import math\n\ndef lognormal_median(mu, sigma):\n    return math.exp(mu)\n\ndef lognormal_mean(mu, sigma):\n    return math.exp(mu + sigma ** 2 / 2)\n\ndef geometric_mean(values):\n    return math.exp(sum(math.log(v) for v in values) / len(values))",
  "hints": ["The median is exp(μ) because exp is monotonic.", "The geometric mean of [1, 10, 100] is 10."]
}
```

> [!TIP] Interview tips
> - When you see skewed positive data, say "this looks log-normal; I'd look at the log scale and report medians too".
> - Be precise: a t-test on logged revenue compares geometric means; to compare average revenue, use the raw scale (with CLT or bootstrap) instead.
> - Logs fail at 0. For data with zeros (non-buyers), mention log(1 + x) or a two-part model.
