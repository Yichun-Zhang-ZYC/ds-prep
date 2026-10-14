---
id: sql-retention-and-cohort-analysis
title: Retention and cohort analysis
estimatedMinutes: 18
difficulty: hard
tags: [interview-pattern, retention, cohorts, product-analytics]
---

## Why it matters
Retention is the metric product teams care about most, and "build a cohort retention table" is a signature DS/DA interview question. It combines date bucketing, joins and conditional counting.

## Concept
- A **cohort** is a group of users who started in the same period (e.g. signup month).
- **Retention in period N** = share of the cohort that was active N periods after joining.
- The query has three parts: assign each user a cohort, compute each activity's period offset from the cohort, then count distinct users per (cohort, offset) and divide by cohort size.

Definitions to agree on first: what counts as "active", whether period 0 is the signup period, and calendar months vs 30-day windows.

## Worked example
Monthly cohort retention table (SQLite date math):

```sql
WITH cohorts AS (
  SELECT id AS user_id, strftime('%Y-%m', signup_date) AS cohort
  FROM users
),
activity_months AS (
  SELECT DISTINCT user_id, strftime('%Y-%m', activity_date) AS month
  FROM activity
),
offsets AS (
  SELECT c.cohort, c.user_id,
         (CAST(substr(a.month, 1, 4) AS INT) * 12 + CAST(substr(a.month, 6, 2) AS INT))
       - (CAST(substr(c.cohort, 1, 4) AS INT) * 12 + CAST(substr(c.cohort, 6, 2) AS INT)) AS month_n
  FROM cohorts c
  JOIN activity_months a ON a.user_id = c.user_id
)
SELECT cohort, month_n, COUNT(DISTINCT user_id) AS active_users
FROM offsets
GROUP BY cohort, month_n
ORDER BY cohort, month_n;
```

Divide `active_users` by the cohort size (the count at `month_n = 0`, or from `cohorts`) to get retention rates. In Postgres the offset is simpler: `DATE_PART('month', AGE(month, cohort))` plus 12 × years.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why use `COUNT(DISTINCT user_id)` instead of `COUNT(*)` when counting retained users?",
  "options": ["It's faster", "A user can have many activity rows in the same month", "COUNT(*) ignores NULLs", "It's required with GROUP BY"],
  "answer": 1,
  "explanation": "Retention counts users, not events. Deduplicate to one row per user per period."
}
```

```quiz
{
  "id": "q2",
  "question": "The January cohort has 200 users; 50 of them were active in March. What is month-2 retention for the January cohort?",
  "options": ["25%", "50 users", "2.5%", "Depends on February"],
  "answer": 0,
  "explanation": "50 / 200 = 25%. Classic retention doesn't require being active in every month in between; that would be 'rolling' or 'unbounded' retention."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "For each signup month `cohort` (`'YYYY-MM'`), return the cohort size as `cohort_size` and the number of those users who were active in the **following calendar month** as `retained_m1`.",
  "setup": "CREATE TABLE users (id INTEGER PRIMARY KEY, signup_date TEXT); CREATE TABLE activity (user_id INTEGER, activity_date TEXT); INSERT INTO users VALUES (1,'2024-01-05'),(2,'2024-01-20'),(3,'2024-01-31'),(4,'2024-02-03'),(5,'2024-02-14'); INSERT INTO activity VALUES (1,'2024-01-06'),(1,'2024-02-10'),(1,'2024-02-11'),(2,'2024-03-02'),(3,'2024-02-01'),(4,'2024-03-15'),(5,'2024-02-20');",
  "starterCode": "WITH cohorts AS (\n  SELECT id AS user_id, strftime('%Y-%m', signup_date) AS cohort\n  FROM users\n)\nSELECT ...",
  "solution": "WITH cohorts AS (\n  SELECT id AS user_id, strftime('%Y-%m', signup_date) AS cohort\n  FROM users\n),\nactive AS (\n  SELECT DISTINCT user_id, strftime('%Y-%m', activity_date) AS month\n  FROM activity\n)\nSELECT c.cohort,\n       COUNT(DISTINCT c.user_id) AS cohort_size,\n       COUNT(DISTINCT CASE WHEN a.month = strftime('%Y-%m', date(c.cohort || '-01', '+1 month')) THEN c.user_id END) AS retained_m1\nFROM cohorts c\nLEFT JOIN active a ON a.user_id = c.user_id\nGROUP BY c.cohort;",
  "hints": ["The next month of cohort 'YYYY-MM' is strftime('%Y-%m', date(cohort || '-01', '+1 month')).", "LEFT JOIN activity so users with no activity still count in cohort_size; count retained users with COUNT(DISTINCT CASE ... END)."]
}
```

> [!TIP] Interview tips
> - Spend the first minute on definitions: active event, period, period 0, and whether the latest cohorts are complete.
> - Point out that recent cohorts have fewer observed periods; don't compare month-6 retention for a cohort that's 2 months old.
> - Follow-ups: "retention curve flattening" (habit formation), and N-day retention (`activity_date = signup_date + N`).
