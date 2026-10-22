---
id: time-series-moving-averages-exponential-smoothing
title: "Moving averages, exponential smoothing (Holt-Winters)"
estimatedMinutes: 12
difficulty: medium
tags: [time-series, exponential-smoothing, holt-winters, baseline]
---

## Why it matters
Smoothing methods are the fastest strong baselines for forecasting, and Holt-Winters often beats complex models on seasonal business data. Interviewers ask how exponential smoothing works, what $\alpha$ does, and when to pick it over ARIMA.

## Concept
**Moving average** (trailing, window $w$): $\hat y_{t+1} = \frac{1}{w}\sum_{i=0}^{w-1} y_{t-i}$. Larger $w$ is smoother but lags more. (A centered MA is for decomposition, not forecasting.)

**Simple exponential smoothing (SES)**: $\ell_t = \alpha y_t + (1-\alpha)\ell_{t-1}$, forecast $\hat y_{t+h} = \ell_t$ (flat). Unrolled, the weight on the observation $j$ steps back is $\alpha(1-\alpha)^j$: exponentially decaying. High $\alpha$ reacts fast but is noisy; low $\alpha$ is smooth but slow. Fit $\alpha$ by minimizing in-sample one-step SSE. SES is the optimal forecast for an ARIMA(0,1,1).

**Holt (double) smoothing** adds a trend:
- Level: $\ell_t = \alpha y_t + (1-\alpha)(\ell_{t-1} + b_{t-1})$
- Trend: $b_t = \beta(\ell_t - \ell_{t-1}) + (1-\beta)b_{t-1}$
- Forecast: $\hat y_{t+h} = \ell_t + h\,b_t$. Use a **damped** trend ($\phi < 1$) so long horizons do not extrapolate forever; damped Holt is a strong default.

**Holt-Winters (triple)** adds a seasonal component $s_t$ with smoothing $\gamma$ and period $m$: additive $\hat y_{t+h} = \ell_t + h b_t + s_{t+h-m}$, multiplicative $\hat y_{t+h} = (\ell_t + h b_t)\, s_{t+h-m}$. Choose additive for constant seasonal amplitude, multiplicative when it scales with the level. The family is organized as **ETS** (Error, Trend, Seasonal) state-space models, which give prediction intervals and AIC-based selection.

**Vs ARIMA**: ETS models are intuitive, cheap, and handle trend and seasonality directly; ARIMA models autocorrelation and needs stationarity. Both are fine for a single series; neither uses external regressors without extension.

## Worked example
SES with $\alpha = 0.5$ on $10, 12, 14$: $\ell_0 = 10$, $\ell_1 = 0.5\cdot12 + 0.5\cdot10 = 11$, $\ell_2 = 0.5\cdot14 + 0.5\cdot11 = 12.5$. The forecast for every future step is $12.5$ even though the series is rising, which is why SES lags on trending data. Holt on $1,3,5,7,9$ starts with $\ell=1$, $b=2$; each update keeps $\ell_t=y_t$ and $b=2$, so the 3-step forecast is $11, 13, 15$. Weights for $\alpha = 0.3$ on the last four observations: $0.3, 0.21, 0.147, 0.103$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You apply simple exponential smoothing to a steadily rising series. What do the h-step forecasts look like?",
  "options": [
    "They continue the upward trend",
    "They are flat at the last smoothed level, so they lag the trend",
    "They revert to the series mean",
    "They oscillate seasonally"
  ],
  "answer": 1,
  "explanation": "SES has no trend term, so every horizon forecast equals the final level. Use Holt's method for trending data."
}
```

```quiz
{
  "id": "q2",
  "question": "Seasonal amplitude grows in proportion to the level. Which Holt-Winters variant fits?",
  "options": [
    "Additive seasonality",
    "Multiplicative seasonality",
    "No seasonal term",
    "Simple moving average"
  ],
  "answer": 1,
  "explanation": "When seasonal swings scale with the level, the seasonal index multiplies the level (or fit additive on the log)."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `moving_average(y, w)` (trailing average; returns `len(y) - w + 1` values), `ses(y, alpha)` (simple exponential smoothing: `l_0 = y_0`, `l_t = alpha*y_t + (1-alpha)*l_{t-1}`; return the list of levels), and `holt(y, alpha, beta, h)` (additive trend: init `l = y[0]`, `b = y[1] - y[0]`; update `l_t = alpha*y_t + (1-alpha)*(l_{t-1}+b_{t-1})`, `b_t = beta*(l_t - l_{t-1}) + (1-beta)*b_{t-1}` for t >= 1; return the h-step forecasts `l + k*b`, k = 1..h).",
  "setup": "",
  "starterCode": "def moving_average(y, w):\n    pass\n\ndef ses(y, alpha):\n    pass\n\ndef holt(y, alpha, beta, h):\n    pass\n\nprint(ses([10, 12, 14], 0.5))",
  "tests": "assert moving_average([1, 2, 3, 4, 5], 3) == [2, 3, 4]\nassert moving_average([5], 1) == [5]\nl = ses([10, 12, 14], 0.5)\nassert all(abs(a - b) < 1e-12 for a, b in zip(l, [10, 11, 12.5]))\nassert ses([4, 4, 4], 0.3) == [4, 4, 4]\nassert ses([1, 9], 1.0) == [1, 9]\nf = holt([1, 3, 5, 7, 9], 0.5, 0.5, 3)\nassert all(abs(a - b) < 1e-9 for a, b in zip(f, [11, 13, 15]))\nf2 = holt([10, 12, 11, 15], 0.5, 0.5, 2)\n# hand calc: t=1: l=12,b=2 ; t=2: l=.5*11+.5*14=12.5,b=.5*.5+.5*2=1.25 ; t=3: l=.5*15+.5*13.75=14.375,b=.5*1.875+.5*1.25=1.5625\nassert abs(f2[0] - (14.375 + 1.5625)) < 1e-9 and abs(f2[1] - (14.375 + 2 * 1.5625)) < 1e-9",
  "solution": "def moving_average(y, w):\n    return [sum(y[i - w + 1:i + 1]) / w for i in range(w - 1, len(y))]\n\ndef ses(y, alpha):\n    levels = [y[0]]\n    for v in y[1:]:\n        levels.append(alpha * v + (1 - alpha) * levels[-1])\n    return levels\n\ndef holt(y, alpha, beta, h):\n    l, b = y[0], y[1] - y[0]\n    for v in y[1:]:\n        l_new = alpha * v + (1 - alpha) * (l + b)\n        b = beta * (l_new - l) + (1 - beta) * b\n        l = l_new\n    return [l + k * b for k in range(1, h + 1)]",
  "hints": [
    "Holt's update uses the previous trend inside the level update; compute the new level first, then the new trend with the old level.",
    "SES forecasts are flat: every horizon equals the last level."
  ]
}
```

> [!TIP] Interview tips
> - Explain $\alpha$ as a memory knob: $\alpha \to 1$ is naive (last value), $\alpha \to 0$ is the long-run average.
> - Choose by structure: no trend/season gives SES; trend gives Holt (damped); trend and season gives Holt-Winters. Always compare to a seasonal naive baseline.
> - Mention that smoothing initial values and parameters are fit by SSE or likelihood, and that ETS gives prediction intervals.
