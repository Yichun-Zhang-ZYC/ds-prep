---
id: data-engineering-batch-vs-streaming
title: Batch vs streaming
estimatedMinutes: 10
difficulty: easy
tags: [data-engineering, streaming, batch, architecture]
---

## Why it matters
"Should this be real-time?" is a judgment call interviewers love. Streaming adds cost and complexity, so you should justify it with a business need and know the architectures (Lambda, Kappa).

## Concept

| | Batch | Streaming |
|---|---|---|
| Data | Bounded chunks (yesterday, last hour) | Unbounded, continuous events |
| Latency | Minutes to hours | Milliseconds to seconds (micro-batch: seconds) |
| Complexity | Lower: rerun a partition to fix | Higher: state, ordering, late data, exactly-once |
| Cost | Cheap compute, scheduled | Always-on infrastructure |
| Tools | Spark, dbt, warehouse SQL, Airflow | Kafka, Flink, Spark Structured Streaming, Kafka Streams |
| Backfill | Easy | Harder (replay the log) |

Use streaming when freshness changes decisions: fraud detection, real-time pricing, alerting, live dashboards for operations, recommendation features from the current session. Daily reporting and most analytics are fine with batch (or frequent micro-batches).

Architectures:
- **Lambda**: a batch layer (accurate, recomputed) plus a speed layer (approximate, real-time), merged at serving time. Downside: two codebases with the same logic.
- **Kappa**: everything is a stream; reprocessing = replaying the log (Kafka) through the same streaming job. One codebase; requires a durable, replayable log.
- Modern lakehouses blur the line: streaming ingestion into Delta/Iceberg tables, with batch and streaming readers on the same tables.

## Worked example
A food-delivery company: fraud scoring on each payment must happen in under 200 ms (streaming); the "orders per city per day" executive report can run hourly in batch; an ops dashboard of current courier availability needs ~10-second freshness (streaming or micro-batch).

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which use case most clearly requires streaming?",
  "options": ["Monthly finance close", "Blocking fraudulent card transactions before approval", "Quarterly churn analysis", "Training a model weekly"],
  "answer": 1,
  "explanation": "The decision must be made within the transaction's latency budget."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `needs_streaming(max_staleness_s, batch_interval_s)` returning True when the required freshness is shorter than the batch interval can deliver. Then write `micro_batches(events, interval)` that groups `(timestamp_seconds, value)` events into consecutive micro-batches by `timestamp // interval`, returning a list of `(batch_start, [values])` sorted by batch_start.",
  "starterCode": "def needs_streaming(max_staleness_s, batch_interval_s):\n    pass\n\ndef micro_batches(events, interval):\n    pass\n\nprint(micro_batches([(1, 'a'), (12, 'b'), (5, 'c'), (25, 'd')], 10))",
  "tests": "assert needs_streaming(1, 3600) is True\nassert needs_streaming(86400, 3600) is False\nassert micro_batches([(1, 'a'), (12, 'b'), (5, 'c'), (25, 'd')], 10) == [(0, ['a', 'c']), (10, ['b']), (20, ['d'])]\nassert micro_batches([], 10) == []",
  "solution": "def needs_streaming(max_staleness_s, batch_interval_s):\n    return max_staleness_s < batch_interval_s\n\ndef micro_batches(events, interval):\n    groups = {}\n    for ts, v in sorted(events, key=lambda e: e[0]):\n        groups.setdefault(ts // interval * interval, []).append(v)\n    return sorted(groups.items())",
  "hints": ["Batch start = ts // interval * interval.", "Sort events by time before grouping."]
}
```

> [!TIP] Interview tips
> - Ask "how fresh must the data be, and what decision does it drive?" before choosing streaming.
> - Contrast Lambda (two paths) and Kappa (one replayable stream) architectures.
> - Mention micro-batching as a middle ground and the operational cost of always-on systems.
