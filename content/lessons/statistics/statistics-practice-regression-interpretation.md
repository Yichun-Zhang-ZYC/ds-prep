---
id: statistics-practice-regression-interpretation
title: "Practice: Interpreting regression output"
estimatedMinutes: 14
difficulty: medium
tags: [statistics, regression, practice, interview]
---

## Why it matters

A common interview prompt is a pasted regression table plus "what does this tell you, and what would you worry about?". Candidates who can read coefficients, standard errors, $R^2$ and the F statistic in thirty seconds, and then name the threats (confounding, collinearity, heteroscedasticity), stand out. This set builds on Interpreting coefficients, $R^2$ and adjusted $R^2$ and Logistic regression interpretation.

## Concept

**Reading a table, in order**:

1. **Units and sign**: a coefficient is the expected change in $y$ per one-unit change in that $x$, **holding the other predictors fixed**.
2. **Significance**: $t = \hat\beta / SE(\hat\beta)$ with $n-k-1$ degrees of freedom; 95% CI $= \hat\beta \pm t_{crit}\,SE$ (about $\pm 2\,SE$). The CI also tells you the plausible magnitude, which a p-value does not.
3. **Fit**: $R^2$ is the share of variance explained; adjusted $R^2 = 1 - (1-R^2)\dfrac{n-1}{n-k-1}$ penalizes useless predictors. Overall $F = \dfrac{R^2/k}{(1-R^2)/(n-k-1)}$ tests that all slopes are zero.
4. **Threats**: omitted confounders, multicollinearity (inflated SEs, unstable signs), non-constant variance (use robust SEs), non-linearity, outliers/leverage, and extrapolation.

**Transformations change the interpretation**:

| Model | Coefficient $b$ means |
|---|---|
| level-level $y = a + bx$ | $+1$ in $x$ changes $y$ by $b$ units |
| log-level $\ln y = a + bx$ | $+1$ in $x$ changes $y$ by about $100b\%$ (exactly $100(e^b-1)\%$) |
| log-log $\ln y = a + b\ln x$ | a 1% increase in $x$ changes $y$ by about $b\%$ (elasticity) |
| logistic $\text{logit}(p) = a + bx$ | $+1$ in $x$ multiplies the odds by $e^b$ |

**Pitfalls**: calling a coefficient causal from observational data; reading a non-significant coefficient as "no effect" (look at the CI); comparing raw coefficients across predictors on different scales (standardize first); celebrating high $R^2$ in time series with trends; interpreting an interaction's main effect without the interaction (see Interaction terms).

## Worked example

A retailer models weekly units sold, $n = 60$ stores-weeks, 3 predictors, residual df $= 56$ ($t_{crit} \approx 2.0$).

| Term | Coef | SE | t | 95% CI |
|---|---|---|---|---|
| Intercept | 120.0 | 15.0 | 8.0 | (90, 150) |
| Price (per 1 unit) | -2.4 | 0.8 | -3.0 | (-4.0, -0.8) |
| Promo (0/1) | 18.0 | 9.0 | 2.0 | (0, 36) |
| Ad spend (per 1k) | 4.5 | 5.0 | 0.9 | (-5.5, 14.5) |

$R^2 = 0.40$, so adjusted $R^2 = 1 - 0.6 \cdot 59/56 = 0.368$ and $F = (0.40/3)/(0.60/56) = 12.4$, strongly rejecting "all slopes are zero".

**Reading**: holding promo and ad spend fixed, each extra unit of price is associated with 2.4 fewer weekly units (CI 0.8 to 4.0), clearly significant. Promo weeks sell about 18 more units, borderline ($t = 2.0$, CI just touches 0). Ad spend is not distinguishable from zero, but its CI (-5.5 to 14.5) is wide, so "no effect" is not established. **Worries**: promos and ad spend probably move together (check VIF); price is set by managers who react to demand (endogeneity), so the price slope is an association, not a price elasticity.

**Transform check**: in a log-level model with $b = 0.12$, the exact effect is $e^{0.12} - 1 = 12.7\%$, not 12%. A logistic coefficient of 0.69 means odds multiply by $e^{0.69} \approx 2$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "In a regression of ln(salary) on years of experience, the coefficient is 0.04. How do you interpret it?",
  "options": [
    "Each extra year adds 0.04 units of salary",
    "Each extra year is associated with roughly 4% higher salary",
    "Salary rises 0.04% per year",
    "Experience explains 4% of the variance"
  ],
  "answer": 1,
  "explanation": "In a log-level model, $100(e^b-1)\\% \\approx 100b\\%$ for small $b$, so about 4% (exactly 4.08%) per extra year."
}
```

```quiz
{
  "id": "q2",
  "question": "A coefficient has estimate 3.0, SE 2.0, and a 95% CI of about (-1, 7). Which statement is best?",
  "options": [
    "There is no effect",
    "The effect is positive with 95% probability",
    "The data cannot rule out zero, but also cannot rule out a sizable positive effect",
    "The model is misspecified"
  ],
  "answer": 2,
  "explanation": "Non-significance is lack of evidence, not evidence of absence. The interval is wide and spans both zero and meaningful effects."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `coef_summary(b, se, crit=2.0)` returning `(t, lo, hi)`: the t-statistic and the confidence interval $b \\pm crit \\cdot se$. Then write `is_significant(b, se, crit=2.0)` that returns `True` when the interval excludes 0. Check with price: b = -2.4, se = 0.8 gives t = -3 and CI (-4.0, -0.8).",
  "starterCode": "def coef_summary(b, se, crit=2.0):\n    pass\n\ndef is_significant(b, se, crit=2.0):\n    pass\n\nprint(coef_summary(-2.4, 0.8), is_significant(4.5, 5.0))",
  "tests": "t, lo, hi = coef_summary(-2.4, 0.8)\nassert abs(t + 3) < 1e-9 and abs(lo + 4.0) < 1e-9 and abs(hi + 0.8) < 1e-9\nt, lo, hi = coef_summary(4.5, 5.0)\nassert abs(t - 0.9) < 1e-9 and abs(lo + 5.5) < 1e-9 and abs(hi - 14.5) < 1e-9\nassert is_significant(-2.4, 0.8) is True\nassert is_significant(4.5, 5.0) is False\nassert is_significant(18.0, 9.0, crit=1.96) is True\nassert is_significant(18.0, 9.0, crit=2.0) is False",
  "solution": "def coef_summary(b, se, crit=2.0):\n    return b / se, b - crit * se, b + crit * se\n\ndef is_significant(b, se, crit=2.0):\n    _, lo, hi = coef_summary(b, se, crit)\n    return lo > 0 or hi < 0",
  "hints": [
    "t is the estimate divided by its standard error.",
    "The CI excludes 0 when lo > 0 or hi < 0 (a strict inequality)."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `adj_r2(r2, n, k)` and `f_stat(r2, n, k)` for a regression with `n` observations and `k` predictors (plus an intercept). Adjusted $R^2 = 1 - (1-R^2)(n-1)/(n-k-1)$ and $F = (R^2/k)/((1-R^2)/(n-k-1))$. Check: $R^2 = 0.40$, $n = 60$, $k = 3$ gives about 0.368 and 12.44.",
  "starterCode": "def adj_r2(r2, n, k):\n    pass\n\ndef f_stat(r2, n, k):\n    pass\n\nprint(adj_r2(0.40, 60, 3), f_stat(0.40, 60, 3))",
  "tests": "assert abs(adj_r2(0.40, 60, 3) - (1 - 0.6 * 59 / 56)) < 1e-12\nassert abs(f_stat(0.40, 60, 3) - (0.4 / 3) / (0.6 / 56)) < 1e-12\n# adding junk predictors at the same R^2 lowers adjusted R^2\nassert adj_r2(0.40, 60, 10) < adj_r2(0.40, 60, 3)\nassert adj_r2(0.0, 30, 2) < 0\nassert abs(f_stat(0.5, 12, 1) - 10.0) < 1e-12",
  "solution": "def adj_r2(r2, n, k):\n    return 1 - (1 - r2) * (n - 1) / (n - k - 1)\n\ndef f_stat(r2, n, k):\n    return (r2 / k) / ((1 - r2) / (n - k - 1))",
  "hints": [
    "The residual degrees of freedom are n − k − 1.",
    "Adjusted R² can be negative when R² is tiny relative to k."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Write `effect(b, kind, x_change=1.0)` that translates a coefficient into an interpretable effect. `kind='level'`: return `b * x_change`. `'log-level'`: percent change in y, `100 * (exp(b * x_change) - 1)`. `'log-log'`: percent change in y for an `x_change` percent increase in x, `100 * ((1 + x_change/100) ** b - 1)`. `'logit'`: the odds ratio `exp(b * x_change)`. Raise `ValueError` for any other kind.",
  "starterCode": "import math\n\ndef effect(b, kind, x_change=1.0):\n    pass\n\nprint(effect(0.12, 'log-level'), effect(0.8, 'log-log'), effect(0.69, 'logit'))",
  "tests": "import math\nassert abs(effect(-2.4, 'level', 2) + 4.8) < 1e-12\nassert abs(effect(0.12, 'log-level') - 12.7496851579) < 1e-6\nassert abs(effect(0.8, 'log-log') - 0.7992031825) < 1e-6\nassert abs(effect(-1.0, 'log-log', 10) - (100 * (1.1 ** -1 - 1))) < 1e-9\nassert abs(effect(0.69, 'logit') - math.exp(0.69)) < 1e-12\nassert abs(effect(0.0, 'logit') - 1) < 1e-12\ntry:\n    effect(1, 'probit')\n    raise AssertionError('should raise')\nexcept ValueError:\n    pass",
  "solution": "import math\n\ndef effect(b, kind, x_change=1.0):\n    if kind == 'level':\n        return b * x_change\n    if kind == 'log-level':\n        return 100 * (math.exp(b * x_change) - 1)\n    if kind == 'log-log':\n        return 100 * ((1 + x_change / 100) ** b - 1)\n    if kind == 'logit':\n        return math.exp(b * x_change)\n    raise ValueError(kind)",
  "hints": [
    "A zero coefficient should give no change: 0 for level and percent kinds, an odds ratio of 1 for logit.",
    "For log-log the exact change is (1 + pct/100)^b − 1; it is close to b·pct for small pct."
  ]
}
```

> [!TIP] Interview tips
> - Read in order: sign and units, CI (not only the p-value), fit, then threats.
> - Say 'holding other variables fixed', and say association unless the design is randomized.
> - Know the interpretation for each transformation (log-level, log-log, logit) cold.
