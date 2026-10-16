---
id: data-engineering-partitioning-and-bucketing
title: Partitioning & bucketing
estimatedMinutes: 12
difficulty: medium
tags: [data-engineering, storage, partitioning, performance]
---

## Why it matters
Good partitioning makes queries 100× cheaper; bad partitioning creates millions of tiny files and slow jobs. Interviewers ask how you'd choose partition keys and when bucketing helps.

## Concept
**Partitioning** splits a table into separate directories/segments by the value of a column, usually a date: `events/event_date=2024-06-01/`. Queries filtering on the partition column read only matching partitions (**partition pruning**).

Choosing a partition key:
- Columns used in most `WHERE` filters (date is the classic choice).
- **Low-to-moderate cardinality**: aim for partitions of roughly 100 MB–1 GB+. Partitioning by `user_id` (millions of values) creates millions of tiny files: the **small files problem** slows metadata listing and scans.
- Avoid skew: one huge partition and many tiny ones defeats parallelism.
- Warehouses: BigQuery partition by date/integer range (max 4,000 partitions per table), Snowflake auto micro-partitions plus clustering keys, Redshift sort keys.

**Bucketing (clustering / hashing)** divides data into a fixed number of buckets by `hash(key) % N`, within or instead of partitions.
- Good for **high-cardinality** columns (user_id) used in joins and filters.
- If two tables are bucketed on the join key with the same N, Spark/Hive can join bucket-to-bucket **without a shuffle**.
- Clustering in BigQuery/Snowflake sorts data within partitions by chosen columns, improving block pruning for filters on them.

Typical design: partition by `event_date`, cluster/bucket by `user_id`.

## Worked example
Events table, 2 years, 5 TB. Partitioned by date: 730 partitions of ~7 GB, and a one-week query reads 7 partitions (~50 GB). If you instead partition by `country × date × hour`, you get ~3M partitions, most a few KB: listing files alone takes minutes. Better: partition by date and cluster by country.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why is partitioning a large table by user_id usually a bad idea?",
  "options": ["user_id can't be filtered", "It creates a huge number of tiny partitions/files, hurting metadata and scan performance", "Partitions must be dates", "It makes joins impossible"],
  "answer": 1,
  "explanation": "High-cardinality partition keys cause the small-files problem; bucket or cluster by user_id instead."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `bucket_of(key, n_buckets)` using `zlib.crc32(str(key).encode()) % n_buckets`. Write `partition_stats(rows, key)` returning a dict partition value → row count. Then write `is_good_partition_key(n_rows, n_distinct, bytes_per_row, min_mb=100)` returning True if the average partition size (n_rows / n_distinct × bytes_per_row) is at least `min_mb` megabytes (1 MB = 1e6 bytes).",
  "starterCode": "import zlib\nfrom collections import Counter\n\ndef bucket_of(key, n_buckets):\n    pass\n\ndef partition_stats(rows, key):\n    pass\n\ndef is_good_partition_key(n_rows, n_distinct, bytes_per_row, min_mb=100):\n    pass\n",
  "tests": "import zlib\nassert bucket_of(42, 8) == zlib.crc32(b'42') % 8\nassert all(0 <= bucket_of(k, 16) < 16 for k in range(100))\nrows = [{'d': '2024-06-01'}, {'d': '2024-06-01'}, {'d': '2024-06-02'}]\nassert partition_stats(rows, 'd') == {'2024-06-01': 2, '2024-06-02': 1}\nassert is_good_partition_key(5_000_000_000, 730, 1000) is True\nassert is_good_partition_key(5_000_000_000, 10_000_000, 1000) is False",
  "solution": "import zlib\nfrom collections import Counter\n\ndef bucket_of(key, n_buckets):\n    return zlib.crc32(str(key).encode()) % n_buckets\n\ndef partition_stats(rows, key):\n    return dict(Counter(r[key] for r in rows))\n\ndef is_good_partition_key(n_rows, n_distinct, bytes_per_row, min_mb=100):\n    avg_bytes = n_rows / n_distinct * bytes_per_row\n    return avg_bytes >= min_mb * 1e6",
  "hints": ["A stable hash (crc32) keeps bucket assignment consistent across runs.", "730 date partitions of 5B rows × 1 KB ≈ 6.8 GB each: fine. 10M partitions ≈ 0.5 MB each: too small."]
}
```

> [!TIP] Interview tips
> - Partition on frequently filtered, moderate-cardinality columns (usually date); target partitions ≥ ~100 MB.
> - Use bucketing/clustering for high-cardinality join or filter keys; mention shuffle-free bucketed joins.
> - Call out the small-files problem and skewed partitions, plus compaction as the fix.
