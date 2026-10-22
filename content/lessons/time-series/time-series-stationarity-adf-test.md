---
id: time-series-stationarity-adf-test
title: "Stationarity, ADF test"
estimatedMinutes: 12
difficulty: medium
tags: [time-series, stationarity, adf, unit-root]
---

## Why it matters
Classical models (ARMA, ARIMA) assume the statistical properties of the series do not drift over time. Interviewers ask what stationarity is, how to test it, and what you do when the test says "no".

## Concept
A series is **weakly (covariance) stationary** if the mean $E[y_t]=\mu$ is constant, the variance $\text{Var}(y_t)=\sigma^2$ is constant, and the autocovariance $\text{Cov}(y_t, y_{t-k})$ depends only on the lag $k$. White noise is stationary; a trend, a seasonal pattern, or growing variance is not. **Strict** stationarity (the whole joint distribution is shift-invariant) is stronger and rarely needed.

**Why it matters**: with stationarity, past behavior is informative about the future, so sample moments and fitted coefficients generalize. Regressing one non-stationary series on another gives **spurious regression** (high $R^2$, meaningless).

**Trend-stationary vs difference-stationary**: $y_t = a + bt + \varepsilon_t$ is stationary after removing the trend. A **random walk** $y_t = y_{t-1} + \varepsilon_t$ has a **unit root**; its variance grows as $t\sigma^2$ and shocks never die out. Remove the trend by regression in the first case, by differencing in the second.

**ADF test** (augmented Dickey-Fuller): regress $\Delta y_t = \alpha + \beta t + \gamma y_{t-1} + \sum_{i=1}^p \delta_i \Delta y_{t-i} + \varepsilon_t$.
- $H_0$: $\gamma = 0$ (unit root, non-stationary). $H_1$: $\gamma < 0$ (stationary).
- The t-statistic follows the Dickey-Fuller distribution, not Student-t. Reject $H_0$ when the statistic is more negative than the critical value (about $-2.86$ at 5% with a constant).
- The lagged differences absorb autocorrelation; choose $p$ by AIC.

**KPSS** flips the hypotheses ($H_0$: stationary), so run both. ADF rejects and KPSS does not: stationary. Both fail to reject: low power or ambiguity.

## Worked example
A random walk with 300 points: the ADF statistic is, say, $-1.4$ (above the $-2.86$ cutoff), so we fail to reject the unit root and difference once. After differencing we get white noise with an ADF statistic of about $-17$, so we reject. A trend-stationary series $y_t = 0.3t + \varepsilon_t$ may fail the constant-only test; test with a trend term, or detrend by regression first.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "In the ADF test, a p-value of 0.40 means:",
  "options": [
    "The series is stationary",
    "We fail to reject the unit root, so treat it as non-stationary and difference",
    "The series has no trend",
    "The residuals are white noise"
  ],
  "answer": 1,
  "explanation": "The null is a unit root. A large p-value gives no evidence against it, so the series is treated as non-stationary."
}
```

```quiz
{
  "id": "q2",
  "question": "Which of these series is (weakly) stationary?",
  "options": [
    "A random walk",
    "y_t = 0.5 t + noise",
    "An AR(1) process with coefficient 0.6",
    "Monthly sales with growing seasonal amplitude"
  ],
  "answer": 2,
  "explanation": "An AR(1) with |phi| < 1 has constant mean and variance and lag-dependent autocovariance. The others have a unit root, a trend or changing variance."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `df_stat(y)`: the (non-augmented) Dickey-Fuller t-statistic with a constant. Regress `dy[t] = y[t] - y[t-1]` on `[1, y[t-1]]` by OLS and return the t-statistic of the `y[t-1]` coefficient, $\\hat\\gamma / SE(\\hat\\gamma)$ with $SE^2 = s^2 (X^TX)^{-1}_{11}$ and $s^2 = RSS/(n-2)$. Then `is_stationary(y, crit=-2.86)` returns True when the statistic is below `crit` (reject the unit root).",
  "setup": "import numpy as np",
  "starterCode": "def df_stat(y):\n    pass\n\ndef is_stationary(y, crit=-2.86):\n    pass\n\nrng = np.random.default_rng(0)\ne = rng.normal(size=300)\nwalk = np.cumsum(e)\nprint(df_stat(walk), df_stat(e))",
  "tests": "rng = np.random.default_rng(0)\ne = rng.normal(size=300)\nwalk = np.cumsum(e)\nar = np.zeros(300)\nfor t in range(1, 300):\n    ar[t] = 0.5 * ar[t - 1] + e[t]\nassert df_stat(e) < -10\nassert df_stat(ar) < -5\nassert is_stationary(ar) and is_stationary(e)\nassert not is_stationary(walk)\nassert df_stat(walk) > -2.86\nyy = np.array([1.0, 2.0, 2.0, 3.0, 5.0, 4.0])\ny0, dy = yy[:-1], np.diff(yy)\nX = np.column_stack([np.ones(5), y0])\nb = np.linalg.solve(X.T @ X, X.T @ dy)\nr = dy - X @ b\nse = np.sqrt((r @ r) / 3 * np.linalg.inv(X.T @ X)[1, 1])\nassert abs(df_stat(yy) - b[1] / se) < 1e-9",
  "solution": "def df_stat(y):\n    y = np.asarray(y, dtype=float)\n    dy = np.diff(y)\n    X = np.column_stack([np.ones(len(dy)), y[:-1]])\n    xtx_inv = np.linalg.inv(X.T @ X)\n    beta = xtx_inv @ X.T @ dy\n    resid = dy - X @ beta\n    s2 = resid @ resid / (len(dy) - 2)\n    return beta[1] / np.sqrt(s2 * xtx_inv[1, 1])\n\ndef is_stationary(y, crit=-2.86):\n    return bool(df_stat(y) < crit)",
  "packages": [
    "numpy"
  ],
  "hints": [
    "Build X = column_stack([ones, y[:-1]]) and solve OLS with the normal equations.",
    "The statistic is compared with Dickey-Fuller critical values (about -2.86 at 5% with a constant), not the normal distribution."
  ]
}
```

> [!TIP] Interview tips
> - State the null correctly: ADF's $H_0$ is a unit root. A large p-value means "not shown to be stationary", not "non-stationary proven".
> - Pair ADF with KPSS, and always look at the plot; structural breaks reduce ADF's power.
> - Don't over-difference: if the series is already stationary, differencing introduces a negative lag-1 autocorrelation (about $-0.5$).
