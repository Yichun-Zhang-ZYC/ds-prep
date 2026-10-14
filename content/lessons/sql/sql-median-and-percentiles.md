---
id: sql-median-and-percentiles
title: Median and percentiles
estimatedMinutes: 12
difficulty: medium
tags: [interview-pattern, percentiles, statistics]
---

## Why it matters
Averages lie on skewed data (income, order value, latency). Interviewers ask for the median to see if you know that, and whether you can compute it when your database has no `MEDIAN` function.

## Concept
| Engine | Median |
|---|---|
| Postgres, Snowflake | `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY x)` |
| BigQuery | `PERCENTILE_CONT(x, 0.5) OVER ()` or `APPROX_QUANTILES(x, 2)[OFFSET(1)]` |
| SQLite, older MySQL | compute it from row numbers |

`PERCENTILE_CONT` interpolates between the two middle values; `PERCENTILE_DISC` returns an actual value from the data.

Portable median with window functions: number the rows, then average the middle one (odd count) or two (even count). With `n` rows, the middle positions are `(n + 1) / 2` and `(n + 2) / 2` using integer division. For odd `n` they're the same row.

## Worked example
Median order amount per country:

```sql
WITH ranked AS (
  SELECT country, amount,
         ROW_NUMBER() OVER (PARTITION BY country ORDER BY amount) AS rn,
         COUNT(*)     OVER (PARTITION BY country)                  AS n
  FROM orders
)
SELECT country, AVG(amount) AS median_amount
FROM ranked
WHERE rn IN ((n + 1) / 2, (n + 2) / 2)
GROUP BY country;
```

The same pattern gives any percentile: pick the row at position `CEIL(p × n)` (nearest-rank method).

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Order amounts are 10, 20, 30, 1000. Which statement is true?",
  "options": ["Mean 265, median 25", "Mean 25, median 265", "Mean and median are both 265", "Median is undefined for an even count"],
  "answer": 0,
  "explanation": "Mean = 1060 / 4 = 265. Median = average of 20 and 30 = 25. The single large order pulls the mean far above a typical order."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Return the **median** of `delivery_days` across all deliveries as `median_days`. There is an even number of rows.",
  "setup": "CREATE TABLE deliveries (id INTEGER PRIMARY KEY, delivery_days INTEGER); INSERT INTO deliveries VALUES (1,2),(2,9),(3,3),(4,1),(5,30),(6,4);",
  "starterCode": "WITH ranked AS (\n  SELECT delivery_days,\n         ROW_NUMBER() OVER (ORDER BY delivery_days) AS rn,\n         COUNT(*) OVER () AS n\n  FROM deliveries\n)\nSELECT ...",
  "solution": "WITH ranked AS (\n  SELECT delivery_days,\n         ROW_NUMBER() OVER (ORDER BY delivery_days) AS rn,\n         COUNT(*) OVER () AS n\n  FROM deliveries\n)\nSELECT AVG(delivery_days) AS median_days\nFROM ranked\nWHERE rn IN ((n + 1) / 2, (n + 2) / 2);",
  "hints": ["Sorted: 1, 2, 3, 4, 9, 30. The middle two are the 3rd and 4th values.", "Average the rows whose rn is (n + 1) / 2 or (n + 2) / 2."]
}
```

> [!TIP] Interview tips
> - Bring up the median yourself when the data is likely skewed (revenue, time-on-site, latency).
> - Know both `PERCENTILE_CONT` (interpolated) and `PERCENTILE_DISC` (actual value).
> - At scale, mention approximate quantiles (`APPROX_QUANTILES`, t-digest) and that p95/p99 latency is computed that way.
