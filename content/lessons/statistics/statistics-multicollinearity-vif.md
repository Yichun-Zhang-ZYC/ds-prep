---
id: statistics-multicollinearity-vif
title: Multicollinearity, VIF
estimatedMinutes: 10
difficulty: medium
tags: [statistics, regression, multicollinearity, diagnostics]
---

## Why it matters
"Your coefficient flipped sign when you added a variable. Why?" Multicollinearity is the usual answer. Interviewers want to know what it breaks (coefficient interpretation) and what it doesn't (predictions).

## Concept
**Multicollinearity**: predictors are highly correlated with each other, e.g. `ad_spend_tv` and `ad_spend_total`, or height in cm and in inches.

Effects:
- Coefficients become unstable: large standard errors, signs that flip with small data changes.
- Individual coefficients are hard to interpret ("holding the other constant" is unrealistic).
- Predictions and overall fit are mostly fine.

**Variance inflation factor**: regress predictor $j$ on all other predictors to get $R_j^2$, then

$$
\text{VIF}_j = \frac{1}{1 - R_j^2}
$$

VIF = 1: no collinearity. Above about 5–10: problematic. The SE of $\beta_j$ is inflated by $\sqrt{\text{VIF}_j}$.

Fixes: drop or combine redundant variables, use domain-driven features, or use ridge regression; collect more varied data.

## Worked example
Predicting sales from `price` and `price_with_tax` (= price × 1.08). The two are perfectly correlated: OLS can't separate them (VIF = ∞). Keep one.

With `temperature` and `ice_cream_sales` both predicting `sunscreen_sales`, the correlation is high but not perfect (VIF ≈ 6): the model predicts well, but don't read the two coefficients as separate causal effects.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A predictor's R² when regressed on the other predictors is 0.9. What's its VIF?",
  "options": ["0.9", "1.9", "10", "0.1"],
  "answer": 2,
  "explanation": "VIF = 1 / (1 − 0.9) = 10, so its SE is inflated by √10 ≈ 3.2×."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `vif_two_predictors(xs, zs)`: with exactly two predictors, R²_j is the squared correlation between them. Return the VIF (the same for both). Return `float('inf')` when the correlation is ±1.",
  "starterCode": "import math\n\ndef vif_two_predictors(xs, zs):\n    pass\n\nprint(vif_two_predictors([1, 2, 3, 4, 5], [2, 1, 4, 3, 6]))",
  "tests": "import math, statistics\nxs, zs = [1, 2, 3, 4, 5], [2, 1, 4, 3, 6]\nr = statistics.correlation(xs, zs)\nassert abs(vif_two_predictors(xs, zs) - 1 / (1 - r * r)) < 1e-9\nassert vif_two_predictors([1, 2, 3], [2, 4, 6]) == float('inf')\nassert abs(vif_two_predictors([1, -1, 1, -1], [1, 1, -1, -1]) - 1) < 1e-12",
  "solution": "import math\n\ndef vif_two_predictors(xs, zs):\n    n = len(xs)\n    mx, mz = sum(xs) / n, sum(zs) / n\n    sxz = sum((x - mx) * (z - mz) for x, z in zip(xs, zs))\n    sxx = sum((x - mx) ** 2 for x in xs)\n    szz = sum((z - mz) ** 2 for z in zs)\n    r2 = sxz * sxz / (sxx * szz)\n    if abs(1 - r2) < 1e-12:\n        return float('inf')\n    return 1 / (1 - r2)",
  "hints": ["With two predictors, R²_j = corr(x, z)².", "Guard against division by zero for perfectly correlated inputs."]
}
```

> [!TIP] Interview tips
> - Say what's affected: coefficient stability and interpretation, not prediction quality.
> - Quote the rule of thumb (VIF > 5–10) and name the fixes.
> - In ML settings, regularization (ridge) handles collinearity gracefully.
