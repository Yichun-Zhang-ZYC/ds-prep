---
id: sql-practice-rolling-and-yoy-metrics
title: "Practice: Rolling windows and YoY metrics"
estimatedMinutes: 15
difficulty: hard
tags: [interview-pattern, practice, window-functions, rolling, yoy]
---

## Why it matters
Metric questions end with 'compared to last year' or 'over the trailing 7 days'. The window functions are easy; the danger is calendar logic: missing days or months silently shift row-based windows and `LAG` offsets. Interviewers watch for whether you notice. For syntax see *Running totals and moving averages*, *LAG and LEAD* and *Month-over-month growth*.

## Concept
**Row-based vs calendar-based.** `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW` means seven *rows*, which is seven *days* only if every day exists exactly once. Three safe options:

1. **Complete the calendar first.** Left join the data onto a date spine (a calendar table or a recursive CTE) with `COALESCE(revenue, 0)`, then use `ROWS`.
2. **Self-join or correlated subquery on dates**, e.g. `JOIN daily p ON p.day BETWEEN date(d.day, '-2 day') AND d.day`. Works with gaps, and it is the only option for distinct counts.
3. **`RANGE` with numeric offsets** where supported (needs a numeric order key such as a day number).

**YoY / period-over-period.**
- `LAG(revenue, 12)` is right only if every month is present exactly once. With a missing month it compares against the wrong period. Joining on the shifted key (`strftime('%Y-%m', month || '-01', '-1 year')`, or `month - INTERVAL '1 year'`) is robust and gives NULL when there is no prior year.
- Growth is $\frac{\text{current} - \text{prior}}{\text{prior}}$; guard against a zero or NULL denominator with `NULLIF(prior, 0)`.
- Compare equal-length periods: a partial current month versus a full prior month is misleading.

**Running totals within a period:** `SUM(x) OVER (PARTITION BY year ORDER BY month)` resets at each year (year-to-date).

**Partial windows.** The first rows have fewer than $k$ neighbors. Decide whether to output NULL (use `COUNT(*) OVER (same frame)` to check) or a shorter average.

Pitfalls: `ORDER BY` missing in the window (the default frame then covers the whole partition for ties), a default `RANGE` frame doubling up tied dates, and dividing integers.

## Worked example
Table `monthly(month, revenue)` with a deliberately missing month (2023-04). Task: year-over-year growth for each 2024 month by joining to the same month one year earlier.

```sql
SELECT c.month,
       c.revenue,
       p.revenue AS prior_year,
       ROUND((c.revenue - p.revenue) * 100.0 / p.revenue, 1) AS yoy_pct
FROM monthly c
LEFT JOIN monthly p
  ON p.month = strftime('%Y-%m', c.month || '-01', '-1 year')
WHERE c.month >= '2024-01'
ORDER BY c.month;
```

Result:

| month | revenue | prior_year | yoy_pct |
|---|---|---|---|
| 2024-01 | 120 | 100 | 20 |
| 2024-02 | 125 | 110 | 13.6 |
| 2024-03 | 150 | 120 | 25 |
| 2024-04 | 140 | NULL | NULL |
| 2024-05 | 156 | 130 | 20 |
| 2024-06 | 175 | 140 | 25 |

Check 2024-06: 175 against 140 in 2023-06 is $(175 - 140)/140 = 25\%$. 2024-04 has no 2023-04 row, so `prior_year` and `yoy_pct` are NULL, which is the honest answer. With `LAG(revenue, 12) OVER (ORDER BY month)` every 2024 month would be compared with the month before its true counterpart (2024-04 against 2023-03, 120) and January would get NULL, because the missing row shifts every offset by one.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A table has one row per day except weekends are missing. `AVG(x) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)` computes the average over...",
  "options": [
    "The last 7 calendar days",
    "The last 7 rows, which span more than 7 calendar days",
    "The last 7 weekdays only if you add PARTITION BY",
    "Always exactly 7 days"
  ],
  "answer": 1,
  "explanation": "ROWS counts rows, not time. With gaps the frame stretches further back in calendar time. Use a calendar spine, a date-range self-join or RANGE if you want 7 calendar days."
}
```

```quiz
{
  "id": "q2",
  "question": "Revenue is 80 this month and 0 in the same month last year. What should YoY growth show?",
  "options": [
    "Infinity",
    "100%",
    "NULL (undefined), by dividing by NULLIF(prior, 0)",
    "0%"
  ],
  "answer": 2,
  "explanation": "Growth from zero is undefined. NULLIF(prior, 0) turns the zero denominator into NULL so the query does not error and the result is honestly missing."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "`daily` has missing dates. For each row, return the **sum of revenue over the 3 calendar days ending on that day** (the day and the two before it; missing days contribute nothing). Columns: `day, rolling_3d`.",
  "setup": "CREATE TABLE monthly (month TEXT, revenue INTEGER);\nINSERT INTO monthly VALUES ('2023-01',100),('2023-02',110),('2023-03',120),('2023-05',130),('2023-06',140),('2023-07',150),('2023-08',145),('2023-09',155),('2023-10',160),('2023-11',180),('2023-12',200),('2024-01',120),('2024-02',125),('2024-03',150),('2024-04',140),('2024-05',156),('2024-06',175);\nCREATE TABLE daily (day TEXT, revenue INTEGER);\nINSERT INTO daily VALUES ('2024-06-01',10),('2024-06-02',20),('2024-06-04',30),('2024-06-05',40),('2024-06-06',50),('2024-06-09',60),('2024-06-10',70);",
  "starterCode": "SELECT d.day,\n       (SELECT SUM(p.revenue) FROM daily p WHERE ...) AS rolling_3d\nFROM daily d;",
  "solution": "SELECT d.day,\n       (SELECT SUM(p.revenue)\n        FROM daily p\n        WHERE p.day BETWEEN date(d.day, '-2 day') AND d.day) AS rolling_3d\nFROM daily d;",
  "hints": [
    "A ROWS frame would count rows, not calendar days, so use dates.",
    "Correlated subquery (or self-join) on p.day BETWEEN date(d.day, '-2 day') AND d.day.",
    "SUM over the matching rows; each outer row matches at least itself."
  ]
}
```

```sql-exercise
{
  "id": "ex2",
  "prompt": "Return each month's **year-to-date revenue** (cumulative within its calendar year, resetting each January). Columns: `month, revenue, ytd`.",
  "setup": "CREATE TABLE monthly (month TEXT, revenue INTEGER);\nINSERT INTO monthly VALUES ('2023-01',100),('2023-02',110),('2023-03',120),('2023-05',130),('2023-06',140),('2023-07',150),('2023-08',145),('2023-09',155),('2023-10',160),('2023-11',180),('2023-12',200),('2024-01',120),('2024-02',125),('2024-03',150),('2024-04',140),('2024-05',156),('2024-06',175);\nCREATE TABLE daily (day TEXT, revenue INTEGER);\nINSERT INTO daily VALUES ('2024-06-01',10),('2024-06-02',20),('2024-06-04',30),('2024-06-05',40),('2024-06-06',50),('2024-06-09',60),('2024-06-10',70);",
  "starterCode": "SELECT month, revenue,\n       SUM(revenue) OVER (...) AS ytd\nFROM monthly;",
  "solution": "SELECT month, revenue,\n       SUM(revenue) OVER (\n         PARTITION BY substr(month, 1, 4)\n         ORDER BY month\n         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\n       ) AS ytd\nFROM monthly;",
  "hints": [
    "Partition by the year part: substr(month, 1, 4).",
    "Order by month and sum with an explicit ROWS frame to the current row.",
    "The total resets automatically for the new partition."
  ]
}
```

```sql-exercise
{
  "id": "ex3",
  "prompt": "Using the **three previous rows** (months) of `monthly` as the baseline, return months whose revenue is **strictly above the average of those three**. Only consider months that have a full three-row history. Columns: `month, revenue, prev3_avg` (rounded to 2 decimals).",
  "setup": "CREATE TABLE monthly (month TEXT, revenue INTEGER);\nINSERT INTO monthly VALUES ('2023-01',100),('2023-02',110),('2023-03',120),('2023-05',130),('2023-06',140),('2023-07',150),('2023-08',145),('2023-09',155),('2023-10',160),('2023-11',180),('2023-12',200),('2024-01',120),('2024-02',125),('2024-03',150),('2024-04',140),('2024-05',156),('2024-06',175);\nCREATE TABLE daily (day TEXT, revenue INTEGER);\nINSERT INTO daily VALUES ('2024-06-01',10),('2024-06-02',20),('2024-06-04',30),('2024-06-05',40),('2024-06-06',50),('2024-06-09',60),('2024-06-10',70);",
  "starterCode": "WITH w AS (\n  SELECT month, revenue,\n         AVG(revenue) OVER (ORDER BY month ROWS BETWEEN 3 PRECEDING AND 1 PRECEDING) AS prev3_avg,\n         COUNT(*) OVER (ORDER BY month ROWS BETWEEN 3 PRECEDING AND 1 PRECEDING) AS n\n  FROM monthly\n)\nSELECT ...",
  "solution": "WITH w AS (\n  SELECT month, revenue,\n         AVG(revenue) OVER (ORDER BY month ROWS BETWEEN 3 PRECEDING AND 1 PRECEDING) AS prev3_avg,\n         COUNT(*) OVER (ORDER BY month ROWS BETWEEN 3 PRECEDING AND 1 PRECEDING) AS n\n  FROM monthly\n)\nSELECT month, revenue, ROUND(prev3_avg, 2) AS prev3_avg\nFROM w\nWHERE n = 3 AND revenue > prev3_avg;",
  "hints": [
    "Frame: ROWS BETWEEN 3 PRECEDING AND 1 PRECEDING excludes the current row.",
    "COUNT(*) over the same frame tells you whether three rows were available.",
    "You cannot filter on a window result in WHERE; wrap in a CTE first."
  ]
}
```

> [!TIP] Interview tips
> - Ask: 'Are all days/months guaranteed to be present?' and say how you handle gaps.
> - For YoY, prefer joining on the shifted date over LAG(12) unless the calendar is complete.
> - State whether the first periods should be NULL or partial averages.
