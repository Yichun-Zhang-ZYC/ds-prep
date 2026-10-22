---
id: sql-practice-streaks-and-gaps
title: "Practice: Streaks, gaps and islands"
estimatedMinutes: 15
difficulty: hard
tags: [interview-pattern, practice, gaps-and-islands, window-functions, streaks]
---

## Why it matters
Streaks and gaps are the classic hard SQL question: 'longest login streak', 'users active 3 days in a row', 'periods a device was down', 'missing dates'. The twist is always the same, and once you recognize it you can solve the whole family. This set drills the three variants. For the base date-minus-row-number trick, see *Consecutive days / gaps and islands*.

## Concept
There are three tools; pick by the shape of the question.

1. **Date minus row number** (consecutive dates). After deduplicating dates, `date - ROW_NUMBER()` is constant inside a streak. Best for "N days in a row".
2. **Change flag plus running sum** (runs of the same value, or gaps over a threshold). Flag a row with 1 when it starts a new run (`LAG` is NULL, value differs, or the gap is too big), then `SUM(flag) OVER (ORDER BY ...)` is the run id. This is the general version: it works for statuses, not only dates, and for any gap rule such as sessions.
3. **`LEAD`/`LAG` on the gap itself** (listing the missing periods). When `next_date - date > 1`, the gap runs from `date + 1` to `next_date - 1`.

Steps that avoid most mistakes:
- Deduplicate to one row per (entity, date) first.
- Partition by the entity so users and devices never mix.
- Group by `(entity, run_id)` and aggregate `MIN`/`MAX`/`COUNT` for the run's start, end and length.
- Decide whether a run's length means rows or elapsed days; with one row per day they coincide.

Pitfalls: the first row of each partition has `LAG = NULL`, so a plain `status <> LAG(status)` yields NULL, not 1 (use `CASE ... ELSE 1`); and grouping by `run_id` alone merges different entities if you forgot the partition.

## Worked example
Table `status_log(device_id, day, status)`, one row per device per day. Task: list each run of identical consecutive status with its start, end and length, using the change-flag approach.

```sql
WITH flagged AS (
  SELECT device_id, day, status,
         CASE WHEN status = LAG(status) OVER (PARTITION BY device_id ORDER BY day)
              THEN 0 ELSE 1 END AS changed
  FROM status_log
),
runs AS (
  SELECT device_id, day, status,
         SUM(changed) OVER (PARTITION BY device_id ORDER BY day) AS run_id
  FROM flagged
)
SELECT device_id, status, MIN(day) AS start_day, MAX(day) AS end_day, COUNT(*) AS days
FROM runs
GROUP BY device_id, run_id, status
ORDER BY device_id, start_day;
```

Result:

| device_id | status | start_day | end_day | days |
|---|---|---|---|---|
| 1 | up | 2024-05-01 | 2024-05-02 | 2 |
| 1 | down | 2024-05-03 | 2024-05-05 | 3 |
| 1 | up | 2024-05-06 | 2024-05-06 | 1 |
| 2 | down | 2024-05-01 | 2024-05-01 | 1 |
| 2 | up | 2024-05-02 | 2024-05-03 | 2 |
| 3 | up | 2024-05-01 | 2024-05-01 | 1 |
| 3 | down | 2024-05-02 | 2024-05-02 | 1 |
| 3 | up | 2024-05-03 | 2024-05-03 | 1 |
| 3 | down | 2024-05-04 | 2024-05-05 | 2 |

Device 1 reads up, up, down, down, down, up. The flags are 1, 0, 1, 0, 0, 1, so the running sum gives run ids 1, 1, 2, 2, 2, 3, i.e. an up run of 2 days, a down run of 3 and an up run of 1. Devices 2 and 3 restart their run ids at 1, which confirms the partition resets the count. Grouping by `status` as well as `run_id` is harmless and lets you select it without an aggregate.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which approach handles 'a new session starts after more than 30 minutes of inactivity'?",
  "options": [
    "timestamp minus ROW_NUMBER()",
    "LAG to compute the gap, flag gaps > 30, running SUM of flags as the session id",
    "GROUP BY the hour",
    "SELECT DISTINCT user_id"
  ],
  "answer": 1,
  "explanation": "Timestamps are not evenly spaced, so the date-minus-row-number trick fails. The flag plus running sum approach works for any gap rule."
}
```

```quiz
{
  "id": "q2",
  "question": "For a user's distinct login dates 03-01, 03-02, 03-05, using `LEAD(login_date)`, which row identifies the missing days 03-03 and 03-04?",
  "options": [
    "The 03-02 row: next date is 03-05, gap from 03-03 to 03-04",
    "The 03-01 row",
    "The 03-05 row, whose LEAD is NULL",
    "None; LEAD cannot find gaps"
  ],
  "answer": 0,
  "explanation": "On the 03-02 row, next_date minus date is 3 > 1, so the gap is date + 1 = 03-03 through next_date - 1 = 03-04. The last row has a NULL next date and is not a gap."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "List every login streak of **at least 3 consecutive days**. Columns: `user_id, streak_start, streak_end, length`. Users may log in several times a day.",
  "setup": "CREATE TABLE logins (user_id INTEGER, login_date TEXT);\nINSERT INTO logins VALUES (1,'2024-03-01'),(1,'2024-03-02'),(1,'2024-03-02'),(1,'2024-03-03'),(1,'2024-03-05'),(1,'2024-03-06'),(2,'2024-03-01'),(2,'2024-03-03'),(2,'2024-03-04'),(2,'2024-03-05'),(2,'2024-03-06'),(2,'2024-03-07'),(3,'2024-03-10'),(4,'2024-03-01'),(4,'2024-03-02'),(4,'2024-03-03'),(4,'2024-03-04');\nCREATE TABLE status_log (device_id INTEGER, day TEXT, status TEXT);\nINSERT INTO status_log VALUES (1,'2024-05-01','up'),(1,'2024-05-02','up'),(1,'2024-05-03','down'),(1,'2024-05-04','down'),(1,'2024-05-05','down'),(1,'2024-05-06','up'),(2,'2024-05-01','down'),(2,'2024-05-02','up'),(2,'2024-05-03','up'),(3,'2024-05-01','up'),(3,'2024-05-02','down'),(3,'2024-05-03','up'),(3,'2024-05-04','down'),(3,'2024-05-05','down');",
  "starterCode": "WITH days AS (\n  SELECT DISTINCT user_id, login_date FROM logins\n),\ngrouped AS (\n  SELECT user_id, login_date,\n         julianday(login_date) - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date) AS grp\n  FROM days\n)\nSELECT ...",
  "solution": "WITH days AS (\n  SELECT DISTINCT user_id, login_date FROM logins\n),\ngrouped AS (\n  SELECT user_id, login_date,\n         julianday(login_date) - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date) AS grp\n  FROM days\n)\nSELECT user_id, MIN(login_date) AS streak_start, MAX(login_date) AS streak_end, COUNT(*) AS length\nFROM grouped\nGROUP BY user_id, grp\nHAVING COUNT(*) >= 3;",
  "hints": [
    "Deduplicate dates first, then julianday(date) - ROW_NUMBER() per user is constant within a streak.",
    "Group by (user_id, that difference) and take MIN, MAX and COUNT.",
    "HAVING COUNT(*) >= 3 keeps only long streaks."
  ]
}
```

```sql-exercise
{
  "id": "ex2",
  "prompt": "For each user, list the **gaps between logins**: the first and last missing date of every run of missing days between two logins. Columns: `user_id, gap_start, gap_end`. Do not report time before the first or after the last login.",
  "setup": "CREATE TABLE logins (user_id INTEGER, login_date TEXT);\nINSERT INTO logins VALUES (1,'2024-03-01'),(1,'2024-03-02'),(1,'2024-03-02'),(1,'2024-03-03'),(1,'2024-03-05'),(1,'2024-03-06'),(2,'2024-03-01'),(2,'2024-03-03'),(2,'2024-03-04'),(2,'2024-03-05'),(2,'2024-03-06'),(2,'2024-03-07'),(3,'2024-03-10'),(4,'2024-03-01'),(4,'2024-03-02'),(4,'2024-03-03'),(4,'2024-03-04');\nCREATE TABLE status_log (device_id INTEGER, day TEXT, status TEXT);\nINSERT INTO status_log VALUES (1,'2024-05-01','up'),(1,'2024-05-02','up'),(1,'2024-05-03','down'),(1,'2024-05-04','down'),(1,'2024-05-05','down'),(1,'2024-05-06','up'),(2,'2024-05-01','down'),(2,'2024-05-02','up'),(2,'2024-05-03','up'),(3,'2024-05-01','up'),(3,'2024-05-02','down'),(3,'2024-05-03','up'),(3,'2024-05-04','down'),(3,'2024-05-05','down');",
  "starterCode": "WITH days AS (\n  SELECT DISTINCT user_id, login_date FROM logins\n),\nnxt AS (\n  SELECT user_id, login_date,\n         LEAD(login_date) OVER (PARTITION BY user_id ORDER BY login_date) AS next_date\n  FROM days\n)\nSELECT ...",
  "solution": "WITH days AS (\n  SELECT DISTINCT user_id, login_date FROM logins\n),\nnxt AS (\n  SELECT user_id, login_date,\n         LEAD(login_date) OVER (PARTITION BY user_id ORDER BY login_date) AS next_date\n  FROM days\n)\nSELECT user_id,\n       date(login_date, '+1 day') AS gap_start,\n       date(next_date, '-1 day') AS gap_end\nFROM nxt\nWHERE julianday(next_date) - julianday(login_date) > 1;",
  "hints": [
    "Use LEAD(login_date) over distinct dates to get each login's next login.",
    "A gap exists when the next date is more than 1 day later.",
    "gap_start = date(login_date, '+1 day'), gap_end = date(next_date, '-1 day')."
  ]
}
```

```sql-exercise
{
  "id": "ex3",
  "prompt": "For each device that was ever `down`, return its **longest consecutive run of `down` days** as `longest_down`. Columns: `device_id, longest_down`.",
  "setup": "CREATE TABLE logins (user_id INTEGER, login_date TEXT);\nINSERT INTO logins VALUES (1,'2024-03-01'),(1,'2024-03-02'),(1,'2024-03-02'),(1,'2024-03-03'),(1,'2024-03-05'),(1,'2024-03-06'),(2,'2024-03-01'),(2,'2024-03-03'),(2,'2024-03-04'),(2,'2024-03-05'),(2,'2024-03-06'),(2,'2024-03-07'),(3,'2024-03-10'),(4,'2024-03-01'),(4,'2024-03-02'),(4,'2024-03-03'),(4,'2024-03-04');\nCREATE TABLE status_log (device_id INTEGER, day TEXT, status TEXT);\nINSERT INTO status_log VALUES (1,'2024-05-01','up'),(1,'2024-05-02','up'),(1,'2024-05-03','down'),(1,'2024-05-04','down'),(1,'2024-05-05','down'),(1,'2024-05-06','up'),(2,'2024-05-01','down'),(2,'2024-05-02','up'),(2,'2024-05-03','up'),(3,'2024-05-01','up'),(3,'2024-05-02','down'),(3,'2024-05-03','up'),(3,'2024-05-04','down'),(3,'2024-05-05','down');",
  "starterCode": "WITH flagged AS (\n  SELECT device_id, day, status,\n         CASE WHEN status = LAG(status) OVER (PARTITION BY device_id ORDER BY day) THEN 0 ELSE 1 END AS changed\n  FROM status_log\n)\nSELECT ...",
  "solution": "WITH flagged AS (\n  SELECT device_id, day, status,\n         CASE WHEN status = LAG(status) OVER (PARTITION BY device_id ORDER BY day)\n              THEN 0 ELSE 1 END AS changed\n  FROM status_log\n),\nruns AS (\n  SELECT device_id, status,\n         SUM(changed) OVER (PARTITION BY device_id ORDER BY day) AS run_id\n  FROM flagged\n),\nlengths AS (\n  SELECT device_id, status, run_id, COUNT(*) AS days\n  FROM runs\n  GROUP BY device_id, run_id, status\n)\nSELECT device_id, MAX(days) AS longest_down\nFROM lengths\nWHERE status = 'down'\nGROUP BY device_id;",
  "hints": [
    "Flag a row with 1 when the status differs from the previous day (or there is no previous day).",
    "A running SUM of the flags per device gives a run id; group by (device, run id, status) to get run lengths.",
    "Keep status = 'down' runs, then MAX per device."
  ]
}
```

> [!TIP] Interview tips
> - Name the technique out loud: 'dedupe, flag the start of each run, running sum for the run id, group by run id'.
> - Use the change-flag version when the question is not purely about consecutive dates.
> - Test with the first row of a partition and with a duplicate date in your head before you submit.
