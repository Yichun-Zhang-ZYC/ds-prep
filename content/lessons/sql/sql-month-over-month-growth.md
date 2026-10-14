---
id: sql-month-over-month-growth
title: Month-over-month growth
estimatedMinutes: 10
difficulty: medium
tags: [interview-pattern, lag, growth]
---

## Why it matters
"Show monthly revenue and its month-over-month growth" is a warm-up in almost every analytics interview. It checks aggregation, `LAG`, safe division and percentage formatting in one short query.

## Concept
Two steps:

1. Aggregate to one row per month.
2. Compare each month with the previous one using `LAG`.

Growth % = (this month − last month) / last month × 100.

Edge cases: the first month has no previous value (NULL growth); a previous value of 0 needs `NULLIF` to avoid dividing by zero; a month with no rows at all disappears unless you fill it from a calendar.

## Worked example

```sql
WITH monthly AS (
  SELECT strftime('%Y-%m', order_date) AS month, SUM(amount) AS revenue
  FROM orders
  GROUP BY month
)
SELECT month, revenue,
       LAG(revenue) OVER (ORDER BY month) AS prev_revenue,
       ROUND(100.0 * (revenue - LAG(revenue) OVER (ORDER BY month))
             / NULLIF(LAG(revenue) OVER (ORDER BY month), 0), 1) AS mom_pct
FROM monthly;
```

For year-over-year growth, use `LAG(revenue, 12)` on a complete monthly series, or join each month to the same month of the previous year.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Revenue went from 80 to 100, then from 100 to 80. What are the two month-over-month changes?",
  "options": ["+20% and −20%", "+25% and −20%", "+20% and −25%", "+25% and −25%"],
  "answer": 1,
  "explanation": "(100 − 80) / 80 = +25%; (80 − 100) / 100 = −20%. Percent changes aren't symmetric because the base changes."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Return each `month` (`'YYYY-MM'`), its `revenue`, and the month-over-month growth as `mom_pct` (percentage rounded to 1 decimal; NULL for the first month).",
  "setup": "CREATE TABLE orders (id INTEGER PRIMARY KEY, order_date TEXT, amount REAL); INSERT INTO orders VALUES (1,'2024-01-03',100.0),(2,'2024-01-20',100.0),(3,'2024-02-11',150.0),(4,'2024-02-25',100.0),(5,'2024-03-02',200.0),(6,'2024-04-09',120.0),(7,'2024-04-30',60.0);",
  "starterCode": "WITH monthly AS (\n  SELECT strftime('%Y-%m', order_date) AS month, SUM(amount) AS revenue\n  FROM orders\n  GROUP BY month\n)\nSELECT month, revenue\nFROM monthly;",
  "solution": "WITH monthly AS (\n  SELECT strftime('%Y-%m', order_date) AS month, SUM(amount) AS revenue\n  FROM orders\n  GROUP BY month\n)\nSELECT month, revenue,\n       ROUND(100.0 * (revenue - LAG(revenue) OVER (ORDER BY month))\n             / LAG(revenue) OVER (ORDER BY month), 1) AS mom_pct\nFROM monthly;",
  "hints": ["LAG(revenue) OVER (ORDER BY month) is last month's revenue.", "Multiply by 100.0 to avoid integer division and get a percentage."]
}
```

> [!TIP] Interview tips
> - Say what happens to missing months; a gap makes `LAG` compare with two months ago.
> - For seasonal businesses, offer year-over-year alongside month-over-month.
> - Mention that a single month's growth is noisy; a 3-month average growth or a trend line is easier to act on.
