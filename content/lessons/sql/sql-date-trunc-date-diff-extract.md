---
id: sql-date-trunc-date-diff-extract
title: DATE_TRUNC, DATE_DIFF, EXTRACT
estimatedMinutes: 12
difficulty: easy
tags: [dates, dialects, time-series]
---

## Why it matters
Almost every metric is "per day / week / month". You need to bucket timestamps, compute gaps between dates, and pull out parts like the weekday. The syntax differs by database, so interviewers mostly check that you know the idea and one dialect well.

## Concept
| Task | Postgres / Snowflake | BigQuery | SQLite (used here) |
|---|---|---|---|
| Truncate to month | `DATE_TRUNC('month', ts)` | `DATE_TRUNC(d, MONTH)` | `strftime('%Y-%m-01', d)` |
| Days between | `d2 - d1` / `DATEDIFF(day, d1, d2)` | `DATE_DIFF(d2, d1, DAY)` | `julianday(d2) - julianday(d1)` |
| Part of a date | `EXTRACT(DOW FROM d)` | `EXTRACT(DAYOFWEEK FROM d)` | `strftime('%w', d)` (0 = Sunday) |
| Add an interval | `d + INTERVAL '7 days'` | `DATE_ADD(d, INTERVAL 7 DAY)` | `date(d, '+7 days')` |

Watch the week definition: weeks can start on Sunday or Monday depending on the engine and settings. Say which one you assume.

## Worked example
Monthly revenue and the average days from signup to first order:

```sql
SELECT strftime('%Y-%m', order_date) AS month, SUM(amount) AS revenue
FROM orders
GROUP BY month
ORDER BY month;

SELECT AVG(julianday(f.first_order) - julianday(u.signup_date)) AS avg_days_to_first_order
FROM users u
JOIN (SELECT user_id, MIN(order_date) AS first_order FROM orders GROUP BY user_id) f
  ON f.user_id = u.id;
```

Grouping by a truncated date (rather than by `EXTRACT(MONTH ...)`) keeps January 2023 and January 2024 apart.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You group orders by `EXTRACT(MONTH FROM order_date)` over two years of data. What goes wrong?",
  "options": ["Nothing", "Same months of different years are merged into one bucket", "It errors on timestamps", "Months are sorted alphabetically"],
  "answer": 1,
  "explanation": "EXTRACT(MONTH) returns 1–12, so January 2023 and January 2024 land in the same group. Truncate to the month, or group by year and month."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Return each month as `month` in `'YYYY-MM'` format with its number of orders as `orders` and revenue as `revenue`.",
  "setup": "CREATE TABLE orders (id INTEGER PRIMARY KEY, order_date TEXT, amount REAL); INSERT INTO orders VALUES (1,'2023-12-30',40.0),(2,'2024-01-05',25.0),(3,'2024-01-17',60.0),(4,'2024-02-02',10.0),(5,'2024-02-28',35.0),(6,'2024-02-29',5.0),(7,'2024-03-01',80.0);",
  "starterCode": "SELECT order_date, amount\nFROM orders;",
  "solution": "SELECT strftime('%Y-%m', order_date) AS month,\n       COUNT(*) AS orders,\n       SUM(amount) AS revenue\nFROM orders\nGROUP BY month;",
  "hints": ["In SQLite, strftime('%Y-%m', d) gives 'YYYY-MM'.", "Group by that expression (or its alias)."]
}
```

> [!TIP] Interview tips
> - Tell the interviewer which dialect you're writing; they rarely mind, as long as you're consistent.
> - Clarify "week" (Sunday or Monday start, ISO weeks) and "month" (calendar month or rolling 30 days).
> - For "days between", say whether the boundary days are inclusive; off-by-one errors are common here.
