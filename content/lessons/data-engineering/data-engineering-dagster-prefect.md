---
id: data-engineering-dagster-prefect
title: Dagster / Prefect
estimatedMinutes: 10
difficulty: medium
tags: [data-engineering, orchestration, dagster, prefect]
---

## Why it matters
Newer orchestrators address Airflow's pain points, and many teams now pick Dagster or Prefect. Interviewers may ask how they differ from Airflow and when you'd choose each.

## Concept
**Dagster**: **asset-centric** orchestration.
- You define **software-defined assets** (tables, files, ML models) and how to compute each from upstream assets; Dagster derives the graph.
- Built-in **partitions** (daily, by region) and partition-aware **backfills**, asset **lineage**, freshness policies, data quality **asset checks**.
- Strong local development and testing (resources injected, easy unit tests), typed I/O managers.
- Integrates tightly with dbt (each dbt model becomes an asset).

**Prefect**: **Pythonic, dynamic workflows**.
- Decorate ordinary functions with `@flow` and `@task`; control flow is plain Python (loops, conditionals, dynamic task counts at runtime).
- Retries, caching, concurrency limits, and a hybrid model where your code runs in your infrastructure while the control plane is managed.
- Low ceremony; good for ML pipelines and event-driven automation.

**Airflow**: task-centric, huge ecosystem of providers, the industry default; newer versions (2.x/3.x) added TaskFlow, datasets/assets, deferrable operators.

| Choose | When |
|---|---|
| Airflow | Large existing ecosystem, many integrations, team already knows it |
| Dagster | You think in data assets, want lineage, partitions, testing and dbt integration |
| Prefect | You want minimal boilerplate and dynamic Python workflows |

Whatever the tool: idempotent tasks, logical-date partitions, retries, alerting and observability matter more than the choice of orchestrator.

## Worked example
```python
from dagster import asset, DailyPartitionsDefinition

daily = DailyPartitionsDefinition(start_date="2024-01-01")

@asset(partitions_def=daily)
def raw_orders(context):
    return extract_orders(context.partition_key)

@asset(partitions_def=daily)
def daily_revenue(raw_orders):
    return raw_orders.groupby("country")["amount"].sum()
```
Dagster knows `daily_revenue` depends on `raw_orders`, shows lineage in the UI, and can backfill any date range of partitions.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What distinguishes Dagster's core abstraction from Airflow's?",
  "options": ["Dagster has no scheduling", "Dagster centers on data assets and their lineage; Airflow centers on tasks in a DAG", "Dagster only runs SQL", "Airflow can't run Python"],
  "answer": 1,
  "explanation": "Asset-centric vs task-centric is the key conceptual difference."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Model asset-based orchestration. `assets` maps asset name → list of upstream asset names. Write `downstream_of(assets, changed)` returning the sorted list of assets that must be rematerialized when `changed` is updated (all transitive downstream assets, excluding `changed`). Then write `backfill_plan(assets, changed, partitions)` returning a list of `(asset, partition)` pairs: for each partition (in order), `changed` first, then its downstream assets in sorted order.",
  "starterCode": "def downstream_of(assets, changed):\n    pass\n\ndef backfill_plan(assets, changed, partitions):\n    pass\n",
  "tests": "assets = {'raw_orders': [], 'stg_orders': ['raw_orders'], 'daily_revenue': ['stg_orders'], 'customer_ltv': ['stg_orders'], 'exec_dashboard': ['daily_revenue'], 'raw_users': []}\nassert downstream_of(assets, 'stg_orders') == ['customer_ltv', 'daily_revenue', 'exec_dashboard']\nassert downstream_of(assets, 'raw_users') == []\nplan = backfill_plan(assets, 'daily_revenue', ['2024-01-01', '2024-01-02'])\nassert plan == [('daily_revenue', '2024-01-01'), ('exec_dashboard', '2024-01-01'), ('daily_revenue', '2024-01-02'), ('exec_dashboard', '2024-01-02')]",
  "solution": "def downstream_of(assets, changed):\n    children = {a: [] for a in assets}\n    for a, ups in assets.items():\n        for u in ups:\n            children[u].append(a)\n    seen, stack = set(), [changed]\n    while stack:\n        for c in children[stack.pop()]:\n            if c not in seen:\n                seen.add(c)\n                stack.append(c)\n    return sorted(seen)\n\ndef backfill_plan(assets, changed, partitions):\n    down = downstream_of(assets, changed)\n    return [(a, p) for p in partitions for a in [changed] + down]",
  "hints": ["Invert the upstream map into a children map, then traverse.", "For each partition, list the changed asset first, then its downstream assets."]
}
```

> [!TIP] Interview tips
> - Contrast task-centric Airflow, asset-centric Dagster and Pythonic/dynamic Prefect.
> - Pick by team needs: ecosystem (Airflow), lineage/partitions/testing (Dagster), low-boilerplate dynamic flows (Prefect).
> - Stress that idempotency, partitioning and observability matter more than the tool.
