---
id: statistics-conjugate-priors
title: Conjugate priors
estimatedMinutes: 10
difficulty: medium
tags: [statistics, bayesian, conjugate-priors]
---

## Why it matters
Conjugate priors make Bayesian updating a matter of adding counts, which is why Bayesian A/B testing and Thompson sampling run cheaply in production. Interviewers expect you to know the Beta-Binomial pair at minimum.

## Concept
A prior is **conjugate** to a likelihood if the posterior is in the same family. Updating then just changes the parameters.

| Data (likelihood) | Conjugate prior | Posterior after the data |
|---|---|---|
| Bernoulli / Binomial ($k$ successes in $n$) | Beta(α, β) | Beta(α + k, β + n − k) |
| Poisson counts ($\sum x$ over $n$ periods) | Gamma(a, b) (rate b) | Gamma(a + Σx, b + n) |
| Normal with known variance σ² | Normal(μ₀, τ²) | Normal (precision-weighted mean) |
| Categorical / Multinomial | Dirichlet(α₁…α_k) | Dirichlet(α_i + counts_i) |

The prior parameters act like **pseudo-observations**: Beta(α, β) is "α − 1 successes and β − 1 failures already seen".

## Worked example
Support tickets per day are Poisson with unknown rate λ. Prior Gamma(a = 20, b = 4) (mean 5 per day, worth about 4 days of data). You then observe 10 days with 70 tickets in total:

$$
\text{posterior} = \text{Gamma}(20 + 70,\; 4 + 10) = \text{Gamma}(90, 14), \qquad E[\lambda] = \frac{90}{14} \approx 6.4
$$

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Prior Beta(1, 1). You observe 30 conversions in 100 trials. What is the posterior mean?",
  "options": ["0.30", "31/102 ≈ 0.304", "0.5", "31/100"],
  "answer": 1,
  "explanation": "Posterior Beta(31, 71) with mean 31 / (31 + 71) = 31/102."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `beta_binomial_update(a, b, k, n)`, `gamma_poisson_update(a, b, counts)` (counts is a list of per-period counts), and `dirichlet_update(alphas, counts)`. Each returns the posterior parameters.",
  "starterCode": "def beta_binomial_update(a, b, k, n):\n    pass\n\ndef gamma_poisson_update(a, b, counts):\n    pass\n\ndef dirichlet_update(alphas, counts):\n    pass\n\nprint(gamma_poisson_update(20, 4, [7] * 10))",
  "tests": "assert beta_binomial_update(1, 1, 30, 100) == (31, 71)\nassert gamma_poisson_update(20, 4, [7] * 10) == (90, 14)\nassert dirichlet_update([1, 1, 1], [5, 0, 2]) == [6, 1, 3]",
  "solution": "def beta_binomial_update(a, b, k, n):\n    return (a + k, b + n - k)\n\ndef gamma_poisson_update(a, b, counts):\n    return (a + sum(counts), b + len(counts))\n\ndef dirichlet_update(alphas, counts):\n    return [a + c for a, c in zip(alphas, counts)]",
  "hints": ["Successes go to α, failures to β.", "Gamma-Poisson: add the total count to a and the number of periods to b."]
}
```

> [!TIP] Interview tips
> - Explain priors as pseudo-counts; it makes the choice of prior strength intuitive.
> - Mention Thompson sampling: sample from each arm's Beta posterior and play the best.
> - Note that conjugacy is a convenience; with modern tools (MCMC, variational inference) any prior works, just more slowly.
