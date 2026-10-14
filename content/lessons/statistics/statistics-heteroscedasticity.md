---
id: statistics-heteroscedasticity
title: Heteroscedasticity
estimatedMinutes: 10
difficulty: medium
tags: [statistics, regression, diagnostics, robust-se]
---

## Why it matters
Most business data has errors that grow with the scale of the outcome (big customers vary more). Ignoring this gives overconfident p-values. Knowing the "robust standard errors" fix is expected for DS roles.

## Concept
**Homoscedasticity**: the error variance is the same for all observations. **Heteroscedasticity**: it changes, typically growing with $x$ or with $\hat y$ (a "funnel" in the residuals-vs-fitted plot).

Consequences:
- OLS coefficients stay **unbiased**.
- Standard errors (and so p-values, CIs) are **wrong**, often too small.
- OLS is no longer the most efficient estimator.

Fixes:
- **Heteroscedasticity-robust (HC / "sandwich") standard errors**: keep OLS, fix the SEs. The default choice.
- Transform $y$ (log), which often stabilizes variance for multiplicative data.
- Weighted least squares when you know the variance structure.

Detection: residuals vs fitted plot; Breusch–Pagan or White test.

## Worked example
Regressing order value on customer tenure: new customers' orders cluster tightly around \$30, while long-tenure customers range from \$20 to \$500. The residual plot fans out.

The tenure coefficient (say +\$4 per year) is still unbiased, but the classic SE might say ±0.5 when the robust SE is ±1.4. The "highly significant" result may only be "significant". Log(order value) often also makes the spread more even.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What does heteroscedasticity do to OLS coefficient estimates?",
  "options": ["Biases them", "Leaves them unbiased but makes the usual standard errors unreliable", "Makes them all zero", "Nothing at all"],
  "answer": 1,
  "explanation": "Unbiasedness only needs exogeneity. Constant variance matters for the standard errors."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `variance_ratio(xs, residuals)`: split observations at the median of x, and return var(residuals in upper half) / var(residuals in lower half) (population variances). Values far from 1 suggest heteroscedasticity (a simple Goldfeld–Quandt-style check).",
  "starterCode": "def variance_ratio(xs, residuals):\n    pass\n\nxs = [1, 2, 3, 4, 5, 6, 7, 8]\nres = [0.1, -0.1, 0.2, -0.2, 1.0, -1.2, 2.0, -1.8]\nprint(variance_ratio(xs, res))",
  "tests": "xs = [1, 2, 3, 4, 5, 6, 7, 8]\nres = [0.1, -0.1, 0.2, -0.2, 1.0, -1.2, 2.0, -1.8]\nassert variance_ratio(xs, res) > 20\nassert abs(variance_ratio(xs, [1, -1, 1, -1, 1, -1, 1, -1]) - 1) < 1e-12",
  "solution": "def _pvar(v):\n    m = sum(v) / len(v)\n    return sum((x - m) ** 2 for x in v) / len(v)\n\ndef variance_ratio(xs, residuals):\n    pairs = sorted(zip(xs, residuals))\n    half = len(pairs) // 2\n    low = [r for _, r in pairs[:half]]\n    high = [r for _, r in pairs[half:]]\n    return _pvar(high) / _pvar(low)",
  "hints": ["Sort (x, residual) pairs by x, split into halves, compare the residual variances."]
}
```

> [!TIP] Interview tips
> - Say "coefficients are still unbiased, standard errors aren't; I'd use robust SEs".
> - Mention the residuals-vs-fitted plot as the first diagnostic.
> - For revenue-like outcomes, suggest a log transform, which often fixes skew and heteroscedasticity together.
