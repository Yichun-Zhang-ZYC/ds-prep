---
id: sql-union-vs-union-all
title: UNION vs UNION ALL
estimatedMinutes: 8
difficulty: easy
tags: [set-operations, union]
---

## Why it matters
Stacking data from several sources (web + app events, this year + last year) is routine. Choosing `UNION` by habit silently drops legitimate duplicate rows and costs a sort.

## Concept
- `UNION ALL` stacks the results as they are. Fast, keeps duplicates.
- `UNION` stacks and then removes duplicate rows (like `DISTINCT` over the whole result). Slower.

Rules for both:
- Same number of columns, in the same order, with compatible types.
- Column names come from the **first** query.
- One `ORDER BY` at the very end applies to the combined result.

## Worked example
Total events across two platforms. `UNION` here would be a bug, because two identical events on the same day are both real:

```sql
SELECT event_date, user_id, 'web' AS platform FROM web_events
UNION ALL
SELECT event_date, user_id, 'app' AS platform FROM app_events;
```

Adding a literal `platform` column keeps track of where each row came from and makes rows distinguishable anyway.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Query A returns 5 rows, query B returns 3 rows, and 2 rows of B are identical to rows of A (no duplicates within A or B). How many rows do `A UNION B` and `A UNION ALL B` return?",
  "options": ["6 and 8", "8 and 6", "6 and 6", "8 and 8"],
  "answer": 0,
  "explanation": "UNION ALL keeps all 8. UNION removes the 2 duplicates: 5 + 3 − 2 = 6."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Return the total number of logins per `user_id` as `logins`, counting logins from **both** `web_logins` and `app_logins`. The same user can log in on both on the same day; count both.",
  "setup": "CREATE TABLE web_logins (user_id INTEGER, login_date TEXT); CREATE TABLE app_logins (user_id INTEGER, login_date TEXT); INSERT INTO web_logins VALUES (1,'2024-05-01'),(1,'2024-05-02'),(2,'2024-05-01'); INSERT INTO app_logins VALUES (1,'2024-05-01'),(2,'2024-05-01'),(3,'2024-05-03');",
  "starterCode": "WITH all_logins AS (\n  SELECT user_id, login_date FROM web_logins\n  -- combine with app_logins\n)\nSELECT ...",
  "solution": "WITH all_logins AS (\n  SELECT user_id, login_date FROM web_logins\n  UNION ALL\n  SELECT user_id, login_date FROM app_logins\n)\nSELECT user_id, COUNT(*) AS logins\nFROM all_logins\nGROUP BY user_id;",
  "hints": ["UNION would merge user 1's web and app logins on 2024-05-01 into one row.", "Stack with UNION ALL, then group."]
}
```

> [!TIP] Interview tips
> - Default to `UNION ALL` and say so; use `UNION` only when you deliberately want deduplication.
> - Add a source column when stacking; it helps debugging and later grouping.
> - If types differ (e.g. `INT` vs `TEXT` ids), cast explicitly; implicit casts differ across engines.
