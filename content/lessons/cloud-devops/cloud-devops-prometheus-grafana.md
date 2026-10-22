---
id: cloud-devops-prometheus-grafana
title: Prometheus, Grafana
estimatedMinutes: 12
difficulty: medium
tags: [observability, prometheus, grafana, promql, monitoring]
---

## Why it matters
Prometheus and Grafana are the default open-source metrics stack for Kubernetes and ML serving. Interviewers expect you to know the pull model, the four metric types, how `rate()` and `histogram_quantile()` work, and why label cardinality can take a server down.

## Concept
**Prometheus** is a time-series database plus a scraper. It **pulls** (`GET /metrics`) from targets on an interval, stores samples as `metric_name{label="value"} -> (timestamp, float)`, and evaluates rules with **PromQL**. Short-lived jobs push to a **Pushgateway**; **Alertmanager** deduplicates, groups and routes alerts. Targets are found through static config or service discovery (Kubernetes, EC2, Consul).

```yaml
# prometheus.yml
scrape_configs:
  - job_name: model-api
    scrape_interval: 15s
    static_configs:
      - targets: ["api-1:8000", "api-2:8000"]
```

**Metric types**:
- **Counter**: only goes up (resets to 0 on restart), e.g. `http_requests_total`. Always query with `rate()` or `increase()`.
- **Gauge**: goes up and down, e.g. memory, queue depth, in-flight requests.
- **Histogram**: cumulative `_bucket{le="..."}` counters plus `_sum` and `_count`. Quantiles are estimated at query time with `histogram_quantile()` (linear interpolation inside a bucket), and buckets can be **summed across instances**.
- **Summary**: quantiles computed client-side; cannot be aggregated across instances.

**Useful PromQL**: `rate(x[5m])` is the per-second average increase over the window, handling counter resets; `sum by (label)` aggregates; `avg_over_time`, `topk`, and `up == 0` find dead targets. Never average per-instance quantiles; aggregate the buckets, then take the quantile.

**Cardinality**: every unique label combination is a separate time series. Labels like `user_id`, `request_id` or raw URLs create millions of series, blowing up memory. Use bounded labels (`route` templates, `status_class`).

**Grafana** is the visualization layer: dashboards, panels and variables on top of Prometheus (and Loki, Tempo, SQL data sources), plus its own alerting. Good dashboards follow the **RED** method (Rate, Errors, Duration) for services and **USE** (Utilization, Saturation, Errors) for resources. Keep dashboards and alert rules in Git (JSON, Jsonnet, Terraform).

**Scaling**: one Prometheus is not highly available or long-term; use two replicas scraping the same targets, and **Thanos / Mimir / Cortex** (or a managed service) for long retention and global queries. Local retention is typically 15 days.

## Worked example
A model API runs on 3 pods. Serving p95 must stay below 300 ms and 5xx below 2%.

```promql
# p95 latency over 5 minutes, aggregated across all pods
histogram_quantile(0.95,
  sum by (le) (rate(http_request_duration_seconds_bucket{job="model-api"}[5m])))

# error ratio
sum(rate(http_requests_total{job="model-api", code=~"5.."}[5m]))
  / sum(rate(http_requests_total{job="model-api"}[5m]))
```

Suppose the aggregated buckets over 5 minutes are `le=0.1: 50`, `le=0.5: 90`, `le=1.0: 100`, `le=+Inf: 100`. The 95th percentile rank is $0.95 \cdot 100 = 95$, which falls in the `(0.5, 1.0]` bucket: $0.5 + (1.0 - 0.5)\cdot\frac{95 - 90}{100 - 90} = 0.75$ s. That breaches the 300 ms target, so the alert below fires after 10 minutes of sustained errors.

```yaml
groups:
  - name: model-api
    rules:
      - alert: HighErrorRatio
        expr: |
          sum(rate(http_requests_total{code=~"5.."}[5m]))
            / sum(rate(http_requests_total[5m])) > 0.02
        for: 10m
        labels: {severity: page}
        annotations: {runbook: "https://wiki/runbooks/model-api-5xx"}
```

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Three pods each report their own p95 latency. What is the correct way to get a fleet-wide p95 in Prometheus?",
  "options": [
    "Average the three p95 values",
    "Take the max of the three p95 values and call it the fleet p95",
    "Sum the histogram `_bucket` series across pods, then apply `histogram_quantile`",
    "Use a Gauge for latency"
  ],
  "answer": 2,
  "explanation": "Quantiles cannot be averaged. Histogram buckets are counters and can be summed across instances before computing the quantile (accuracy is limited by bucket boundaries)."
}
```

```quiz
{
  "id": "q2",
  "question": "Which label is most likely to cause a cardinality explosion on a request-count metric?",
  "options": [
    "method (GET/POST)",
    "status_class (2xx/4xx/5xx)",
    "user_id",
    "route template such as /predict"
  ],
  "answer": 2,
  "explanation": "Each distinct `user_id` creates a new time series. Use bounded labels in metrics; put per-user detail in logs or traces."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Simulate two PromQL building blocks. `counter_increase(samples)` takes `(timestamp, value)` pairs for a counter and returns the total increase, treating a drop in value as a counter reset (after a reset the new value counts as increase since 0). `rate(samples)` is the increase divided by the elapsed time between the first and last sample. `histogram_quantile(q, buckets)` takes cumulative `(le, count)` buckets ending with `float('inf')`, finds the bucket containing rank $q \\cdot$ total, and linearly interpolates between its lower and upper bound (the lowest bucket starts at 0; if the rank lands in the +Inf bucket return the previous upper bound).",
  "starterCode": "def counter_increase(samples):\n    pass\n\ndef rate(samples):\n    pass\n\ndef histogram_quantile(q, buckets):\n    pass\n\nprint(rate([(0, 0), (15, 15), (30, 30), (45, 5), (60, 20)]))\nprint(histogram_quantile(0.95, [(0.1, 50), (0.5, 90), (1.0, 100), (float(\"inf\"), 100)]))",
  "tests": "inf = float(\"inf\")\ns = [(0, 0), (15, 15), (30, 30), (45, 5), (60, 20)]\nassert counter_increase(s) == 50\nassert abs(rate(s) - 50 / 60) < 1e-12\nassert abs(rate([(0, 10), (10, 30)]) - 2.0) < 1e-12\nb = [(0.1, 50), (0.5, 90), (1.0, 100), (inf, 100)]\nassert abs(histogram_quantile(0.5, b) - 0.1) < 1e-12\nassert abs(histogram_quantile(0.9, b) - 0.5) < 1e-12\nassert abs(histogram_quantile(0.95, b) - 0.75) < 1e-12\nassert abs(histogram_quantile(0.9, [(1, 10), (inf, 20)]) - 1) < 1e-12",
  "solution": "def counter_increase(samples):\n    total = 0\n    prev = None\n    for _, v in samples:\n        if prev is not None:\n            total += v - prev if v >= prev else v\n        prev = v\n    return total\n\ndef rate(samples):\n    return counter_increase(samples) / (samples[-1][0] - samples[0][0])\n\ndef histogram_quantile(q, buckets):\n    rank = q * buckets[-1][1]\n    lower, lower_count = 0.0, 0\n    for le, c in buckets:\n        if c >= rank:\n            if le == float(\"inf\") or c == lower_count:\n                return lower\n            return lower + (le - lower) * (rank - lower_count) / (c - lower_count)\n        lower, lower_count = le, c\n    return lower",
  "hints": [
    "On a reset (`v < prev`) the increase for that step is just `v`.",
    "Rank = q * total count (the last bucket's count). Find the first bucket with count >= rank.",
    "Interpolate: lower + (upper - lower) * (rank - count_below) / (count_in_bucket)."
  ]
}
```

> [!TIP] Interview tips
> - Say "pull model, `/metrics` endpoint, service discovery", then name the four metric types and when to use each.
> - Always wrap counters in `rate()`; never average quantiles; know that histogram accuracy depends on bucket choice.
> - Mention cardinality and long-term storage (Thanos/Mimir) as the two classic production problems.
> - Alert on symptoms (error ratio, latency SLO) with a `for:` duration and a runbook, not on raw CPU.
