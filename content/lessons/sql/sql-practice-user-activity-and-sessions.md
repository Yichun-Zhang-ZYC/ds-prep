---
id: sql-practice-user-activity-and-sessions
title: "Practice: User activity and engagement queries"
estimatedMinutes: 15
difficulty: medium
tags: [interview-pattern, practice, engagement, sessions, retention]
---

## Why it matters
Product and growth teams live on activity tables: one row per event, millions of rows, no clean 'sessions' column. Interviewers use DAU, new vs returning, D1 retention and sessionization to test whether you can turn raw events into user-level facts without double counting.

## Concept
The playbook for event-log questions:

1. **Collapse events to the grain you need first.** `SELECT DISTINCT user_id, date(event_ts)` gives one row per user-day; almost every engagement metric starts there.
2. **Count users, not events.** `COUNT(DISTINCT user_id)` for any "how many users" question; a user with 50 events is still one DAU.
3. **Derive per-user anchors with a CTE.** First-seen day (`MIN`) separates new from returning users; signup date anchors cohorts and retention.
4. **Sessions = gaps.** Sort each user's events, flag a new session when the gap from `LAG` exceeds a threshold (commonly 30 minutes), then `SUM` the flags as a running total to get a session id. See *Sessionization*.
5. **Rolling distinct counts** (distinct users in the last 7 days) cannot be a window function, since `COUNT(DISTINCT ...)` is not allowed over a frame. Self-join user-days to a date range, or use a calendar table.

Pitfalls: mixing timestamps and dates in comparisons, time zone shifts moving events across day boundaries (see *Time zones*), and dividing by the wrong cohort (retention denominators are the cohort size, not the users active that day). Related: *DAU, MAU and stickiness*, *Retention and cohort analysis*.

## Worked example
Tables: `users(user_id, signup_date)` and `events(user_id, event_ts, event_type)`. Task: daily active users, split into new (first ever active day) and returning.

```sql
WITH daily AS (
  SELECT DISTINCT user_id, date(event_ts) AS d FROM events
),
first_day AS (
  SELECT user_id, MIN(d) AS d0 FROM daily GROUP BY user_id
)
SELECT d,
       COUNT(*) AS dau,
       SUM(d = d0) AS new_users,
       SUM(d <> d0) AS returning_users
FROM daily
JOIN first_day USING (user_id)
GROUP BY d
ORDER BY d;
```

Result:

| d | dau | new_users | returning_users |
|---|---|---|---|
| 2024-03-01 | 2 | 2 | 0 |
| 2024-03-02 | 3 | 1 | 2 |
| 2024-03-03 | 1 | 0 | 1 |
| 2024-03-04 | 3 | 1 | 2 |

Walk through 2024-03-04: users 1, 3 and 4 are active, so DAU is 3. User 4 is new; users 1 and 3 were first seen earlier, so 2 are returning. Without the `DISTINCT` in `daily`, user 1's three events on 03-01 would inflate DAU on that day from 2 to 4.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why can't you compute 'distinct users in the trailing 7 days' with `COUNT(DISTINCT user_id) OVER (ORDER BY d ROWS 6 PRECEDING)`?",
  "options": [
    "Window functions cannot use ORDER BY",
    "DISTINCT is not supported inside window aggregates in most engines (and in SQLite)",
    "The result would be an integer",
    "ROWS cannot take a number"
  ],
  "answer": 1,
  "explanation": "Most engines reject COUNT(DISTINCT) as a window function. The usual fixes are a self-join of user-days to a date range or a calendar table. Note a ROWS frame over user-days is also wrong: rows are not days."
}
```

```quiz
{
  "id": "q2",
  "question": "D1 retention for the 03-01 signup cohort of 2 users, where 1 user was active on 03-02. What is the rate, and what is the denominator?",
  "options": [
    "1/3, all users active on 03-02",
    "1/2, users active on 03-02",
    "1/2, the cohort size (users who signed up on 03-01)",
    "1, since someone returned"
  ],
  "answer": 2,
  "explanation": "The denominator is always the cohort size, here 2. The numerator is cohort members active exactly one day later: 1. So 50%."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Compute **day-1 retention** per signup date. Columns: `signup_date, cohort_size, retained, d1_rate` where `retained` is users with an event exactly one day after signup and `d1_rate` is rounded to 3 decimals. Note the join to `events` will repeat users; count distinct users.",
  "setup": "CREATE TABLE users (user_id INTEGER, signup_date TEXT);\nINSERT INTO users VALUES (1,'2024-03-01'),(2,'2024-03-01'),(3,'2024-03-02'),(4,'2024-03-04');\nCREATE TABLE events (user_id INTEGER, event_ts TEXT, event_type TEXT);\nINSERT INTO events VALUES (1,'2024-03-01 09:00:00','open'),(1,'2024-03-01 09:10:00','click'),(1,'2024-03-01 15:00:00','open'),(1,'2024-03-02 10:00:00','open'),(1,'2024-03-04 08:00:00','open'),(2,'2024-03-01 12:00:00','open'),(2,'2024-03-02 12:00:00','open'),(2,'2024-03-03 12:00:00','open'),(3,'2024-03-02 20:00:00','open'),(3,'2024-03-04 20:00:00','open'),(4,'2024-03-04 07:00:00','open');",
  "starterCode": "WITH cohort AS (\n  SELECT user_id, signup_date FROM users\n)\nSELECT ...",
  "solution": "SELECT u.signup_date,\n       COUNT(*) AS cohort_size,\n       COUNT(DISTINCT CASE WHEN e.user_id IS NOT NULL THEN u.user_id END) AS retained,\n       ROUND(COUNT(DISTINCT CASE WHEN e.user_id IS NOT NULL THEN u.user_id END) * 1.0 / COUNT(DISTINCT u.user_id), 3) AS d1_rate\nFROM users u\nLEFT JOIN events e\n  ON e.user_id = u.user_id\n AND date(e.event_ts) = date(u.signup_date, '+1 day')\nGROUP BY u.signup_date;",
  "hints": [
    "LEFT JOIN events on user_id AND date(event_ts) = date(signup_date, '+1 day').",
    "A user with several events on day 1 would be repeated, so use COUNT(DISTINCT ...).",
    "retained counts users whose joined event is not NULL; the denominator is COUNT(DISTINCT u.user_id)."
  ]
}
```

```sql-exercise
{
  "id": "ex2",
  "prompt": "Count **sessions per user**, where a new session starts when the gap since the user's previous event is **more than 30 minutes** (the first event always starts one). Columns: `user_id, sessions`.",
  "setup": "CREATE TABLE users (user_id INTEGER, signup_date TEXT);\nINSERT INTO users VALUES (1,'2024-03-01'),(2,'2024-03-01'),(3,'2024-03-02'),(4,'2024-03-04');\nCREATE TABLE events (user_id INTEGER, event_ts TEXT, event_type TEXT);\nINSERT INTO events VALUES (1,'2024-03-01 09:00:00','open'),(1,'2024-03-01 09:10:00','click'),(1,'2024-03-01 15:00:00','open'),(1,'2024-03-02 10:00:00','open'),(1,'2024-03-04 08:00:00','open'),(2,'2024-03-01 12:00:00','open'),(2,'2024-03-02 12:00:00','open'),(2,'2024-03-03 12:00:00','open'),(3,'2024-03-02 20:00:00','open'),(3,'2024-03-04 20:00:00','open'),(4,'2024-03-04 07:00:00','open');",
  "starterCode": "WITH gaps AS (\n  SELECT user_id, event_ts,\n         LAG(event_ts) OVER (PARTITION BY user_id ORDER BY event_ts) AS prev_ts\n  FROM events\n)\nSELECT ...",
  "solution": "WITH gaps AS (\n  SELECT user_id, event_ts,\n         LAG(event_ts) OVER (PARTITION BY user_id ORDER BY event_ts) AS prev_ts\n  FROM events\n),\nflags AS (\n  SELECT user_id,\n         CASE WHEN prev_ts IS NULL\n                OR (julianday(event_ts) - julianday(prev_ts)) * 24 * 60 > 30\n              THEN 1 ELSE 0 END AS is_new\n  FROM gaps\n)\nSELECT user_id, SUM(is_new) AS sessions\nFROM flags\nGROUP BY user_id;",
  "hints": [
    "Use LAG(event_ts) partitioned by user, ordered by event_ts.",
    "Minutes between two timestamps in SQLite: (julianday(a) - julianday(b)) * 24 * 60.",
    "Flag 1 when prev is NULL or the gap exceeds 30, then SUM the flags per user; you do not even need a running total when you only want the count."
  ]
}
```

```sql-exercise
{
  "id": "ex3",
  "prompt": "For each date that appears in the data, count the **distinct users active in the 3-day window ending that date** (the date and the two days before it). Columns: `d, active_3d`.",
  "setup": "CREATE TABLE users (user_id INTEGER, signup_date TEXT);\nINSERT INTO users VALUES (1,'2024-03-01'),(2,'2024-03-01'),(3,'2024-03-02'),(4,'2024-03-04');\nCREATE TABLE events (user_id INTEGER, event_ts TEXT, event_type TEXT);\nINSERT INTO events VALUES (1,'2024-03-01 09:00:00','open'),(1,'2024-03-01 09:10:00','click'),(1,'2024-03-01 15:00:00','open'),(1,'2024-03-02 10:00:00','open'),(1,'2024-03-04 08:00:00','open'),(2,'2024-03-01 12:00:00','open'),(2,'2024-03-02 12:00:00','open'),(2,'2024-03-03 12:00:00','open'),(3,'2024-03-02 20:00:00','open'),(3,'2024-03-04 20:00:00','open'),(4,'2024-03-04 07:00:00','open');",
  "starterCode": "WITH daily AS (\n  SELECT DISTINCT user_id, date(event_ts) AS d FROM events\n)\nSELECT ...",
  "solution": "WITH daily AS (\n  SELECT DISTINCT user_id, date(event_ts) AS d FROM events\n),\ndays AS (\n  SELECT DISTINCT d FROM daily\n)\nSELECT days.d,\n       COUNT(DISTINCT daily.user_id) AS active_3d\nFROM days\nJOIN daily\n  ON daily.d BETWEEN date(days.d, '-2 day') AND days.d\nGROUP BY days.d;",
  "hints": [
    "Build a distinct list of user-days first.",
    "Self-join: for each date in the list, match user-days whose date is between date(d, '-2 day') and d.",
    "COUNT(DISTINCT user_id) per outer date, since the same user can match on several days."
  ]
}
```

> [!TIP] Interview tips
> - Say 'one row per user-day' before anything else; it shows you control the grain.
> - For retention, define the cohort and the denominator explicitly (cohort size, not active users).
> - For sessions, ask for the inactivity threshold and whether a session may cross midnight.
