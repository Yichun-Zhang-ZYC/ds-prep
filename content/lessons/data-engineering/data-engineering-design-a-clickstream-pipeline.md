---
id: data-engineering-design-a-clickstream-pipeline
title: Design a clickstream pipeline
estimatedMinutes: 20
difficulty: hard
tags: [data-engineering, system-design, streaming, case-interview]
---

## Why it matters
"Design a pipeline that collects website/app click events and powers analytics" is the most common data engineering system design question. It tests ingestion, streaming vs batch, storage layout, data quality and cost.

## Concept
A framework to follow in any pipeline design:
1. **Clarify requirements**: event volume (events/sec, peak), latency needs (real-time vs daily), consumers (dashboards, ML, ad-hoc), retention, privacy constraints.
2. **Estimate scale**: events/day × bytes/event → GB/day, peak throughput, storage per year.
3. **High-level architecture** from source to consumers.
4. **Deep dives**: schema, partitioning, deduplication, late data, failure handling.
5. **Data quality, monitoring, cost, privacy.**

Reference architecture for clickstream:
- **Collection**: client SDKs batch events (with `event_id`, `user_id`/anonymous id, `session_id`, `event_type`, `event_ts` client time, properties) and send to a **collector/API gateway**, which validates against a schema, adds server time and IP-derived geo, and publishes to **Kafka/Kinesis** (partitioned by user or session id).
- **Raw landing**: a sink (Kafka Connect / Firehose) writes compressed raw events to object storage `bronze/clicks/dt=…/hr=…` — the immutable source of truth for replay.
- **Stream processing** (Flink/Spark Streaming) for low-latency needs: real-time counters, session metrics, feature updates to an online store; dedup by `event_id`, event-time windows with watermarks.
- **Batch processing** (Spark/dbt, hourly/daily): parse, dedupe, sessionize, bot filtering, identity stitching (anonymous → logged-in user), write **Silver** Parquet/Delta partitioned by `event_date`, then **Gold** aggregates (DAU, funnels, retention).
- **Serving**: warehouse/lakehouse for BI and ad-hoc SQL; OLAP store (Druid/Pinot/ClickHouse) for sub-second dashboards; feature store for ML.
- **Cross-cutting**: schema registry and data contracts, data-quality checks (volume, null rates, freshness), orchestration (Airflow/Dagster), PII handling (hash IPs, consent flags, deletion), monitoring of consumer lag.

## Worked example
Estimate: 50M DAU × 100 events/user/day = 5B events/day ≈ 58k events/s on average, peaks ~3× ≈ 175k/s. At ~1 KB/event raw JSON: 5 TB/day raw; as compressed Parquet maybe ~0.7 TB/day; a year of Silver ≈ 250 TB. Kafka sizing: if one partition handles ~5–10 MB/s, peak 175 MB/s needs ≥ 20–35 partitions; choose 64 for headroom.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why keep an immutable raw copy of click events in object storage even if a streaming job already processes them?",
  "options": ["It's required by Kafka", "It enables replay and backfills when logic changes or bugs are found, independent of Kafka retention", "It makes the dashboards faster", "It avoids needing a schema"],
  "answer": 1,
  "explanation": "The raw zone is the system of record you can always reprocess."
}
```

```quiz
{
  "id": "q2",
  "question": "Client clocks are unreliable and mobile events arrive hours late. How should daily metrics handle this?",
  "options": ["Use only server receive time and ignore event time", "Store both client event time and server time; aggregate by event time with a reprocessing window for late data", "Drop all late events", "Use the Kafka offset as the timestamp"],
  "answer": 1,
  "explanation": "Keep both timestamps, correct obvious skew, and recompute recent partitions as late data arrives."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write capacity helpers. `events_per_sec(dau, events_per_user, peak_factor=1.0)` = dau × events_per_user / 86400 × peak_factor. `storage_tb_per_day(events_per_day, bytes_per_event, compression=1.0)` = events × bytes / compression / 1e12. `kafka_partitions(peak_mb_per_sec, mb_per_partition)` = ceil of the ratio. Then `sessionize(timestamps, gap)` takes one user's sorted event times (seconds) and returns session ids (0, 1, 2…) per event, starting a new session when the gap since the previous event is > gap.",
  "starterCode": "import math\n\ndef events_per_sec(dau, events_per_user, peak_factor=1.0):\n    pass\n\ndef storage_tb_per_day(events_per_day, bytes_per_event, compression=1.0):\n    pass\n\ndef kafka_partitions(peak_mb_per_sec, mb_per_partition):\n    pass\n\ndef sessionize(timestamps, gap):\n    pass\n",
  "tests": "assert round(events_per_sec(50_000_000, 100)) == 57870\nassert round(events_per_sec(50_000_000, 100, 3)) == 173611\nassert storage_tb_per_day(5_000_000_000, 1000) == 5.0\nassert abs(storage_tb_per_day(5_000_000_000, 1000, 7) - 5 / 7) < 1e-12\nassert kafka_partitions(175, 8) == 22\nassert sessionize([0, 60, 4000, 4100, 9000], 1800) == [0, 0, 1, 1, 2]\nassert sessionize([], 1800) == []",
  "solution": "import math\n\ndef events_per_sec(dau, events_per_user, peak_factor=1.0):\n    return dau * events_per_user / 86400 * peak_factor\n\ndef storage_tb_per_day(events_per_day, bytes_per_event, compression=1.0):\n    return events_per_day * bytes_per_event / compression / 1e12\n\ndef kafka_partitions(peak_mb_per_sec, mb_per_partition):\n    return math.ceil(peak_mb_per_sec / mb_per_partition)\n\ndef sessionize(timestamps, gap):\n    ids, sid = [], -1\n    prev = None\n    for t in timestamps:\n        if prev is None or t - prev > gap:\n            sid += 1\n        ids.append(sid)\n        prev = t\n    return ids",
  "hints": ["There are 86,400 seconds in a day.", "Increment the session id whenever the gap exceeds the threshold."]
}
```

```reveal
{
  "prompt": "Interview: 'Design the clickstream pipeline for a mobile app with 50M DAU. Product wants a real-time active-users dashboard and daily funnel/retention analytics; ML wants session features.' Outline your answer.",
  "answer": "**1. Requirements**: ~5B events/day, peak ~175k/s; real-time dashboard with ~10 s freshness; daily analytics by 7 a.m.; session features for ML (online, minutes fresh); retain raw 1 year, aggregates longer; GDPR deletion and consent.\n\n**2. Ingestion**: SDK batches events with `event_id`, ids, client `event_ts`; collector validates against the schema registry (bad events → dead-letter topic), adds server time/geo, publishes to Kafka `clicks` keyed by `user_id` (64 partitions, RF 3, 7-day retention).\n\n**3. Raw zone**: Kafka Connect writes compressed raw events to `s3://lake/bronze/clicks/dt=/hr=` (immutable, for replay).\n\n**4. Streaming path**: Flink job dedups by `event_id` (keyed state with TTL), computes 1-minute active users with event-time windows and a 2-minute watermark into an OLAP store (Pinot/Druid/ClickHouse) for the dashboard; computes rolling session features into the online feature store (Redis/DynamoDB).\n\n**5. Batch path**: hourly/daily Spark or dbt jobs: parse, dedupe, filter bots, stitch anonymous ids to users, sessionize (30-minute gap), write Silver Delta/Iceberg partitioned by `event_date`, then Gold tables (DAU/WAU, funnels, cohort retention). Reprocess the last 3 days to absorb late events. Idempotent partition overwrites; Airflow/Dagster orchestration.\n\n**6. Quality & ops**: volume/null-rate/freshness checks before publishing Gold; Kafka consumer lag and Flink checkpoint alerts; data contracts with the app team.\n\n**7. Privacy & cost**: hash IPs, honor consent flags, deletion job across Silver/Gold + VACUUM; compaction of small files; lifecycle policies (bronze → cold storage after 90 days); sampling for exploratory queries.\n\n**Tradeoffs to mention**: Kappa (replay from Kafka/raw) vs separate batch logic; exactly-once via checkpoints + idempotent sinks; approximate distinct counts (HLL) for real-time DAU."
}
```

> [!TIP] Interview tips
> - Start with requirements and back-of-envelope numbers; they justify every later choice.
> - Draw source → collector → Kafka → raw zone → stream + batch → serving, and explain why each piece exists.
> - Go deep on dedup, late data, sessionization, partitioning and replay; finish with quality, privacy and cost.
