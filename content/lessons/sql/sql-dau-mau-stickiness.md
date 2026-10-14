---
id: sql-dau-mau-stickiness
title: DAU / MAU / stickiness
estimatedMinutes: 12
difficulty: medium
tags: [interview-pattern, engagement, product-analytics]
---

## Why it matters
DAU, MAU and their ratio are the standard engagement metrics. Interviewers ask you to compute them and then probe the definitions: what counts as active, rolling vs calendar month, and how to read the ratio.

## Concept
- **DAU**: distinct active users on a day.
- **MAU**: distinct active users in a month (calendar month, or the trailing 28/30 days).
- **Stickiness** = average DAU / MAU. 0.5 means the typical monthly user shows up about half the days. Social apps aim high (often 0.5 or more); tools used weekly sit around 0.1–0.2.

MAU is **not** the sum of DAU: a user active on 10 days counts 10 times in the DAU sum but once in MAU. Always count distinct users per window.

## Worked example
Average DAU, MAU and stickiness for March:

```sql
WITH march AS (
  SELECT user_id, event_date FROM events
  WHERE event_date >= '2024-03-01' AND event_date < '2024-04-01'
),
daily AS (
  SELECT event_date, COUNT(DISTINCT user_id) AS dau FROM march GROUP BY event_date
)
SELECT ROUND(AVG(dau), 2)                                         AS avg_dau,
       (SELECT COUNT(DISTINCT user_id) FROM march)                AS mau,
       ROUND(AVG(dau) / (SELECT COUNT(DISTINCT user_id) FROM march), 3) AS stickiness
FROM daily;
```

This averages over days that had any activity. If some days had none, decide whether they should count as DAU = 0 (use a date spine).

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Over a 30-day month, DAU was exactly 1,000 every day and MAU was 10,000. What is stickiness, and what does it suggest?",
  "options": ["0.1: the average monthly user is active about 3 days a month", "10: very sticky", "0.1: 10% of users churned", "1.0: everyone returns daily"],
  "answer": 0,
  "explanation": "1,000 / 10,000 = 0.1, roughly 3 active days out of 30 for the typical monthly user."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "For March 2024, return `mau` (distinct active users in March) and `avg_dau` (average of daily distinct users over days with activity, rounded to 2 decimals).",
  "setup": "CREATE TABLE events (user_id INTEGER, event_date TEXT); INSERT INTO events VALUES (1,'2024-02-28'),(1,'2024-03-01'),(1,'2024-03-01'),(2,'2024-03-01'),(3,'2024-03-02'),(1,'2024-03-02'),(2,'2024-03-03'),(4,'2024-03-03'),(5,'2024-03-03'),(1,'2024-04-01');",
  "starterCode": "WITH march AS (\n  SELECT user_id, event_date FROM events\n  WHERE event_date >= '2024-03-01' AND event_date < '2024-04-01'\n)\nSELECT ...",
  "solution": "WITH march AS (\n  SELECT user_id, event_date FROM events\n  WHERE event_date >= '2024-03-01' AND event_date < '2024-04-01'\n),\ndaily AS (\n  SELECT event_date, COUNT(DISTINCT user_id) AS dau\n  FROM march\n  GROUP BY event_date\n)\nSELECT (SELECT COUNT(DISTINCT user_id) FROM march) AS mau,\n       ROUND(AVG(dau), 2) AS avg_dau\nFROM daily;",
  "hints": ["MAU is COUNT(DISTINCT user_id) over the whole month.", "Compute DAU per day in a CTE, then average it."]
}
```

> [!TIP] Interview tips
> - Define "active" explicitly (any event? a meaningful action?); it changes everything downstream.
> - Prefer trailing 28-day MAU for weekly-cycle products; it removes the "short February" effect.
> - Explain how you'd read a drop in stickiness: MAU growth from new users with low engagement is different from existing users disengaging.
