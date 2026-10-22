---
id: time-series-prophet
title: "Prophet"
estimatedMinutes: 11
difficulty: medium
tags: [time-series, prophet, changepoints, holidays]
---

## Why it matters
Prophet is a popular open-source forecaster for business series (daily with holidays, strong seasonality, missing data). Interviewers ask how it works, when it is a good fit, and its weaknesses compared with ARIMA or boosted trees.

## Concept
Prophet fits a decomposable additive model: $y(t) = g(t) + s(t) + h(t) + \varepsilon_t$.
- **Trend** $g(t)$: piecewise linear, or **logistic growth** with a capacity $C$ for saturating series. Slope changes at **changepoints** (default 25, placed in the first 80% of history): $g(t) = (k + \mathbf a(t)^\top \boldsymbol\delta)\, t + (m + \mathbf a(t)^\top \boldsymbol\gamma)$. A sparse Laplace prior on the slope changes $\boldsymbol\delta$ (`changepoint_prior_scale`) controls flexibility: too high overfits, too low underfits.
- **Seasonality** $s(t)$: Fourier series $\sum_{k=1}^K \left(a_k \cos\frac{2\pi k t}{P} + b_k \sin\frac{2\pi k t}{P}\right)$ with $P = 365.25$ (yearly, $K=10$) and $P=7$ (weekly, $K=3$). Larger $K$ fits sharper patterns and risks overfitting. `seasonality_mode='multiplicative'` when swings scale with the level.
- **Holidays/events** $h(t)$: indicator columns with optional windows around the date.
- **Extra regressors** can be added (their future values must be known).

**Fitting**: a Bayesian model fit by MAP (Stan L-BFGS), cheap and robust to missing data and outliers without any need for regular spacing or stationarity. Uncertainty intervals come from simulating future trend changepoints plus observation noise.

**Strengths**: interpretable components, holiday handling, trend breaks, tolerates gaps, easy to tune with domain knowledge. **Weaknesses**: it is basically regression on time, with no autoregressive terms, so it misses short-term momentum; it often loses to well-tuned ETS/ARIMA/GBM benchmarks; it extrapolates trends aggressively; many series need many fits. Always **cross-validate** with rolling-origin backtests.

## Worked example
Daily orders: trend slope $+2$/day, then a changepoint at day 50 where growth slows by $0.8$/day (new slope $1.2$). Weekly pattern: $2\sin(2\pi t/7) + \cos(2\pi t/7)$, so the weekly amplitude is $\sqrt{2^2+1^2} \approx 2.24$ orders. At day 60 the trend contribution is $1 + 2\cdot60 - 0.8\cdot(60-50) = 113$. Adding a one-off holiday effect of $-6$ on day 60 gives a prediction of $113 + \text{seasonal} - 6$. If forecasts at day 200 climb implausibly, cap growth with logistic growth or lower `changepoint_prior_scale`.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What does Prophet's changepoint_prior_scale control?",
  "options": [
    "The number of Fourier terms",
    "How flexible the trend is, i.e. how large slope changes may be",
    "The forecast horizon",
    "The size of the holiday window"
  ],
  "answer": 1,
  "explanation": "It sets the scale of the Laplace prior on slope changes: higher allows more flexible trends (risk of overfitting), lower makes the trend stiffer."
}
```

```quiz
{
  "id": "q2",
  "question": "Which is a known weakness of Prophet compared with ARIMA/ETS?",
  "options": [
    "It cannot handle holidays",
    "It requires stationarity",
    "It has no autoregressive terms, so it misses short-term momentum",
    "It cannot give intervals"
  ],
  "answer": 2,
  "explanation": "Prophet is regression on time with trend, seasonality and events; it does not model recent residual autocorrelation unless you add regressors."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Prophet is an additive regression: piecewise-linear trend with changepoints plus Fourier seasonality. Implement `design_matrix(t, changepoints, period, K)` with columns `[1, t, max(0, t - s) for each changepoint s, sin(2πkt/period), cos(2πkt/period) for k = 1..K]` (use `t` as a numpy array), and `fit_predict(t, y, changepoints, period, K, t_new)`, which fits ordinary least squares on `(t, y)` and predicts at `t_new`.",
  "setup": "import numpy as np",
  "starterCode": "def design_matrix(t, changepoints, period, K):\n    pass\n\ndef fit_predict(t, y, changepoints, period, K, t_new):\n    pass\n\nt = np.arange(5.0)\nprint(design_matrix(t, [2.0], 7, 1).shape)",
  "tests": "t = np.arange(100.0)\ndef truth(t):\n    return 1 + 0.5 * t - 0.8 * np.maximum(0, t - 50) + 2 * np.sin(2 * np.pi * t / 7) + 1 * np.cos(2 * np.pi * t / 7)\nX = design_matrix(t[:5], [2.0], 7, 2)\nassert X.shape == (5, 2 + 1 + 4)\nassert np.allclose(X[:, 0], 1) and np.allclose(X[:, 1], t[:5]) and np.allclose(X[:, 2], [0, 0, 0, 1, 2])\nassert np.allclose(X[:, 3], np.sin(2 * np.pi * t[:5] / 7)) and np.allclose(X[:, 4], np.cos(2 * np.pi * t[:5] / 7))\nassert np.allclose(X[:, 5], np.sin(4 * np.pi * t[:5] / 7)) and np.allclose(X[:, 6], np.cos(4 * np.pi * t[:5] / 7))\nt_new = np.arange(100.0, 114.0)\npred = fit_predict(t, truth(t), [50.0], 7, 1, t_new)\nassert np.allclose(pred, truth(t_new), atol=1e-6)\nwrong = fit_predict(t, truth(t), [], 7, 1, t_new)\nassert np.abs(wrong - truth(t_new)).max() > 5",
  "solution": "def design_matrix(t, changepoints, period, K):\n    t = np.asarray(t, dtype=float)\n    cols = [np.ones_like(t), t]\n    for s in changepoints:\n        cols.append(np.maximum(0.0, t - s))\n    for k in range(1, K + 1):\n        cols.append(np.sin(2 * np.pi * k * t / period))\n        cols.append(np.cos(2 * np.pi * k * t / period))\n    return np.column_stack(cols)\n\ndef fit_predict(t, y, changepoints, period, K, t_new):\n    X = design_matrix(t, changepoints, period, K)\n    beta, *_ = np.linalg.lstsq(X, np.asarray(y, dtype=float), rcond=None)\n    return design_matrix(t_new, changepoints, period, K) @ beta",
  "packages": [
    "numpy"
  ],
  "hints": [
    "Each changepoint adds a hinge column max(0, t - s); its coefficient is the change in slope at s.",
    "np.column_stack of the list of columns, then lstsq; predict by building the same design matrix at t_new."
  ]
}
```

> [!TIP] Interview tips
> - Describe it as a generalized additive regression on time (trend + Fourier seasonality + holidays), not as an autoregressive model.
> - Name tuning knobs: changepoint prior scale, seasonality prior and Fourier order, seasonality mode, holidays, logistic cap/floor.
> - Be honest about limits: benchmark against seasonal naive and ETS/ARIMA with rolling-origin CV; consider global ML models for many related series.
