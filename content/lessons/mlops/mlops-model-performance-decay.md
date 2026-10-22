---
id: mlops-model-performance-decay
title: Model performance decay
estimatedMinutes: 10
difficulty: medium
tags: [mlops, monitoring, performance, delayed-labels]
---

## Why it matters
A model that was 90% accurate at launch quietly gets worse. Interviewers want to hear how you measure decay when labels arrive late, and how you turn the decay curve into a retraining policy.

## Concept
**Why models decay**: data and concept drift, upstream pipeline changes, seasonality, adversaries adapting (fraud, spam), feedback loops, and the product itself changing.

**Measuring live performance**:
- **Ground-truth metrics** (accuracy, AUC, calibration, business KPI) computed on *matured* predictions: join logged predictions to labels once they arrive (the **label delay**: minutes for ad clicks, 30-90 days for loan default).
- Compute over **rolling windows** (daily/weekly) and compare with the offline baseline; track confidence intervals, since small windows are noisy.
- **Slice** by segment (country, device, new vs returning); an aggregate can hide a segment that collapsed.
- Always log: model version, features used, prediction, timestamp, request id, so labels can be joined later.

**When labels are slow, use proxies**: input and prediction drift, prediction-score distribution, null/default rates, human-review samples, delayed-but-partial labels, or a **proxy label** (early indicator such as first-payment-missed).

**From decay curve to policy**: backtest by training at time $t$ and scoring weeks $t+1, t+2, \dots$ on later data. If the metric drops below tolerance after $k$ weeks, retrain more often than every $k$ weeks (or on a trigger). Balance against retraining cost and stability.

Watch the **baseline**: compare against the validation score and against a naive model, since seasonal base-rate swings can move accuracy without any model change.

## Worked example
A churn model launched at weekly AUC 0.90. Later weeks measure 0.89, 0.88, 0.84, 0.81. With a tolerance of 0.05 the alert threshold is 0.85, so week 4 (0.84) is the first breach. Backtesting shows the curve crosses the threshold about 3 weeks after training, so the team retrains every 2 weeks and adds an alert for earlier warning on input drift (labels take 30 days).

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Loan default labels arrive 60 days after scoring. Which is the best way to monitor a model in the first 60 days?",
  "options": ["Wait for labels", "Monitor input/prediction drift and early proxy labels, then compute true metrics on matured cohorts", "Retrain daily", "Only monitor latency"],
  "answer": 1,
  "explanation": "You need fast proxies for early warning, and delayed true metrics computed on cohorts whose labels have matured."
}
```

```quiz
{
  "id": "q2",
  "question": "Overall AUC is flat, but the new-users segment collapsed. What practice would have caught this?",
  "options": ["A larger test set", "Slicing metrics by segment", "A lower threshold", "Calibration"],
  "answer": 1,
  "explanation": "Aggregates can hide segment-level failures; track key slices separately."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `rolling_accuracy(y_true, y_pred, window)` returning the accuracy of every full window of length `window` (stride 1) as a list. Implement `first_decay(series, baseline, tol)` returning the index of the first value strictly below `baseline - tol`, or -1. Finally implement `matured(events, now, delay)` returning the ids of events `(id, ts)` whose label is available, i.e. `ts <= now - delay`.",
  "starterCode": "def rolling_accuracy(y_true, y_pred, window):\n    pass\n\ndef first_decay(series, baseline, tol):\n    pass\n\ndef matured(events, now, delay):\n    pass\n",
  "tests": "r = rolling_accuracy([1, 1, 0, 0, 1, 1], [1, 1, 0, 0, 0, 0], 3)\nassert len(r) == 4\nassert [round(x, 4) for x in r] == [1.0, 1.0, 0.6667, 0.3333]\nassert first_decay(r, 1.0, 0.2) == 2\nassert first_decay([0.9, 0.89, 0.88, 0.84, 0.81], 0.90, 0.05) == 3\nassert first_decay([0.9, 0.91], 0.9, 0.05) == -1\nassert matured([('a', 1), ('b', 5), ('c', 10)], 15, 7) == ['a', 'b']\nassert matured([('a', 9)], 15, 7) == []",
  "solution": "def rolling_accuracy(y_true, y_pred, window):\n    hits = [int(a == b) for a, b in zip(y_true, y_pred)]\n    return [sum(hits[i:i + window]) / window for i in range(len(hits) - window + 1)]\n\ndef first_decay(series, baseline, tol):\n    for i, v in enumerate(series):\n        if v < baseline - tol:\n            return i\n    return -1\n\ndef matured(events, now, delay):\n    return [i for i, ts in events if ts <= now - delay]",
  "hints": ["Turn predictions into a 0/1 hit list, then slide a window over it.", "An event's label is usable once ts <= now - delay (note the <=)."]
}
```

> [!TIP] Interview tips
> - Lead with label delay: say what you monitor now (proxies, drift) and what you compute later (matured cohorts).
> - Slice metrics and log model version plus request id so predictions can be joined to labels.
> - Use a backtested decay curve to justify the retraining cadence rather than guessing.
