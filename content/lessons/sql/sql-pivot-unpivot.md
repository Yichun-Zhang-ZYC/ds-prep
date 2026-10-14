---
id: sql-pivot-unpivot
title: Pivot / unpivot
estimatedMinutes: 12
difficulty: medium
tags: [interview-pattern, reshaping, conditional-aggregation]
---

## Why it matters
Reports want one column per month or per category; analysis tools want long, tidy data. Turning rows into columns (pivot) and back (unpivot) is a common "reshape this table" interview task.

## Concept
**Pivot** (long → wide) with conditional aggregation, which works in every database:

```sql
SELECT product,
       SUM(CASE WHEN quarter = 'Q1' THEN revenue ELSE 0 END) AS q1,
       SUM(CASE WHEN quarter = 'Q2' THEN revenue ELSE 0 END) AS q2
FROM sales
GROUP BY product;
```

**Unpivot** (wide → long) by stacking one `SELECT` per column with `UNION ALL`:

```sql
SELECT product, 'Q1' AS quarter, q1 AS revenue FROM wide_sales
UNION ALL
SELECT product, 'Q2', q2 FROM wide_sales;
```

SQL Server, Snowflake and BigQuery also have `PIVOT` / `UNPIVOT` keywords, but the column list is still hard-coded. Dynamic pivots (unknown categories) need generated SQL or a BI tool.

## Worked example
Count of tickets per team and status, one column per status:

```sql
SELECT team,
       COUNT(CASE WHEN status = 'open'    THEN 1 END) AS open,
       COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending,
       COUNT(CASE WHEN status = 'closed'  THEN 1 END) AS closed
FROM tickets
GROUP BY team;
```

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A pivot uses `SUM(CASE WHEN quarter = 'Q3' THEN revenue END)` (no ELSE). A product had no Q3 sales. What appears in its q3 column?",
  "options": ["0", "NULL", "An error", "The Q2 value"],
  "answer": 1,
  "explanation": "All CASE results are NULL for that product, and SUM of only NULLs is NULL. Add ELSE 0 (or COALESCE) if the report should show 0."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Pivot `sales` to one row per `product` with columns `q1`, `q2`, `q3`, `q4` holding that quarter's revenue (0 if none).",
  "setup": "CREATE TABLE sales (product TEXT, quarter TEXT, revenue REAL); INSERT INTO sales VALUES ('Pen','Q1',100.0),('Pen','Q2',120.0),('Pen','Q4',90.0),('Ink','Q1',40.0),('Ink','Q1',10.0),('Ink','Q3',75.0),('Pad','Q2',60.0);",
  "starterCode": "SELECT product,\n       -- one column per quarter\nFROM sales\nGROUP BY product;",
  "solution": "SELECT product,\n       SUM(CASE WHEN quarter = 'Q1' THEN revenue ELSE 0 END) AS q1,\n       SUM(CASE WHEN quarter = 'Q2' THEN revenue ELSE 0 END) AS q2,\n       SUM(CASE WHEN quarter = 'Q3' THEN revenue ELSE 0 END) AS q3,\n       SUM(CASE WHEN quarter = 'Q4' THEN revenue ELSE 0 END) AS q4\nFROM sales\nGROUP BY product;",
  "hints": ["One SUM(CASE ...) per quarter.", "Ink has two Q1 rows; SUM adds them."]
}
```

> [!TIP] Interview tips
> - Mention that pivots hard-code categories; new categories need a code change (or a dynamic pivot).
> - Keep data long in tables and pivot only at the reporting layer.
> - Unpivot is handy for comparing many metric columns at once (e.g. one row per metric for a dashboard).
