---
id: time-series-ar-ma-arma-arima-sarima
title: "AR, MA, ARMA, ARIMA, SARIMA"
estimatedMinutes: 14
difficulty: hard
tags: [time-series, arima, sarima, box-jenkins]
---

## Why it matters
ARIMA is the classic statistical forecasting model and a staple of DS interviews: what do $p, d, q$ mean, how do you pick them, and how do forecasts and intervals behave?

## Concept
**AR($p$)**: regress on past values, $y_t = c + \phi_1 y_{t-1} + \dots + \phi_p y_{t-p} + \varepsilon_t$. Stationary if the roots of $1 - \phi_1 z - \dots - \phi_p z^p$ lie outside the unit circle; for AR(1), $|\phi| < 1$, with mean $c/(1-\phi)$.

**MA($q$)**: regress on past shocks, $y_t = \mu + \varepsilon_t + \theta_1 \varepsilon_{t-1} + \dots + \theta_q \varepsilon_{t-q}$. Always stationary. A shock affects only $q$ later periods. (Not a moving average smoother.)

**ARMA($p,q$)** combines both: $\phi(B) y_t = c + \theta(B)\varepsilon_t$. **ARIMA($p,d,q$)** fits ARMA to the $d$-times differenced series.

**SARIMA** $(p,d,q)(P,D,Q)_m$ adds seasonal AR/MA terms and seasonal differencing at period $m$, e.g. $(1,1,1)(0,1,1)_{12}$ for monthly data (the "airline model").

**Workflow** (Box-Jenkins): (1) make the series stationary (transform, difference); (2) read ACF/PACF for candidate $p, q$ (or search with AIC/BIC, e.g. auto-ARIMA); (3) estimate by maximum likelihood; (4) check residuals are white noise (Ljung-Box, ACF); (5) forecast and validate out of sample.

**Forecast behavior**: for stationary ARMA, long-horizon forecasts converge to the mean. With $d=1$ they become flat or drift-like, and with a constant in a $d=1$ model they follow a linear drift. **Prediction intervals** widen with the horizon (bounded for stationary models, growing like $\sqrt h$ for a random walk). An AR($p$) forecast is recursive: predicted values replace the unknown future ones.

**Limits**: linear, univariate, constant variance (use GARCH for volatility), needs enough history, and handles external regressors only through ARIMAX/SARIMAX.

## Worked example
AR(2): $y_t = 1 + 0.5 y_{t-1} + 0.2 y_{t-2}$ with last values $y_{T-1} = 4$, $y_T = 6$. One step: $1 + 0.5\cdot6 + 0.2\cdot4 = 4.8$. Two steps: $1 + 0.5\cdot4.8 + 0.2\cdot6 = 4.6$. Long-run mean: $1/(1 - 0.5 - 0.2) = 3.33$, which the forecasts approach. For ARIMA(1,1,0) with $\phi = 0.5$ and last two levels $100, 104$: the last difference is $4$, the forecast differences are $2, 1, \dots$ (no constant), so the level forecasts are $106, 107, \dots$ and flatten.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "The ACF of a differenced series cuts off after lag 1 and the PACF decays slowly. Which ARIMA order is most plausible?",
  "options": [
    "ARIMA(1,1,0)",
    "ARIMA(0,1,1)",
    "ARIMA(1,0,1)",
    "ARIMA(0,0,0)"
  ],
  "answer": 1,
  "explanation": "ACF cut-off at lag q signals an MA(q) on the differenced series, so ARIMA(0,1,1)."
}
```

```quiz
{
  "id": "q2",
  "question": "For a stationary ARMA model, what do long-horizon point forecasts converge to?",
  "options": [
    "The last observation",
    "Zero",
    "The unconditional mean of the process",
    "A linear trend"
  ],
  "answer": 2,
  "explanation": "Shock effects decay, so forecasts revert to the process mean (c / (1 - sum of phi) for an AR)."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `fit_ar(y, p)`: least-squares AR(p) with intercept (`y_t = c + phi_1 y_{t-1} + ... + phi_p y_{t-p}`); return `(c, phis)` where `phis` is a list `[phi_1..phi_p]`. Implement `forecast_ar(y, c, phis, h)`: recursive h-step forecasts that feed predictions back in. Then `arima_d1_forecast(y, p, h)`: an ARIMA(p,1,0) forecast = difference once, fit AR(p), forecast the differences, and integrate back to levels.",
  "setup": "import numpy as np",
  "starterCode": "def fit_ar(y, p):\n    pass\n\ndef forecast_ar(y, c, phis, h):\n    pass\n\ndef arima_d1_forecast(y, p, h):\n    pass\n\nprint(forecast_ar([1.0, 2.0], 0.0, [1.0], 2))",
  "tests": "rng = np.random.default_rng(3)\ne = rng.normal(size=1500)\ny = np.zeros(1500)\nfor t in range(2, 1500):\n    y[t] = 1.0 + 0.5 * y[t - 1] - 0.3 * y[t - 2] + e[t]\nc, phis = fit_ar(y, 2)\nassert abs(c - 1.0) < 0.15 and abs(phis[0] - 0.5) < 0.07 and abs(phis[1] + 0.3) < 0.07\nf = forecast_ar([4.0, 6.0], 1.0, [0.5, 0.2], 2)\nassert abs(f[0] - (1 + 0.5 * 6 + 0.2 * 4)) < 1e-12\nassert abs(f[1] - (1 + 0.5 * f[0] + 0.2 * 6)) < 1e-12\nlong = forecast_ar(list(y), c, phis, 200)\nassert abs(long[-1] - c / (1 - sum(phis))) < 1e-6\nw = np.cumsum(y)\nc1, p1 = fit_ar(np.diff(w), 2)\nd = forecast_ar(list(np.diff(w)), c1, p1, 3)\nfl = arima_d1_forecast(w, 2, 3)\nassert len(fl) == 3\nassert abs(fl[0] - (w[-1] + d[0])) < 1e-8 and abs(fl[2] - (w[-1] + sum(d))) < 1e-8",
  "solution": "def fit_ar(y, p):\n    y = np.asarray(y, dtype=float)\n    X = np.column_stack([np.ones(len(y) - p)] + [y[p - k:len(y) - k] for k in range(1, p + 1)])\n    beta, *_ = np.linalg.lstsq(X, y[p:], rcond=None)\n    return float(beta[0]), [float(b) for b in beta[1:]]\n\ndef forecast_ar(y, c, phis, h):\n    hist = list(y)\n    out = []\n    for _ in range(h):\n        nxt = c + sum(phi * hist[-k] for k, phi in enumerate(phis, start=1))\n        hist.append(nxt)\n        out.append(nxt)\n    return out\n\ndef arima_d1_forecast(y, p, h):\n    y = np.asarray(y, dtype=float)\n    dy = np.diff(y)\n    c, phis = fit_ar(dy, p)\n    d = forecast_ar(list(dy), c, phis, h)\n    return [float(v) for v in y[-1] + np.cumsum(d)]",
  "packages": [
    "numpy"
  ],
  "hints": [
    "Row t of X is [1, y[t-1], ..., y[t-p]] and the target is y[t], for t = p..n-1. Use np.linalg.lstsq.",
    "In the recursion, hist[-1] is lag 1, hist[-2] is lag 2, and so on; append each prediction to hist."
  ]
}
```

> [!TIP] Interview tips
> - Be able to say: $d$ comes from stationarity tests, $p$ from the PACF, $q$ from the ACF, and then verify with AIC and residual diagnostics.
> - Mention that AIC cannot be compared across models with different $d$ (different data), so compare via out-of-sample error.
> - Know when not to use ARIMA: many series, nonlinear patterns, rich covariates, multiple seasonalities. Use ETS, ML or global models instead.
