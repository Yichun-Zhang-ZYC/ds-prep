---
id: sql-first-value-last-value
title: FIRST_VALUE / LAST_VALUE
estimatedMinutes: 10
difficulty: medium
tags: [window-functions, frames, first-value]
---

## Why it matters
"Each user's first acquisition channel", "compare every price to the opening price of the day": `FIRST_VALUE` attaches a value from another row without collapsing rows. `LAST_VALUE` is famous for a frame trap interviewers like to test.

## Concept
```sql
FIRST_VALUE(expr) OVER (PARTITION BY ... ORDER BY ...)
LAST_VALUE(expr)  OVER (PARTITION BY ... ORDER BY ... ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
```

The trap: with `ORDER BY` and no frame, the default frame ends at the **current row**. So `LAST_VALUE` without an explicit frame just returns the current row's value, not the partition's last value.

Two safe alternatives for "last value": `FIRST_VALUE(expr) OVER (... ORDER BY key DESC)`, or spell out `UNBOUNDED FOLLOWING`.

## Worked example
Each signup row with the user's first and most recent plan:

```sql
SELECT user_id, changed_at, plan,
       FIRST_VALUE(plan) OVER (PARTITION BY user_id ORDER BY changed_at) AS first_plan,
       FIRST_VALUE(plan) OVER (PARTITION BY user_id ORDER BY changed_at DESC) AS current_plan
FROM plan_changes;
```

Unlike `GROUP BY` + `MIN`, every row stays, and you can compare each row with its first or last value.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "For prices 10, 12, 15 ordered by time, what does `LAST_VALUE(price) OVER (ORDER BY ts)` return on the first row?",
  "options": ["15", "10", "NULL", "12"],
  "answer": 1,
  "explanation": "The default frame stops at the current row, so the last value in the frame is the row itself: 10."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "For every visit, return `user_id`, `visit_date`, `channel` and the user's **first-ever channel** as `first_channel`.",
  "setup": "CREATE TABLE visits (user_id INTEGER, visit_date TEXT, channel TEXT); INSERT INTO visits VALUES (1,'2024-02-01','ads'),(1,'2024-02-05','email'),(1,'2024-02-09','direct'),(2,'2024-02-03','seo'),(2,'2024-02-04','ads'),(3,'2024-02-07','direct');",
  "starterCode": "SELECT user_id, visit_date, channel\nFROM visits;",
  "solution": "SELECT user_id, visit_date, channel,\n       FIRST_VALUE(channel) OVER (PARTITION BY user_id ORDER BY visit_date) AS first_channel\nFROM visits;",
  "hints": ["Partition by user, order by visit_date, take FIRST_VALUE."]
}
```

> [!TIP] Interview tips
> - Mention the `LAST_VALUE` frame trap unprompted; it signals you've used these functions for real.
> - "First touch" vs "last touch" attribution is exactly `FIRST_VALUE` with `ASC` vs `DESC`.
> - If you only need one row per user, `ROW_NUMBER() = 1` is simpler; use `FIRST_VALUE` when every row must stay.
