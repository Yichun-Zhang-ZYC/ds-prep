---
id: cloud-devops-logging-metrics-tracing
title: "Logging, metrics, tracing"
estimatedMinutes: 11
difficulty: medium
tags: [observability, logging, metrics, tracing, devops]
---

## Why it matters

When a production service slows down at 3 a.m., you need to find out what is wrong and where. Interviewers test whether you know the three pillars of observability, what each is good at, and how to use them together.

## Concept

**Observability** is the ability to understand a system's internal state from its outputs. The three pillars answer different questions:
- **Metrics**: *is something wrong?* Numeric time series, cheap and aggregated.
- **Logs**: *what happened?* Discrete timestamped events with detail.
- **Traces**: *where is the time going?* The path of one request across services.

**Metrics**: types are *counter* (only goes up: requests, errors), *gauge* (up and down: queue depth, memory) and *histogram* (distribution buckets, to compute p50/p95/p99 across instances). Use the **RED** method for services (Rate, Errors, Duration) and **USE** for resources (Utilisation, Saturation, Errors), plus the four golden signals (latency, traffic, errors, saturation). Beware **high-cardinality labels** (user id, request id): each unique label set is a separate series and can blow up storage. Prefer percentiles over averages, which hide tail latency.

```text
# metric type: counter, with labels
http_requests_total{service="scorer",status="500"} 1027
# p95 latency per service from a histogram
histogram_quantile(0.95, sum by (le, service) (rate(http_request_duration_seconds_bucket[5m])))
```

**Logs**: emit **structured** logs (JSON) with consistent fields (timestamp, level, service, `trace_id`, message) so they can be searched and aggregated. Use levels sensibly (DEBUG/INFO/WARN/ERROR), never log secrets or PII, and ship them to a central store (ELK/OpenSearch, Loki, CloudWatch Logs, Cloud Logging) instead of reading files on hosts. Sample or cap verbose logs because volume is the main cost.

```json
{"ts": "2026-03-01T12:00:03Z", "level": "ERROR", "service": "scorer", "trace_id": "9f2c", "msg": "model timeout", "latency_ms": 2010, "user_id": 42}
```

**Tracing**: a **trace** is a tree of **spans** (name, start, duration, parent span id, attributes) sharing a `trace_id`, propagated between services in headers (W3C `traceparent`). **OpenTelemetry (OTel)** is the vendor-neutral standard for instrumentation; backends include Jaeger, Tempo and Datadog. Because traces are expensive, use **sampling** (head-based at a fixed rate, or tail-based to keep slow and failing traces). A span's **self time** is its duration minus its children's, showing where time is truly spent.

**Putting them together**: an alert on a metric (p95 latency above SLO) tells you something is wrong; a trace of a slow request shows which downstream call is slow; the logs correlated by `trace_id` explain why. Alert on symptoms users feel (error rate, latency), not on every cause (CPU).

## Worked example

A recommendation API's p95 latency alert fires: 1.8 s against a 500 ms SLO. The metrics dashboard shows the error rate is flat but only the `/recs` route slowed after a deploy. A trace of one slow request has the spans `api` (1,800 ms) → `ranker` (1,500 ms) → `feature-store` (1,300 ms). Self times: `api` $1800-1500 = 300$ ms, `ranker` $1500-1300 = 200$ ms, `feature-store` 1,300 ms. The logs for that `trace_id` show repeated `cache miss` warnings from the feature store, pointing to an expired cache after the deploy. Metric to detect, trace to localise, log to explain.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why should you not add a `user_id` label to a Prometheus counter?",
  "options": [
    "It is a best practice for debugging",
    "High-cardinality labels create a series per user and explode storage; put per-user detail in logs or traces",
    "It makes queries faster",
    "Histograms require it"
  ],
  "answer": 1,
  "explanation": "Each unique label combination is a new time series. Keep metric labels low-cardinality and use logs/traces for per-request detail."
}
```

```quiz
{
  "id": "q2",
  "question": "An API is slow but you do not know which downstream service is responsible. Which signal localises it best?",
  "options": [
    "A CPU gauge on the API host",
    "A count of ERROR logs",
    "A distributed trace of a slow request",
    "The mean latency"
  ],
  "answer": 2,
  "explanation": "A trace shows the per-span timing of the whole request path, so the slow hop is visible directly."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Practise the log and trace side. (1) Write `summarize(lines)`: each line is a JSON string with `service`, `level` and `latency_ms`. Skip lines that are not valid JSON or lack those keys. Return `{service: {'count', 'errors', 'error_rate', 'p95'}}`, where `errors` counts `level == 'ERROR'`, `error_rate = errors / count`, and `p95` is the nearest-rank 95th percentile of latency (sorted values, index `ceil(0.95 * n) - 1`). (2) Write `self_times(spans)`: each span is `{'id', 'parent', 'start', 'end'}` (parent is `None` for the root); return `{id: its duration minus the summed durations of its direct children}`.",
  "starterCode": "import json\nimport math\n\ndef summarize(lines):\n    pass\n\ndef self_times(spans):\n    pass\n\nprint(summarize(['{\"service\": \"a\", \"level\": \"INFO\", \"latency_ms\": 10}', 'oops']))\n",
  "tests": "import json\nlines = [json.dumps({'service': 'scorer', 'level': 'INFO' if i % 5 else 'ERROR', 'latency_ms': i}) for i in range(1, 21)]\nlines += ['not json', json.dumps({'service': 'api', 'level': 'INFO', 'latency_ms': 7})]\ns = summarize(lines)\nassert set(s) == {'scorer', 'api'}\nassert s['scorer']['count'] == 20\nassert s['scorer']['errors'] == 4\nassert abs(s['scorer']['error_rate'] - 0.2) < 1e-12\nassert s['scorer']['p95'] == 19\nassert s['api'] == {'count': 1, 'errors': 0, 'error_rate': 0.0, 'p95': 7}\nspans = [\n    {'id': 'api', 'parent': None, 'start': 0, 'end': 1800},\n    {'id': 'ranker', 'parent': 'api', 'start': 100, 'end': 1600},\n    {'id': 'fs', 'parent': 'ranker', 'start': 200, 'end': 1500},\n]\nt = self_times(spans)\nassert t == {'api': 300, 'ranker': 200, 'fs': 1300}, t\nassert self_times([{'id': 'x', 'parent': None, 'start': 5, 'end': 9}]) == {'x': 4}",
  "solution": "import json\nimport math\n\ndef summarize(lines):\n    data = {}\n    for line in lines:\n        try:\n            rec = json.loads(line)\n            svc, level, lat = rec['service'], rec['level'], rec['latency_ms']\n        except (ValueError, KeyError, TypeError):\n            continue\n        data.setdefault(svc, []).append((level, lat))\n    out = {}\n    for svc, rows in data.items():\n        lats = sorted(l for _, l in rows)\n        errors = sum(1 for lv, _ in rows if lv == 'ERROR')\n        out[svc] = {\n            'count': len(rows),\n            'errors': errors,\n            'error_rate': errors / len(rows),\n            'p95': lats[math.ceil(0.95 * len(lats)) - 1],\n        }\n    return out\n\ndef self_times(spans):\n    dur = {s['id']: s['end'] - s['start'] for s in spans}\n    child_sum = {}\n    for s in spans:\n        if s['parent'] is not None:\n            child_sum[s['parent']] = child_sum.get(s['parent'], 0) + dur[s['id']]\n    return {i: d - child_sum.get(i, 0) for i, d in dur.items()}",
  "hints": [
    "Wrap json.loads and the key lookups in try/except and `continue` on failure; group (level, latency) by service.",
    "For the trace, first compute every span's duration, then add each span's duration to its parent's child total."
  ]
}
```

> [!TIP] Interview tips
> - Name the pillars and what question each answers: metrics detect, traces localise, logs explain; link them with a trace id.
> - Mention RED/USE or the golden signals, percentiles over averages, and low-cardinality metric labels.
> - Know structured logging, OpenTelemetry, sampling (head vs tail), and alerting on user-facing symptoms against an SLO.
