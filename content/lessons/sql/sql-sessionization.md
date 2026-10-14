---
id: sql-sessionization
title: Sessionization
estimatedMinutes: 15
difficulty: hard
tags: [interview-pattern, window-functions, sessions, clickstream]
---

## Why it matters
Raw clickstream has no session IDs. "Group events into sessions with a 30-minute inactivity timeout" is a classic hard SQL question for product analytics and data engineering roles.

## Concept
Three window steps:

1. For each event, get the previous event time of the **same user** with `LAG`.
2. Flag a new session when there is no previous event or the gap exceeds the timeout.
3. A running `SUM` of the flag per user gives a session number.

```text
ts      gap     new_session  session_num
10:00   -       1            1
10:10   10m     0            1
11:00   50m     1            2
11:05   5m      0            2
```

The same "flag + running sum" trick numbers any kind of group that starts on a condition.

## Worked example
Session number per user with a 30-minute timeout (SQLite: `julianday` difference × 1440 = minutes):

```sql
WITH prev AS (
  SELECT user_id, ts,
         LAG(ts) OVER (PARTITION BY user_id ORDER BY ts) AS prev_ts
  FROM clicks
),
flagged AS (
  SELECT user_id, ts,
         CASE WHEN prev_ts IS NULL
                OR (julianday(ts) - julianday(prev_ts)) * 1440 > 30
              THEN 1 ELSE 0 END AS new_session
  FROM prev
)
SELECT user_id, ts,
       SUM(new_session) OVER (PARTITION BY user_id ORDER BY ts
                              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS session_num
FROM flagged;
```

From here, session length is `MAX(ts) − MIN(ts)` per `(user_id, session_num)`, and events per session is `COUNT(*)`.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why must the LAG be partitioned by user?",
  "options": ["For performance only", "Otherwise one user's event is compared with another user's previous event", "LAG requires PARTITION BY", "To sort the output"],
  "answer": 1,
  "explanation": "Without PARTITION BY user_id, the 'previous event' could belong to a different user, so sessions would merge across users."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Assign a session number per user with a **30-minute** inactivity timeout. Return `user_id`, `ts` and `session_num` (1 for each user's first session).",
  "setup": "CREATE TABLE clicks (user_id INTEGER, ts TEXT); INSERT INTO clicks VALUES (1,'2024-06-01 10:00:00'),(1,'2024-06-01 10:12:00'),(1,'2024-06-01 10:30:00'),(1,'2024-06-01 11:20:00'),(1,'2024-06-01 11:25:00'),(2,'2024-06-01 09:00:00'),(2,'2024-06-01 10:00:00'),(2,'2024-06-01 10:05:00');",
  "starterCode": "WITH prev AS (\n  SELECT user_id, ts,\n         LAG(ts) OVER (PARTITION BY user_id ORDER BY ts) AS prev_ts\n  FROM clicks\n)\nSELECT ...",
  "solution": "WITH prev AS (\n  SELECT user_id, ts,\n         LAG(ts) OVER (PARTITION BY user_id ORDER BY ts) AS prev_ts\n  FROM clicks\n),\nflagged AS (\n  SELECT user_id, ts,\n         CASE WHEN prev_ts IS NULL OR (julianday(ts) - julianday(prev_ts)) * 1440 > 30\n              THEN 1 ELSE 0 END AS new_session\n  FROM prev\n)\nSELECT user_id, ts,\n       SUM(new_session) OVER (PARTITION BY user_id ORDER BY ts\n                              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS session_num\nFROM flagged;",
  "hints": ["(julianday(a) - julianday(b)) * 1440 is the gap in minutes.", "Flag 1 when the gap is over 30 minutes (or there's no previous click), then take a running SUM of the flag per user."]
}
```

> [!TIP] Interview tips
> - Explain the three steps (LAG, flag, running sum) before writing; it's the whole solution.
> - Ask about the timeout and whether sessions also break at midnight or on a campaign change.
> - In production, mention computing sessions incrementally in the pipeline rather than over all history each time.
