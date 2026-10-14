---
id: sql-common-table-expressions
title: Common Table Expressions (WITH)
estimatedMinutes: 10
difficulty: easy
tags: [cte, readability, subqueries]
---

## Why it matters
In a live SQL interview, readable beats clever. CTEs let you build an answer step by step, talk through each step, and debug one piece at a time.

## Concept
A CTE names a query so later parts of the statement can use it like a table:

```sql
WITH step1 AS (
  SELECT ...
),
step2 AS (
  SELECT ... FROM step1      -- later CTEs can use earlier ones
)
SELECT * FROM step2;
```

Things to know:
- A CTE exists only for the single statement that defines it.
- It can be referenced several times. Whether it's computed once or inlined each time depends on the engine (Postgres 12+ inlines unless you write `MATERIALIZED`).
- CTEs and subqueries are equally powerful; CTEs win on readability.

## Worked example
Top customer per country by revenue, built in steps:

```sql
WITH revenue AS (
  SELECT customer_id, SUM(amount) AS revenue
  FROM orders
  GROUP BY customer_id
),
ranked AS (
  SELECT c.country, c.name, r.revenue,
         ROW_NUMBER() OVER (PARTITION BY c.country ORDER BY r.revenue DESC) AS rn
  FROM revenue r
  JOIN customers c ON c.id = r.customer_id
)
SELECT country, name, revenue
FROM ranked
WHERE rn = 1;
```

Each CTE has one job, which makes the query easy to explain out loud.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which statement about CTEs is true?",
  "options": ["A CTE is stored in the database like a view", "A later CTE in the same WITH clause can reference an earlier one", "CTEs are always faster than subqueries", "You can only reference a CTE once"],
  "answer": 1,
  "explanation": "CTEs are scoped to one statement and can chain. Performance is usually the same as the equivalent subquery."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Using CTEs, return the `country` and its revenue as `revenue` for countries whose revenue is **above the average country revenue**.",
  "setup": "CREATE TABLE customers (id INTEGER PRIMARY KEY, country TEXT); CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER, amount REAL); INSERT INTO customers VALUES (1,'US'),(2,'US'),(3,'DE'),(4,'JP'),(5,'BR'); INSERT INTO orders VALUES (1,1,100.0),(2,2,150.0),(3,3,80.0),(4,4,60.0),(5,4,40.0),(6,5,30.0),(7,1,50.0);",
  "starterCode": "WITH country_revenue AS (\n  -- revenue per country\n)\nSELECT ...",
  "solution": "WITH country_revenue AS (\n  SELECT c.country, SUM(o.amount) AS revenue\n  FROM orders o\n  JOIN customers c ON c.id = o.customer_id\n  GROUP BY c.country\n)\nSELECT country, revenue\nFROM country_revenue\nWHERE revenue > (SELECT AVG(revenue) FROM country_revenue);",
  "hints": ["First CTE: revenue per country.", "The average of that CTE's revenue column is the threshold; you can reference the CTE twice."]
}
```

> [!TIP] Interview tips
> - Narrate as you go: "first I'll get revenue per customer, then rank within country".
> - Name CTEs after what they contain (`daily_active`, `first_purchase`), not `t1`, `t2`.
> - If asked about performance, mention materialization and that a CTE referenced many times may be recomputed.
