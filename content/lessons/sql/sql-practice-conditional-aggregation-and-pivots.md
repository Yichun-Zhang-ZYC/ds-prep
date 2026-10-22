---
id: sql-practice-conditional-aggregation-and-pivots
title: "Practice: Conditional aggregation and pivots"
estimatedMinutes: 15
difficulty: medium
tags: [interview-pattern, practice, conditional-aggregation, pivot, unpivot]
---

## Why it matters
Reports want categories as columns, interviewers want 'one pass over the table', and many engines have no `PIVOT` keyword. `SUM(CASE WHEN ...)` is the portable answer, and the same idea solves 'users who did both A and B', conversion rates and wide-to-long reshaping. See *Conditional aggregation* and *Pivot and unpivot* for the basics.

## Concept
**Pivot (long to wide).** Group by the row key and make one output column per category: `SUM(CASE WHEN cat = 'X' THEN amount ELSE 0 END)`. The category list is fixed in the query; SQL cannot create columns from data without dynamic SQL.

Variations of the same trick:
- **Counts and rates:** `COUNT(CASE WHEN cond THEN 1 END)` or `AVG(CASE WHEN cond THEN 1.0 ELSE 0 END)` gives a share directly. `COUNT` ignores the NULL from a missing `ELSE`; `SUM` needs `ELSE 0` to avoid a NULL total for empty groups.
- **'Did both A and B':** group by user and require `SUM(CASE WHEN cat='A' THEN 1 ELSE 0 END) > 0 AND SUM(CASE WHEN cat='B' THEN 1 ELSE 0 END) > 0` in `HAVING`. This replaces a self-join or two `IN` subqueries and scans once.
- **Percent of total by group:** conditional sum divided by total sum, in the same `SELECT`.

**Unpivot (wide to long).** `UNION ALL` one `SELECT` per column, giving each a literal label (`'q1' AS quarter`). Postgres can use `CROSS JOIN LATERAL (VALUES ...)`, Snowflake and Spark have `UNPIVOT`/`stack`. Filter NULLs after unpivoting if blanks should not count as data.

Pitfalls: forgetting `ELSE 0` or `ELSE NULL` semantics, dividing integers (multiply by `1.0`), and trying to filter on a conditional aggregate in `WHERE` (it belongs in `HAVING`).

## Worked example
Table `sales(sale_id, customer_id, sale_date, category, region, amount)`. Task: monthly revenue with one column per category plus a total, in a single scan.

```sql
SELECT strftime('%Y-%m', sale_date) AS month,
       SUM(CASE WHEN category = 'Electronics' THEN amount ELSE 0 END) AS electronics,
       SUM(CASE WHEN category = 'Furniture'   THEN amount ELSE 0 END) AS furniture,
       SUM(CASE WHEN category = 'Stationery'  THEN amount ELSE 0 END) AS stationery,
       SUM(amount) AS total
FROM sales
GROUP BY month
ORDER BY month;
```

Result:

| month | electronics | furniture | stationery | total |
|---|---|---|---|---|
| 2024-01 | 100 | 250 | 20 | 370 |
| 2024-02 | 150 | 150 | 0 | 300 |
| 2024-03 | 120 | 0 | 30 | 150 |

Each `CASE` routes a row's amount into exactly one column and a zero into the others, so the columns add up to `total`. Check March: Stationery 30 and Electronics 120 give total 150. A category absent from a month (Furniture in March) shows 0 instead of NULL because of `ELSE 0`. The same grouped result without conditional sums would need three separate queries joined together.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You want the share of rows with `amount > 100` in one pass. Which expression is correct?",
  "options": [
    "AVG(CASE WHEN amount > 100 THEN 1.0 ELSE 0 END)",
    "COUNT(amount > 100) / COUNT(*)",
    "SUM(amount > 100) / COUNT(*) in any engine, with integer division",
    "WHERE amount > 100 then COUNT(*)"
  ],
  "answer": 0,
  "explanation": "AVG of a 1/0 flag is the share. COUNT(boolean) counts non-NULL values, which is every row. Integer division would truncate to 0 or 1, and a WHERE would remove the denominator rows."
}
```

```quiz
{
  "id": "q2",
  "question": "Why is `WHERE SUM(CASE WHEN category = 'A' THEN 1 ELSE 0 END) > 0` invalid?",
  "options": [
    "CASE is not allowed in WHERE",
    "SUM needs DISTINCT",
    "Aggregates cannot appear in WHERE because WHERE runs before grouping; use HAVING",
    "It is valid"
  ],
  "answer": 2,
  "explanation": "WHERE filters rows before GROUP BY, so aggregates are not available there. Conditions on aggregated values go in HAVING."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "For each region, return the **share of its revenue from Electronics** as `electronics_share`, rounded to 3 decimals. Columns: `region, electronics_share`.",
  "setup": "CREATE TABLE sales (sale_id INTEGER, customer_id INTEGER, sale_date TEXT, category TEXT, region TEXT, amount INTEGER);\nINSERT INTO sales VALUES (1,1,'2024-01-05','Electronics','East',100),(2,2,'2024-01-12','Furniture','East',50),(3,1,'2024-01-20','Furniture','West',200),(4,3,'2024-01-25','Stationery','West',20),(5,2,'2024-02-03','Electronics','West',150),(6,3,'2024-02-14','Furniture','East',80),(7,1,'2024-02-20','Furniture','East',70),(8,4,'2024-03-02','Stationery','East',30),(9,4,'2024-03-15','Electronics','West',120);\nCREATE TABLE product_sales (product TEXT, q1 INTEGER, q2 INTEGER, q3 INTEGER, q4 INTEGER);\nINSERT INTO product_sales VALUES ('Alpha',100,120,NULL,90),('Beta',50,NULL,80,60),('Gamma',NULL,NULL,40,30);",
  "starterCode": "SELECT region,\n       ...\nFROM sales\nGROUP BY region;",
  "solution": "SELECT region,\n       ROUND(SUM(CASE WHEN category = 'Electronics' THEN amount ELSE 0 END) * 1.0 / SUM(amount), 3) AS electronics_share\nFROM sales\nGROUP BY region;",
  "hints": [
    "Numerator: SUM(CASE WHEN category = 'Electronics' THEN amount ELSE 0 END).",
    "Denominator: SUM(amount) in the same SELECT.",
    "Multiply by 1.0 so the division is not integer."
  ]
}
```

```sql-exercise
{
  "id": "ex2",
  "prompt": "Find customers who bought from **both Electronics and Furniture**. Column: `customer_id`.",
  "setup": "CREATE TABLE sales (sale_id INTEGER, customer_id INTEGER, sale_date TEXT, category TEXT, region TEXT, amount INTEGER);\nINSERT INTO sales VALUES (1,1,'2024-01-05','Electronics','East',100),(2,2,'2024-01-12','Furniture','East',50),(3,1,'2024-01-20','Furniture','West',200),(4,3,'2024-01-25','Stationery','West',20),(5,2,'2024-02-03','Electronics','West',150),(6,3,'2024-02-14','Furniture','East',80),(7,1,'2024-02-20','Furniture','East',70),(8,4,'2024-03-02','Stationery','East',30),(9,4,'2024-03-15','Electronics','West',120);\nCREATE TABLE product_sales (product TEXT, q1 INTEGER, q2 INTEGER, q3 INTEGER, q4 INTEGER);\nINSERT INTO product_sales VALUES ('Alpha',100,120,NULL,90),('Beta',50,NULL,80,60),('Gamma',NULL,NULL,40,30);",
  "starterCode": "SELECT customer_id\nFROM sales\nGROUP BY customer_id\nHAVING ...",
  "solution": "SELECT customer_id\nFROM sales\nGROUP BY customer_id\nHAVING SUM(CASE WHEN category = 'Electronics' THEN 1 ELSE 0 END) > 0\n   AND SUM(CASE WHEN category = 'Furniture' THEN 1 ELSE 0 END) > 0;",
  "hints": [
    "Group by customer_id.",
    "In HAVING, require a positive conditional count for each of the two categories.",
    "You can also write it as COUNT(DISTINCT CASE ...) conditions or use two EXISTS, but one scan is simpler."
  ]
}
```

```sql-exercise
{
  "id": "ex3",
  "prompt": "`product_sales` is wide (one column per quarter, NULL = no data). Unpivot it and return each product's **best quarter** and its revenue. Columns: `product, best_quarter, revenue`. Assume no ties.",
  "setup": "CREATE TABLE sales (sale_id INTEGER, customer_id INTEGER, sale_date TEXT, category TEXT, region TEXT, amount INTEGER);\nINSERT INTO sales VALUES (1,1,'2024-01-05','Electronics','East',100),(2,2,'2024-01-12','Furniture','East',50),(3,1,'2024-01-20','Furniture','West',200),(4,3,'2024-01-25','Stationery','West',20),(5,2,'2024-02-03','Electronics','West',150),(6,3,'2024-02-14','Furniture','East',80),(7,1,'2024-02-20','Furniture','East',70),(8,4,'2024-03-02','Stationery','East',30),(9,4,'2024-03-15','Electronics','West',120);\nCREATE TABLE product_sales (product TEXT, q1 INTEGER, q2 INTEGER, q3 INTEGER, q4 INTEGER);\nINSERT INTO product_sales VALUES ('Alpha',100,120,NULL,90),('Beta',50,NULL,80,60),('Gamma',NULL,NULL,40,30);",
  "starterCode": "WITH long AS (\n  SELECT product, 'q1' AS quarter, q1 AS revenue FROM product_sales\n  UNION ALL\n  ...\n)\nSELECT ...",
  "solution": "WITH long AS (\n  SELECT product, 'q1' AS quarter, q1 AS revenue FROM product_sales\n  UNION ALL SELECT product, 'q2', q2 FROM product_sales\n  UNION ALL SELECT product, 'q3', q3 FROM product_sales\n  UNION ALL SELECT product, 'q4', q4 FROM product_sales\n),\nranked AS (\n  SELECT product, quarter, revenue,\n         ROW_NUMBER() OVER (PARTITION BY product ORDER BY revenue DESC) AS rn\n  FROM long\n  WHERE revenue IS NOT NULL\n)\nSELECT product, quarter AS best_quarter, revenue\nFROM ranked\nWHERE rn = 1;",
  "hints": [
    "UNION ALL four SELECTs, one per quarter column, each with a literal quarter label.",
    "Drop NULL revenue after unpivoting.",
    "ROW_NUMBER() OVER (PARTITION BY product ORDER BY revenue DESC) = 1."
  ]
}
```

> [!TIP] Interview tips
> - Mention the pivot column list is hard-coded and that dynamic pivots need dynamic SQL or a BI layer.
> - Use ELSE 0 with SUM so empty groups show 0, and say so.
> - For 'both A and B', conditional counts in HAVING beat a self-join.
