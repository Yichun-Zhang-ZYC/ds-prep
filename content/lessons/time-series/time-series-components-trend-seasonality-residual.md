---
id: time-series-components-trend-seasonality-residual
title: "Components: trend, seasonality, residual"
estimatedMinutes: 10
difficulty: easy
tags: [time-series, decomposition, seasonality, trend]
---

## Why it matters
Every forecasting interview starts with "what does the series look like?" Splitting a series into trend, seasonality and noise tells you which model family fits, what to difference, and what a sensible baseline is.

## Concept
A time series $y_t$ is commonly modeled as a combination of:
- **Trend** $T_t$: long-run direction (growth, decline).
- **Seasonality** $S_t$: a pattern repeating with a fixed period $m$ (7 for daily data with weekly cycles, 12 for monthly data with yearly cycles).
- **Residual** $R_t$: what is left; ideally white noise. Cycles (irregular ups and downs of non-fixed length, such as business cycles) are separate from seasonality.

**Additive**: $y_t = T_t + S_t + R_t$. Use when seasonal swings have constant size.
**Multiplicative**: $y_t = T_t \cdot S_t \cdot R_t$. Use when swings grow with the level; taking $\log y_t$ turns it into an additive model.

**Classical decomposition**: (1) estimate the trend with a centered moving average of length $m$; (2) detrend, $y_t - \hat T_t$; (3) average the detrended values per season position and center them to sum to zero; (4) residual = what remains. Weaknesses: no trend estimate at the ends, a fixed seasonal pattern, sensitivity to outliers. **STL** (LOESS-based) fixes these: seasonality can evolve, it is robust to outliers, and it works for any period.

Check the residuals: if they still show autocorrelation or a pattern, the decomposition missed structure. Also watch for **multiple seasonalities** (daily and weekly in hourly data) and **calendar effects** (holidays, trading days).

## Worked example
Quarterly sales with trend $100 + 5t$ and seasonal indices $+8, -2, -10, +4$ (sum 0). In quarter 3 of year 2 ($t = 6$, counting from 0), the trend is $130$, so the expected value is $130 - 10 = 120$. If the observed value is 123, the residual is $+3$. For a series whose seasonal swing grows (say $\pm 5\%$ of the level), use a multiplicative model with indices such as $1.05, 0.98, 0.93, 1.04$ applied to the level.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Monthly airline passengers show seasonal swings that grow as the overall passenger count grows. Which is the best first step?",
  "options": [
    "Fit an additive decomposition directly",
    "Log-transform (or use a multiplicative model), then decompose",
    "Remove the seasonality by dropping December",
    "Use a moving average of length 3"
  ],
  "answer": 1,
  "explanation": "Growing seasonal amplitude indicates a multiplicative structure; the log turns products into sums so an additive model fits."
}
```

```quiz
{
  "id": "q2",
  "question": "Why does classical decomposition with a centered moving average give no trend estimate for the first and last points?",
  "options": [
    "The moving average needs data on both sides of each point",
    "Seasonality is undefined at the ends",
    "The residual must be zero there",
    "It always drops one full period"
  ],
  "answer": 0,
  "explanation": "A centered window of length m needs about m/2 observations on each side, so those endpoints cannot be computed."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `decompose(y, m)`: classical additive decomposition for a numpy array `y` with period `m`. Trend = centered moving average (for even `m` use the 2×m MA: half weight on both ends; leave `np.nan` where undefined). Seasonal = mean of the detrended values for each position `t % m` (ignore NaN), shifted to sum to zero and tiled to len(y). Residual = y − trend − seasonal. Return `(trend, seasonal, resid)`.",
  "setup": "import numpy as np",
  "starterCode": "def decompose(y, m):\n    pass\n\nt = np.arange(16)\ny = 10 + 2 * t + np.tile([3, -1, -3, 1], 4)\nprint(decompose(y.astype(float), 4)[1][:4])",
  "tests": "t = np.arange(16)\ny = (10 + 2 * t + np.tile([3, -1, -3, 1], 4)).astype(float)\ntr, se, re = decompose(y, 4)\nassert len(tr) == 16 and np.isnan(tr[:2]).all() and np.isnan(tr[-2:]).all()\nassert not np.isnan(tr[2:14]).any()\nassert np.allclose(tr[2:14], 10 + 2 * t[2:14])\nassert np.allclose(se[:4], [3, -1, -3, 1]) and abs(se[:4].sum()) < 1e-9\nassert np.allclose(re[2:14], 0, atol=1e-9)\ny3 = np.array([1, 2, 3, 4, 5, 6, 7.0])\ntr3, _, _ = decompose(y3, 3)\nassert np.allclose(tr3[1:-1], y3[1:-1]) and np.isnan(tr3[0]) and np.isnan(tr3[-1])",
  "solution": "def decompose(y, m):\n    y = np.asarray(y, dtype=float)\n    n = len(y)\n    trend = np.full(n, np.nan)\n    h = m // 2\n    if m % 2 == 1:\n        for t in range(h, n - h):\n            trend[t] = y[t - h:t + h + 1].mean()\n    else:\n        for t in range(h, n - h):\n            trend[t] = (0.5 * y[t - h] + y[t - h + 1:t + h].sum() + 0.5 * y[t + h]) / m\n    detr = y - trend\n    idx = np.array([np.nanmean(detr[k::m]) for k in range(m)])\n    idx = idx - idx.mean()\n    seasonal = np.tile(idx, n // m + 1)[:n]\n    return trend, seasonal, y - trend - seasonal",
  "packages": [
    "numpy"
  ],
  "hints": [
    "For even m the centered MA is (0.5·y[t−m/2] + y[t−m/2+1..t+m/2−1] + 0.5·y[t+m/2]) / m.",
    "np.nanmean(detrended[k::m]) gives the raw seasonal index for position k."
  ]
}
```

> [!TIP] Interview tips
> - Say how you choose additive vs multiplicative: look at whether seasonal amplitude grows with the level; log-transform to make it additive.
> - Mention STL as the practical default and that classical decomposition loses the first and last $m/2$ points.
> - Pitfall: calling the data "seasonal" without a known period. Confirm with an ACF spike at lag $m$ or domain knowledge.
