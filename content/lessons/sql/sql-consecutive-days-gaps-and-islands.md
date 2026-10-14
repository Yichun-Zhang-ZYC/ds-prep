---
id: sql-consecutive-days-gaps-and-islands
title: Consecutive days / gaps and islands
estimatedMinutes: 15
difficulty: hard
tags: [interview-pattern, window-functions, streaks]
---

## Why it matters
"Users who logged in 3 days in a row", "longest streak", "periods when the sensor was offline": these are gaps-and-islands problems. They're a favorite hard question because the trick isn't obvious until you've seen it once.

## Concept
For consecutive dates, **date minus row number is constant within a streak**:

| login_date | row_number | date − row_number |
|---|---|---|
| Mar 1 | 1 | Feb 29 |
| Mar 2 | 2 | Feb 29 |
| Mar 3 | 3 | Feb 29 |
| Mar 5 | 4 | Mar 1 |
| Mar 6 | 5 | Mar 1 |

Rows with the same difference form one "island" (streak). Group by it to get each streak's start, end and length.

Two details that matter:
- Deduplicate dates first (two logins on one day would break the arithmetic).
- Number rows `PARTITION BY user_id` so each user's streaks are separate.

## Worked example
Every streak per user (SQLite uses `julianday` for date arithmetic):

```sql
WITH days AS (
  SELECT DISTINCT user_id, login_date FROM logins
),
grouped AS (
  SELECT user_id, login_date,
         julianday(login_date) - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date) AS grp
  FROM days
)
SELECT user_id, MIN(login_date) AS streak_start, MAX(login_date) AS streak_end, COUNT(*) AS length
FROM grouped
GROUP BY user_id, grp;
```

The same idea works for any ordered sequence: consecutive IDs, or runs of the same status (using a `LAG`-based change flag and a running `SUM`).

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A user logged in on Jan 1, Jan 1 (twice), Jan 2 and Jan 3. Without deduplication, what goes wrong?",
  "options": ["Nothing", "The duplicate shifts the row numbers, splitting one streak into two islands", "julianday fails on duplicates", "The streak becomes longer"],
  "answer": 1,
  "explanation": "Row numbers become 1, 2, 3, 4 for 4 rows over 3 dates, so date − row_number is no longer constant. Use DISTINCT dates first."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "For each user, return their **longest streak of consecutive login days** as `longest_streak`. Columns: `user_id, longest_streak`. A user may log in several times a day.",
  "setup": "CREATE TABLE logins (user_id INTEGER, login_date TEXT); INSERT INTO logins VALUES (1,'2024-03-01'),(1,'2024-03-02'),(1,'2024-03-02'),(1,'2024-03-03'),(1,'2024-03-05'),(2,'2024-03-01'),(2,'2024-03-03'),(2,'2024-03-04'),(2,'2024-03-05'),(2,'2024-03-06'),(3,'2024-03-10');",
  "starterCode": "WITH days AS (\n  SELECT DISTINCT user_id, login_date FROM logins\n)\nSELECT ...",
  "solution": "WITH days AS (\n  SELECT DISTINCT user_id, login_date FROM logins\n),\ngrouped AS (\n  SELECT user_id,\n         julianday(login_date) - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date) AS grp\n  FROM days\n),\nstreaks AS (\n  SELECT user_id, grp, COUNT(*) AS streak\n  FROM grouped\n  GROUP BY user_id, grp\n)\nSELECT user_id, MAX(streak) AS longest_streak\nFROM streaks\nGROUP BY user_id;",
  "hints": ["julianday(date) − ROW_NUMBER() is constant inside a streak.", "Count rows per (user, group), then take the MAX per user."]
}
```

> [!TIP] Interview tips
> - Draw the little table (date, row number, difference) on the whiteboard; it makes the trick obvious to the interviewer.
> - Say "dedupe dates first" before they find the bug for you.
> - "At least N days in a row" is just `HAVING COUNT(*) >= N` on the islands.
