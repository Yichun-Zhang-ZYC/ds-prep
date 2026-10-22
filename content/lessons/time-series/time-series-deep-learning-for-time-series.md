---
id: time-series-deep-learning-for-time-series
title: "Deep learning for time series (LSTM, Temporal Fusion Transformer)"
estimatedMinutes: 13
difficulty: hard
tags: [time-series, deep-learning, lstm, tft, quantile-loss]
---

## Why it matters
Neural forecasters (LSTM, N-BEATS, Transformers, TFT) are common in large-scale forecasting at tech companies. Interviewers want to know when deep learning is worth it, how data is windowed, and what TFT adds.

## Concept
**When it pays off**: thousands of related series, long history, rich covariates (static, known-future, observed-past), multi-horizon probabilistic outputs, cold-start via a shared (global) model. For one short series, ETS/ARIMA/GBM is usually as good and cheaper.

**Data**: slide a window over each series. Input: the last $L$ values (plus covariates); output: the next $H$ values. Normalize **per window or per series** (instance normalization, or mean scaling as in DeepAR) so one model handles series on different scales. Split by **time**, not by random window, since overlapping windows leak.

**Architectures**:
- **LSTM/GRU**: recurrent state carries history; gating mitigates vanishing gradients. **Seq2seq** encoder-decoder produces $H$ outputs; autoregressive decoding compounds error, direct multi-horizon heads avoid it. **DeepAR** is an autoregressive RNN that outputs distribution parameters (e.g. negative binomial) and is trained across many series.
- **N-BEATS / N-HiTS**: stacked fully-connected blocks with backward/forward residual links; strong MLP baselines.
- **Transformers** (Informer, PatchTST): attention over time steps or patches of the series. Simple linear models (DLinear) have matched many early Transformers, so benchmark carefully.
- **Temporal Fusion Transformer (TFT)**: handles the three covariate types, with variable-selection networks (interpretable feature importance), gated residual networks, an LSTM encoder-decoder for local patterns, interpretable multi-head attention for long-range dependence, and **quantile outputs** trained with pinball loss.

**Pinball loss** for quantile $q$: $L_q(y,\hat y) = \max\big(q(y-\hat y),\ (q-1)(y-\hat y)\big)$. Predicting the 10/50/90% quantiles gives prediction intervals without distributional assumptions.

**Pitfalls**: overfitting on small data, not scaling inputs, leakage through overlapping windows, ignoring baselines, no calibration check of the quantiles (coverage should be about the nominal level).

## Worked example
Daily sales, input length 28, horizon 7, stride 1. A series of length 100 gives $100 - 28 - 7 + 1 = 66$ training windows. For $y = 0..9$, $L=4$, $H=2$: windows $[0,1,2,3]\to[4,5]$ through $[4,5,6,7]\to[8,9]$, which is $10-4-2+1 = 5$ windows. Pinball at $q = 0.9$: an under-forecast of 2 costs $0.9\cdot2 = 1.8$, while an over-forecast of 2 costs only $0.1\cdot2 = 0.2$, which pushes the 90% quantile prediction upward.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which TFT feature gives probabilistic forecasts without assuming a parametric distribution?",
  "options": [
    "Variable selection networks",
    "Quantile outputs trained with pinball loss",
    "LSTM encoder",
    "Positional encoding"
  ],
  "answer": 1,
  "explanation": "TFT outputs several quantiles (e.g. 10/50/90%) trained with quantile (pinball) loss, which yields intervals non-parametrically."
}
```

```quiz
{
  "id": "q2",
  "question": "Why is a random train/validation split of sliding windows a bad idea?",
  "options": [
    "It makes training slower",
    "Overlapping windows share data, so validation windows leak the future and overstate accuracy",
    "Windows must be sorted for LSTMs",
    "It changes the horizon"
  ],
  "answer": 1,
  "explanation": "Neighboring windows overlap and training windows can come from after the validation period. Split by time with a gap."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Deep forecasters train on sliding windows. Implement `make_windows(y, input_len, horizon, stride=1)` returning numpy arrays `(X, Y)` where `X[i] = y[s:s+input_len]` and `Y[i] = y[s+input_len:s+input_len+horizon]` for start indices `s = 0, stride, 2*stride, ...` that fit. Implement `instance_norm(X)` returning `(Xn, mu, sd)` with per-window mean and std (`sd` is the population std, add 1e-8 to avoid division by zero), so predictions can be de-normalized as `pred * sd + mu`. Implement `pinball_loss(y, yhat, q)` = mean of `max(q*(y-yhat), (q-1)*(y-yhat))`, the quantile loss used by TFT.",
  "setup": "import numpy as np",
  "starterCode": "def make_windows(y, input_len, horizon, stride=1):\n    pass\n\ndef instance_norm(X):\n    pass\n\ndef pinball_loss(y, yhat, q):\n    pass\n\nX, Y = make_windows(np.arange(10), 4, 2)\nprint(X.shape, Y.shape)",
  "tests": "y = np.arange(10.0)\nX, Y = make_windows(y, 4, 2)\nassert X.shape == (5, 4) and Y.shape == (5, 2)\nassert np.allclose(X[0], [0, 1, 2, 3]) and np.allclose(Y[0], [4, 5])\nassert np.allclose(X[-1], [4, 5, 6, 7]) and np.allclose(Y[-1], [8, 9])\nX2, Y2 = make_windows(y, 4, 2, stride=2)\nassert X2.shape == (3, 4) and np.allclose(X2[1], [2, 3, 4, 5]) and np.allclose(Y2[2], [8, 9])\nassert make_windows(y, 9, 2)[0].shape[0] == 0\nXn, mu, sd = instance_norm(X)\nassert np.allclose(Xn.mean(axis=1), 0, atol=1e-6) and np.allclose(Xn.std(axis=1), 1, atol=1e-5)\nassert np.allclose(mu.ravel(), [1.5, 2.5, 3.5, 4.5, 5.5]) and np.allclose(sd.ravel(), np.sqrt(1.25), atol=1e-6)\nassert abs(pinball_loss(np.array([10.0]), np.array([8.0]), 0.9) - 1.8) < 1e-12\nassert abs(pinball_loss(np.array([10.0]), np.array([12.0]), 0.9) - 0.2) < 1e-12\nassert abs(pinball_loss(np.array([10.0, 10.0]), np.array([8.0, 12.0]), 0.5) - 1.0) < 1e-12",
  "solution": "def make_windows(y, input_len, horizon, stride=1):\n    y = np.asarray(y, dtype=float)\n    X, Y = [], []\n    for s in range(0, len(y) - input_len - horizon + 1, stride):\n        X.append(y[s:s + input_len])\n        Y.append(y[s + input_len:s + input_len + horizon])\n    if not X:\n        return np.empty((0, input_len)), np.empty((0, horizon))\n    return np.array(X), np.array(Y)\n\ndef instance_norm(X):\n    mu = X.mean(axis=1, keepdims=True)\n    sd = X.std(axis=1, keepdims=True) + 1e-8\n    return (X - mu) / sd, mu, sd\n\ndef pinball_loss(y, yhat, q):\n    e = np.asarray(y, dtype=float) - np.asarray(yhat, dtype=float)\n    return float(np.mean(np.maximum(q * e, (q - 1) * e)))",
  "packages": [
    "numpy"
  ],
  "hints": [
    "The last valid start is len(y) - input_len - horizon; range(0, len(y) - input_len - horizon + 1, stride).",
    "Pinball loss penalizes under-forecasts by q and over-forecasts by (1 - q); at q = 0.5 it is half the MAE."
  ]
}
```

> [!TIP] Interview tips
> - Answer "would you use deep learning?" with conditions: many related series, covariates, long history, need for probabilistic output. Otherwise start with ETS/GBM.
> - For TFT, say: three covariate types, variable selection, attention for long-range, quantile outputs.
> - Always include a seasonal-naive/GBM baseline and a time-based backtest.
