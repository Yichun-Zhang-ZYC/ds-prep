---
id: mlops-alerting
title: Alerting
estimatedMinutes: 10
difficulty: medium
tags: [mlops, monitoring, alerting, sre]
---

## Why it matters
Monitoring without good alerting is a dashboard nobody looks at; too many alerts and everyone ignores them. Interviewers test whether you can design alerts that are actionable, low-noise and routed correctly.

## Concept
**What to alert on** (ML adds layers on top of standard service health):
- **Service**: error rate, latency (p95/p99), saturation, availability against an SLO.
- **Data**: null rate, schema changes, volume drops, freshness (late features), out-of-range values.
- **Model**: input/prediction drift (PSI), score distribution shifts, and live performance when labels arrive.
- **Business**: conversion, approval rate, revenue per request.

**Good alert properties**: **actionable** (a human must do something), **symptom-based** (user-visible impact beats a low-level cause), has a **runbook** link and an owner, and a clear **severity** (page now vs ticket tomorrow).

**Reduce noise**:
- **`for` duration / consecutive breaches**: fire only after $N$ consecutive bad windows to avoid flapping.
- **Cooldown / repeat interval**, **deduplication** and **grouping** so one incident is one notification.
- **Dynamic thresholds**: flag $|x - \mu| / \sigma > k$ against a rolling baseline for metrics with trends or seasonality; static thresholds for hard limits.
- **Burn-rate alerts** on an SLO: page when the error budget is being consumed too fast.

**Alert fatigue** is the failure mode: if more than a small share of pages need no action, tighten or delete them. Review alerts after every incident.

Tools: Prometheus + Alertmanager, Grafana, CloudWatch, Datadog; ML-specific: Evidently, WhyLabs, Arize.

## Worked example
A feature's null rate is sampled every 5 minutes. The rule: alert when the null rate exceeds 5% for 3 consecutive samples, repeat at most every 30 minutes. A 1-sample blip of 6% is ignored; a real upstream outage (8%, 9%, 9%, ...) fires after 15 minutes with a runbook link ("check the ingestion job, roll back the feature pipeline") and pages the data on-call, not the modelling team.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which alert is the most actionable for an on-call engineer?",
  "options": ["CPU > 60% on one pod for 10 seconds", "Prediction API error rate above 2% for 5 minutes, with runbook link", "Any feature's mean changed", "Daily AUC differs from yesterday"],
  "answer": 1,
  "explanation": "It is symptom-based, sustained, tied to user impact, and comes with next steps. The others are noisy or low-level."
}
```

```quiz
{
  "id": "q2",
  "question": "A metric flaps above and below the threshold every few minutes, causing repeated pages. Best fix?",
  "options": ["Raise the threshold to a huge value", "Require N consecutive breaches and add a repeat interval", "Disable the alert", "Send alerts by email"],
  "answer": 1,
  "explanation": "A for-duration and cooldown cut flapping while still catching sustained problems."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `alerts(values, threshold, for_n, cooldown)` returning the list of indices at which an alert fires. A value breaches if `v > threshold`. Fire at index `i` when the current streak of consecutive breaches is at least `for_n` and (no earlier alert, or `i - last_fire >= cooldown`). Also implement `zscore_alert(history, x, k)`: return True if `abs(x - mean) / std > k` using the population std of `history`; if the std is 0, return `x != mean`.",
  "starterCode": "import statistics\n\ndef alerts(values, threshold, for_n, cooldown):\n    pass\n\ndef zscore_alert(history, x, k):\n    pass\n",
  "tests": "v = [1, 6, 7, 2, 6, 7, 8, 9, 3]\nassert alerts(v, 5, 3, 2) == [6]\nassert alerts(v, 5, 2, 2) == [2, 5, 7]\nassert alerts([9] * 8, 5, 3, 3) == [2, 5]\nassert alerts([1, 2, 3], 5, 1, 1) == []\nh = [1, 2, 3, 4, 5]\nassert zscore_alert(h, 7, 2) is True\nassert zscore_alert(h, 7, 3) is False\nassert zscore_alert(h, 3, 1) is False\nassert zscore_alert([10, 10, 10], 10, 3) is False\nassert zscore_alert([10, 10, 10], 11, 3) is True",
  "solution": "import statistics\n\ndef alerts(values, threshold, for_n, cooldown):\n    fired = []\n    streak = 0\n    last = None\n    for i, v in enumerate(values):\n        streak = streak + 1 if v > threshold else 0\n        if streak >= for_n and (last is None or i - last >= cooldown):\n            fired.append(i)\n            last = i\n    return fired\n\ndef zscore_alert(history, x, k):\n    mu = statistics.fmean(history)\n    sd = statistics.pstdev(history)\n    if sd == 0:\n        return x != mu\n    return abs(x - mu) / sd > k",
  "hints": ["Reset the streak to 0 whenever a value does not breach.", "Remember the last fire index; compare i - last_fire with cooldown."]
}
```

> [!TIP] Interview tips
> - Say alerts must be actionable and symptom-based, with an owner, severity and runbook.
> - Name noise reducers: for-duration, cooldown, dedup/grouping, dynamic thresholds, SLO burn rate.
> - Cover all layers: service health, data quality, drift, model performance and business KPIs.
