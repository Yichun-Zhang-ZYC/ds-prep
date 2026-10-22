---
id: ml-system-design-feature-store
title: Feature store
estimatedMinutes: 10
difficulty: medium
tags: [ml-system-design, feature-store, mlops, leakage]
---

## Why it matters
Most production ML bugs are feature bugs: a feature computed one way in training and another way at serving, or one that quietly leaks the future. A feature store is the standard answer, and interviewers probe point-in-time correctness and train/serve skew.

## Concept
A **feature store** is a system that defines, computes, stores and serves features consistently for training and inference.

Components:
- **Offline store** (warehouse / Parquet / Delta): full history, used to build training sets and for batch scoring.
- **Online store** (Redis, DynamoDB, Cassandra): latest value per entity key, read at serving in a few ms.
- **Registry / definitions**: feature name, entity, owner, transformation code, data type, freshness SLA, so teams reuse features instead of rebuilding them.
- **Pipelines**: batch jobs (daily aggregates) and streaming jobs (last-5-minutes counts) that **materialize** the same definition into both stores.

Problems it solves:
- **Train/serve skew**: one definition and one code path feed both stores, so logic cannot diverge.
- **Point-in-time correctness**: when building training rows, join each label to the feature values that were known **at the label's timestamp** (an "as-of join"), never the latest value, or you leak the future (see data leakage).
- **Reuse and discovery**, lineage, access control, and monitoring of feature freshness and drift.
- **Low-latency serving**: avoid recomputing heavy aggregates per request.

Costs and cautions: operational complexity, online-store memory cost (size = entities × features × bytes × replicas), backfills for new features, TTLs for stale values, and handling missing keys with defaults. Tools: Feast, Tecton, SageMaker/Vertex feature stores, Databricks Feature Store. Not every team needs one: for a single model with simple features, a well-tested shared library may be enough.

## Worked example
Label: user A churned-check at $t = 10$. Feature `sessions_7d` history for A: $(t=5, 3)$, $(t=9, 4)$, $(t=12, 7)$. The point-in-time join picks the latest value with $t \le 10$, which is 4. Joining the latest value (7) would leak activity from after the label time and inflate offline AUC.
Online store sizing: 100M users × 50 features × 8 bytes $= 40$ GB; with 2 replicas, 80 GB, which fits in a small Redis cluster.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What does a point-in-time (as-of) join guarantee for training data?",
  "options": [
    "Faster joins",
    "Each training row only uses feature values available at its label/prediction timestamp",
    "Features are normalized",
    "All users appear exactly once"
  ],
  "answer": 1,
  "explanation": "It prevents leaking future information into training rows, matching what the model would have known at serving time."
}
```

```quiz
{
  "id": "q2",
  "question": "Which is the main benefit of materializing one feature definition to both offline and online stores?",
  "options": [
    "It removes the need for monitoring",
    "It reduces train/serve skew",
    "It makes models more complex",
    "It guarantees higher AUC"
  ],
  "answer": 1,
  "explanation": "A single definition and pipeline keeps training and serving features consistent."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `point_in_time_join(labels, features)`. `labels` is a list of `(entity, ts)`; `features` is a list of `(entity, ts, value)` (unsorted). For each label return the value of the entity's most recent feature with `ts <= label ts`, or `None` if there is none. Also write `online_store_gb(n_entities, n_features, bytes_per_feature, replicas=1)` (1 GB = 1e9 bytes).",
  "starterCode": "def point_in_time_join(labels, features):\n    pass\n\ndef online_store_gb(n_entities, n_features, bytes_per_feature, replicas=1):\n    pass\n\nfeats = [('A', 5, 3), ('A', 12, 7), ('A', 9, 4), ('B', 2, 1)]\nprint(point_in_time_join([('A', 10), ('B', 1), ('C', 5)], feats))\n",
  "tests": "feats = [('A', 5, 3), ('A', 12, 7), ('A', 9, 4), ('B', 2, 1)]\nassert point_in_time_join([('A', 10), ('B', 1), ('C', 5)], feats) == [4, None, None]\nassert point_in_time_join([('A', 12), ('A', 4), ('B', 2)], feats) == [7, None, 1]\nassert point_in_time_join([], feats) == []\nassert abs(online_store_gb(100_000_000, 50, 8) - 40) < 1e-9\nassert abs(online_store_gb(100_000_000, 50, 8, 2) - 80) < 1e-9",
  "solution": "def point_in_time_join(labels, features):\n    by_entity = {}\n    for e, ts, v in features:\n        by_entity.setdefault(e, []).append((ts, v))\n    for e in by_entity:\n        by_entity[e].sort()\n    out = []\n    for e, t in labels:\n        val = None\n        for ts, v in by_entity.get(e, []):\n            if ts <= t:\n                val = v\n            else:\n                break\n        out.append(val)\n    return out\n\ndef online_store_gb(n_entities, n_features, bytes_per_feature, replicas=1):\n    return n_entities * n_features * bytes_per_feature * replicas / 1e9",
  "hints": [
    "Group features by entity and sort by timestamp, then scan until ts exceeds the label time.",
    "Equal timestamps are allowed (<=)."
  ]
}
```

> [!TIP] Interview tips
> - Lead with train/serve skew and point-in-time correctness; they are the reasons feature stores exist.
> - Describe offline vs online store, one definition feeding both, and freshness SLAs.
> - Be honest about costs, and say when a shared library or on-the-fly features are enough.
