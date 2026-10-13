---
id: sql-cross-join
title: CROSS JOIN
estimatedMinutes: 8
difficulty: easy
tags: [joins, cross-join, scaffolding]
---

## Why it matters
`CROSS JOIN` is rarely the answer on its own, but it's the standard trick for building a complete grid (every date × every product) so that missing combinations show up as zeros instead of disappearing.

## Concept
`CROSS JOIN` returns every combination of rows: a table with `m` rows crossed with one of `n` rows gives `m × n` rows. There is no `ON` condition.

```sql
SELECT s.size, c.color
FROM sizes s
CROSS JOIN colors c;     -- 3 sizes × 4 colors = 12 rows
```

Forgetting a join condition (`FROM a, b` with no `WHERE`) produces an accidental cross join. On real tables that can mean billions of rows.

## Worked example
Daily sales per store, showing 0 for days with no sales:

```sql
WITH grid AS (
  SELECT d.day, st.store_id
  FROM calendar d
  CROSS JOIN stores st
)
SELECT g.day, g.store_id, COALESCE(SUM(s.amount), 0) AS revenue
FROM grid g
LEFT JOIN sales s ON s.store_id = g.store_id AND s.sale_date = g.day
GROUP BY g.day, g.store_id;
```

Without the grid, a store with no sales on a day simply has no row, and charts or averages quietly skip it.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Table A has 5 rows and table B has 0 rows. How many rows does `A CROSS JOIN B` return?",
  "options": ["5", "0", "1", "An error"],
  "answer": 1,
  "explanation": "5 × 0 = 0. A cross join with an empty table is empty, a subtle bug when one side is filtered down to nothing."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Return every (`month`, `region`) combination with the region's revenue for that month as `revenue`, using 0 when there were no sales. Use the `months` and `regions` tables to build the grid.",
  "setup": "CREATE TABLE months (month TEXT); CREATE TABLE regions (region TEXT); CREATE TABLE sales (id INTEGER PRIMARY KEY, month TEXT, region TEXT, amount REAL); INSERT INTO months VALUES ('2024-01'),('2024-02'),('2024-03'); INSERT INTO regions VALUES ('East'),('West'); INSERT INTO sales VALUES (1,'2024-01','East',100.0),(2,'2024-01','East',50.0),(3,'2024-02','West',80.0),(4,'2024-03','East',20.0);",
  "starterCode": "SELECT m.month, r.region\nFROM months m\nCROSS JOIN regions r\n",
  "solution": "SELECT m.month, r.region, COALESCE(SUM(s.amount), 0) AS revenue\nFROM months m\nCROSS JOIN regions r\nLEFT JOIN sales s ON s.month = m.month AND s.region = r.region\nGROUP BY m.month, r.region;",
  "hints": ["Build the 3 × 2 grid with CROSS JOIN, then LEFT JOIN the sales onto it.", "COALESCE the sum to 0."]
}
```

> [!TIP] Interview tips
> - When a question says "include days with zero", think grid: calendar `CROSS JOIN` dimension, then `LEFT JOIN` facts.
> - Estimate output size before crossing big tables and say it out loud.
> - Many warehouses have a date-series generator (`GENERATE_SERIES`, `GENERATE_DATE_ARRAY`); a recursive CTE works anywhere.
