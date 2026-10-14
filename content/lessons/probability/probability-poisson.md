---
id: probability-poisson
title: Poisson
estimatedMinutes: 12
difficulty: medium
tags: [probability, distributions, counts, poisson]
---

## Why it matters
Support tickets per hour, server errors per day, purchases per minute: counts of events in a fixed window are usually modeled as Poisson. It's also the basis for spotting "unusual" spikes.

## Concept
$X \sim \text{Poisson}(\lambda)$ counts events in a fixed interval when events occur independently at a constant average rate $\lambda$:

$$
P(X = k) = \frac{e^{-\lambda} \lambda^k}{k!}, \qquad E[X] = \text{Var}(X) = \lambda
$$

Useful facts:
- **Mean equals variance.** Real counts often have variance > mean (**overdispersion**); then a negative binomial model fits better.
- **Sums add**: independent Poisson($\lambda_1$) + Poisson($\lambda_2$) = Poisson($\lambda_1 + \lambda_2$).
- **Approximates Binomial(n, p)** when $n$ is large and $p$ small, with $\lambda = np$.
- Time **between** Poisson events is exponential with mean $1/\lambda$.

## Worked example
A shop gets 3 orders per hour on average. Probability of no orders in an hour, and of at least 6:

$$
P(X = 0) = e^{-3} \approx 0.050 \qquad P(X \ge 6) = 1 - \sum_{k=0}^{5} \frac{e^{-3} 3^k}{k!} \approx 0.084
$$

So 6+ orders in an hour happens about 1 hour in 12: not a rare anomaly.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Errors average 2 per day. Assuming Poisson, what is the expected number and the standard deviation for a 4-day window?",
  "options": ["Mean 8, SD √8 ≈ 2.83", "Mean 8, SD 8", "Mean 2, SD √2", "Mean 8, SD 4"],
  "answer": 0,
  "explanation": "Rates scale with the window: λ = 2 × 4 = 8. Variance equals λ, so SD = √8."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `poisson_pmf(k, lam)` and `poisson_sf(k, lam)` = P(X ≥ k). Use them in `is_unusual(observed, lam, alpha=0.01)` that returns `True` if P(X ≥ observed) < alpha.",
  "starterCode": "from math import exp, factorial\n\ndef poisson_pmf(k, lam):\n    pass\n\ndef poisson_sf(k, lam):\n    pass\n\ndef is_unusual(observed, lam, alpha=0.01):\n    pass\n\nprint(poisson_pmf(0, 3), poisson_sf(6, 3), is_unusual(9, 3))",
  "tests": "from math import exp\nassert abs(poisson_pmf(0, 3) - exp(-3)) < 1e-12\nassert abs(poisson_sf(0, 3) - 1) < 1e-12\nassert abs(poisson_sf(6, 3) - 0.08391794203) < 1e-9\nassert is_unusual(9, 3) is True\nassert is_unusual(5, 3) is False",
  "solution": "from math import exp, factorial\n\ndef poisson_pmf(k, lam):\n    return exp(-lam) * lam**k / factorial(k)\n\ndef poisson_sf(k, lam):\n    return 1 - sum(poisson_pmf(i, lam) for i in range(k))\n\ndef is_unusual(observed, lam, alpha=0.01):\n    return poisson_sf(observed, lam) < alpha",
  "hints": ["P(X ≥ k) = 1 − P(X ≤ k − 1).", "For the anomaly check, compare the tail probability with alpha."]
}
```

> [!TIP] Interview tips
> - Check "mean ≈ variance" before trusting a Poisson model; if variance is much larger, say "overdispersed, use negative binomial".
> - Scale λ with the window length (per hour → per day).
> - Use the Poisson tail for simple anomaly alerts, and mention seasonality (λ varies by hour of day).
