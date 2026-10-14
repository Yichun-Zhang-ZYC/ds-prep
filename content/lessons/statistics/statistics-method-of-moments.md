---
id: statistics-method-of-moments
title: Method of moments
estimatedMinutes: 8
difficulty: medium
tags: [statistics, estimation, moments]
---

## Why it matters
Method of moments (MoM) is the quickest way to get a parameter estimate by hand. It comes up as "how else could you estimate this?" after MLE, and as a fast starting point for numerical fitting.

## Concept
Set the population moments (functions of the parameters) equal to the sample moments, then solve:

$$
E[X] = \bar x, \qquad E[X^2] = \frac{1}{n}\sum x_i^2, \;\dots
$$

Use as many equations as there are parameters.

| | Method of moments | MLE |
|---|---|---|
| Effort | algebra only | optimization, sometimes numerical |
| Efficiency | often less efficient | asymptotically efficient |
| Can give impossible values? | yes (e.g. negative variance parameters) | respects the parameter space |

## Worked example
**Uniform(0, θ)**: $E[X] = \theta/2$, so $\hat\theta_{\text{MoM}} = 2\bar x$. (The MLE is $\max x_i$; both are reasonable, and MoM can even give $\hat\theta$ smaller than an observed value.)

**Gamma(k, θ)**: mean $k\theta$, variance $k\theta^2$. Matching sample mean $m$ and variance $v$:

$$
\hat\theta = \frac{v}{m}, \qquad \hat k = \frac{m^2}{v}
$$

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Samples from Uniform(0, θ) are 1, 2, 9. What are the method-of-moments and MLE estimates of θ?",
  "options": ["8 and 9", "9 and 8", "4 and 9", "12 and 9"],
  "answer": 0,
  "explanation": "MoM: 2 × mean = 2 × 4 = 8, which is smaller than the observed 9 (impossible). MLE: max = 9."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `gamma_mom(values)` returning `(k_hat, theta_hat)` using the population variance (divide by n).",
  "starterCode": "def gamma_mom(values):\n    pass\n\nprint(gamma_mom([2.0, 3.5, 1.2, 4.8, 2.6]))",
  "tests": "xs = [2.0, 3.5, 1.2, 4.8, 2.6]\nm = sum(xs) / len(xs)\nv = sum((x - m) ** 2 for x in xs) / len(xs)\nk, t = gamma_mom(xs)\nassert abs(k - m * m / v) < 1e-12 and abs(t - v / m) < 1e-12\nassert abs(k * t - m) < 1e-12",
  "solution": "def gamma_mom(values):\n    n = len(values)\n    m = sum(values) / n\n    v = sum((x - m) ** 2 for x in values) / n\n    return m * m / v, v / m",
  "hints": ["Solve k·θ = m and k·θ² = v for k and θ."]
}
```

> [!TIP] Interview tips
> - Offer MoM as a quick sanity estimate or initial value, then mention MLE for efficiency.
> - Point out MoM's failure mode: estimates outside the valid range.
> - Matching mean and variance is also a quick way to fit a Beta prior from historical conversion rates.
