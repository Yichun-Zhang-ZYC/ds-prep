---
id: data-engineering-shuffle-data-skew-broadcast-join
title: Shuffle, data skew, broadcast join
estimatedMinutes: 14
difficulty: hard
tags: [data-engineering, spark, performance, joins]
---

## Why it matters
"Your Spark job is stuck at 199/200 tasks for an hour. What's happening?" is the classic Spark performance question. The answers involve shuffles, skew and join strategies.

## Concept
**Shuffle**: redistributing data across executors by key (for groupBy, join, distinct, repartition). Data is serialized, written to local disk, and fetched over the network. It's usually the most expensive part of a job. Reduce shuffles by filtering and selecting columns early, pre-aggregating, and avoiding unnecessary repartitions.

**Data skew**: a few keys have far more rows than others (null user_id, a mega-customer, "unknown" country). After a shuffle, one partition is huge, so one task runs for an hour while others finish in seconds, and it may spill or OOM.
Fixes:
- **Filter or handle junk keys** (nulls, defaults) separately.
- **Broadcast join** if the other side is small.
- **Salting**: append a random suffix 0..N−1 to the hot key on the big side, replicate the small side N times with each suffix, join on (key, salt), then aggregate. Spreads a hot key over N tasks.
- **Two-stage aggregation**: aggregate by (key, salt) first, then by key.
- **AQE skew join** (`spark.sql.adaptive.skewJoin.enabled`) splits skewed partitions automatically.

**Join strategies**:
- **Broadcast hash join**: send the small table to every executor; no shuffle of the large table. Great when one side fits in memory (default threshold `spark.sql.autoBroadcastJoinThreshold` = 10 MB; hint with `F.broadcast(df)`). Too big a broadcast can OOM the driver/executors.
- **Sort-merge join**: shuffle both sides by key, sort, merge. Default for two large tables.
- **Shuffle hash join**: shuffle both, build a hash table per partition.

## Worked example
Joining 2B click events to a 50 MB `dim_campaign`: a sort-merge join shuffles 2B rows. With `clicks.join(F.broadcast(campaigns), "campaign_id")` the large table never moves: the job drops from 40 to 6 minutes. A separate aggregation where 30% of rows have `user_id = NULL` gets one giant task; filtering nulls (or salting) fixes it.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A join stage has 199 tasks finishing in 30 s and one taking 45 minutes. Most likely cause?",
  "options": ["Too few executors", "Data skew: one key (e.g. null or a huge customer) maps to one partition", "Parquet files are compressed", "The driver is too small"],
  "answer": 1,
  "explanation": "A single straggler task with far more input than others is the signature of skew."
}
```

```quiz
{
  "id": "q2",
  "question": "When is a broadcast join appropriate?",
  "options": ["Both tables are 5 TB", "One table is small enough to fit in each executor's memory", "You need a full outer join on two huge tables", "Never in Spark"],
  "answer": 1,
  "explanation": "Broadcasting the small side avoids shuffling the large side."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `partition_sizes(keys, n_partitions)` returning a list of row counts per partition using `hash_fn(key) = sum(map(ord, str(key))) % n_partitions`. Write `skew_ratio(sizes)` = max / mean. Then write `salt_keys(keys, hot_keys, n_salts)` returning new keys where each occurrence of a hot key becomes f'{key}#{i % n_salts}' (i = running count of that hot key so far) and others stay unchanged; salting should reduce the skew ratio.",
  "starterCode": "def hash_fn(key, n):\n    return sum(map(ord, str(key))) % n\n\ndef partition_sizes(keys, n_partitions):\n    pass\n\ndef skew_ratio(sizes):\n    pass\n\ndef salt_keys(keys, hot_keys, n_salts):\n    pass\n",
  "tests": "keys = ['null'] * 900 + [f'u{i}' for i in range(100)]\nsizes = partition_sizes(keys, 10)\nassert sum(sizes) == 1000 and len(sizes) == 10\nassert skew_ratio([10, 10, 10]) == 1.0\nassert skew_ratio([30, 0, 0]) == 3.0\nsalted = salt_keys(keys, {'null'}, 10)\nassert salted[:3] == ['null#0', 'null#1', 'null#2'] and salted[-1] == 'u99'\nassert skew_ratio(partition_sizes(salted, 10)) < skew_ratio(sizes)",
  "solution": "def hash_fn(key, n):\n    return sum(map(ord, str(key))) % n\n\ndef partition_sizes(keys, n_partitions):\n    sizes = [0] * n_partitions\n    for k in keys:\n        sizes[hash_fn(k, n_partitions)] += 1\n    return sizes\n\ndef skew_ratio(sizes):\n    mean = sum(sizes) / len(sizes)\n    return max(sizes) / mean\n\ndef salt_keys(keys, hot_keys, n_salts):\n    seen = {}\n    out = []\n    for k in keys:\n        if k in hot_keys:\n            i = seen.get(k, 0)\n            seen[k] = i + 1\n            out.append(f'{k}#{i % n_salts}')\n        else:\n            out.append(k)\n    return out",
  "hints": ["Skew ratio of 1 means perfectly even partitions.", "Salting spreads one hot key over n_salts different keys, which hash to different partitions."]
}
```

> [!TIP] Interview tips
> - Diagnose from the Spark UI: one straggler task = skew; huge shuffle read/write = too much data moved.
> - Fixes in order: filter/handle null keys, broadcast small sides, salting or two-stage aggregation, AQE skew handling.
> - Know join strategies (broadcast hash vs sort-merge) and the broadcast threshold and its OOM risk.
