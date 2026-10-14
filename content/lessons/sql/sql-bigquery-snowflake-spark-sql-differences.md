---
id: sql-bigquery-snowflake-spark-sql-differences
title: BigQuery, Snowflake, Spark SQL differences
estimatedMinutes: 12
difficulty: medium
tags: [dialects, warehouse, bigquery, snowflake, spark]
---

## Why it matters
Most data roles query a cloud warehouse or Spark, not Postgres. Interviewers want to hear that you know how these engines differ in cost model, syntax and features, and that you write SQL with that in mind.

## Concept
| Topic | BigQuery | Snowflake | Spark SQL |
|---|---|---|---|
| Cost model | bytes scanned (on-demand) or slots | warehouse compute time (credits) | cluster time |
| Filter on window result | `QUALIFY` | `QUALIFY` | subquery / CTE |
| Truncate date | `DATE_TRUNC(d, MONTH)` | `DATE_TRUNC('month', d)` | `DATE_TRUNC('month', d)` |
| Days between | `DATE_DIFF(d2, d1, DAY)` | `DATEDIFF(day, d1, d2)` | `DATEDIFF(d2, d1)` |
| Safe division | `SAFE_DIVIDE(a, b)` | `DIV0(a, b)` | `a / NULLIF(b, 0)` |
| Arrays / nested data | `ARRAY`, `STRUCT`, `UNNEST` | `VARIANT`, `FLATTEN` | `ARRAY`, `STRUCT`, `EXPLODE` |
| Approximate distinct | `APPROX_COUNT_DISTINCT` | `APPROX_COUNT_DISTINCT` | `approx_count_distinct` |
| Data skipping | partitioning + clustering | micro-partitions + clustering keys | partitioning, file pruning, Z-ordering (Delta) |

All three are columnar, so `SELECT *` costs more than selecting the columns you need, and `LIMIT` generally doesn't reduce the data scanned.

## Worked example
"Latest row per user" with `QUALIFY` (BigQuery / Snowflake) and without it (Spark):

```sql
-- BigQuery / Snowflake
SELECT *
FROM events
QUALIFY ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY ts DESC) = 1;

-- Spark SQL
SELECT * FROM (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY ts DESC) AS rn
  FROM events
) t
WHERE rn = 1;
```

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "In BigQuery on-demand pricing, which change usually reduces cost the most?",
  "options": ["Adding LIMIT 100", "Selecting only the needed columns and filtering on the partition column", "Using ORDER BY", "Replacing JOIN with a subquery"],
  "answer": 1,
  "explanation": "Cost is bytes scanned. Columnar storage reads only selected columns, and partition filters skip whole partitions. LIMIT doesn't reduce scanned bytes."
}
```

```reveal
{
  "prompt": "A Spark SQL join is very slow and one task runs much longer than the others. What's happening, and what can you do?",
  "answer": "That's **data skew**: a few join keys (e.g. a NULL key or one huge customer) hold most of the rows, so one partition gets far more work.\n\nFixes: filter or handle NULL keys separately; **broadcast** the small table if one side fits in memory (`/*+ BROADCAST(small) */`); **salt** the skewed key (add a random suffix on the big side, replicate the small side); or enable adaptive query execution (AQE) skew-join handling in Spark 3."
}
```

> [!TIP] Interview tips
> - Connect syntax to cost: "since BigQuery bills by bytes scanned, I'd select only these columns and filter on the partition date".
> - Mention `QUALIFY` when you're on BigQuery or Snowflake; it shows hands-on experience.
> - For Spark, think about shuffles, skew and broadcast joins, not just the SQL text.
