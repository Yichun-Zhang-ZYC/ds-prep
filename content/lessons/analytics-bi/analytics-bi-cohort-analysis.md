---
id: analytics-bi-cohort-analysis
title: Cohort analysis
estimatedMinutes: 14
difficulty: medium
tags: [business-metrics, cohorts, retention, sql, interview-pattern]
---

## Why it matters
Cohort analysis separates "the product is getting worse" from "we acquired a different mix of users". It is a staple of product analytics interviews, usually as a SQL task that builds a retention triangle.

## Concept
A **cohort** is a group of users sharing a starting event in the same period (signup month, first purchase week, acquisition channel). **Cohort analysis** tracks each cohort's behavior as a function of **age** (periods since the start), not calendar time.

**Retention triangle**: rows = cohorts, columns = month 0, 1, 2, …, cells = active users or % of cohort size. Month 0 is 100% by construction. Recent cohorts have fewer columns (right-censored), giving the triangle shape.

**How to read it**:
- **Down a column**: is month-1 retention improving for newer cohorts? (product or acquisition quality changes)
- **Across a row**: the retention curve shape; healthy products flatten at a non-zero plateau.
- **Along the diagonal**: calendar-time effects (an outage or seasonal spike hits all cohorts at once).

**Types**: acquisition cohorts (by start date) vs **behavioral** cohorts (by an action, e.g. used feature X in week 1). Compare behavioral cohorts carefully: engaged users self-select into the behavior (correlation, not causation).

**Pitfalls**:
- **Age alignment**: compute periods since cohort start, not raw month number.
- **Distinct users**: count each user once per period.
- **Immature cohorts**: don't compare an incomplete current month with finished ones.
- **Mix shifts**: blended retention can fall merely because more users come from a low-retention channel; cohort-by-channel shows it.

**SQL pattern**: user's cohort = month of signup; age = months between activity and signup; `COUNT(DISTINCT user_id)` grouped by cohort and age; divide by cohort size.

## Worked example
Five users: users 1-3 signed up in January, 4-5 in February. Active months after signup:

| Cohort | Size | Month 0 | Month 1 | Month 2 |
|---|---|---|---|---|
| 2024-01 | 3 | 3 (100%) | 2 (67%) | 1 (33%) |
| 2024-02 | 2 | 2 (100%) | 1 (50%) | n/a |

February's month-1 retention (50%) is lower than January's (67%), but with 2 users that gap is noise; with real volumes you would test it. Month 2 for the February cohort doesn't exist yet: that is censoring, not zero.

Age computation in SQLite: `(year(activity) * 12 + month(activity)) - (year(signup) * 12 + month(signup))`. Counting `DISTINCT user_id` matters because a user active twice in one month would otherwise count twice.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Month-1 retention is 40% for every cohort, but overall monthly retention fell from 40% to 30% over a year. What is the most likely explanation?",
  "options": [
    "Cohort retention secretly worsened",
    "A growing share of users is in younger cohorts or low-retention channels (mix and age effect)",
    "A calculation bug is the only possibility",
    "Retention always decays over time"
  ],
  "answer": 1,
  "explanation": "Blended retention depends on the age and channel mix of the active base. Cohort curves hold age constant, so identical cohort curves point to a mix shift."
}
```

```quiz
{
  "id": "q2",
  "question": "Which is a pitfall when comparing the March cohort to the January cohort at month 2 on April 10?",
  "options": [
    "March has not had a full month 2 yet, so its month-2 value is incomplete",
    "January users are always better",
    "Month 2 cannot be computed for any cohort",
    "There is no pitfall"
  ],
  "answer": 0,
  "explanation": "March's month 2 is May, which has not happened. Even a partial month would understate retention versus complete cohorts."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Tables `users(user_id, signup_date)` and `activity(user_id, activity_date)` (ISO dates). Build a monthly retention table: for each signup-month cohort ('YYYY-MM') and month_number (months between activity month and signup month, 0 = signup month) return `cohort_month`, `month_number`, `active_users` (distinct users active in that month) and `retention` (active_users / cohort size, rounded to 2 decimals). Order by cohort_month, then month_number.",
  "setup": "CREATE TABLE users (user_id INTEGER, signup_date TEXT); INSERT INTO users VALUES (1,'2024-01-05'),(2,'2024-01-10'),(3,'2024-01-20'),(4,'2024-02-02'),(5,'2024-02-15'); CREATE TABLE activity (user_id INTEGER, activity_date TEXT); INSERT INTO activity VALUES (1,'2024-01-06'),(1,'2024-02-03'),(1,'2024-02-10'),(1,'2024-03-01'),(2,'2024-01-11'),(2,'2024-02-20'),(3,'2024-01-21'),(4,'2024-02-03'),(4,'2024-03-10'),(5,'2024-02-16');",
  "starterCode": "WITH a AS (\n  SELECT u.user_id,\n         strftime('%Y-%m', u.signup_date) AS cohort_month,\n         0 AS month_number  -- replace with the real month difference\n  FROM users u\n  JOIN activity x ON x.user_id = u.user_id\n)\nSELECT ...",
  "solution": "WITH a AS (\n  SELECT u.user_id,\n         strftime('%Y-%m', u.signup_date) AS cohort_month,\n         (CAST(strftime('%Y', x.activity_date) AS INTEGER) * 12 + CAST(strftime('%m', x.activity_date) AS INTEGER))\n         - (CAST(strftime('%Y', u.signup_date) AS INTEGER) * 12 + CAST(strftime('%m', u.signup_date) AS INTEGER)) AS month_number\n  FROM users u\n  JOIN activity x ON x.user_id = u.user_id\n),\nsizes AS (\n  SELECT strftime('%Y-%m', signup_date) AS cohort_month, COUNT(*) AS n\n  FROM users\n  GROUP BY 1\n)\nSELECT a.cohort_month, a.month_number,\n       COUNT(DISTINCT a.user_id) AS active_users,\n       ROUND(1.0 * COUNT(DISTINCT a.user_id) / s.n, 2) AS retention\nFROM a\nJOIN sizes s ON s.cohort_month = a.cohort_month\nGROUP BY a.cohort_month, a.month_number\nORDER BY a.cohort_month, a.month_number;",
  "orderMatters": true,
  "hints": [
    "Month difference = (year * 12 + month of activity) - (year * 12 + month of signup); use strftime and CAST.",
    "Count DISTINCT users (user 1 is active twice in February) and divide by the cohort size from a separate CTE."
  ]
}
```

> [!TIP] Interview tips
> - Define the cohort (start event and period) and the age unit first, then describe how you read the triangle: columns, rows, diagonals.
> - Always count distinct users, align by age, and flag right-censored cells rather than treating them as zero.
> - When blended retention moves, check cohort curves by channel to separate mix shift from real product change.
