---
id: statistics-map-and-bayesian-estimation
title: MAP and Bayesian estimation
estimatedMinutes: 12
difficulty: medium
tags: [statistics, bayesian, map, regularization]
---

## Why it matters
"What's the difference between MLE and MAP?" and "how is L2 regularization Bayesian?" are standard ML-statistics bridge questions. The answer is the prior.

## Concept
Bayesian estimation treats the parameter as random with a **prior** $p(\theta)$, then updates it with data:

$$
p(\theta \mid x) \propto p(x \mid \theta)\, p(\theta)
$$

Point estimates from the posterior:
- **MAP** (maximum a posteriori): the posterior mode, $\arg\max_\theta \big[\log p(x \mid \theta) + \log p(\theta)\big]$.
- **Posterior mean**: minimizes expected squared error.

MAP = MLE + a penalty from the prior:
- Gaussian prior on weights → **L2 (ridge)** penalty.
- Laplace prior → **L1 (lasso)** penalty.

With lots of data, the likelihood dominates and MAP ≈ MLE. With little data, the prior matters.

## Worked example
Conversion rate with prior Beta(α, β) and $k$ conversions in $n$ visits. The posterior is Beta(α + k, β + n − k).

$$
\hat p_{\text{MLE}} = \frac{k}{n}, \qquad \hat p_{\text{MAP}} = \frac{k + \alpha - 1}{n + \alpha + \beta - 2}, \qquad \hat p_{\text{mean}} = \frac{k + \alpha}{n + \alpha + \beta}
$$

With Beta(2, 2) and 3 / 3 conversions: MLE = 1.0 (absurdly confident), MAP = 4/5 = 0.8, posterior mean = 5/7 ≈ 0.71.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Ridge regression (L2 penalty) corresponds to MAP estimation with which prior on the coefficients?",
  "options": ["Uniform", "Gaussian centered at 0", "Laplace centered at 0", "Beta"],
  "answer": 1,
  "explanation": "The log of a zero-mean Gaussian prior is −w²/(2σ²) + const, which is an L2 penalty."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `estimates(k, n, alpha, beta)` returning `(mle, map, posterior_mean)` for a conversion rate with a Beta(alpha, beta) prior. Assume alpha, beta > 1.",
  "starterCode": "def estimates(k, n, alpha, beta):\n    pass\n\nprint(estimates(3, 3, 2, 2))",
  "tests": "mle, mp, pm = estimates(3, 3, 2, 2)\nassert abs(mle - 1.0) < 1e-12 and abs(mp - 0.8) < 1e-12 and abs(pm - 5/7) < 1e-12\nmle, mp, pm = estimates(500, 10000, 2, 2)\nassert abs(mle - mp) < 1e-3 and abs(mle - pm) < 1e-3",
  "solution": "def estimates(k, n, alpha, beta):\n    mle = k / n\n    map_ = (k + alpha - 1) / (n + alpha + beta - 2)\n    mean = (k + alpha) / (n + alpha + beta)\n    return mle, map_, mean",
  "hints": ["Posterior is Beta(alpha + k, beta + n − k).", "Beta(a, b) has mode (a − 1)/(a + b − 2) and mean a/(a + b)."]
}
```

> [!TIP] Interview tips
> - One line: "MAP is MLE plus a prior; the prior acts as a regularizer".
> - Mention that MAP is not invariant to reparameterization, while the full posterior is.
> - In product analytics, Bayesian estimates shine for small segments and early experiment reads.
