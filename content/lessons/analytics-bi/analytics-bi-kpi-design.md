---
id: analytics-bi-kpi-design
title: KPI design
estimatedMinutes: 10
difficulty: easy
tags: [analytics, kpi, north-star, metrics]
---

## Why it matters

"What would you track to know whether this product is healthy?" Choosing and defining KPIs is the first step of every analytics role; a vague or gameable KPI misdirects a whole team.

## Concept

A **metric** is any measurement; a **KPI** is a metric tied to a goal, with an owner, a target and a review cadence.

**Structure**: one **North Star** (the outcome that best captures value delivered) → **input metrics** (drivers the team can move) → **guardrails** (counter-metrics that must not degrade). Example: North Star weekly active teams; inputs activation rate, invites sent; guardrails support tickets per 100 signups.

**Good KPI checklist**:
- **Tied to a decision**: if it moves, someone knows what to do.
- **Precisely defined**: numerator, denominator, population, time window, exclusions (bots, test accounts), time zone.
- **Leading vs lagging**: revenue and renewal lag; early usage leads. Track both.
- **Rate vs count**: rates normalise for size, counts show scale. Don't judge growth only on a ratio whose denominator shrinks.
- **Hard to game**: Goodhart's law says a measure that becomes a target stops being a good measure. Add guardrails.
- **Targets**: state baseline, target, deadline and a red/amber/green threshold.

Keep the list short: 3-7 KPIs per team. Everything else is a diagnostic metric.

## Worked example

Goal: improve onboarding. **KPI**: 7-day activation rate = signups who create a project within 7 days / signups, cohorted by signup month. In January 400 users signed up and 140 activated, so $140/400 = 35\%$. Target: 40% by Q3.

- **Inputs**: % who verify email in 1 day, % who finish the setup checklist.
- **Guardrails**: 30-day retention (activation pushes that create junk projects won't help it) and tickets per 100 signups.
- **Pitfall**: counting activation among *all* users, not the signup cohort, mixes old and new users and hides trends.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which metric is the best leading indicator for annual renewal rate?",
  "options": [
    "Annual renewal rate itself",
    "Quarterly revenue",
    "Weekly use of a key feature in the first 90 days",
    "Number of employees at the customer"
  ],
  "answer": 2,
  "explanation": "Leading indicators move before the outcome and are actionable. Renewal and revenue are lagging; early product usage predicts renewal and can be influenced."
}
```

```quiz
{
  "id": "q2",
  "question": "Support agents are rewarded on tickets closed per hour, and customer satisfaction falls. Which principle is this?",
  "options": [
    "Simpson's paradox",
    "Goodhart's law",
    "Survivorship bias",
    "Regression to the mean"
  ],
  "answer": 1,
  "explanation": "When a measure becomes a target it stops being a good measure. Pair KPIs with guardrail (counter) metrics such as CSAT or reopen rate."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Define the KPI **7-day activation rate**: the share of users who create a project (`project_created`) within 7 days of signup (day 0 to day 7 inclusive), grouped by signup month. Return `signup_month` (YYYY-MM), `users`, `activated` and `activation_rate` rounded to 4 decimals. Users with no qualifying event stay in the denominator.",
  "setup": "CREATE TABLE users (user_id INTEGER, signup_date TEXT); INSERT INTO users VALUES (1,'2024-01-05'),(2,'2024-01-20'),(3,'2024-01-28'),(4,'2024-02-02'),(5,'2024-02-10'),(6,'2024-02-25'); CREATE TABLE events (user_id INTEGER, event TEXT, ts TEXT); INSERT INTO events VALUES (1,'project_created','2024-01-06 10:00'),(1,'project_created','2024-01-07 11:00'),(1,'login','2024-01-05 09:00'),(2,'login','2024-01-20 08:00'),(2,'project_created','2024-01-29 12:00'),(3,'login','2024-01-28 09:00'),(3,'project_created','2024-01-28 09:30'),(4,'project_created','2024-02-08 15:00'),(5,'login','2024-02-10 10:00'),(6,'project_created','2024-03-05 10:00');",
  "starterCode": "SELECT substr(u.signup_date, 1, 7) AS signup_month,\n       COUNT(DISTINCT u.user_id) AS users\nFROM users u\n-- join the qualifying events here\nGROUP BY 1;",
  "solution": "SELECT substr(u.signup_date, 1, 7) AS signup_month,\n       COUNT(DISTINCT u.user_id) AS users,\n       COUNT(DISTINCT e.user_id) AS activated,\n       ROUND(1.0 * COUNT(DISTINCT e.user_id) / COUNT(DISTINCT u.user_id), 4) AS activation_rate\nFROM users u\nLEFT JOIN events e\n  ON e.user_id = u.user_id\n AND e.event = 'project_created'\n AND date(e.ts) BETWEEN u.signup_date AND date(u.signup_date, '+7 days')\nGROUP BY substr(u.signup_date, 1, 7);",
  "orderMatters": false,
  "hints": [
    "LEFT JOIN so non-activated users stay in the denominator; put the event and time-window conditions in the ON clause, not in WHERE.",
    "Count DISTINCT user ids so a user with two projects counts once."
  ]
}
```

> [!TIP] Interview tips
> - Structure the answer: goal → North Star → inputs → guardrails, then give the exact definition of one metric.
> - Follow-up: "How could this KPI be gamed?" Name the failure mode and the counter-metric.
> - Pitfall: vanity metrics (total signups, page views) that only go up and drive no decision.
