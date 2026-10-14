---
id: statistics-ols-assumptions
title: OLS assumptions
estimatedMinutes: 12
difficulty: medium
tags: [statistics, regression, ols, diagnostics]
---

## Why it matters
"What are the assumptions of linear regression, and what happens if they're violated?" is one of the most common DS interview questions. A strong answer separates assumptions needed for unbiased coefficients from those needed for valid standard errors.

## Concept
Model: $y = \beta_0 + \beta_1 x_1 + \dots + \beta_p x_p + \varepsilon$. OLS picks the β minimizing $\sum (y_i - \hat y_i)^2$.

| Assumption | If violated |
|---|---|
| **Linearity** in parameters | biased fit; add terms / transforms |
| **No perfect multicollinearity** | coefficients not identifiable; unstable when near-collinear |
| **Exogeneity**: $E[\varepsilon \mid X] = 0$ (no omitted confounders) | **biased** coefficients, the most serious problem |
| **Independent errors** | SEs too small (clustered / time-series data) |
| **Homoscedasticity**: constant error variance | SEs wrong; use robust (HC) SEs |
| **Normal errors** | only matters for small-sample inference; CLT covers large n |

Under the first four (plus homoscedasticity), OLS is **BLUE**: the best linear unbiased estimator (Gauss–Markov).

## Worked example
Regressing sales on ad spend across cities:

- Big cities have both more ad spend **and** more sales for other reasons → omitted variable (city size) biases the ad coefficient upward. Fix: add population as a control, or use an experiment.
- Residual spread grows with city size → heteroscedasticity → use robust standard errors.
- Weekly data for each city → errors correlated within a city → cluster SEs by city.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which violation biases the coefficient estimates themselves, not just their standard errors?",
  "options": ["Heteroscedasticity", "Non-normal errors", "An omitted variable correlated with both x and y", "Autocorrelated errors"],
  "answer": 2,
  "explanation": "Omitted-variable bias breaks exogeneity. The others mainly affect standard errors and p-values."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `simple_ols(xs, ys)` returning `(intercept, slope)` for one predictor, using slope = cov(x, y) / var(x). Then write `residuals(xs, ys)`; their sum should be ~0.",
  "starterCode": "def simple_ols(xs, ys):\n    pass\n\ndef residuals(xs, ys):\n    pass\n\nprint(simple_ols([1, 2, 3, 4], [3, 5, 7, 9]))",
  "tests": "b0, b1 = simple_ols([1, 2, 3, 4], [3, 5, 7, 9])\nassert abs(b0 - 1) < 1e-12 and abs(b1 - 2) < 1e-12\nxs, ys = [1, 2, 3, 4, 5], [2.1, 3.9, 6.2, 7.8, 10.1]\nr = residuals(xs, ys)\nassert abs(sum(r)) < 1e-9\nassert abs(sum(x * e for x, e in zip(xs, r))) < 1e-9",
  "solution": "def simple_ols(xs, ys):\n    n = len(xs)\n    mx, my = sum(xs) / n, sum(ys) / n\n    sxy = sum((x - mx) * (y - my) for x, y in zip(xs, ys))\n    sxx = sum((x - mx) ** 2 for x in xs)\n    slope = sxy / sxx\n    return my - slope * mx, slope\n\ndef residuals(xs, ys):\n    b0, b1 = simple_ols(xs, ys)\n    return [y - (b0 + b1 * x) for x, y in zip(xs, ys)]",
  "hints": ["Slope = Σ(x − x̄)(y − ȳ) / Σ(x − x̄)²; intercept = ȳ − slope·x̄.", "OLS residuals sum to zero and are uncorrelated with x."]
}
```

> [!TIP] Interview tips
> - Rank the assumptions by consequence: exogeneity (bias) first, then error structure (SEs), then normality.
> - Name the fix for each: controls or experiments, robust / clustered SEs, transforms.
> - Mention diagnostics: residuals vs fitted plots, Q-Q plots, VIF.
