---
id: analytics-bi-looker
title: Looker (LookML)
estimatedMinutes: 12
difficulty: medium
tags: [looker, lookml, semantic-layer, bi]
---

## Why it matters

Looker is the semantic-layer-first BI tool used by many data-mature companies. Interviews ask what LookML is, how explores and joins work, and how Looker avoids double counting.

## Concept

**LookML** is a declarative modelling language (stored in Git) that describes your data; Looker generates SQL from it at query time and runs it in your warehouse (no extracts).

**Core objects**
- **Model**: a database connection plus the explores it exposes.
- **View**: a table (or derived table) with its **dimensions** (attributes), **dimension_groups** (e.g. `type: time` expands into date/week/month) and **measures** (aggregations: `count`, `sum`, `average`, `count_distinct`, or custom SQL).
- **Explore**: the entry point for users, defined from a base view plus **joins**, each with a `type` (`left_outer`...), a `sql_on` and a `relationship` (`many_to_one`, `one_to_many`...).
- **Dashboards** (UI or LookML), **Looks**, scheduling, embedding and the API sit on top.

**Correct aggregates**: declare a `primary_key` and the right `relationship`. Looker then uses **symmetric aggregates** so `SUM` and `COUNT` across a one-to-many join are not inflated by fan-out.

**Derived tables**: SQL or native derived tables; **PDTs** (persistent derived tables) are materialised in the warehouse and rebuilt per a **datagroup** (`persist_with`), which also controls cache lifetime.

**Governance**: Git branching, dev vs production mode, content validator, `access_filter` and user attributes for row-level security, refinements and `extends` for reuse, Liquid templating for dynamic SQL.

## Worked example

A minimal model:

```lookml
view: orders {
  sql_table_name: analytics.orders ;;

  dimension: order_id {
    primary_key: yes
    type: number
    sql: ${TABLE}.order_id ;;
  }
  dimension_group: created {
    type: time
    timeframes: [date, week, month]
    sql: ${TABLE}.created_at ;;
  }
  dimension: status { type: string  sql: ${TABLE}.status ;; }

  measure: order_count { type: count }
  measure: total_revenue {
    type: sum
    sql: ${TABLE}.amount ;;
    value_format_name: usd
  }
}

explore: orders {
  join: users {
    type: left_outer
    relationship: many_to_one
    sql_on: ${orders.user_id} = ${users.id} ;;
  }
}
```

If one order (amount \$100) has 2 rows in a joined `order_items` view, a naive `SUM(amount)` after the join returns \$200. With `order_id` as the primary key, Looker's symmetric aggregates return \$100. Users pick *Created Month*, *Status* and *Total Revenue* in the explore; Looker writes the SQL, joins `users` only if one of its fields is selected, and caches the result per the datagroup.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why is declaring primary_key: yes on a view's id dimension important?",
  "options": [
    "It makes queries faster by creating a database index",
    "Looker uses it to compute symmetric aggregates, so sums and counts are not inflated by join fan-out",
    "It hides the field from users",
    "It is required for every dimension"
  ],
  "answer": 1,
  "explanation": "With a primary key and a correct relationship, Looker deduplicates rows when aggregating across a join (symmetric aggregates), preventing double counting."
}
```

```quiz
{
  "id": "q2",
  "question": "In an explore, orders joins to order_items. What relationship is declared on the order_items join?",
  "options": [
    "many_to_one",
    "one_to_many",
    "one_to_one",
    "many_to_many"
  ],
  "answer": 1,
  "explanation": "From the base view (orders) to order_items, one order has many items: one_to_many. The relationship is read from the explore's base view toward the joined view."
}
```

## Practice

```reveal
{
  "prompt": "Explain how Looker differs from a typical dashboard-first BI tool, and walk through what happens when a user clicks 'Run' on an explore.",
  "answer": "**Looker is model-first.** Analysts define business logic once in **LookML** (views = tables/columns, dimensions, measures, explores = join graphs, models = connections) stored in **Git** with code review and dev/production modes. Users build queries on that governed model, so \"revenue\" means the same thing everywhere.\n\n**What happens on Run**\n1. The user picks fields in the explore (dimensions, measures, filters).\n2. Looker's generator turns the selection and the LookML into **SQL for the specific dialect** (BigQuery, Snowflake...), adding only the needed joins, `GROUP BY`, and symmetric-aggregate logic where fan-out is possible.\n3. The SQL runs **in the database** (no extracts); results are cached according to the model's `persist_with` datagroup, so a repeated query is served from cache until the data changes.\n4. Results are rendered as a table/visualisation and can be saved to a Look or dashboard, scheduled, or accessed via API/embedding.\n\n**Related features to mention**: derived tables and PDTs for expensive transformations, `access_filter` + user attributes for row-level security, refinements/`extends` for reuse, Liquid for dynamic SQL.\n\n**Trade-offs**: requires LookML skills and a performant warehouse; less free-form than a desktop tool."
}
```

> [!TIP] Interview tips
> - Lead with "model-first: logic lives in LookML in Git, SQL runs in the warehouse".
> - Name `primary_key` + `relationship` + symmetric aggregates when asked about double counting.
> - Pitfall: putting heavy logic in many ad-hoc derived tables without PDT/datagroup persistence; slow, uncached queries hit the warehouse on every click.
