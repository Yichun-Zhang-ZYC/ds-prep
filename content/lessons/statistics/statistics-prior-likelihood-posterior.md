---
id: statistics-prior-likelihood-posterior
title: Prior, likelihood, posterior
estimatedMinutes: 12
difficulty: medium
tags: [statistics, bayesian, inference]
---

## Why it matters
Bayesian reasoning shows up in experimentation platforms ("probability B is better"), small-sample estimates, and ML. Interviewers check that you can name the three parts and explain how data moves a belief.

## Concept
$$
\underbrace{p(\theta \mid \text{data})}_{\text{posterior}} = \frac{\overbrace{p(\text{data} \mid \theta)}^{\text{likelihood}}\;\overbrace{p(\theta)}^{\text{prior}}}{p(\text{data})}
$$

- **Prior**: what you believe about θ before seeing this data (historical rates, domain knowledge, or a weak "uninformative" prior).
- **Likelihood**: how probable the observed data is for each value of θ.
- **Posterior**: the updated belief, a full distribution, so you can answer questions like "P(θ > 0.05)".

More data → the likelihood dominates → the prior matters less. Today's posterior can be tomorrow's prior (sequential updating).

## Worked example
A new landing page: you believe its conversion rate is around 5% (prior Beta(5, 95), mean 5%). After 200 visitors with 16 conversions (8%):

$$
\text{posterior} = \text{Beta}(5 + 16,\; 95 + 184) = \text{Beta}(21, 279), \qquad \text{mean} = \frac{21}{300} = 7\%
$$

The estimate moves most of the way from 5% toward 8%. With 2,000 visitors at the same rate, it would land almost exactly at 8%.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "As the sample size grows very large, what happens to the influence of a (reasonable) prior on the posterior?",
  "options": ["It grows", "It shrinks; the posterior is dominated by the data", "It stays the same", "The posterior becomes the prior"],
  "answer": 1,
  "explanation": "The likelihood sharpens with more data and overwhelms any prior that doesn't rule out the true value."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement a grid posterior: `grid_posterior(prior, k, n)` where `prior` is a list of (p, weight) pairs over candidate conversion rates. Multiply each weight by the binomial likelihood p^k(1−p)^(n−k), normalize, and return a list of (p, posterior_prob). Also write `posterior_mean(post)`.",
  "starterCode": "def grid_posterior(prior, k, n):\n    pass\n\ndef posterior_mean(post):\n    pass\n\nprior = [(p / 100, 1) for p in range(1, 100)]\nprint(posterior_mean(grid_posterior(prior, 16, 200)))",
  "tests": "prior = [(p / 100, 1) for p in range(1, 100)]\npost = grid_posterior(prior, 16, 200)\nassert abs(sum(w for _, w in post) - 1) < 1e-9\nm = posterior_mean(post)\nassert 0.075 < m < 0.09, m\npost2 = grid_posterior([(0.2, 1), (0.8, 1)], 9, 10)\nassert dict(post2)[0.8] > 0.99",
  "solution": "def grid_posterior(prior, k, n):\n    unnorm = [(p, w * p ** k * (1 - p) ** (n - k)) for p, w in prior]\n    total = sum(w for _, w in unnorm)\n    return [(p, w / total) for p, w in unnorm]\n\ndef posterior_mean(post):\n    return sum(p * w for p, w in post)",
  "hints": ["Posterior ∝ prior × likelihood; divide by the total so the weights sum to 1.", "The binomial coefficient cancels out in the normalization."]
}
```

> [!TIP] Interview tips
> - Name all three pieces and say which one encodes business knowledge (the prior).
> - Emphasize that the posterior is a distribution: you can report P(lift > 0) or an expected loss.
> - Address the "subjective prior" critique: use weak or historical priors and show sensitivity to the choice.
