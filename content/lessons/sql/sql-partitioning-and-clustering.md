---
id: sql-partitioning-and-clustering
title: Partitioning and clustering
estimatedMinutes: 10
difficulty: medium
tags: [performance, warehouse, partitioning]
---

## Why it matters
In data warehouses you pay for bytes scanned, and queries over billions of rows only stay fast if they skip most of the data. Partitioning and clustering are how they skip it, and they come up in DE and analytics-engineering interviews.

## Concept
- **Partitioning** splits a table into separate chunks by a column, usually a date (`event_date`). A filter on that column lets the engine read only matching partitions: **partition pruning**.
- **Clustering** (BigQuery, Snowflake) or **sort keys** (Redshift) order data inside storage blocks by one or more columns, so the engine can skip blocks whose min/max range can't match the filter.

| | Partitioning | Clustering |
|---|---|---|
| Typical column | date / timestamp | high-use filter columns (`user_id`, `country`) |
| Granularity | coarse (one per day) | fine (blocks within partitions) |
| Pitfall | too many tiny partitions | low benefit on low-cardinality columns |

Pruning only happens if the filter is on the partition column directly. `WHERE DATE(event_ts) = ...` on a table partitioned by `event_date` may scan everything.

## Worked example
BigQuery DDL and a query that prunes:

```sql
CREATE TABLE analytics.events
PARTITION BY event_date
CLUSTER BY user_id, event_name AS
SELECT * FROM raw.events;

-- Reads only 7 partitions, and within them only blocks for this user
SELECT event_name, COUNT(*)
FROM analytics.events
WHERE event_date BETWEEN '2024-06-01' AND '2024-06-07'
  AND user_id = 123
GROUP BY event_name;
```

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A table is partitioned by `event_date`. Which query scans the least data?",
  "options": ["`WHERE user_id = 5`", "`WHERE event_date >= '2024-06-01'`", "`WHERE EXTRACT(YEAR FROM event_date) = 2024`", "No filter, but `LIMIT 10`"],
  "answer": 1,
  "explanation": "A direct filter on the partition column prunes partitions. LIMIT doesn't reduce bytes scanned in most warehouses, and functions on the column may block pruning."
}
```

```reveal
{
  "prompt": "How would you choose the partition and clustering columns for a 2-billion-row events table?",
  "answer": "Look at how the table is queried.\n\n- **Partition** by the column almost every query filters on, usually the event date, at a granularity that keeps partitions reasonably large (daily is typical).\n- **Cluster** by the next most common filters or join keys (`user_id`, `event_name`, `country`), ordered by how often they're used.\n- Require a partition filter on huge tables (BigQuery `require_partition_filter`) to prevent accidental full scans.\n- Revisit after checking query logs: bytes scanned per query and pruning effectiveness."
}
```

> [!TIP] Interview tips
> - Tie the choice to query patterns: "most queries filter on date and user, so…".
> - Mention cost: in BigQuery on-demand pricing, bytes scanned are the bill.
> - Partitioning in Postgres (declarative partitioning) exists too, mainly for maintenance like dropping old data.
