---
id: sql-explain-query-plans
title: EXPLAIN / query plans
estimatedMinutes: 10
difficulty: medium
tags: [performance, explain, internals]
---

## Why it matters
Optimizing without the query plan is guessing. Interviewers for senior analyst and data engineer roles expect you to read a plan and name what's expensive.

## Concept
`EXPLAIN` shows how the database will run a query; `EXPLAIN ANALYZE` (Postgres) actually runs it and reports real times and row counts. Warehouses show the same information as a visual "query profile".

What to look for:

| Plan node | Meaning | Red flag when… |
|---|---|---|
| Seq Scan / full table scan | reads every row | the table is big and the filter is selective |
| Index Scan / Index Seek | uses an index | expected on selective filters |
| Hash Join | builds a hash table of one side | the "build" side is huge |
| Nested Loop | for each row of A, probe B | both sides are large (fine if one side is tiny) |
| Sort | orders rows | big sorts spilling to disk |
| Estimated vs actual rows | optimizer's guess vs reality | off by 10× or more: stale statistics |

In warehouses also check **bytes scanned** (cost) and **shuffle / data skew** between workers.

## Worked example
A Postgres plan for a filtered join (simplified):

```text
Hash Join  (cost=..  rows=1200)  (actual rows=980)
  Hash Cond: (o.customer_id = c.id)
  -> Seq Scan on orders o  (rows=5,000,000)
       Filter: (order_date >= '2024-06-01')
       Rows Removed by Filter: 4,900,000
  -> Hash  -> Seq Scan on customers c
```

Reading it: the database scans all 5M orders to keep 100k. An index (or partition) on `order_date` would let it read only the recent rows.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "The plan estimates 50 rows for a step that actually returns 2,000,000. What's the most likely cause?",
  "options": ["The query has a syntax error", "Outdated table statistics, so the optimizer picked a bad plan", "Too many indexes", "The result was cached"],
  "answer": 1,
  "explanation": "Big gaps between estimated and actual rows usually mean stale or missing statistics. Run ANALYZE (Postgres) or equivalent."
}
```

```reveal
{
  "prompt": "When is a full table scan actually the right plan?",
  "answer": "When the query needs a large share of the table (roughly more than 5–20%, depending on the engine), reading the table sequentially is cheaper than many random index lookups. It's also normal for small tables and for columnar warehouses, which scan only the needed columns and skip partitions or blocks using metadata."
}
```

> [!TIP] Interview tips
> - Name the specific node you'd fix ("the seq scan on orders filtered by date").
> - Mention `EXPLAIN ANALYZE` runs the query; don't run it on an expensive `DELETE` in production.
> - In BigQuery or Snowflake, lead with bytes scanned, partition pruning and skew.
