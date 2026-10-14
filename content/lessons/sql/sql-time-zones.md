---
id: sql-time-zones
title: Time zones
estimatedMinutes: 10
difficulty: medium
tags: [dates, time-zones, data-quality]
---

## Why it matters
"Why don't our daily numbers match the finance report?" Very often the answer is time zones: one system counts days in UTC, the other in local time. Interviewers ask this to see if you think about data correctness, not just syntax.

## Concept
- **Store** timestamps in UTC (or with an explicit offset). **Convert** only when you report.
- A "day" depends on the time zone. An order at `2024-03-01 03:00 UTC` belongs to **February 29** in New York (UTC−5).
- **Daylight saving time** means some local days have 23 or 25 hours, and a fixed offset like `−5 hours` is only right part of the year. Use named zones (`America/New_York`) when the database supports them.

| Engine | Convert a UTC timestamp to a local date |
|---|---|
| Postgres | `(ts AT TIME ZONE 'UTC' AT TIME ZONE 'America/New_York')::date` |
| BigQuery | `DATE(ts, 'America/New_York')` |
| Snowflake | `CONVERT_TIMEZONE('UTC', 'America/New_York', ts)::date` |
| SQLite | `date(ts, '-5 hours')` (fixed offset only) |

## Worked example
Daily orders in New York local time from UTC timestamps (fixed −5h offset in SQLite):

```sql
SELECT date(created_at_utc, '-5 hours') AS local_day, COUNT(*) AS orders
FROM orders
GROUP BY local_day;
```

The same rows grouped by `date(created_at_utc)` give different daily counts near midnight, even though the total is the same.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "An event happened at `2024-07-01 02:30 UTC`. Which local date is it in Los Angeles (UTC−7 in July)?",
  "options": ["2024-07-01", "2024-06-30", "2024-07-02", "It depends on the database"],
  "answer": 1,
  "explanation": "02:30 − 7 hours = 19:30 on June 30."
}
```

```quiz
{
  "id": "q2",
  "question": "Why is `date(ts, '-5 hours')` not fully correct for New York?",
  "options": ["SQLite can't subtract hours", "New York is UTC−4 during daylight saving time", "It rounds to the nearest hour", "It only works for dates after 2000"],
  "answer": 1,
  "explanation": "New York switches between UTC−5 (winter) and UTC−4 (summer). Named time zones handle that; fixed offsets don't."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Timestamps in `events.ts_utc` are UTC. Count events per **local day in UTC−5** as `local_day` and `events`.",
  "setup": "CREATE TABLE events (id INTEGER PRIMARY KEY, ts_utc TEXT); INSERT INTO events VALUES (1,'2024-01-10 02:00:00'),(2,'2024-01-10 04:59:00'),(3,'2024-01-10 05:00:00'),(4,'2024-01-10 23:30:00'),(5,'2024-01-11 03:15:00'),(6,'2024-01-11 12:00:00');",
  "starterCode": "SELECT date(ts_utc) AS local_day, COUNT(*) AS events\nFROM events\nGROUP BY local_day;",
  "solution": "SELECT date(ts_utc, '-5 hours') AS local_day, COUNT(*) AS events\nFROM events\nGROUP BY local_day;",
  "hints": ["Shift the timestamp by -5 hours before taking the date.", "05:00 UTC is exactly midnight local time."]
}
```

> [!TIP] Interview tips
> - When numbers "don't match", list time zone as one of the first things to check, along with filters and late-arriving data.
> - Ask which zone the business reports in. Global companies often report in UTC or HQ time.
> - Mention DST and that named zones are safer than fixed offsets.
