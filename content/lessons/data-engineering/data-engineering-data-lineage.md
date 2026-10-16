---
id: data-engineering-data-lineage
title: Data lineage
estimatedMinutes: 10
difficulty: easy
tags: [data-engineering, governance, lineage]
---

## Why it matters
"A source column is changing type next week. Which dashboards break?" and "this KPI looks wrong; where does it come from?" are everyday questions lineage answers. Interviewers ask how you'd capture and use it.

## Concept
**Data lineage** records how data flows: which sources, jobs and transformations produce each table (and ideally each column), and which downstream assets consume it.

Granularity:
- **Table-level**: `raw.orders → stg_orders → fct_orders → revenue_dashboard`.
- **Column-level**: `fct_orders.revenue` derives from `raw.orders.amount × fx.rate`.

Uses:
- **Impact analysis**: before changing or deprecating a column, find every downstream model, dashboard and ML feature.
- **Root-cause analysis**: trace a bad metric upstream to the failing source or job.
- **Compliance**: show where PII flows (GDPR/CCPA), support deletion requests and audits.
- **Trust & discovery**: analysts see where data comes from and how fresh it is.

How it's captured:
- **Parsing SQL / code**: dbt's DAG (`ref`), SQL parsers (sqlglot) for column-level lineage.
- **Runtime instrumentation**: **OpenLineage** events emitted by Airflow, Spark, dbt, Flink to a backend like Marquez.
- **Catalog platforms** (DataHub, OpenMetadata, Atlan, Unity Catalog, Collibra) combine lineage with ownership and metadata.

## Worked example
Finance wants to rename `orders.amount` to `orders.amount_usd`. Lineage shows 14 downstream dbt models, 3 Looker dashboards and 1 ML feature view depend on it. The team adds a deprecation alias, migrates dependents, and only then drops the old column, with no surprise breakage.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What is impact analysis in the context of lineage?",
  "options": ["Measuring query speed", "Finding all downstream assets affected by a change to an upstream table or column", "Counting rows in a table", "Estimating storage cost"],
  "answer": 1,
  "explanation": "Lineage graphs let you see who consumes what before you change it."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "`edges` is a list of (upstream, downstream) pairs. Write `impact(edges, node)` returning the sorted list of all transitive downstream nodes, and `root_sources(edges, node)` returning the sorted list of upstream nodes of `node` that have no upstream themselves (the original sources).",
  "starterCode": "def impact(edges, node):\n    pass\n\ndef root_sources(edges, node):\n    pass\n",
  "tests": "edges = [('raw.orders', 'stg_orders'), ('raw.fx', 'stg_fx'), ('stg_orders', 'fct_orders'), ('stg_fx', 'fct_orders'), ('fct_orders', 'dash_revenue'), ('fct_orders', 'ml_ltv'), ('raw.users', 'dim_user')]\nassert impact(edges, 'stg_orders') == ['dash_revenue', 'fct_orders', 'ml_ltv']\nassert impact(edges, 'dash_revenue') == []\nassert root_sources(edges, 'dash_revenue') == ['raw.fx', 'raw.orders']\nassert root_sources(edges, 'raw.users') == []",
  "solution": "def _walk(adj, node):\n    seen, stack = set(), [node]\n    while stack:\n        for n in adj.get(stack.pop(), []):\n            if n not in seen:\n                seen.add(n)\n                stack.append(n)\n    return seen\n\ndef impact(edges, node):\n    down = {}\n    for u, d in edges:\n        down.setdefault(u, []).append(d)\n    return sorted(_walk(down, node))\n\ndef root_sources(edges, node):\n    up = {}\n    for u, d in edges:\n        up.setdefault(d, []).append(u)\n    ancestors = _walk(up, node)\n    return sorted(a for a in ancestors if a not in up)",
  "hints": ["Build adjacency in the direction you want to traverse.", "Root sources are ancestors with no upstream of their own."]
}
```

> [!TIP] Interview tips
> - Distinguish table-level and column-level lineage, and name the uses (impact analysis, root cause, compliance).
> - Explain capture methods: SQL parsing, dbt DAG, OpenLineage runtime events, catalogs like DataHub.
> - Give a concrete change-management story using lineage.
