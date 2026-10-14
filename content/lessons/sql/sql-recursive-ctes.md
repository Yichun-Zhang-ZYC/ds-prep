---
id: sql-recursive-ctes
title: Recursive CTEs
estimatedMinutes: 15
difficulty: hard
tags: [cte, recursion, hierarchy, date-spine]
---

## Why it matters
Two interview problems need recursion: walking a hierarchy of unknown depth (org charts, category trees) and generating a sequence (a date spine to fill gaps). A recursive CTE handles both in plain SQL.

## Concept
A recursive CTE has two parts joined by `UNION ALL`:

```sql
WITH RECURSIVE tree AS (
  SELECT ...                    -- 1. anchor: the starting rows
  UNION ALL
  SELECT ... FROM tree JOIN ... -- 2. recursive step: uses the previous iteration
)
SELECT * FROM tree;
```

The database runs the anchor, then repeatedly runs the recursive step on the rows produced by the previous step, until a step returns no rows. Always make sure the recursion stops (a depth limit or a condition that eventually fails); a cycle in the data can loop forever.

`RECURSIVE` is required in Postgres, MySQL and SQLite; SQL Server and Oracle omit it.

## Worked example
Every employee under manager 1, with their depth:

```sql
WITH RECURSIVE reports AS (
  SELECT id, name, manager_id, 1 AS depth
  FROM employees
  WHERE manager_id = 1                      -- direct reports
  UNION ALL
  SELECT e.id, e.name, e.manager_id, r.depth + 1
  FROM employees e
  JOIN reports r ON e.manager_id = r.id     -- reports of reports
)
SELECT * FROM reports ORDER BY depth, id;
```

A date spine is the same idea with arithmetic instead of a join: start at the first date and add one day until the end date.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "When does a recursive CTE stop?",
  "options": ["After 100 iterations", "When the recursive step returns no new rows", "When the anchor returns no rows", "When UNION ALL finds duplicates"],
  "answer": 1,
  "explanation": "Each iteration only sees the previous iteration's rows. When that set is empty, recursion ends. Some engines also have a safety limit (e.g. SQL Server's MAXRECURSION 100 by default)."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Generate every date from `2024-01-01` to `2024-01-07` (inclusive) as `day`, and return each with the number of orders that day as `orders` (0 if none).",
  "setup": "CREATE TABLE orders (id INTEGER PRIMARY KEY, order_date TEXT); INSERT INTO orders VALUES (1,'2024-01-01'),(2,'2024-01-01'),(3,'2024-01-03'),(4,'2024-01-06'),(5,'2024-01-06'),(6,'2024-01-06');",
  "starterCode": "WITH RECURSIVE days(day) AS (\n  SELECT '2024-01-01'\n  UNION ALL\n  -- next day until 2024-01-07\n)\nSELECT ...",
  "solution": "WITH RECURSIVE days(day) AS (\n  SELECT '2024-01-01'\n  UNION ALL\n  SELECT date(day, '+1 day') FROM days WHERE day < '2024-01-07'\n)\nSELECT d.day, COUNT(o.id) AS orders\nFROM days d\nLEFT JOIN orders o ON o.order_date = d.day\nGROUP BY d.day;",
  "hints": ["In SQLite, date(day, '+1 day') adds a day to a 'YYYY-MM-DD' string.", "Stop when day reaches the end date, then LEFT JOIN the orders and COUNT(o.id)."]
}
```

> [!TIP] Interview tips
> - Explain the anchor and the recursive step separately, then the stop condition.
> - Mention cycle protection for hierarchies: track the path or cap the depth.
> - If the warehouse has `GENERATE_SERIES` / `GENERATE_DATE_ARRAY`, say you'd use it for date spines in production.
