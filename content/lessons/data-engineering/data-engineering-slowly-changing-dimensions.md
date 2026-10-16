---
id: data-engineering-slowly-changing-dimensions
title: Slowly changing dimensions (SCD Type 1/2)
estimatedMinutes: 14
difficulty: medium
tags: [data-engineering, data-modeling, scd, history]
---

## Why it matters
Customers move, products change category, sales reps switch territories. "How do you keep history so last year's revenue still reports under last year's region?" is one of the most common DE interview questions.

## Concept
- **Type 0**: never change (original signup date).
- **Type 1**: **overwrite** the old value. No history. Use for corrections (fixing a typo) or attributes where history doesn't matter.
- **Type 2**: **add a new row** for each change, with validity columns. Full history.
  - Columns: surrogate key, natural key (e.g. `customer_id`), attributes, `valid_from`, `valid_to` (or NULL / `9999-12-31` for current), `is_current`.
  - Facts store the **surrogate key** that was current when the event happened, so they keep pointing at the historical version.
- **Type 3**: add a column for the previous value (`prev_region`). Limited history (one change back).
- **Type 4 / 6**: history table split out / hybrid of 1+2+3.

Type 2 update procedure for a changed record:
1. Close the current row: set `valid_to = change_date`, `is_current = false`.
2. Insert a new row with a new surrogate key, the new attributes, `valid_from = change_date`, `valid_to = NULL`, `is_current = true`.

Point-in-time lookup: join on natural key where `event_date >= valid_from AND (event_date < valid_to OR valid_to IS NULL)`.

In dbt, **snapshots** implement Type 2 automatically (by timestamp or by checking columns).

## Worked example
Customer 42 moves from Boston (East) to Denver (West) on 2024-06-01.

| sk | customer_id | region | valid_from | valid_to | is_current |
|---|---|---|---|---|---|
| 101 | 42 | East | 2022-01-10 | 2024-06-01 | false |
| 187 | 42 | West | 2024-06-01 | NULL | true |

A March 2024 order points to sk 101 and counts as East revenue; a July order points to sk 187 (West). With Type 1, all history would wrongly move to West.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A customer's region changes and you need historical reports to keep the old region. Which SCD type?",
  "options": ["Type 0", "Type 1", "Type 2", "No dimension needed"],
  "answer": 2,
  "explanation": "Type 2 keeps a row per version with validity dates."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "`dim_customer` is SCD Type 2 (`valid_to` is NULL for the current row). Attribute each order in `orders` to the region **valid on the order date** and return revenue (`revenue`) per `region`, sorted by region. (A row is valid when order_date >= valid_from and (order_date < valid_to or valid_to is NULL).)",
  "setup": "CREATE TABLE dim_customer (customer_sk INTEGER PRIMARY KEY, customer_id INTEGER, region TEXT, valid_from TEXT, valid_to TEXT); INSERT INTO dim_customer VALUES (101,42,'East','2022-01-10','2024-06-01'),(187,42,'West','2024-06-01',NULL),(102,7,'East','2023-03-01',NULL); CREATE TABLE orders (order_id INTEGER, customer_id INTEGER, order_date TEXT, amount REAL); INSERT INTO orders VALUES (1,42,'2024-03-15',100),(2,42,'2024-07-02',250),(3,7,'2024-05-05',80),(4,42,'2024-06-01',30);",
  "starterCode": "SELECT d.region\nFROM orders o\nJOIN dim_customer d ON d.customer_id = o.customer_id\n",
  "solution": "SELECT d.region, SUM(o.amount) AS revenue\nFROM orders o\nJOIN dim_customer d\n  ON d.customer_id = o.customer_id\n AND o.order_date >= d.valid_from\n AND (o.order_date < d.valid_to OR d.valid_to IS NULL)\nGROUP BY d.region\nORDER BY d.region;",
  "hints": ["Add the validity window to the JOIN condition, not just the customer_id.", "valid_to is exclusive, so an order on 2024-06-01 belongs to the new row."]
}
```

> [!TIP] Interview tips
> - Explain Type 1 vs Type 2 with a concrete example and the columns Type 2 needs.
> - Say that facts reference the surrogate key current at event time, and show the point-in-time join.
> - Mention dbt snapshots or MERGE statements as the implementation.
