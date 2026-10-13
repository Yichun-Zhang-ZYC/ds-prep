---
id: sql-count-sum-avg-min-max
title: COUNT, SUM, AVG, MIN, MAX
estimatedMinutes: 10
difficulty: easy
tags: [aggregation, basics]
---

## Why it matters
Every metric starts as an aggregate. Interviewers check the edge cases: integer division, NULLs, and averages of averages.

## Concept
| Function | Returns | NULL behavior |
|---|---|---|
| `COUNT(*)` | number of rows | counts every row |
| `COUNT(col)` | rows where `col` is not NULL | skips NULLs |
| `SUM(col)` | total | skips NULLs; NULL if every value is NULL |
| `AVG(col)` | mean of non-NULL values | skips NULLs (changes the denominator) |
| `MIN` / `MAX` | smallest / largest | skip NULLs; work on numbers, text and dates |

Without `GROUP BY`, an aggregate collapses the whole table into one row.

Watch for **integer division**: in SQLite, Postgres and SQL Server `5 / 2 = 2`. Multiply by `1.0` (or cast) before dividing.

## Worked example
Average order value and revenue per customer:

```sql
SELECT customer_id,
       COUNT(*)                    AS orders,
       SUM(amount)                 AS revenue,
       ROUND(AVG(amount), 2)       AS avg_order_value,
       MIN(order_date)             AS first_order,
       MAX(order_date)             AS last_order
FROM orders
GROUP BY customer_id;
```

The overall average order value is `SUM(amount) / COUNT(*)` over all orders, **not** the average of each customer's average. Customers with many orders would be under-weighted.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "In SQLite, what does `SELECT 7 / 2;` return?",
  "options": ["3.5", "3", "4", "An error"],
  "answer": 1,
  "explanation": "Both operands are integers, so the result is integer division. Write 7 * 1.0 / 2 or CAST(7 AS REAL) / 2 to get 3.5."
}
```

```quiz
{
  "id": "q2",
  "question": "Customer A has 1 order of $100. Customer B has 3 orders of $10. What is the average order value across all orders?",
  "options": ["$55", "$32.50", "$40", "$10"],
  "answer": 1,
  "explanation": "Total revenue $130 / 4 orders = $32.50. Averaging the per-customer averages gives (100 + 10) / 2 = $55, which is wrong."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "For each `product_id`, return the number of reviews as `reviews` and the average rating as `avg_rating` rounded to 2 decimals. Some reviews have no rating (NULL) and should not count toward the average, but should count as reviews.",
  "setup": "CREATE TABLE reviews (id INTEGER PRIMARY KEY, product_id INTEGER, rating INTEGER); INSERT INTO reviews VALUES (1,1,5),(2,1,4),(3,1,NULL),(4,2,3),(5,2,3),(6,2,4),(7,3,NULL),(8,3,2);",
  "starterCode": "SELECT product_id\nFROM reviews\nGROUP BY product_id;",
  "solution": "SELECT product_id,\n       COUNT(*) AS reviews,\n       ROUND(AVG(rating), 2) AS avg_rating\nFROM reviews\nGROUP BY product_id;",
  "hints": ["COUNT(*) counts every review; AVG already skips NULL ratings.", "Wrap AVG in ROUND(..., 2)."]
}
```

> [!TIP] Interview tips
> - Say which denominator you mean: "average over all orders" or "average over customers". They answer different questions.
> - Mention integer division the first time you divide counts; it's a classic gotcha.
> - `MIN`/`MAX` on dates is a quick way to get first and last activity per user, which feeds retention and churn questions.
