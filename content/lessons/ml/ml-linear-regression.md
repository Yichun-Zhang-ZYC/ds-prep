---
id: ml-linear-regression
title: Linear Regression
estimatedMinutes: 15
difficulty: medium
tags: [ml, supervised, regression, linear-models]
---

## Why it matters
Linear regression is the baseline for every regression problem and the most common "derive it / explain the assumptions" question. Interviewers probe assumptions, interpretation and what goes wrong (multicollinearity, outliers, heteroscedasticity).

## Concept
Model: $y = X\beta + \varepsilon$. **Ordinary least squares (OLS)** minimizes the sum of squared residuals:

$$
\hat\beta = \arg\min_\beta \lVert y - X\beta \rVert^2 = (X^\top X)^{-1} X^\top y
$$

For one feature: slope $\hat\beta_1 = \dfrac{\text{Cov}(x, y)}{\text{Var}(x)}$, intercept $\hat\beta_0 = \bar y - \hat\beta_1 \bar x$.

Classic assumptions (LINE + no multicollinearity):
- **L**inearity: $E[y \mid x]$ is linear in the parameters (features can be transformed: logs, squares).
- **I**ndependence of errors.
- **N**ormality of errors: only needed for exact small-sample t-tests and intervals.
- **E**qual variance (homoscedasticity). Violation → coefficients still unbiased but standard errors wrong; use robust (HC) standard errors.
- No perfect multicollinearity. High collinearity inflates the variance of coefficients (check VIF) without hurting predictions much.

Interpretation: $\beta_j$ = expected change in $y$ for a one-unit increase in $x_j$, **holding other features fixed**. It's associational, not causal, unless the design supports it. With $\log y$, $\beta_j \approx$ relative (%) change.

Solving: closed form for small $d$; gradient descent or QR/SVD-based solvers for large or ill-conditioned problems. OLS is the maximum-likelihood estimate under Gaussian errors. Squared loss makes it sensitive to outliers (consider Huber loss).

## Worked example
$x = [1, 2, 3, 4]$, $y = [2, 4, 5, 7]$. $\bar x = 2.5$, $\bar y = 4.5$. $\text{Cov} \propto \sum (x-\bar x)(y - \bar y) = 8$, $\sum (x - \bar x)^2 = 5$. Slope $= 1.6$, intercept $= 4.5 - 1.6 \cdot 2.5 = 0.5$. Fitted line: $\hat y = 0.5 + 1.6x$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Two features are highly correlated (VIF = 25). What happens to an OLS fit?",
  "options": ["Predictions become badly biased", "Coefficients become unstable with large standard errors, though predictions may still be fine", "R² drops to zero", "The model can't be fit at all"],
  "answer": 1,
  "explanation": "Multicollinearity makes it hard to separate each feature's effect, inflating coefficient variance. Predictive accuracy is often little affected."
}
```

```quiz
{
  "id": "q2",
  "question": "Residuals fan out as fitted values increase. What's the main consequence?",
  "options": ["Coefficients are biased", "Standard errors and p-values are unreliable", "The model is non-linear", "R² is overstated by exactly 2×"],
  "answer": 1,
  "explanation": "Heteroscedasticity leaves OLS coefficients unbiased but makes the usual standard errors wrong. Use robust SEs or transform y (e.g. log)."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Without numpy, write `fit_simple(xs, ys)` returning `(intercept, slope)` for single-feature OLS, and `r_squared(xs, ys)` returning R² = 1 − SS_res / SS_tot of that fit.",
  "starterCode": "def fit_simple(xs, ys):\n    pass\n\ndef r_squared(xs, ys):\n    pass\n\nprint(fit_simple([1, 2, 3, 4], [2, 4, 5, 7]), r_squared([1, 2, 3, 4], [2, 4, 5, 7]))",
  "tests": "b0, b1 = fit_simple([1, 2, 3, 4], [2, 4, 5, 7])\nassert abs(b0 - 0.5) < 1e-12 and abs(b1 - 1.6) < 1e-12\nassert abs(r_squared([1, 2, 3, 4], [2, 4, 5, 7]) - (1 - 0.2 / 13)) < 1e-12\nassert abs(r_squared([1, 2, 3], [3, 5, 7]) - 1) < 1e-12",
  "solution": "def fit_simple(xs, ys):\n    n = len(xs)\n    mx, my = sum(xs) / n, sum(ys) / n\n    sxy = sum((x - mx) * (y - my) for x, y in zip(xs, ys))\n    sxx = sum((x - mx) ** 2 for x in xs)\n    b1 = sxy / sxx\n    return my - b1 * mx, b1\n\ndef r_squared(xs, ys):\n    b0, b1 = fit_simple(xs, ys)\n    my = sum(ys) / len(ys)\n    ss_res = sum((y - (b0 + b1 * x)) ** 2 for x, y in zip(xs, ys))\n    ss_tot = sum((y - my) ** 2 for y in ys)\n    return 1 - ss_res / ss_tot",
  "hints": ["Slope = Σ(x−x̄)(y−ȳ) / Σ(x−x̄)².", "For the example, residuals are −0.1, 0.3, −0.3, 0.1."]
}
```

> [!TIP] Interview tips
> - Be ready to derive the normal equations: set the gradient $-2X^\top(y - X\beta)$ to 0.
> - Know which assumption violations bias coefficients (omitted variables, non-linearity) vs only break inference (heteroscedasticity, non-normality).
> - Interpret coefficients "holding others fixed" and avoid causal language unless justified.
