---
id: ml-random-forest
title: Random Forest
estimatedMinutes: 12
difficulty: medium
tags: [ml, supervised, trees, ensembles, bagging]
---

## Why it matters
Random forests are a robust, low-tuning default for tabular data. Interviewers ask why they work (variance reduction via decorrelation), what OOB error is, and how they compare with gradient boosting.

## Concept
Train many deep trees, each with two sources of randomness, and average them:

1. **Bagging**: each tree sees a bootstrap sample (draw $n$ rows with replacement).
2. **Feature subsampling**: at each split, only a random subset of features is considered (commonly $\sqrt{d}$ for classification, $d/3$ for regression).

Why it works: averaging $B$ trees, each with variance $\sigma^2$ and pairwise correlation $\rho$, gives variance

$$
\rho\,\sigma^2 + \frac{1 - \rho}{B}\,\sigma^2
$$

More trees shrink the second term; feature subsampling lowers $\rho$ and hence the first term. Bias stays about the same as one deep tree.

**Out-of-bag (OOB) error**: each bootstrap sample leaves out about $1 - (1 - 1/n)^n \approx 1/e \approx 36.8\%$ of rows. Predicting each row using only trees that didn't see it gives a free validation estimate.

Practical notes:
- Adding trees doesn't overfit; it just costs compute. Tune `max_features`, `min_samples_leaf`, depth.
- Impurity-based feature importance is biased toward high-cardinality features; prefer **permutation importance** or SHAP.
- vs gradient boosting: RF is easier to tune and parallelizes trivially; well-tuned boosting usually wins on accuracy.

## Worked example
With $\sigma^2 = 1$, $\rho = 0.3$ and $B = 100$: variance $= 0.3 + 0.7/100 = 0.307$. Going to $B = 1000$ only reaches $0.3007$. Lowering correlation to $\rho = 0.1$ (smaller `max_features`) gives $0.109$ at $B = 100$: decorrelation matters more than adding trees.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why does a random forest consider only a random subset of features at each split?",
  "options": ["To speed up training only", "To decorrelate the trees, so averaging reduces variance more", "To reduce bias", "To handle missing values"],
  "answer": 1,
  "explanation": "Without it, strong features dominate every tree, trees become similar, and averaging helps less."
}
```

```quiz
{
  "id": "q2",
  "question": "Roughly what fraction of training rows is out-of-bag for each tree?",
  "options": ["10%", "25%", "37%", "50%"],
  "answer": 2,
  "explanation": "(1 − 1/n)^n → 1/e ≈ 0.368."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `ensemble_variance(sigma2, rho, B)` using the formula above, `oob_fraction(n)` returning (1 − 1/n)^n, and `bootstrap_oob(n, seed)` that draws a bootstrap sample of indices 0..n−1 using `random.Random(seed).choices` and returns the sorted list of indices that were never drawn.",
  "starterCode": "import random\n\ndef ensemble_variance(sigma2, rho, B):\n    pass\n\ndef oob_fraction(n):\n    pass\n\ndef bootstrap_oob(n, seed):\n    pass\n\nprint(ensemble_variance(1, 0.3, 100), oob_fraction(1000), len(bootstrap_oob(1000, 0)))",
  "tests": "import math, random\nassert abs(ensemble_variance(1, 0.3, 100) - 0.307) < 1e-12\nassert abs(ensemble_variance(2, 0, 4) - 0.5) < 1e-12\nassert abs(oob_fraction(10 ** 6) - 1 / math.e) < 1e-4\noob = bootstrap_oob(5000, 1)\nassert 0.34 < len(oob) / 5000 < 0.40\nassert oob == sorted(oob) and len(set(oob)) == len(oob)\nassert bootstrap_oob(50, 7) == bootstrap_oob(50, 7)",
  "solution": "import random\n\ndef ensemble_variance(sigma2, rho, B):\n    return rho * sigma2 + (1 - rho) * sigma2 / B\n\ndef oob_fraction(n):\n    return (1 - 1 / n) ** n\n\ndef bootstrap_oob(n, seed):\n    drawn = set(random.Random(seed).choices(range(n), k=n))\n    return [i for i in range(n) if i not in drawn]",
  "hints": ["Variance = ρσ² + (1 − ρ)σ²/B.", "random.Random(seed).choices(range(n), k=n) samples with replacement."]
}
```

> [!TIP] Interview tips
> - Explain the two randomness sources and the variance formula; it shows you know *why* it works.
> - Mention OOB error as built-in validation and permutation importance over impurity importance.
> - Compare with boosting: RF reduces variance of low-bias trees; boosting reduces bias of weak learners.
