---
id: data-engineering-design-a-real-time-dashboard-backend
title: Design a real-time dashboard backend
estimatedMinutes: 20
difficulty: hard
tags: [data-engineering, system-design, streaming, olap, case-interview]
---

## Why it matters
"Design the backend for a live dashboard showing orders per minute by city, refreshed every few seconds, for thousands of viewers" tests streaming aggregation, OLAP serving stores, pre-aggregation and caching.

## Concept
Key requirements to clarify: freshness (1 s? 10 s?), query patterns (fixed charts vs ad-hoc slicing), dimensions and cardinality (city, category, device), time range (last hour vs last 90 days), concurrency (number of viewers), accuracy (approximate OK?), and late data tolerance.

Reference architecture:
- **Events → Kafka** (orders, clicks), keyed sensibly.
- **Stream processor** (Flink / Spark Structured Streaming / ksqlDB): parse, dedupe by event id, enrich (join with dimension tables via broadcast state or lookups), and **pre-aggregate** into small time buckets (e.g. 10 s or 1 min, by city × category) using event time + watermarks. Emit updates.
- **Real-time OLAP store** for serving: **Apache Pinot, Druid, ClickHouse** (or StarRocks). They ingest from Kafka directly, store columnar segments, and answer slice-and-dice aggregations in milliseconds at high QPS. Alternative for simple fixed views: Redis counters / sorted sets keyed by (metric, bucket).
- **API layer** with caching: the dashboard backend queries the OLAP store; cache identical queries for a few seconds (all viewers share the same "last 15 minutes" chart); push updates via **WebSockets/SSE** rather than every client polling.
- **Historical data**: older ranges served from rollups (1-minute → hourly) or the warehouse; the OLAP store keeps recent detail and rolled-up history (tiered retention).
- **Correctness**: late events update past buckets (upserts); exactly-once via checkpoints + idempotent sinks; reconcile with batch numbers daily (the batch pipeline remains the source of truth).
- **Approximations**: HyperLogLog for distinct users, t-digest for percentiles, to keep state small.
- **Ops**: monitor end-to-end latency (event time → visible), consumer lag, query p99, backpressure.

## Worked example
200k orders/hour peak ≈ 56/s: tiny for Kafka. Pre-aggregating to 1-minute × 500 cities × 20 categories gives at most 10k rows/minute; a "last hour by city" query scans ≤ 600k small rows, which Pinot/ClickHouse answers in tens of ms. With 5,000 viewers polling every 5 s (1,000 QPS), a 2-second shared cache reduces OLAP load to ~1 query per distinct chart per 2 s.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why pre-aggregate events into time buckets in the stream processor before serving?",
  "options": ["To lose data intentionally", "It shrinks the data the serving store scans, making queries fast and cheap at high concurrency", "OLAP stores can't store raw events", "Kafka requires it"],
  "answer": 1,
  "explanation": "Dashboards need aggregates; computing them once beats scanning raw events for every viewer."
}
```

```quiz
{
  "id": "q2",
  "question": "Thousands of users view the same live chart. What reduces backend load most simply?",
  "options": ["Each client queries the database every second", "Cache query results for a few seconds and push updates (WebSocket/SSE) to clients", "Increase Kafka partitions", "Store data as CSV"],
  "answer": 1,
  "explanation": "Shared caching and push turn N identical queries into one."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement a mini real-time aggregator. `RollingCounter(bucket_s)` stores counts per (bucket_start, key). `add(event_ts, key, n=1)` adds to the bucket containing event_ts (late events update older buckets). `query(now, window_s)` returns a dict key → total over buckets with start ≥ now − window_s and start ≤ now. Then write `TTLCache(ttl)` with `get(key, now, compute)`: return the cached value if it was computed less than ttl seconds ago, else call compute(), store it with its time and return it; track `self.misses`.",
  "starterCode": "class RollingCounter:\n    def __init__(self, bucket_s):\n        self.bucket_s = bucket_s\n        self.buckets = {}\n\n    def add(self, event_ts, key, n=1):\n        pass\n\n    def query(self, now, window_s):\n        pass\n\nclass TTLCache:\n    def __init__(self, ttl):\n        self.ttl = ttl\n        self.store = {}\n        self.misses = 0\n\n    def get(self, key, now, compute):\n        pass\n",
  "tests": "rc = RollingCounter(60)\nfor ts, city in [(0, 'NYC'), (30, 'SF'), (65, 'NYC'), (130, 'NYC'), (10, 'SF')]:\n    rc.add(ts, city)\nassert rc.buckets[(0, 'SF')] == 2\nassert rc.query(130, 70) == {'NYC': 2}\nassert rc.query(130, 1000) == {'NYC': 3, 'SF': 2}\nc = TTLCache(2)\ncalls = []\nf = lambda: calls.append(1) or len(calls)\nassert c.get('chart', 0, f) == 1\nassert c.get('chart', 1.5, f) == 1\nassert c.get('chart', 2.5, f) == 2\nassert c.misses == 2",
  "solution": "class RollingCounter:\n    def __init__(self, bucket_s):\n        self.bucket_s = bucket_s\n        self.buckets = {}\n\n    def add(self, event_ts, key, n=1):\n        start = event_ts // self.bucket_s * self.bucket_s\n        self.buckets[(start, key)] = self.buckets.get((start, key), 0) + n\n\n    def query(self, now, window_s):\n        out = {}\n        for (start, key), c in self.buckets.items():\n            if now - window_s <= start <= now:\n                out[key] = out.get(key, 0) + c\n        return out\n\nclass TTLCache:\n    def __init__(self, ttl):\n        self.ttl = ttl\n        self.store = {}\n        self.misses = 0\n\n    def get(self, key, now, compute):\n        if key in self.store and now - self.store[key][0] < self.ttl:\n            return self.store[key][1]\n        self.misses += 1\n        value = compute()\n        self.store[key] = (now, value)\n        return value",
  "hints": ["Bucket start = ts // bucket_s × bucket_s; a late event simply lands in an older bucket.", "Cache entries store (computed_at, value)."]
}
```

```reveal
{
  "prompt": "Interview: 'Design the backend for a real-time operations dashboard: orders per minute, revenue and active couriers by city, ≤ 10 s freshness, 5,000 concurrent viewers, plus the ability to look back 30 days.' Outline your answer.",
  "answer": "**1. Requirements**: metrics (orders/min, revenue, active couriers, p95 delivery time) by city/zone; freshness ≤ 10 s; 5k viewers; last 30 days; approximate distinct counts OK; numbers must reconcile with finance daily.\n\n**2. Ingestion**: order and courier-location events to Kafka (orders keyed by order_id, couriers by courier_id), schema registry.\n\n**3. Stream processing**: Flink job dedups by event id, enriches with city/zone (broadcast dimension state), aggregates per 10-second/1-minute event-time buckets × city with a 1–2 minute watermark; active couriers via HLL per bucket; delivery-time percentiles via t-digest. Writes upserts to the serving store; checkpoints for exactly-once.\n\n**4. Serving store**: Pinot/Druid/ClickHouse ingesting the aggregate topic (and optionally raw events for drill-down), partitioned by time, with rollups to hourly for data older than 2 days; 30-day retention (older from the warehouse).\n\n**5. API**: dashboard service with a 2–5 s shared cache per (chart, filters); WebSocket/SSE pushes to clients; rate limiting.\n\n**6. Correctness & ops**: late events update older buckets; nightly reconciliation vs the batch warehouse; alerts on consumer lag, end-to-end latency (event_ts → queryable), query p99; backfill by replaying Kafka/raw into the store.\n\n**Tradeoffs**: pre-aggregation (fast, inflexible) vs raw events in the OLAP store (flexible drill-down, more cost); Redis counters for a handful of fixed tiles vs an OLAP store for slicing; approximate vs exact distinct counts."
}
```

> [!TIP] Interview tips
> - Clarify freshness, query flexibility, concurrency and accuracy first; they decide pre-aggregation and store choice.
> - Architecture: Kafka → stream processor (event-time windows, watermarks, dedup) → real-time OLAP (Pinot/Druid/ClickHouse) → cached API with push.
> - Cover late data, exactly-once, rollups/retention, reconciliation with batch, and latency monitoring.
