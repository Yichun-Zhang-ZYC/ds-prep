---
id: statistics-r-adjusted-r
title: R², adjusted R²
estimatedMinutes: 10
difficulty: easy
tags: [statistics, regression, model-fit]
---

## Why it matters
"Your model has R² = 0.15. Is it useless?" Interviewers want to hear what R² measures, why it always rises when you add variables, and why a low R² can still be a useful model.

## Concept
$$
R^2 = 1 - \frac{SS_{\text{res}}}{SS_{\text{tot}}} = 1 - \frac{\sum (y_i - \hat y_i)^2}{\sum (y_i - \bar y)^2}
$$

The share of variance in $y$ explained by the model, relative to always predicting the mean.

- Adding any predictor never lowers in-sample R², even pure noise.
- **Adjusted R²** penalizes extra predictors:

$$
R^2_{\text{adj}} = 1 - (1 - R^2)\frac{n - 1}{n - p - 1}
$$

- R² can be negative on new data (worse than predicting the mean).
- Low R² doesn't mean coefficients are wrong: individual behavior is noisy, yet the effect of price on demand can be precisely estimated. High R² doesn't mean causal or well-specified.

## Worked example
n = 50, a model with 3 predictors has R² = 0.40. Adding 10 random predictors raises R² to 0.48.

$$
R^2_{\text{adj}}(3) = 1 - 0.60 \cdot \tfrac{49}{46} \approx 0.361, \qquad R^2_{\text{adj}}(13) = 1 - 0.52 \cdot \tfrac{49}{36} \approx 0.292
$$

Adjusted R² falls: the extra variables don't earn their keep. Better still, compare models on held-out data.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A model predicting individual customer spend has R² = 0.12, but the price coefficient has a tight CI. What's the best reading?",
  "options": ["The model is useless", "Spend is noisy at the individual level, but the price effect can still be reliably estimated", "R² must be above 0.7 to use the model", "The coefficient is wrong"],
  "answer": 1,
  "explanation": "R² measures predictive fit, not whether a specific coefficient is well estimated."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `r_squared(ys, preds)` and `adjusted_r_squared(r2, n, p)`.",
  "starterCode": "def r_squared(ys, preds):\n    pass\n\ndef adjusted_r_squared(r2, n, p):\n    pass\n\nprint(adjusted_r_squared(0.40, 50, 3), adjusted_r_squared(0.48, 50, 13))",
  "tests": "assert abs(r_squared([1, 2, 3], [1, 2, 3]) - 1) < 1e-12\nassert abs(r_squared([1, 2, 3], [2, 2, 2])) < 1e-12\nassert r_squared([1, 2, 3], [3, 2, 1]) < 0\nassert abs(adjusted_r_squared(0.40, 50, 3) - (1 - 0.6 * 49 / 46)) < 1e-12\nassert adjusted_r_squared(0.48, 50, 13) < adjusted_r_squared(0.40, 50, 3)",
  "solution": "def r_squared(ys, preds):\n    m = sum(ys) / len(ys)\n    ss_res = sum((y - p) ** 2 for y, p in zip(ys, preds))\n    ss_tot = sum((y - m) ** 2 for y in ys)\n    return 1 - ss_res / ss_tot\n\ndef adjusted_r_squared(r2, n, p):\n    return 1 - (1 - r2) * (n - 1) / (n - p - 1)",
  "hints": ["Predicting the mean everywhere gives R² = 0; worse predictions give negative values."]
}
```

> [!TIP] Interview tips
> - Say what R² is relative to: the "predict the mean" baseline.
> - Prefer adjusted R² or out-of-sample error when comparing models with different numbers of predictors.
> - Separate the goals: prediction (care about fit) vs inference (care about unbiased, precise coefficients).
