---
id: time-series-anomaly-detection-in-time-series
title: "Anomaly detection in time series"
estimatedMinutes: 12
difficulty: medium
tags: [time-series, anomaly-detection, robust-statistics, monitoring]
---

## Why it matters
Anomaly detection on metrics (revenue drops, traffic spikes, sensor faults, fraud bursts) is a core monitoring task. Interviewers ask how you separate real anomalies from trend, seasonality and noise, and how you control false alerts.

## Concept
**Types**: **point** anomalies (a single spike), **contextual** anomalies (normal value at the wrong time, e.g. low traffic at noon), **collective** anomalies (a sequence that is abnormal as a pattern, e.g. a flat line from a stuck sensor), plus **level shifts** and **change points** (permanent changes, not anomalies to alert forever).

**Core recipe**: model what is *expected*, then flag large deviations.
1. **Statistical thresholds**: z-score $\frac{y_t - \mu}{\sigma}$ over a trailing window. Mean and std are corrupted by outliers, so prefer the **robust z-score** with median and MAD: $\frac{|y_t - \text{med}|}{1.4826\,\text{MAD}}$. A threshold of 3-5 is common.
2. **Residual-based**: forecast with seasonal-aware models (STL, ETS, SARIMA, Prophet, GBM), then flag residuals beyond $k\sigma$ or outside the prediction interval. This handles trend and seasonality, so a Monday dip is not an anomaly.
3. **Seasonal-hybrid ESD / STL + IQR**: remove seasonality and trend, then test the remainder for outliers (generalized ESD, Tukey fences).
4. **ML approaches**: Isolation Forest or one-class SVM on windowed features; autoencoders or LSTM forecasters with reconstruction/prediction error; supervised classifiers if labels exist (usually rare).
5. **Change-point detection**: CUSUM, Bayesian online change-point detection, PELT for shifts in mean or variance.

**Practical issues**: use only **past** data for the baseline in online detection (no leakage); handle missing data and holidays; avoid **alert fatigue** by tuning the threshold to a false-alarm budget, requiring persistence (e.g. 3 of 5 points), and alerting on business-relevant magnitudes; retrain/adapt baselines because normal drifts (concept drift); evaluate with precision/recall and **detection delay**, using labeled incidents or injected anomalies, since labels are scarce.

## Worked example
Window values $[11,10,12,11,10,11]$, median $11$; absolute deviations $[0,1,1,0,1,0]$, MAD $=0.5$, scale $=1.4826\cdot0.5 = 0.741$. An observation of 50 has robust $z = 39/0.741 \approx 52.6$, flagged at $k=5$. Plain z-score on a window that already includes a spike of 50 would have an inflated std (about 15), and the same spike would score $z \approx 2.2$ and be missed (masking). For a daily series with a weekly pattern, a Saturday value of 70 against a Saturday forecast of 100 with residual std 8 gives a $-3.75\sigma$ residual: an anomaly, though 70 is a perfectly normal value on a Monday.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Daily traffic has a strong weekly cycle. A fixed threshold alert fires every Monday morning. What is the best fix?",
  "options": [
    "Raise the threshold until it stops",
    "Forecast the expected value with a seasonal model and alert on the residual",
    "Delete Mondays from the data",
    "Use a longer moving average only"
  ],
  "answer": 1,
  "explanation": "Model the expected seasonal level and flag deviations from it, so predictable patterns are not anomalies."
}
```

```quiz
{
  "id": "q2",
  "question": "Why prefer median/MAD over mean/std for the rolling baseline?",
  "options": [
    "They are faster to compute",
    "Outliers inflate the mean and std, masking later anomalies; median/MAD are robust",
    "MAD is always smaller",
    "They require stationarity"
  ],
  "answer": 1,
  "explanation": "Existing spikes inflate std and shift the mean, hiding new anomalies. Median and MAD have a high breakdown point."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `robust_anomalies(y, w, k)`: for each index `t >= w`, take the trailing window `y[t-w:t]` (excluding `y[t]`), compute its median and MAD (median of absolute deviations from the median), set `scale = 1.4826 * MAD`, and flag `t` when `abs(y[t] - median) > k * scale`. If `scale == 0`, flag `t` when `y[t] != median`. Return the sorted list of flagged indices. Also implement `residual_anomalies(y, forecast, k)` that flags indices where the forecast error exceeds `k` times the (population) standard deviation of all errors.",
  "setup": "",
  "starterCode": "def robust_anomalies(y, w, k):\n    pass\n\ndef residual_anomalies(y, forecast, k):\n    pass\n\nprint(robust_anomalies([10, 11, 10, 12, 11, 10, 11, 50, 11, 10, 12, 11], 6, 5))",
  "tests": "y = [10, 11, 10, 12, 11, 10, 11, 50, 11, 10, 12, 11]\nassert robust_anomalies(y, 6, 5) == [7]\nassert robust_anomalies([5, 5, 5, 5, 6, 5], 3, 3) == [4]\nassert robust_anomalies([1, 2, 3], 5, 3) == []\ntrend = [float(i) for i in range(30)]\nassert robust_anomalies(trend, 5, 10) == []\nf = [10.0] * 20\nyy = [10.0] * 20\nyy[12] = 25.0\nassert residual_anomalies(yy, f, 3) == [12]\nassert residual_anomalies(f, f, 3) == []",
  "solution": "def robust_anomalies(y, w, k):\n    out = []\n    for t in range(w, len(y)):\n        win = sorted(y[t - w:t])\n        med = _median(win)\n        mad = _median(sorted(abs(v - med) for v in win))\n        scale = 1.4826 * mad\n        dev = abs(y[t] - med)\n        if (scale == 0 and y[t] != med) or (scale > 0 and dev > k * scale):\n            out.append(t)\n    return out\n\ndef _median(s):\n    n = len(s)\n    return s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2\n\ndef residual_anomalies(y, forecast, k):\n    errs = [a - b for a, b in zip(y, forecast)]\n    mu = sum(errs) / len(errs)\n    sd = (sum((e - mu) ** 2 for e in errs) / len(errs)) ** 0.5\n    return [i for i, e in enumerate(errs) if sd > 0 and abs(e - mu) > k * sd]",
  "hints": [
    "Use only y[t-w:t] for the baseline so a spike does not hide itself, and so no future information is used.",
    "1.4826 * MAD estimates the standard deviation for normal data but ignores outliers inside the window."
  ]
}
```

> [!TIP] Interview tips
> - Lead with "forecast the expected value including seasonality, then threshold the residual", and explain why raw thresholds fail on seasonal data.
> - Mention robust statistics (median/MAD), masking by past outliers, and online detection using only past data.
> - Discuss alert fatigue, false-positive budget, detection delay, and how you would label or evaluate with few anomalies.
