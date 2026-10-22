---
id: time-series-ml-for-time-series
title: "ML for time series (lag features, gradient boosting)"
estimatedMinutes: 13
difficulty: medium
tags: [time-series, feature-engineering, gradient-boosting, leakage]
---

## Why it matters
Gradient boosting on lag features is the workhorse of modern forecasting (it won most M5 solutions) because it uses covariates, nonlinearity and many series at once. Interviewers test whether you can turn a time series into a supervised problem without leaking the future.

## Concept
**Reframe as supervised learning**: for each time $t$, features are known at forecast time and the target is $y_t$ (or $y_{t+h}$).
- **Lag features**: $y_{t-1}, y_{t-2}, y_{t-7}, y_{t-364}$ (choose lags matching seasonality).
- **Rolling statistics**, always **shifted** so they exclude the current target: mean, std, min/max of $y_{t-w..t-1}$; exponentially weighted means.
- **Calendar features**: day of week, month, holiday flags, days to/from events; cyclical encodings $\sin/\cos$ for periodic ones.
- **Exogenous covariates**: price, promotion, weather. Only use those **known in the future** (promotions planned, calendar), or forecast them.
- **Static features** (store, category) allow one **global model** across many series, which usually beats one model per series for short, related series.

**Multi-step strategies**:
- **Recursive**: one-step model fed its own predictions; simple but errors compound.
- **Direct**: a separate model per horizon $h$ using features available at the forecast origin; no error accumulation, more models.
- **Multi-output** or a single model with horizon as a feature.

**Validation**: **never random-shuffle**. Use walk-forward / expanding-window splits, with a gap if features use long lags. Leakage sources: unshifted rolling stats, target encoding computed on all data, scaling fit on the whole series, future-only information in covariates.

**Trees' limits**: they cannot extrapolate a trend beyond the training range (predictions flatline), so **detrend/difference** or model the ratio to a baseline, and predict the residual. Boosted trees are strong with many series and covariates; for one short smooth series, ETS/ARIMA can still win.

## Worked example
Series $[1,2,3,4,5,6]$, lags $\{1,2\}$, 3-step rolling mean. The first valid row is $t=3$ (value 4): features $y_{2}=3,\ y_1=2$, rolling mean of $y_0..y_2 = 2$, so row $[3, 2, 2]$ with target 4. The rolling window ends at $t-1$; including $y_t$ would leak the answer. For a 7-day horizon with daily data, a direct approach trains 7 models whose features use data up to the forecast origin only. If the training series trends from 100 to 200 but the test goes to 260, a tree predicts about 200; modeling $y_t - y_{t-7}$ avoids that.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You build a 7-day rolling mean feature for day t. Which window avoids leakage?",
  "options": [
    "Days t-6 through t",
    "Days t-7 through t-1",
    "Days t through t+6",
    "All days in the dataset"
  ],
  "answer": 1,
  "explanation": "Features must use only information available before the target, so the window must end at t-1."
}
```

```quiz
{
  "id": "q2",
  "question": "A gradient-boosted tree model trained on a rising series predicts a flat line on a test period far above the training range. Why?",
  "options": [
    "Too few lag features",
    "Trees predict constants within leaves and cannot extrapolate beyond training targets",
    "The learning rate is too high",
    "Random shuffling was used"
  ],
  "answer": 1,
  "explanation": "Tree leaves output averages of training targets, so predictions are bounded by the observed range. Difference or detrend the target."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `lag_matrix(y, lags, window)`: for every t from `max(max(lags), window)` to `len(y)-1`, build the feature row `[y[t-l] for l in lags] + [mean(y[t-window:t])]` (the rolling mean must NOT include `y[t]`) and target `y[t]`. Return `(X, targets)` as lists. Then implement `recursive_forecast(model, history, lags, window, h)`: repeatedly build the feature row for the next time step from the (growing) history, call `model(row)` to get a prediction, append it, and return the `h` predictions.",
  "setup": "",
  "starterCode": "def lag_matrix(y, lags, window):\n    pass\n\ndef recursive_forecast(model, history, lags, window, h):\n    pass\n\nprint(lag_matrix([1, 2, 3, 4, 5, 6], [1, 2], 3))",
  "tests": "X, t = lag_matrix([1, 2, 3, 4, 5, 6], [1, 2], 3)\nassert X == [[3, 2, 2.0], [4, 3, 3.0], [5, 4, 4.0]] and t == [4, 5, 6]\ny = [5, 3, 8, 6, 9, 4, 7, 2]\nX1, t1 = lag_matrix(y, [1, 2, 3], 2)\ny2 = list(y)\ny2[5] = 100\nX2, t2 = lag_matrix(y2, [1, 2, 3], 2)\nrow = 5 - 3\nassert X1[row] == X2[row] and t1[row] == 4 and t2[row] == 100\nassert len(X1) == len(y) - 3\nassert recursive_forecast(lambda f: f[0] + 1, [1, 2, 3], [1, 2], 3, 3) == [4, 5, 6]\nout = recursive_forecast(lambda f: f[-1], [2, 4, 6, 8], [1], 2, 3)\nassert abs(out[0] - 7) < 1e-12 and abs(out[1] - 7.5) < 1e-12 and abs(out[2] - 7.25) < 1e-12",
  "solution": "def lag_matrix(y, lags, window):\n    start = max(max(lags), window)\n    X, targets = [], []\n    for t in range(start, len(y)):\n        row = [y[t - l] for l in lags] + [sum(y[t - window:t]) / window]\n        X.append(row)\n        targets.append(y[t])\n    return X, targets\n\ndef recursive_forecast(model, history, lags, window, h):\n    hist = list(history)\n    preds = []\n    for _ in range(h):\n        t = len(hist)\n        row = [hist[t - l] for l in lags] + [sum(hist[t - window:t]) / window]\n        p = model(row)\n        hist.append(p)\n        preds.append(p)\n    return preds",
  "hints": [
    "For the row at time t, use only indices < t: y[t-l] for each lag and the mean of y[t-window:t].",
    "In the recursive version, the 'current' time is len(hist); predictions are appended so later steps use them as lags."
  ]
}
```

> [!TIP] Interview tips
> - First sentence: "I'd build lag, rolling (shifted) and calendar features, train a global GBM, and validate with walk-forward splits."
> - Explain recursive vs direct tradeoffs, and flag leakage risks proactively.
> - Mention trees do not extrapolate trend; predict differences or ratios to a baseline (seasonal naive) instead.
