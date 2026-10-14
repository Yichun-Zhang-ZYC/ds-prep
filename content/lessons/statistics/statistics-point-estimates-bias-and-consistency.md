---
id: statistics-point-estimates-bias-and-consistency
title: Point estimates, bias and consistency
estimatedMinutes: 10
difficulty: medium
tags: [statistics, estimation, bias-variance]
---

## Why it matters
"Is this estimator unbiased? Is that the most important property?" Interviewers use these questions to see if you understand the bias–variance trade-off outside of machine learning.

## Concept
An **estimator** $\hat\theta$ is a rule that turns data into a guess for a parameter $\theta$.

| Property | Meaning |
|---|---|
| Unbiased | $E[\hat\theta] = \theta$: right on average across repeated samples |
| Consistent | $\hat\theta \to \theta$ as $n \to \infty$ |
| Efficient | smallest variance among unbiased estimators |
| MSE | $E[(\hat\theta - \theta)^2] = \text{Bias}^2 + \text{Variance}$ |

Unbiased isn't automatically best. A slightly biased estimator with much lower variance can have lower MSE (that's what regularization and shrinkage do).

Examples: the sample mean is unbiased and consistent for $\mu$. The variance with $1/n$ is biased (too small) but consistent; $1/(n-1)$ removes the bias.

## Worked example
Estimating a rare conversion rate for a small segment with 20 visitors and 0 conversions:

- The raw estimate $\hat p = 0/20 = 0$ is unbiased but very noisy, and "0%" is clearly too extreme.
- Shrinking toward the overall rate, e.g. $(0 + 2) / (20 + 40)$ when the overall rate is 5% (a Beta(2, 38) prior), gives $\approx 3.3\%$: biased toward 5%, but much lower error across many small segments.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Estimator A is unbiased with variance 4. Estimator B has bias 1 and variance 1. Which has lower mean squared error?",
  "options": ["A (MSE 4)", "B (MSE 2)", "They're equal", "Can't tell"],
  "answer": 1,
  "explanation": "MSE = bias² + variance: A = 0 + 4 = 4, B = 1 + 1 = 2."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Simulate the bias of the two variance estimators. Write `avg_variance_estimates(n, reps, seed)` that draws `reps` samples of size `n` from a standard normal (`rng.gauss(0, 1)`, true variance 1) and returns `(mean of the 1/n estimates, mean of the 1/(n−1) estimates)`.",
  "starterCode": "import random\n\ndef avg_variance_estimates(n, reps, seed):\n    pass\n\nprint(avg_variance_estimates(5, 20000, 0))",
  "tests": "biased, unbiased = avg_variance_estimates(5, 20000, 0)\nassert abs(unbiased - 1) < 0.03, unbiased\nassert abs(biased - 0.8) < 0.03, biased",
  "solution": "import random\n\ndef avg_variance_estimates(n, reps, seed):\n    rng = random.Random(seed)\n    b = u = 0.0\n    for _ in range(reps):\n        xs = [rng.gauss(0, 1) for _ in range(n)]\n        m = sum(xs) / n\n        ss = sum((x - m) ** 2 for x in xs)\n        b += ss / n\n        u += ss / (n - 1)\n    return b / reps, u / reps",
  "hints": ["With n = 5, the 1/n estimator averages (n − 1)/n = 0.8 of the true variance."]
}
```

> [!TIP] Interview tips
> - Define MSE = bias² + variance and use it to justify shrinkage or regularization.
> - Say "consistent" when the bias vanishes with more data; it's often good enough in practice.
> - For small segments, propose empirical Bayes shrinkage instead of reporting raw rates.
