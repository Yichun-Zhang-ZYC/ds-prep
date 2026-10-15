---
id: sql-group-by-having
title: GROUP BY, HAVING
estimatedMinutes: 12
difficulty: easy
tags: [aggregation, group-by, having]
---

## Why it matters
Most metric questions ("revenue per region", "users with more than 3 orders") are a `GROUP BY` plus a filter. Knowing which filter goes in `WHERE` and which in `HAVING` is a classic screening question.

## Concept
- `GROUP BY cols` collapses rows into one row per distinct combination of `cols`.
- Every selected column must be either in `GROUP BY` or inside an aggregate (`SUM`, `COUNT`, …).
- `WHERE` filters **rows before** grouping. `HAVING` filters **groups after** aggregation.

Logical order of execution:

`FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT`

That order is why you can't use an aggregate in `WHERE`: the groups don't exist yet.

## Worked example
Customers who spent more than \$500 on completed orders:

```sql
SELECT customer_id,
       COUNT(*)    AS orders,
       SUM(amount) AS total_spent
FROM orders
WHERE status = 'completed'     -- row filter
GROUP BY customer_id
HAVING SUM(amount) > 500       -- group filter
ORDER BY total_spent DESC;
```

## Check your understanding

```quiz
{
  "id": "q1",
  "type": "multi",
  "question": "Which of these filters must go in `HAVING` rather than `WHERE`? Select all that apply.",
  "options": ["`COUNT(*) >= 3`", "`country = 'US'`", "`AVG(price) > 20`", "`order_date >= '2024-01-01'`"],
  "answer": [0, 2],
  "explanation": "Conditions on aggregates (COUNT, AVG) can only be checked after grouping, so they go in HAVING. Plain column conditions belong in WHERE, which is also faster because it shrinks the data before grouping."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Return each `department` with **at least 2 employees**, along with its headcount as `headcount` and average salary as `avg_salary`.",
  "setup": "CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, department TEXT, salary INTEGER); INSERT INTO employees VALUES (1,'Ava','Engineering',185000),(2,'Ben','Engineering',172000),(3,'Chen','Engineering',160000),(4,'Dana','Marketing',128000),(5,'Eli','Marketing',119000),(6,'Farah','Sales',141000),(7,'Gus','Legal',150000);",
  "starterCode": "SELECT department\nFROM employees\n",
  "solution": "SELECT department, COUNT(*) AS headcount, AVG(salary) AS avg_salary\nFROM employees\nGROUP BY department\nHAVING COUNT(*) >= 2;",
  "hints": ["Group by department, then count rows per group.", "The headcount condition is on an aggregate, so it goes in HAVING."]
}
```

> [!TIP] Interview tips
> - Put row-level conditions in `WHERE` even when `HAVING` would also work. It's clearer and filters earlier.
> - Postgres and BigQuery let you `GROUP BY 1, 2` (column positions). Fine in interviews, but name columns in production code.
> - Follow-up you may get: "Now show departments with zero employees too." That needs a `LEFT JOIN` from a departments table.
