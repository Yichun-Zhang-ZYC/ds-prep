---
id: data-engineering-data-warehouse
title: Data warehouse (Snowflake, BigQuery, Redshift)
estimatedMinutes: 12
difficulty: medium
tags: [data-engineering, storage, warehouse, cloud]
---

## Why it matters
The cloud data warehouse is the center of most analytics stacks. Interviewers ask how Snowflake, BigQuery and Redshift work under the hood, how they're priced, and how to make queries fast and cheap.

## Concept
A **data warehouse** is a centralized, structured, SQL-queryable store of cleaned, integrated, historical data for analytics.

Modern cloud warehouses share a design:
- **Columnar storage** with compression; data split into micro-partitions/blocks with min/max metadata for **pruning**.
- **Separation of storage and compute**: data lives in cheap object storage; compute clusters scale independently (and can be paused).
- **MPP** (massively parallel processing): a query is split across many workers.

| | Snowflake | BigQuery | Redshift |
|---|---|---|---|
| Compute | Virtual warehouses (sized, auto-suspend) | Serverless slots | Provisioned clusters or Serverless |
| Pricing | Credits per second of warehouse uptime + storage | On-demand per TB scanned, or slot reservations | Node-hours (or RPU-hours) + storage |
| Tuning levers | Clustering keys, warehouse size, result cache | Partitioning, clustering, avoid SELECT * | Sort keys, distribution keys, VACUUM/ANALYZE |
| Extras | Zero-copy clones, time travel, data sharing | Nested/repeated fields, BI Engine, ML in SQL | Tight AWS integration, Spectrum for S3 |

Cost and speed habits:
- Select only needed columns (columnar: cost ∝ columns read). Avoid `SELECT *`.
- Filter on partition/cluster columns so the engine prunes blocks.
- Pre-aggregate with incremental models / materialized views for dashboards.
- Watch for exploding joins and repeated full-table rebuilds.

Layers inside the warehouse (common convention): **raw/staging → intermediate → marts** (dimensional models), often built with dbt.

## Worked example
A BigQuery table of 10 TB events partitioned by `event_date` and clustered by `user_id`. `SELECT * FROM events` scans 10 TB (≈ \$62 at \$6.25/TB on-demand). `SELECT user_id, event_type FROM events WHERE event_date = '2024-06-01'` scans one day's partition and two columns, maybe 5 GB (≈ \$0.03).

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why does separating storage from compute matter in cloud warehouses?",
  "options": ["It makes SQL unnecessary", "Storage and compute scale and are paid for independently; compute can be paused or resized without moving data", "It removes the need for backups", "It enforces normalization"],
  "answer": 1,
  "explanation": "You can run many isolated compute clusters on the same data and stop paying for idle compute."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Estimate BigQuery on-demand cost. Columns have sizes in GB per day of data (`col_gb_per_day`). Write `scan_gb(col_gb_per_day, columns, days)` = sum of selected column sizes × days, and `query_cost(gb, price_per_tb=6.25)` = gb / 1024 × price, rounded to 2 decimals. Then `savings(col_gb_per_day, total_days, columns, days)` returns the cost of `SELECT *` over all days minus the cost of the selective query.",
  "starterCode": "def scan_gb(col_gb_per_day, columns, days):\n    pass\n\ndef query_cost(gb, price_per_tb=6.25):\n    pass\n\ndef savings(col_gb_per_day, total_days, columns, days):\n    pass\n\ncols = {'user_id': 2.0, 'event_type': 1.0, 'payload': 20.0, 'ts': 3.0}\nprint(query_cost(scan_gb(cols, list(cols), 365)), query_cost(scan_gb(cols, ['user_id', 'event_type'], 1)))",
  "tests": "cols = {'user_id': 2.0, 'event_type': 1.0, 'payload': 20.0, 'ts': 3.0}\nassert scan_gb(cols, ['user_id', 'event_type'], 1) == 3.0\nassert scan_gb(cols, list(cols), 365) == 26 * 365\nassert query_cost(1024) == 6.25\nassert query_cost(26 * 365) == round(26 * 365 / 1024 * 6.25, 2)\nassert savings(cols, 365, ['user_id', 'event_type'], 1) == round(query_cost(26 * 365) - query_cost(3.0), 2)",
  "solution": "def scan_gb(col_gb_per_day, columns, days):\n    return sum(col_gb_per_day[c] for c in columns) * days\n\ndef query_cost(gb, price_per_tb=6.25):\n    return round(gb / 1024 * price_per_tb, 2)\n\ndef savings(col_gb_per_day, total_days, columns, days):\n    full = query_cost(scan_gb(col_gb_per_day, list(col_gb_per_day), total_days))\n    small = query_cost(scan_gb(col_gb_per_day, columns, days))\n    return round(full - small, 2)",
  "hints": ["Columnar engines bill only the columns you read.", "Partition pruning limits the days scanned."]
}
```

> [!TIP] Interview tips
> - Explain columnar storage, storage/compute separation and MPP as the shared architecture.
> - Know each vendor's pricing model and main tuning levers (partitioning/clustering, sort/dist keys, warehouse size).
> - Give concrete cost habits: no SELECT *, filter on partitions, incremental models.
