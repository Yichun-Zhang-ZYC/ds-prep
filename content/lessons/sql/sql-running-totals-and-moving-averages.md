---
id: sql-running-totals-and-moving-averages
title: Running totals and moving averages
estimatedMinutes: 15
difficulty: medium
tags: [window-functions, frames, rows-between, time-series]
---

## Why it matters
Cumulative revenue, 7-day moving averages of DAU, and year-to-date totals are dashboard staples. The interview twist is the window **frame**: `ROWS` vs `RANGE`, and what the default frame does with ties.

## Concept
An aggregate with `OVER (... ORDER BY ...)` becomes cumulative. The frame clause says which rows around the current one are included:

```sql
SUM(x) OVER (ORDER BY day ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)  -- running total
AVG(x) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)          -- 7-row moving average
SUM(x) OVER (PARTITION BY year ORDER BY day)                                 -- year-to-date
```

- `ROWS` counts physical rows. `RANGE` groups rows with the same `ORDER BY` value together.
- With `ORDER BY` and no explicit frame, the default is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`. If two rows tie on the order key, both get the same running total (including each other). Write `ROWS` explicitly when you want row-by-row accumulation.
- The first few rows of a moving average use fewer rows than the window size. Filter them out or show the row count if that matters.

## Worked example
Running revenue and a 3-day moving average:

```sql
SELECT day, revenue,
       SUM(revenue) OVER (ORDER BY day ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total,
       ROUND(AVG(revenue) OVER (ORDER BY day ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS ma_3d
FROM daily_revenue;
```

Like `LAG`, a `ROWS` frame counts rows, not days. With missing days, "the last 3 rows" covers more than 3 days.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Two rows share `day = '2024-01-02'`. With `SUM(x) OVER (ORDER BY day)` (no frame clause), what do they get?",
  "options": ["Different running totals, row by row", "The same running total, which includes both rows", "NULL", "An error"],
  "answer": 1,
  "explanation": "The default frame is RANGE ... CURRENT ROW, which includes all peers with the same ORDER BY value."
}
```

```quiz
{
  "id": "q2",
  "question": "Which frame gives a 7-day moving average on a table with exactly one row per day?",
  "options": ["`ROWS BETWEEN 7 PRECEDING AND CURRENT ROW`", "`ROWS BETWEEN 6 PRECEDING AND CURRENT ROW`", "`ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING`", "`RANGE UNBOUNDED PRECEDING`"],
  "answer": 1,
  "explanation": "6 previous rows plus the current row is 7 rows. (3 PRECEDING AND 3 FOLLOWING is also 7 rows, but centered, so it uses future data.)"
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "For each `day`, return the `signups` and the cumulative signups so far as `cumulative_signups`.",
  "setup": "CREATE TABLE daily_signups (day TEXT, signups INTEGER); INSERT INTO daily_signups VALUES ('2024-04-01',5),('2024-04-02',8),('2024-04-03',3),('2024-04-04',10),('2024-04-05',4);",
  "starterCode": "SELECT day, signups\nFROM daily_signups;",
  "solution": "SELECT day, signups,\n       SUM(signups) OVER (ORDER BY day ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cumulative_signups\nFROM daily_signups;",
  "hints": ["SUM(...) OVER (ORDER BY day) accumulates.", "Spell out ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW to be explicit."]
}
```

```sql-exercise
{
  "id": "ex2",
  "prompt": "Return `day` and the **3-day moving average** of `dau` (current day and the 2 before it) as `ma_3d`, rounded to 2 decimals.",
  "setup": "CREATE TABLE daily_active (day TEXT, dau INTEGER); INSERT INTO daily_active VALUES ('2024-04-01',100),('2024-04-02',120),('2024-04-03',90),('2024-04-04',150),('2024-04-05',130),('2024-04-06',110);",
  "starterCode": "SELECT day,\n       -- moving average here\nFROM daily_active;",
  "solution": "SELECT day,\n       ROUND(AVG(dau) OVER (ORDER BY day ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS ma_3d\nFROM daily_active;",
  "hints": ["A 3-row window is 2 PRECEDING AND CURRENT ROW."]
}
```

> [!TIP] Interview tips
> - Write the frame explicitly. Saying "the default is RANGE, which lumps ties together" shows real depth.
> - Prefer trailing windows (`PRECEDING`) for metrics; centered windows leak future data into forecasts.
> - For calendar-based windows with gaps, either fill the gaps first or use `RANGE BETWEEN INTERVAL '6' DAY PRECEDING AND CURRENT ROW` where supported (Postgres, BigQuery via `RANGE` on a numeric day index).
