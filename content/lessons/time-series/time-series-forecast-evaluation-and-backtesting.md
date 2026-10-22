---
id: time-series-forecast-evaluation-and-backtesting
title: "Forecast evaluation & backtesting"
estimatedMinutes: 13
difficulty: medium
tags: [time-series, evaluation, backtesting, mape, mase]
---

## Why it matters
A forecast is only as trustworthy as its evaluation. Interviewers love time-series evaluation because random k-fold CV is wrong here, and metric choice (MAPE vs MASE) shows whether you understand scale, zeros and baselines.

## Concept
**Point-forecast metrics** (errors $e_t = y_t - \hat y_t$):
- **MAE**: $\frac1n\sum|e_t|$ (same units, robust). **RMSE**: $\sqrt{\frac1n\sum e_t^2}$ (penalizes large errors).
- **MAPE**: $\frac{100}{n}\sum \left|\frac{e_t}{y_t}\right|$. Intuitive, but undefined at $y_t=0$, explodes for small values, and penalizes over-forecasts more than under-forecasts (an under-forecast error is capped at 100%).
- **sMAPE**: $\frac{100}{n}\sum \frac{2|e_t|}{|y_t|+|\hat y_t|}$. Bounded (0-200%), but still unstable near zero and asymmetric; use with care.
- **MASE**: $\dfrac{\text{MAE}}{\frac{1}{T-m}\sum_{t=m+1}^{T}|y_t - y_{t-m}|}$, scaling by the in-sample **naive** (or seasonal naive) error. Scale-free, works with zeros, interpretable: below 1 beats the naive benchmark. Good for comparing across series.
- **WAPE** $=\sum|e_t|/\sum|y_t|$ weights high-volume series; common in retail.
- **Probabilistic**: pinball loss per quantile, CRPS, and **interval coverage** (do 90% intervals contain about 90% of actuals?).
- **Bias** (mean error) matters for planning: unbiased but noisy vs biased but tight.

**Backtesting** = **rolling-origin (walk-forward) evaluation**: choose an origin, train on the past, forecast the next $H$ points, move the origin forward, repeat; average the errors per horizon. **Expanding** window uses all history; **rolling (sliding)** window keeps a fixed length and adapts to regime change. Never shuffle; train strictly before test. Add a **gap** if features use recent data not available at forecast time. Evaluate at the **horizon you will deploy** (error grows with $h$). Hyperparameter tuning needs its own earlier split, or nested walk-forward, to avoid optimistic estimates.

**Baselines**: naive ($\hat y_{t+h}=y_t$), seasonal naive ($y_{t+h-m}$), moving average, drift. A model that cannot beat seasonal naive is not useful.

## Worked example
Actuals $[100, 200]$, forecasts $[110, 180]$: MAPE $=(10\% + 10\%)/2 = 10\%$. sMAPE: $\frac{2\cdot10}{210} = 9.52\%$ and $\frac{2\cdot20}{380} = 10.53\%$, average $10.03\%$. MASE with training series $[1,2,4,7]$: naive one-step MAE $=(1+2+3)/3 = 2$. If forecasts $[4,8]$ miss actuals $[5,7]$ by 1 each, MAE is 1 and MASE $= 0.5$ (twice as good as naive). Walk-forward with $n=10$, initial 4, horizon 2, step 2: train $[0..3]$ test $[4,5]$; train $[0..5]$ test $[6,7]$; train $[0..7]$ test $[8,9]$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A retail dataset has many items with zero-sales days. Which metric is the safest for comparing models across items?",
  "options": [
    "MAPE",
    "sMAPE",
    "MASE",
    "R-squared"
  ],
  "answer": 2,
  "explanation": "MASE scales by the training naive error, so zeros in actuals are fine and results are comparable across series. MAPE is undefined at zero."
}
```

```quiz
{
  "id": "q2",
  "question": "Why is shuffled k-fold CV inappropriate for time series?",
  "options": [
    "It is too slow",
    "Training on future data to predict the past leaks information and ignores temporal dependence",
    "It cannot compute MAE",
    "It needs stationarity"
  ],
  "answer": 1,
  "explanation": "Shuffled folds place future observations in training, giving optimistic error estimates unrepresentative of real forecasting."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement the metrics `mape(y, f)` (mean of |y-f|/|y|, times 100), `smape(y, f)` (mean of 2|y-f|/(|y|+|f|), times 100), and `mase(y, f, y_train, m=1)` (MAE of the forecast divided by the in-sample MAE of the seasonal naive forecast with period `m` on `y_train`). Then implement `walk_forward_splits(n, initial, horizon, step, window=None)`: return a list of `(train_idx, test_idx)` lists; the first training set is `0..initial-1`, each test set is the next `horizon` points, the origin moves forward by `step`, and stop when a full test set no longer fits. If `window` is given, use a rolling training window of at most that many latest points; otherwise an expanding window.",
  "setup": "",
  "starterCode": "def mape(y, f):\n    pass\n\ndef smape(y, f):\n    pass\n\ndef mase(y, f, y_train, m=1):\n    pass\n\ndef walk_forward_splits(n, initial, horizon, step, window=None):\n    pass\n\nprint(mape([100, 200], [110, 180]))",
  "tests": "assert abs(mape([100, 200], [110, 180]) - 10.0) < 1e-9\nassert abs(smape([100, 200], [110, 180]) - 100 * (20 / 210 + 40 / 380) / 2) < 1e-9\nassert abs(mase([5, 7], [4, 8], [1, 2, 4, 7]) - 0.5) < 1e-9\nassert abs(mase([5, 7], [4, 8], [1, 3, 2, 6, 4, 8], m=2) - 0.5) < 1e-9\ns = walk_forward_splits(10, 4, 2, 2)\nassert s == [([0, 1, 2, 3], [4, 5]), ([0, 1, 2, 3, 4, 5], [6, 7]), ([0, 1, 2, 3, 4, 5, 6, 7], [8, 9])]\nr = walk_forward_splits(10, 4, 2, 2, window=4)\nassert r[1] == ([2, 3, 4, 5], [6, 7]) and r[2][0] == [4, 5, 6, 7]\nassert len(walk_forward_splits(10, 4, 3, 1)) == 4\nassert all(max(a) < min(b) for a, b in walk_forward_splits(30, 10, 5, 3))",
  "solution": "def mape(y, f):\n    return 100 * sum(abs(a - b) / abs(a) for a, b in zip(y, f)) / len(y)\n\ndef smape(y, f):\n    return 100 * sum(2 * abs(a - b) / (abs(a) + abs(b)) for a, b in zip(y, f)) / len(y)\n\ndef mase(y, f, y_train, m=1):\n    mae = sum(abs(a - b) for a, b in zip(y, f)) / len(y)\n    scale = sum(abs(y_train[i] - y_train[i - m]) for i in range(m, len(y_train))) / (len(y_train) - m)\n    return mae / scale\n\ndef walk_forward_splits(n, initial, horizon, step, window=None):\n    out = []\n    end = initial\n    while end + horizon <= n:\n        start = 0 if window is None else max(0, end - window)\n        out.append((list(range(start, end)), list(range(end, end + horizon))))\n        end += step\n    return out",
  "hints": [
    "MASE scale = mean of |y_train[i] - y_train[i-m]| over i = m..len-1. Here y_train = [1,2,4,7] with m=1 gives (1+2+3)/3 = 2, and the forecast MAE is 1.",
    "The origin `end` starts at `initial`; loop while end + horizon <= n; the training slice is range(max(0, end - window), end) when rolling."
  ]
}
```

> [!TIP] Interview tips
> - Say "walk-forward / rolling-origin backtest, never random k-fold" and mention horizon-specific errors.
> - Pick the metric to match the business: MASE/RMSLE for comparison across series, WAPE for revenue weighting, pinball/coverage for intervals; avoid MAPE with zeros.
> - Always compare with naive and seasonal-naive baselines.
