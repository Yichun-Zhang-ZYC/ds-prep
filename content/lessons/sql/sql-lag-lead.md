---
id: sql-lag-lead
title: LAG / LEAD
estimatedMinutes: 12
difficulty: medium
tags: [window-functions, lag, lead, time-series]
---

## Why it matters
Day-over-day change, time between a user's visits, "did the price go up?": anything that compares a row with the previous or next row is `LAG` / `LEAD`. It replaces the clumsy self-join on `date = date - 1`.

## Concept
```sql
LAG(expr, offset = 1, default = NULL) OVER (PARTITION BY ... ORDER BY ...)
LEAD(expr, offset = 1, default = NULL) OVER (PARTITION BY ... ORDER BY ...)
```

- `LAG` looks back `offset` rows; `LEAD` looks forward.
- The first row of each partition has no previous row, so `LAG` returns the default (NULL unless you pass one).
- `PARTITION BY` restarts the look-back per group, e.g. per user. Forgetting it compares one user's row with another user's.

`LAG` works on rows, not calendar days. If a day is missing, "previous row" is two days back. Fill gaps with a date spine first when the question is about calendar days.

## Worked example
Daily revenue with the change from the previous day:

```sql
SELECT day, revenue,
       revenue - LAG(revenue) OVER (ORDER BY day) AS change,
       ROUND(100.0 * (revenue - LAG(revenue) OVER (ORDER BY day))
             / LAG(revenue) OVER (ORDER BY day), 1)  AS pct_change
FROM daily_revenue;
```

Days between consecutive visits per user:

```sql
SELECT user_id, visit_date,
       julianday(visit_date) - julianday(LAG(visit_date) OVER (PARTITION BY user_id ORDER BY visit_date)) AS days_since_last
FROM visits;
```

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What does `LAG(price, 1, 0) OVER (ORDER BY day)` return on the first row?",
  "options": ["NULL", "0", "The first price", "An error"],
  "answer": 1,
  "explanation": "The third argument is the default used when there is no previous row."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "For each user's login, return `user_id`, `login_date` and the **previous login date of the same user** as `prev_login` (NULL for their first login).",
  "setup": "CREATE TABLE logins (user_id INTEGER, login_date TEXT); INSERT INTO logins VALUES (1,'2024-03-01'),(1,'2024-03-04'),(1,'2024-03-05'),(2,'2024-03-02'),(2,'2024-03-09'),(3,'2024-03-03');",
  "starterCode": "SELECT user_id, login_date,\n       -- previous login here\nFROM logins;",
  "solution": "SELECT user_id, login_date,\n       LAG(login_date) OVER (PARTITION BY user_id ORDER BY login_date) AS prev_login\nFROM logins;",
  "hints": ["Partition by user so the look-back doesn't cross users.", "Order by login_date inside the window."]
}
```

> [!TIP] Interview tips
> - Always say what you partition by and why; a missing `PARTITION BY` is the classic LAG bug.
> - Point out the "missing days" problem and offer a date spine if the question means calendar days.
> - `LAG` + `CASE` gives quick "streak" or "status changed" flags, which lead into gaps-and-islands problems.
