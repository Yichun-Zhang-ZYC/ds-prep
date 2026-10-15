---
id: experimentation-variance-reduction
title: Variance reduction (CUPED)
estimatedMinutes: 15
difficulty: hard
tags: [experimentation, cuped, variance-reduction, power]
---

## Why it matters
Getting more power without more users is extremely valuable. CUPED is the most widely used variance reduction technique at large tech companies, and explaining it clearly is a strong senior-level signal.

## Concept
**CUPED** (Controlled-experiment Using Pre-Experiment Data) adjusts each user's metric using a pre-experiment covariate $X$ (often the same metric in the weeks before the test):

$$
Y_{\text{cuped}} = Y - \theta\,(X - \bar X), \qquad \theta = \frac{\text{Cov}(X, Y)}{\text{Var}(X)}
$$

- Because $X$ is measured **before** randomization, it's independent of treatment, so the adjusted difference in means stays **unbiased**.
- Variance shrinks by a factor of $(1 - \rho^2)$, where $\rho = \text{corr}(X, Y)$. With ρ = 0.7, variance drops by 49%, roughly halving the required sample size.

Other variance reduction tools: stratified randomization / post-stratification, winsorizing heavy tails, ratio metrics with the delta method, regression adjustment with several covariates.

## Worked example
Metric: revenue per user over 2 weeks. Pre-period revenue correlates with it at ρ = 0.6.

Without CUPED, the test needs 400k users per arm. With CUPED, variance becomes $1 - 0.36 = 0.64$ of the original, so about 256k per arm, or the same test reaches a smaller MDE ($\sqrt{0.64} = 0.8\times$).

New users have no pre-period data; set their $X$ to the mean (no adjustment) or use another covariate.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why must the CUPED covariate be measured before the experiment starts?",
  "options": ["It's faster to compute", "So it can't be affected by the treatment, which keeps the estimate unbiased", "Pre-experiment data has lower variance", "It's a legal requirement"],
  "answer": 1,
  "explanation": "A covariate influenced by treatment would absorb part of the treatment effect."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `cuped_adjust(y, x)` returning the adjusted list Y − θ(X − mean(X)) with θ = cov(X, Y)/var(X), and `variance_reduction(y, x)` returning 1 − var(adjusted)/var(y) (it should equal corr(x, y)²).",
  "starterCode": "def cuped_adjust(y, x):\n    pass\n\ndef variance_reduction(y, x):\n    pass\n\npre = [10, 20, 15, 30, 25, 5, 40, 35]\npost = [12, 24, 14, 33, 28, 8, 41, 39]\nprint(variance_reduction(post, pre))",
  "tests": "import statistics\npre = [10, 20, 15, 30, 25, 5, 40, 35]\npost = [12, 24, 14, 33, 28, 8, 41, 39]\nadj = cuped_adjust(post, pre)\nassert abs(statistics.mean(adj) - statistics.mean(post)) < 1e-9\nr = statistics.correlation(pre, post)\nassert abs(variance_reduction(post, pre) - r * r) < 1e-9",
  "solution": "def _mean(v):\n    return sum(v) / len(v)\n\ndef cuped_adjust(y, x):\n    mx, my = _mean(x), _mean(y)\n    cov = sum((a - mx) * (b - my) for a, b in zip(x, y))\n    var = sum((a - mx) ** 2 for a in x)\n    theta = cov / var\n    return [b - theta * (a - mx) for a, b in zip(x, y)]\n\ndef variance_reduction(y, x):\n    adj = cuped_adjust(y, x)\n    my, ma = _mean(y), _mean(adj)\n    vy = sum((b - my) ** 2 for b in y)\n    va = sum((b - ma) ** 2 for b in adj)\n    return 1 - va / vy",
  "hints": ["θ is the slope of regressing Y on X.", "The adjustment doesn't change the mean of Y, only its variance."]
}
```

> [!TIP] Interview tips
> - Explain CUPED in one line: "subtract the part of the metric predictable from pre-experiment behavior".
> - Quote the variance reduction: $1 - \rho^2$.
> - Mention the new-user caveat and alternatives (stratification, winsorizing).
