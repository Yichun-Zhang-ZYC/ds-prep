---
id: sql-partition-by-vs-group-by
title: PARTITION BY vs GROUP BY
estimatedMinutes: 10
difficulty: easy
tags: [window-functions, group-by, concepts]
---

## Why it matters
"What's the difference between `GROUP BY` and `PARTITION BY`?" is one of the most common conceptual SQL questions. The one-line answer: `GROUP BY` collapses rows, `PARTITION BY` keeps them.

## Concept
| | `GROUP BY` | `PARTITION BY` (in `OVER`) |
|---|---|---|
| Output rows | one per group | one per input row |
| Can select non-grouped columns? | no | yes |
| Typical use | totals per group | per-row value plus a group-level number (share, rank, running total) |
| Evaluated | step 3 (before `SELECT`) | step 5 (inside `SELECT`) |

You can use both in one query: window functions run **after** grouping, over the grouped rows.

## Worked example
Each employee's share of their department's payroll:

```sql
SELECT name, department, salary,
       SUM(salary) OVER (PARTITION BY department) AS dept_payroll,
       ROUND(100.0 * salary / SUM(salary) OVER (PARTITION BY department), 1) AS pct_of_dept
FROM employees;
```

With `GROUP BY department` you would get one row per department and lose the employee names.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A table has 100 rows in 5 departments. How many rows do `SELECT department, COUNT(*) ... GROUP BY department` and `SELECT department, COUNT(*) OVER (PARTITION BY department) ...` return?",
  "options": ["5 and 5", "5 and 100", "100 and 5", "100 and 100"],
  "answer": 1,
  "explanation": "GROUP BY returns one row per department; the window keeps all 100 rows and repeats the department count on each."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "For each order, return `order_id`, `region`, `amount` and the order's share of its region's total revenue as `pct_of_region` (a percentage rounded to 1 decimal).",
  "setup": "CREATE TABLE orders (order_id INTEGER PRIMARY KEY, region TEXT, amount REAL); INSERT INTO orders VALUES (1,'East',200.0),(2,'East',300.0),(3,'East',500.0),(4,'West',100.0),(5,'West',300.0);",
  "starterCode": "SELECT order_id, region, amount\nFROM orders;",
  "solution": "SELECT order_id, region, amount,\n       ROUND(100.0 * amount / SUM(amount) OVER (PARTITION BY region), 1) AS pct_of_region\nFROM orders;",
  "hints": ["You need every order row, so GROUP BY won't do.", "Divide amount by SUM(amount) OVER (PARTITION BY region)."]
}
```

> [!TIP] Interview tips
> - Lead with "collapses vs keeps rows", then give a one-line example.
> - Mention you can combine them: `GROUP BY` first, then rank the groups with a window.
> - Shares of total are a classic window use; avoid a self-join to an aggregated subquery when a window does it in one pass.
