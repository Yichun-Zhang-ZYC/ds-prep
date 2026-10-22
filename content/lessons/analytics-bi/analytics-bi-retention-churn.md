---
id: analytics-bi-retention-churn
title: Retention, churn
estimatedMinutes: 12
difficulty: medium
tags: [business-metrics, retention, churn, sql, interview-pattern]
---

## Why it matters
Retention is the metric most tied to long-term growth. Interviewers ask you to define churn precisely, compute it in SQL from an activity table, and explain why a small change in churn matters so much.

## Concept
**Definitions** (always specify the period and the denominator):
- **Retention rate** $= \dfrac{\text{users from the starting population still active at the end}}{\text{starting population}}$.
- **Churn rate** $= 1 - \text{retention}$ for the same population.
- **Types**: **N-day retention** (active exactly on day N after signup), **rolling or unbounded retention** (active on or after day N), **bracket retention** (active within a window). The numbers differ a lot; name which you use.
- **Customer vs revenue churn**: **net revenue retention** (NRR) includes expansion, so it can exceed 100% while logo churn is positive.
- **Subscription vs engagement churn**: contractual (cancellation date known) vs non-contractual (inactive for $X$ days, an arbitrary threshold; pick it from the activity gap distribution).

**Why it matters**: with constant monthly churn $c$, expected lifetime is $1/c$. Moving churn from 5% to 4% raises lifetime from 20 to 25 months, a 25% LTV gain. Retention curves should flatten; a curve that keeps falling to zero signals no core user base.

**Computing churn in SQL**: take the starting population (active in month $m$), left join to activity in month $m+1$, and count users with no match. Be careful with:
- Counting users *distinctly*; multiple events per user.
- Users who return later (resurrected) are still churned in the interim month.
- New users acquired in month $m+1$ are not part of the starting population.

**Reading drops**: separate new-user retention (onboarding problem) from existing-user retention (product or market problem), and segment by channel, platform and plan.

## Worked example
Monthly active users: January {1, 2, 3, 4, 5}; February {1, 2, 4, 6}.

- Starting population (Jan) = 5 users.
- Retained in Feb = {1, 2, 4} = 3. User 6 is new, so ignore it.
- Retention $= 3/5 = 60\%$, churn $= 2/5 = 40\%$ (users 3 and 5).

```sql
SELECT COUNT(*) AS jan_users,
       COUNT(f.user_id) AS retained,
       ROUND(1.0 * (COUNT(*) - COUNT(f.user_id)) / COUNT(*), 2) AS churn_rate
FROM monthly_active j
LEFT JOIN monthly_active f
  ON f.user_id = j.user_id AND f.month = '2024-02'
WHERE j.month = '2024-01';
```

`COUNT(f.user_id)` counts only matched rows, so the difference gives churned users. Using `WHERE f.month = ...` would turn the left join into an inner join and silently drop the churned users.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Monthly churn falls from 5% to 4%. By roughly how much does expected customer lifetime (1 / churn) increase?",
  "options": [
    "1%",
    "5 months, or 25%",
    "20%",
    "It stays the same"
  ],
  "answer": 1,
  "explanation": "Lifetime goes from 1/0.05 = 20 months to 1/0.04 = 25 months, +5 months (+25%), and LTV rises proportionally."
}
```

```quiz
{
  "id": "q2",
  "question": "Your churn query LEFT JOINs January users to February activity but adds `WHERE feb.month = '2024-02'`. What happens?",
  "options": [
    "Nothing, the result is identical",
    "Churned users are filtered out, so churn is always reported as 0",
    "Retained users are double counted",
    "The query errors"
  ],
  "answer": 1,
  "explanation": "Filtering the right table in WHERE removes the NULL-extended rows (the churned users). Put the condition in the ON clause."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Table `monthly_active(user_id, month)` lists the users active in each month ('YYYY-MM'). Return one row with `jan_users` (users active in 2024-01), `retained` (of those, users also active in 2024-02) and `churn_rate` (share of January users not active in February, rounded to 2 decimals).",
  "setup": "CREATE TABLE monthly_active (user_id INTEGER, month TEXT); INSERT INTO monthly_active VALUES (1,'2024-01'),(2,'2024-01'),(3,'2024-01'),(4,'2024-01'),(5,'2024-01'),(1,'2024-02'),(2,'2024-02'),(4,'2024-02'),(6,'2024-02'),(1,'2024-03'),(3,'2024-03');",
  "starterCode": "SELECT ...\nFROM monthly_active j\nLEFT JOIN monthly_active f\n  ON ...",
  "solution": "SELECT COUNT(*) AS jan_users,\n       COUNT(f.user_id) AS retained,\n       ROUND(1.0 * (COUNT(*) - COUNT(f.user_id)) / COUNT(*), 2) AS churn_rate\nFROM monthly_active j\nLEFT JOIN monthly_active f\n  ON f.user_id = j.user_id AND f.month = '2024-02'\nWHERE j.month = '2024-01';",
  "hints": [
    "LEFT JOIN February rows on the same user_id; put the month condition in ON.",
    "COUNT(f.user_id) ignores NULLs, so it counts retained users; use 1.0 * to avoid integer division."
  ]
}
```

> [!TIP] Interview tips
> - Define retention with its period, denominator and type (N-day vs rolling) before computing anything.
> - Show that a one-point churn change moves lifetime and LTV a lot ($1/c$), which is why retention beats acquisition tweaks.
> - Watch the LEFT JOIN trap: filter the right table in ON, not WHERE; and exclude new users from the starting population.
