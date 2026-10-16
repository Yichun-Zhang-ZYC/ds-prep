---
id: data-engineering-dbt
title: dbt
estimatedMinutes: 14
difficulty: medium
tags: [data-engineering, dbt, elt, analytics-engineering]
---

## Why it matters
dbt (data build tool) is the standard way to build transformations in the warehouse. Analytics engineer and DE interviews regularly ask about models, materializations, tests, incremental models and project structure.

## Concept
dbt turns `SELECT` statements into tables and views, manages dependencies, and adds testing and documentation.

- **Models**: `.sql` files with one `SELECT`. `{{ ref('stg_orders') }}` references another model, which builds the **DAG** so dbt runs models in dependency order. `{{ source('stripe', 'charges') }}` references raw tables.
- **Materializations**: `view` (cheap, always fresh, slow to query), `table` (rebuilt each run), `incremental` (process only new rows), `ephemeral` (inlined as a CTE).
- **Incremental models**:

```sql
{{ config(materialized='incremental', unique_key='order_id') }}
SELECT * FROM {{ ref('stg_orders') }}
{% if is_incremental() %}
  WHERE updated_at > (SELECT MAX(updated_at) FROM {{ this }})
{% endif %}
```

- **Tests**: generic (`unique`, `not_null`, `accepted_values`, `relationships`) declared in YAML, plus custom SQL tests that fail if they return rows. Packages like dbt-expectations add more.
- **Snapshots**: SCD Type 2 history for mutable source tables.
- **Seeds** (small CSVs), **macros** (Jinja functions), **docs** and lineage graphs, **exposures** (dashboards that depend on models).
- Typical layers: `staging` (1:1 with sources, renaming/casting) → `intermediate` (joins, business logic) → `marts` (facts and dimensions for consumers).
- Commands: `dbt run`, `dbt test`, `dbt build` (run + test in DAG order), `dbt run --select +fct_orders` (a model plus its upstream), `--full-refresh`.
- Production: run in CI on pull requests (slim CI with `state:modified+`), schedule via Airflow/Dagster/dbt Cloud.

## Worked example
`stg_orders` renames and casts raw columns; `int_order_items_joined` joins orders to items and products; `fct_orders` aggregates to one row per order, tested with `unique` and `not_null` on `order_id` and a `relationships` test to `dim_customer`. A PR that breaks uniqueness fails CI before reaching production.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What does `{{ ref('stg_orders') }}` do in a dbt model?",
  "options": ["Runs a test", "Resolves to the stg_orders relation and records a dependency so dbt builds models in the right order", "Creates a seed", "Defines a snapshot"],
  "answer": 1,
  "explanation": "ref() handles environment-specific schema names and builds the DAG."
}
```

```quiz
{
  "id": "q2",
  "question": "When is an incremental materialization most useful?",
  "options": ["Small lookup tables", "Large, append-heavy tables where rebuilding everything each run is too slow or costly", "Views that must always be fresh", "Ephemeral CTEs"],
  "answer": 1,
  "explanation": "Incremental models process only new/changed rows, at the cost of extra complexity (late data, full refreshes)."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Write the SQL a dbt `fct_orders` model would compile to (refs replaced by table names): from `stg_orders` and `stg_order_items`, return one row per order with `order_id`, `customer_id`, `n_items` (sum of quantity) and `order_total` (sum of quantity × unit_price), **only for orders with status 'completed'**, sorted by order_id.",
  "setup": "CREATE TABLE stg_orders (order_id INTEGER, customer_id INTEGER, status TEXT); INSERT INTO stg_orders VALUES (1,10,'completed'),(2,11,'cancelled'),(3,10,'completed'); CREATE TABLE stg_order_items (order_id INTEGER, product_id INTEGER, quantity INTEGER, unit_price REAL); INSERT INTO stg_order_items VALUES (1,100,2,5.0),(1,101,1,20.0),(2,100,1,5.0),(3,102,3,7.5);",
  "starterCode": "SELECT o.order_id, o.customer_id\nFROM stg_orders o\n",
  "solution": "SELECT o.order_id, o.customer_id,\n       SUM(i.quantity) AS n_items,\n       SUM(i.quantity * i.unit_price) AS order_total\nFROM stg_orders o\nJOIN stg_order_items i ON i.order_id = o.order_id\nWHERE o.status = 'completed'\nGROUP BY o.order_id, o.customer_id\nORDER BY o.order_id;",
  "hints": ["Join items to orders, filter completed, group by order.", "order_total = SUM(quantity * unit_price)."]
}
```

> [!TIP] Interview tips
> - Explain ref/source and the DAG, materializations (view/table/incremental/ephemeral) and when to use each.
> - Mention tests in YAML, snapshots for SCD2, and the staging → intermediate → marts layering.
> - Show production maturity: CI on PRs, `dbt build`, selectors, and handling late data in incremental models.
