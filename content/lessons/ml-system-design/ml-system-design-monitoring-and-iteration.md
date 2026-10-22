---
id: ml-system-design-monitoring-and-iteration
title: Monitoring & iteration
estimatedMinutes: 10
difficulty: medium
tags: [ml-system-design, monitoring, drift, mlops]
---

## Why it matters
Models decay silently: the service returns 200 OK while accuracy erodes because the world changed. "How would you monitor this model after launch, and when would you retrain?" closes almost every ML design interview.

## Concept
Monitor four layers:
1. **System health**: latency (p50/p95/p99), error rate, throughput, memory/GPU, timeouts, fallback rate.
2. **Data quality**: schema changes, null rates, out-of-range values, missing or stale features, training/serving skew.
3. **Data and prediction drift** (no labels needed): shifts in input feature distributions (**covariate drift**) and in the score distribution. Tools: **PSI** $=\sum_i (a_i - e_i)\ln(a_i/e_i)$ over bins (rule of thumb: <0.1 stable, 0.1-0.25 moderate, >0.25 major), KS test, JS divergence.
4. **Model performance** (needs labels): AUC, precision/recall, calibration, business KPIs, sliced by segment. Labels often arrive late (chargebacks take weeks), so use **proxy metrics** (click rate, score distribution) and delayed-label dashboards.

**Concept drift** means $P(y \mid x)$ changes (fraud tactics evolve), which input monitoring alone cannot detect. Beware **feedback loops**: the model's own decisions shape future training data (you only see outcomes for approved loans or shown items), so keep an exploration or holdout slice.

**Iterate**:
- **Retraining triggers**: schedule (daily/weekly), drift or metric thresholds, or new data volume. Prefer automated pipelines with validation gates.
- **Safe rollout**: shadow mode, canary or A/B, **champion/challenger**, instant rollback, versioned models plus data and code.
- **Alerting**: alert on actionable, tiered thresholds to avoid fatigue; have a runbook and a fallback (previous model or rules).

## Worked example
A churn model's `tenure` feature had training-time bin shares $e = (0.5, 0.3, 0.2)$; this week's traffic gives $a = (0.3, 0.3, 0.4)$.
PSI $= (0.3-0.5)\ln(0.6) + 0 + (0.4-0.2)\ln 2 = 0.1022 + 0.1386 \approx 0.24$, which is moderate drift near the 0.25 alarm. Next steps: check for a pipeline bug (a new user cohort or a broken join) before retraining; if the shift is real and AUC on labeled data has dropped, retrain.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Labels arrive 30 days late. What can you monitor in real time?",
  "options": [
    "Nothing; wait for labels",
    "Input feature drift, prediction-score distribution, data quality and proxy metrics",
    "Only latency",
    "Only accuracy on the training set"
  ],
  "answer": 1,
  "explanation": "Unsupervised signals (feature and score drift, data quality) and proxy metrics give early warning; true performance follows once labels land."
}
```

```quiz
{
  "id": "q2",
  "question": "Which situation is concept drift?",
  "options": [
    "A feature's null rate jumps from 1% to 40% after an upstream bug",
    "Users' age distribution shifts but the age-to-purchase relationship is unchanged",
    "Fraudsters change tactics so the same features now predict fraud differently",
    "Serving latency doubles"
  ],
  "answer": 2,
  "explanation": "Concept drift is a change in $P(y \\mid x)$. The first is a data-quality issue, the second is covariate drift only, the last is system health."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `psi(expected, actual, eps=1e-6)` taking two lists of bin proportions and returning $\\sum (a-e)\\ln(a/e)$, clamping each proportion to at least `eps`. Then `drift_level(psi_value)` returns `'stable'` (< 0.1), `'moderate'` (< 0.25) or `'major'`. Finally `bin_shares(values, edges)` returns the share of values in each of the `len(edges)+1` bins defined by sorted `edges` (a value equal to an edge goes to the upper bin).",
  "starterCode": "import math\n\ndef psi(expected, actual, eps=1e-6):\n    pass\n\ndef drift_level(psi_value):\n    pass\n\ndef bin_shares(values, edges):\n    pass\n\nprint(psi([0.5, 0.3, 0.2], [0.3, 0.3, 0.4]))\n",
  "tests": "assert abs(psi([0.5, 0.3, 0.2], [0.3, 0.3, 0.4]) - 0.2408) < 1e-3\nassert abs(psi([0.5, 0.5], [0.5, 0.5])) < 1e-12\nassert psi([0.5, 0.5], [0.0, 1.0]) > 5\nassert drift_level(0.05) == 'stable'\nassert drift_level(0.1) == 'moderate'\nassert drift_level(0.24) == 'moderate'\nassert drift_level(0.25) == 'major'\ns = bin_shares([1, 5, 10, 12, 20], [5, 10])\nassert [round(x, 2) for x in s] == [0.2, 0.2, 0.6]",
  "solution": "import math\n\ndef psi(expected, actual, eps=1e-6):\n    total = 0.0\n    for e, a in zip(expected, actual):\n        e, a = max(e, eps), max(a, eps)\n        total += (a - e) * math.log(a / e)\n    return total\n\ndef drift_level(psi_value):\n    if psi_value < 0.1:\n        return 'stable'\n    if psi_value < 0.25:\n        return 'moderate'\n    return 'major'\n\ndef bin_shares(values, edges):\n    counts = [0] * (len(edges) + 1)\n    for v in values:\n        i = 0\n        while i < len(edges) and v >= edges[i]:\n            i += 1\n        counts[i] += 1\n    return [c / len(values) for c in counts]",
  "hints": [
    "Clamp with max(x, eps) so ln(0) never happens.",
    "For binning, count how many edges the value is >= to; that count is the bin index."
  ]
}
```

> [!TIP] Interview tips
> - Separate system health, data quality, drift and true performance; say which need labels.
> - Name PSI/KS for drift, proxy metrics for delayed labels, and concept vs covariate drift.
> - Close the loop: retraining triggers, validation gates, shadow/canary rollout, rollback, and a feedback-loop holdout.
