---
id: statistics-maximum-likelihood-estimation
title: Maximum likelihood estimation (MLE)
estimatedMinutes: 15
difficulty: medium
tags: [statistics, estimation, mle, likelihood]
---

## Why it matters
MLE is how most models are fit: logistic regression, Poisson regression, and neural networks with cross-entropy loss all maximize a likelihood. "Derive the MLE for a coin's p" is a classic whiteboard question.

## Concept
The **likelihood** $L(\theta) = P(\text{data} \mid \theta)$ treats the observed data as fixed and asks which parameter makes it most probable. The MLE is

$$
\hat\theta_{\text{MLE}} = \arg\max_\theta L(\theta) = \arg\max_\theta \sum_i \log p(x_i \mid \theta)
$$

Recipe: write the log-likelihood (products become sums), take the derivative, set it to 0, solve.

Properties (for large samples, under regularity conditions): consistent, asymptotically normal, and asymptotically efficient. It can be biased in small samples, e.g. the normal variance MLE divides by $n$.

Minimizing **cross-entropy / log loss** is exactly maximizing the Bernoulli likelihood.

## Worked example
Coin flips with $k$ heads in $n$ flips:

$$
\ell(p) = k \log p + (n - k)\log(1 - p), \qquad \ell'(p) = \frac{k}{p} - \frac{n - k}{1 - p} = 0 \;\Rightarrow\; \hat p = \frac{k}{n}
$$

For Poisson counts $x_1, \dots, x_n$: $\ell(\lambda) = \sum x_i \log\lambda - n\lambda + \text{const}$, so $\hat\lambda = \bar x$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Waiting times are modeled as Exponential(λ) with density λe^(−λx). What is the MLE of λ?",
  "options": ["x̄", "1 / x̄", "n / Σx² ", "median"],
  "answer": 1,
  "explanation": "ℓ(λ) = n log λ − λ Σx. Setting n/λ − Σx = 0 gives λ̂ = n / Σx = 1 / x̄."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `bernoulli_log_likelihood(p, data)` for a list of 0/1 outcomes, then `grid_mle(data)` that returns the p in {0.001, 0.002, …, 0.999} with the highest log-likelihood. It should land at (about) the sample mean.",
  "starterCode": "import math\n\ndef bernoulli_log_likelihood(p, data):\n    pass\n\ndef grid_mle(data):\n    pass\n\nprint(grid_mle([1, 0, 1, 1, 0, 1, 0, 1]))",
  "tests": "import math\nassert abs(bernoulli_log_likelihood(0.5, [1, 0]) - 2 * math.log(0.5)) < 1e-12\nassert abs(grid_mle([1, 0, 1, 1, 0, 1, 0, 1]) - 0.625) < 1e-9\nassert abs(grid_mle([0, 0, 0, 1]) - 0.25) < 1e-9",
  "solution": "import math\n\ndef bernoulli_log_likelihood(p, data):\n    return sum(math.log(p) if x == 1 else math.log(1 - p) for x in data)\n\ndef grid_mle(data):\n    grid = [i / 1000 for i in range(1, 1000)]\n    return max(grid, key=lambda p: bernoulli_log_likelihood(p, data))",
  "hints": ["Sum log p for each 1 and log(1 − p) for each 0.", "max(grid, key=...) picks the best grid point."]
}
```

> [!TIP] Interview tips
> - Always switch to the log-likelihood before differentiating; say why (sums are easier, and it's numerically stable).
> - Connect MLE to familiar losses: log loss ↔ Bernoulli, squared error ↔ Gaussian with fixed variance.
> - Mention MLE's small-sample issues (overfitting, 0/1 probabilities) and that priors (MAP) help.
