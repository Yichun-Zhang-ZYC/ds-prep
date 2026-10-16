---
id: data-engineering-spark-structured-streaming-flink
title: Spark Structured Streaming / Flink
estimatedMinutes: 12
difficulty: medium
tags: [data-engineering, streaming, spark, flink]
---

## Why it matters
Once events are in Kafka, something must process them: aggregate, join, enrich, write to a sink. Spark Structured Streaming and Apache Flink are the two main engines, and interviewers ask how they work and how they differ.

## Concept
**Spark Structured Streaming**
- Treats a stream as an **unbounded table**; you write the same DataFrame/SQL code as batch, and Spark runs it incrementally.
- Default execution: **micro-batches** (e.g. every few seconds); latency typically ~1 s or more. (Continuous mode exists but is limited.)
- **Output modes**: append (only new final rows), update (changed rows), complete (whole result table).
- **Checkpointing** (offsets + state to durable storage) enables recovery and exactly-once with idempotent/transactional sinks (e.g. Delta).
- Stateful operations: windowed aggregations with **watermarks**, stream-stream joins, `mapGroupsWithState` / `transformWithState`.
- Great when you're already on Spark/Databricks and want one codebase for batch and streaming.

**Apache Flink**
- True **event-at-a-time** streaming with low latency (milliseconds).
- Rich **event-time** support: watermarks, windows (tumbling, sliding, session), timers, allowed lateness.
- Large managed **keyed state** (RocksDB backend) with periodic **distributed snapshots** (checkpoints, Chandy-Lamport) for exactly-once.
- APIs: DataStream, Table API/Flink SQL. Used for fraud detection, real-time features, alerting, complex event processing.

Choosing: sub-second latency or complex stateful event-time logic → Flink. Unified batch/streaming on a Spark lakehouse with seconds of latency → Structured Streaming. Simple Kafka-to-Kafka transforms → Kafka Streams. Managed options: Databricks, Confluent Flink, AWS Managed Flink, Dataflow (Apache Beam).

## Worked example
```python
orders = (spark.readStream.format("kafka").option("subscribe", "orders").load()
          .select(F.from_json(F.col("value").cast("string"), schema).alias("o")).select("o.*"))
per_min = (orders.withWatermark("event_ts", "10 minutes")
           .groupBy(F.window("event_ts", "1 minute"), "country")
           .agg(F.sum("amount").alias("revenue")))
(per_min.writeStream.format("delta").outputMode("append")
        .option("checkpointLocation", "s3://chk/per_min").start("s3://gold/revenue_per_min"))
```

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What is a key architectural difference between Spark Structured Streaming (default) and Flink?",
  "options": ["Spark can't read Kafka", "Spark processes micro-batches; Flink processes events one at a time with lower latency", "Flink doesn't support state", "Spark has no checkpointing"],
  "answer": 1,
  "explanation": "Micro-batching trades some latency for simplicity and batch/stream unification."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Simulate a stateful streaming aggregation with checkpointing. `StreamAgg()` keeps running totals per key in `self.state` and the last processed offset in `self.offset` (start −1). `process(batch)` takes a list of `(offset, key, amount)` records, skips records with offset ≤ self.offset (already processed: replays after a crash shouldn't double count), updates state, and advances the offset. `checkpoint()` returns a copy `(offset, dict(state))`; `restore(cp)` loads it.",
  "starterCode": "class StreamAgg:\n    def __init__(self):\n        self.state = {}\n        self.offset = -1\n\n    def process(self, batch):\n        pass\n\n    def checkpoint(self):\n        pass\n\n    def restore(self, cp):\n        pass\n",
  "tests": "s = StreamAgg()\ns.process([(0, 'US', 10), (1, 'CA', 5)])\ncp = s.checkpoint()\ns.process([(2, 'US', 7)])\nassert s.state == {'US': 17, 'CA': 5}\nr = StreamAgg()\nr.restore(cp)\nr.process([(1, 'CA', 5), (2, 'US', 7), (3, 'CA', 1)])\nassert r.state == {'US': 17, 'CA': 6} and r.offset == 3\nassert cp[1] == {'US': 10, 'CA': 5}",
  "solution": "class StreamAgg:\n    def __init__(self):\n        self.state = {}\n        self.offset = -1\n\n    def process(self, batch):\n        for off, key, amount in sorted(batch):\n            if off <= self.offset:\n                continue\n            self.state[key] = self.state.get(key, 0) + amount\n            self.offset = off\n\n    def checkpoint(self):\n        return (self.offset, dict(self.state))\n\n    def restore(self, cp):\n        self.offset, state = cp\n        self.state = dict(state)",
  "hints": ["Skipping offsets you've already applied makes replays safe.", "Checkpoint copies of state so later updates don't change the saved snapshot."]
}
```

> [!TIP] Interview tips
> - Spark Structured Streaming: unbounded table, micro-batches, output modes, checkpoints, watermarks.
> - Flink: event-at-a-time, rich event-time semantics, large keyed state, distributed snapshots.
> - Choose by latency needs and existing stack; mention checkpointing + idempotent/transactional sinks for exactly-once.
