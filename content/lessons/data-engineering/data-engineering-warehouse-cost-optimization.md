---
id: data-engineering-warehouse-cost-optimization
title: "Warehouse cost and performance optimization"
estimatedMinutes: 12
difficulty: medium
tags: [data-engineering, data-warehouse, cost, performance]
---

## Why it matters
Cloud warehouses bill for scanned bytes or running compute, so one careless query or an always-on cluster becomes a real budget line. "Our warehouse bill doubled; what do you do?" is a favorite senior question. It combines storage layout, query design and compute management.

## Concept
First **measure**: find the top cost drivers (query history, billing views, tags by team/job). Typically a handful of queries and pipelines cause most of the spend.

Two billing models, two sets of levers:
- **Pay per bytes scanned** (BigQuery on-demand, Athena): cost is proportional to data read. Reduce bytes.
- **Pay for compute time** (Snowflake credits, Redshift/Databricks clusters, BigQuery reservations): cost is size x running time. Reduce runtime and idle time.

Levers:
1. **Prune data**: partition on the common filter (date), cluster/sort on high-selectivity columns, always filter on the partition column with a constant range (not wrapped in functions), require partition filters on huge tables.
2. **Read fewer columns**: avoid `SELECT *` on columnar storage; project early.
3. **Avoid recomputation**: incremental models instead of full rebuilds; materialize shared heavy CTEs; pre-aggregate for dashboards; use result caches (identical queries are free or cheap).
4. **Fix bad queries**: filter before joining, avoid exploding joins and cross joins, deduplicate with the right keys, use approximate functions (`APPROX_COUNT_DISTINCT`) when exactness is not needed, `LIMIT` does not reduce scanned bytes in most engines.
5. **Right-size compute**: smaller warehouse unless queries spill to disk (a bigger one that finishes twice as fast costs about the same); **auto-suspend** after a short idle time; separate warehouses per workload with per-team budgets; autoscaling/concurrency limits; spot or reserved capacity for steady loads.
6. **Storage**: compact small files, compress (Parquet/zstd), lifecycle policies to cold tiers, drop unused tables and shorten time-travel retention where acceptable.
7. **Governance**: query timeouts and cost alerts, dev/test on samples or clones, show cost per dashboard/job.

Pitfalls: optimizing a query that runs once a month; over-partitioning (thousands of tiny partitions); clustering that is never used by filters; cutting costs by breaking SLAs without telling consumers.

## Worked example
Illustrative numbers. A dashboard query reads a 2 TB `events` table (40 equally wide columns, 30 daily partitions) and runs 200 times a day under pay-per-scan pricing of 5 USD per TB.

- Original: `SELECT * ... WHERE DATE(ts) = '2024-06-01'`: the function on the column defeats pruning, so it scans 2 TB = **10 USD/run**, 2,000 USD/day.
- Select the 4 needed columns: 2 x 4/40 = 0.2 TB = 1 USD/run.
- Filter on the partition column directly (`event_date = '2024-06-01'`): 0.2 / 30 = 0.0067 TB = **0.033 USD/run**, about 6.7 USD/day, a 300x reduction.
- Further: a pre-aggregated daily table (a few MB) serves the dashboard for almost nothing, and the result cache absorbs repeated identical queries.

Compute-billing example: a Medium warehouse (4 credits/hour) left running 24 h uses 96 credits/day. BI traffic is active about 6 h/day spread in bursts. With 60-second auto-suspend it runs roughly 7 h, about 28 credits, a 70% saving. Moving a nightly ELT job that spills to disk from Medium to Large (8 credits/hour) cuts runtime from 60 to 25 minutes: 4 credits becomes about 3.3 credits and finishes sooner.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Under pay-per-bytes-scanned pricing, which change most reliably lowers the cost of a query on a 2 TB columnar table?",
  "options": [
    "Adding LIMIT 100",
    "Using a larger warehouse",
    "Selecting only needed columns and filtering on the partition column",
    "Adding ORDER BY"
  ],
  "answer": 2,
  "explanation": "Cost follows bytes read. Column projection and partition pruning reduce them; LIMIT usually does not, and compute size is irrelevant to scan pricing."
}
```

```quiz
{
  "id": "q2",
  "question": "A nightly job runs for 30 minutes on a Small warehouse and spills heavily to disk. What is a sensible experiment?",
  "options": [
    "Try a larger size; if runtime drops by more than the cost increase, the job is cheaper overall",
    "Never change the size",
    "Run it twice for safety",
    "Disable auto-suspend"
  ],
  "answer": 0,
  "explanation": "Spilling means too little memory. A larger warehouse can finish much more than proportionally faster, lowering total credits; measure it."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `scan_cost(table_tb, cols_used, cols_total, parts_hit, parts_total, price_per_tb)` assuming equal column widths and equal partitions: cost = table size x column fraction x partition fraction x price.",
  "starterCode": "def scan_cost(table_tb, cols_used, cols_total, parts_hit, parts_total, price_per_tb):\n    # assume equal column widths and equal-size partitions\n    pass\n",
  "tests": "assert abs(scan_cost(2, 40, 40, 30, 30, 5) - 10.0) < 1e-9\nassert abs(scan_cost(2, 4, 40, 30, 30, 5) - 1.0) < 1e-9\nassert abs(scan_cost(2, 4, 40, 1, 30, 5) - 1 / 30) < 1e-9\nassert scan_cost(2, 4, 40, 0, 30, 5) == 0",
  "solution": "def scan_cost(table_tb, cols_used, cols_total, parts_hit, parts_total, price_per_tb):\n    return table_tb * (cols_used / cols_total) * (parts_hit / parts_total) * price_per_tb",
  "hints": [
    "Multiply the table size by cols_used/cols_total and parts_hit/parts_total.",
    "Use true division."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `warehouse_credits(starts, query_min, credits_per_hr, auto_suspend_min)`. Each query starts at a time (minutes) in `starts` and runs `query_min`. After a query ends the warehouse stays on for `auto_suspend_min` unless another query arrives. Merge the overlapping on-intervals `[start, start + query_min + auto_suspend_min]` and return credits = total on-minutes / 60 x credits_per_hr.",
  "starterCode": "def warehouse_credits(starts, query_min, credits_per_hr, auto_suspend_min):\n    # starts: query start times in minutes; each runs query_min minutes.\n    # The warehouse stays on until auto_suspend_min after the last running query ends.\n    pass\n",
  "tests": "assert abs(warehouse_credits([0, 5, 100], 1, 2, 10) - 0.9) < 1e-9\nassert abs(warehouse_credits([100, 0, 5], 1, 2, 1) - 0.2) < 1e-9\nassert warehouse_credits([], 1, 2, 10) == 0\nassert abs(warehouse_credits([0], 60, 4, 0) - 4.0) < 1e-9",
  "solution": "def warehouse_credits(starts, query_min, credits_per_hr, auto_suspend_min):\n    iv = sorted((s, s + query_min + auto_suspend_min) for s in starts)\n    total = 0\n    cur = None\n    for a, b in iv:\n        if cur is None:\n            cur = [a, b]\n        elif a <= cur[1]:\n            cur[1] = max(cur[1], b)\n        else:\n            total += cur[1] - cur[0]\n            cur = [a, b]\n    if cur is not None:\n        total += cur[1] - cur[0]\n    return total / 60 * credits_per_hr",
  "hints": [
    "Sort the intervals, then merge those that overlap.",
    "Sum the merged lengths in minutes."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Our monthly warehouse bill doubled. How do you investigate and reduce it without hurting users?'",
  "answer": "**1. Attribute the growth**: query history grouped by user/team/dashboard/job, plus storage vs compute split. Compare month over month: new pipelines, data volume growth, a new heavy dashboard, a query regression, a warehouse left on.\n\n**2. Quick wins**: auto-suspend to 1-5 minutes; kill or timeout runaway queries; drop duplicated or abandoned tables; stop full-refresh jobs that can be incremental; fix top 10 expensive queries (projection, partition filters, early filters, avoid cross joins).\n\n**3. Structural fixes**: partition/cluster the largest tables by actual filter patterns; pre-aggregate dashboard sources; materialize shared logic; compaction; split workloads (ELT, BI, ad hoc) into separate compute with budgets.\n\n**4. Compute sizing**: test sizes on the heaviest jobs (cost = rate x time); reservations or committed use for baseline load, on-demand for bursts.\n\n**5. Guardrails**: per-team budgets and alerts, required partition filters, dev environment on samples, cost dashboards visible to owners (chargeback/showback).\n\n**6. Verify**: track cost per job and p95 latency before/after; communicate changes that affect freshness. Prioritize by saving per effort, and do not optimize rare queries."
}
```

> [!TIP] Interview tips
> - Start by measuring and attributing cost; name the billing model before proposing fixes.
> - Give concrete levers: partition pruning, column projection, incremental models, pre-aggregation, caching, right-sizing, auto-suspend.
> - Quantify savings with simple arithmetic and mention guardrails such as budgets and required partition filters.
