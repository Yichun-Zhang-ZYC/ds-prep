---
id: sql-normalization-vs-denormalization
title: Normalization vs denormalization
estimatedMinutes: 12
difficulty: medium
tags: [data-modeling, normalization, internals]
---

## Why it matters
"Would you store this normalized or denormalized?" tests whether you understand the trade-off between write correctness and read speed. It comes up in data modeling, analytics engineering and system design rounds.

## Concept
**Normalization** removes redundancy so each fact is stored once:

| Normal form | Rule (informally) | Violation example |
|---|---|---|
| 1NF | each column holds one atomic value; no repeating groups | `tags = 'sql,python'` in one column |
| 2NF | 1NF, and every non-key column depends on the **whole** composite key | `order_items(order_id, product_id, product_name)`: name depends only on product_id |
| 3NF | 2NF, and no non-key column depends on another non-key column | `employees(id, dept_id, dept_name)`: dept_name depends on dept_id |

**Denormalization** deliberately duplicates data (e.g. copying `customer_country` onto every order) to avoid joins at read time.

| | Normalized (OLTP) | Denormalized (OLAP / analytics) |
|---|---|---|
| Writes | one place to update, no anomalies | updates must touch many rows |
| Reads | many joins | few joins, fast scans |
| Typical home | application databases | warehouses, star schemas, wide tables |

## Worked example
A 3NF fix: move department attributes to their own table.

```sql
-- Before: dept_name repeated on every employee, can drift out of sync
CREATE TABLE employees (id INT, name TEXT, dept_id INT, dept_name TEXT);

-- After (3NF)
CREATE TABLE departments (dept_id INT PRIMARY KEY, dept_name TEXT);
CREATE TABLE employees   (id INT PRIMARY KEY, name TEXT, dept_id INT REFERENCES departments(dept_id));
```

Renaming a department is now one update instead of hundreds, and the names can't disagree.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "`orders(order_id, customer_id, customer_email, amount)`: which normal form does it violate, and why?",
  "options": ["1NF, because email is text", "3NF, because customer_email depends on customer_id, not on order_id", "2NF, because the key is composite", "None"],
  "answer": 1,
  "explanation": "customer_email is a fact about the customer (a transitive dependency through customer_id). Move it to a customers table."
}
```

```reveal
{
  "prompt": "Why are analytics warehouses usually denormalized (star schemas, wide tables) if normalization prevents anomalies?",
  "answer": "Warehouses are read-heavy and mostly append-only: data is loaded in batches by pipelines, not edited row by row by users, so update anomalies matter much less. Meanwhile, analysts run large scans and aggregations where every join costs time and money. Columnar storage also compresses repeated values well, so duplication is cheap. A star schema is the usual compromise: denormalized dimensions around a narrow fact table."
}
```

> [!TIP] Interview tips
> - Frame the answer as a trade-off: write integrity vs read performance.
> - Name the workload: OLTP → normalize; OLAP → denormalize (star schema).
> - Mention that the "source of truth" stays normalized and denormalized tables are rebuilt from it by pipelines.
