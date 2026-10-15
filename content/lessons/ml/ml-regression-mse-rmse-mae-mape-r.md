---
id: ml-regression-mse-rmse-mae-mape-r
title: "Regression: MSE, RMSE, MAE, MAPE, R²"
estimatedMinutes: 12
difficulty: easy
tags: [ml, evaluation, regression, metrics]
---

## Why it matters
Choosing the regression metric is choosing what errors you care about. Interviewers ask "RMSE or MAE?", "what's wrong with MAPE?" and "can R² be negative?".

## Concept
For predictions $\hat y_i$ and targets $y_i$:

$$
\text{MSE} = \frac{1}{n}\sum (y_i - \hat y_i)^2 \qquad \text{RMSE} = \sqrt{\text{MSE}} \qquad \text{MAE} = \frac{1}{n}\sum |y_i - \hat y_i|
$$

$$
\text{MAPE} = \frac{100\%}{n}\sum \left|\frac{y_i - \hat y_i}{y_i}\right| \qquad R^2 = 1 - \frac{\sum (y_i - \hat y_i)^2}{\sum (y_i - \bar y)^2}
$$

- **MSE / RMSE** penalize large errors heavily (squared). RMSE is in the target's units. Minimized by predicting the **conditional mean**.
- **MAE** treats all errors linearly: more robust to outliers. Minimized by the **conditional median**.
- **MAPE** is scale-free and easy to explain ("off by 8% on average"), but explodes when $y$ is near 0, is undefined at 0, and penalizes over-forecasts more than under-forecasts. Alternatives: sMAPE, **WAPE** $= \sum|y - \hat y| / \sum |y|$.
- **R²**: fraction of variance explained relative to predicting the mean. 1 is perfect, 0 equals the mean baseline, and it **can be negative** on test data if the model is worse than the mean. It's not comparable across datasets with different variance.
- Asymmetric costs (stock-outs worse than overstock): use **quantile (pinball) loss** or a custom cost.

## Worked example
Errors on five predictions: [1, −1, 2, −2, 10]. MAE = 16/5 = 3.2. MSE = (1 + 1 + 4 + 4 + 100)/5 = 22, RMSE ≈ 4.69. The single error of 10 dominates RMSE; if that outlier is a data glitch, MAE is the fairer summary.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Forecasting daily sales where many stores have days with 0 sales. Which metric should you avoid?",
  "options": ["MAE", "RMSE", "MAPE", "WAPE"],
  "answer": 2,
  "explanation": "MAPE divides by the actual value, which is undefined at 0 and explodes near it."
}
```

```quiz
{
  "id": "q2",
  "question": "A model has R² = −0.3 on the test set. What does that mean?",
  "options": ["Impossible; R² is between 0 and 1", "The model predicts worse than always predicting the mean of the test targets", "30% of variance is explained", "The model is perfectly calibrated"],
  "answer": 1,
  "explanation": "R² below 0 means its squared error exceeds that of the mean baseline."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `regression_metrics(y, yhat)` returning a dict with keys `'mse'`, `'rmse'`, `'mae'`, `'mape'` (as a percentage; skip rows where y == 0) and `'r2'`.",
  "starterCode": "import math\n\ndef regression_metrics(y, yhat):\n    pass\n\nprint(regression_metrics([3, 5, 2, 7], [2.5, 5, 4, 8]))",
  "tests": "import math\nm = regression_metrics([3, 5, 2, 7], [2.5, 5, 4, 8])\nassert abs(m['mse'] - 1.3125) < 1e-12\nassert abs(m['rmse'] - math.sqrt(1.3125)) < 1e-12\nassert abs(m['mae'] - 0.875) < 1e-12\nassert abs(m['mape'] - 100 * (0.5 / 3 + 0 + 1.0 + 1 / 7) / 4) < 1e-9\nassert abs(m['r2'] - (1 - 5.25 / 14.75)) < 1e-12\nm0 = regression_metrics([0, 10], [1, 10])\nassert abs(m0['mape'] - 0) < 1e-12\nmb = regression_metrics([1, 2, 3], [3, 3, 3])\nassert mb['r2'] < 0",
  "solution": "import math\n\ndef regression_metrics(y, yhat):\n    n = len(y)\n    errs = [a - b for a, b in zip(y, yhat)]\n    mse = sum(e * e for e in errs) / n\n    mae = sum(abs(e) for e in errs) / n\n    pct = [abs(e / a) for e, a in zip(errs, y) if a != 0]\n    mape = 100 * sum(pct) / len(pct)\n    mean = sum(y) / n\n    ss_tot = sum((a - mean) ** 2 for a in y)\n    r2 = 1 - sum(e * e for e in errs) / ss_tot\n    return {'mse': mse, 'rmse': math.sqrt(mse), 'mae': mae, 'mape': mape, 'r2': r2}",
  "hints": ["Compute errors once and reuse them.", "For MAPE, average only over rows with non-zero actuals."]
}
```

> [!TIP] Interview tips
> - Tie the metric to the business cost: big misses very costly → RMSE; robust typical error → MAE; relative error → WAPE rather than MAPE.
> - Know that MSE ↔ mean and MAE ↔ median; it explains their outlier behavior.
> - Report a baseline (predict the mean or last value) alongside every metric.
