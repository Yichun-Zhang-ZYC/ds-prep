---
id: analytics-bi-conversion-funnels
title: Conversion funnels
estimatedMinutes: 12
difficulty: medium
tags: [business-metrics, funnel, conversion, sql, interview-pattern]
---

## Why it matters
Funnels show where users drop off on the way to a goal such as purchase or signup. Interviewers ask you to define steps, compute step and overall conversion in SQL, and explain how to diagnose and improve the biggest leak.

## Concept
A **funnel** is an ordered sequence of steps (view → add to cart → checkout → purchase). For each step count the users (or sessions) who reached it.

- **Step conversion** $= \dfrac{\text{users at step } k}{\text{users at step } k-1}$.
- **Overall conversion** $= \dfrac{\text{users at last step}}{\text{users at first step}}$, the product of the step rates.
- **Drop-off** $= 1 - \text{step conversion}$. The step with the largest *absolute* user loss is usually the best optimization target.

**Design decisions** (state them explicitly):
- **Unit**: users vs sessions. Session funnels measure the flow; user funnels include returning later.
- **Strict vs loose ordering**: must the steps happen in order? Strict funnels require each step's first timestamp to come after the previous one's.
- **Conversion window**: e.g. purchase within 7 days of the first view.
- **Entry cohort**: only users who hit step 1 count; a user who purchases without a view is excluded (or flagged as a tracking issue).

**SQL pattern**: aggregate to one row per user with the first time of each step (`MIN(CASE WHEN event = ... THEN ts END)`), then count the users who satisfy the ordering conditions. Avoid counting events: a user viewing 5 times is one user.

**Diagnosing**: segment by device, channel, country and new vs returning; compare time-to-convert; look for technical errors at the leaky step; then run an A/B test on the fix. Watch for Simpson's paradox when channel mix changes.

## Worked example
Funnel for 5 viewers: 3 add to cart, 1 purchases (in order).

| Step | Users | Step conversion | Overall |
|---|---|---|---|
| View | 5 | n/a | 100% |
| Cart | 3 | $3/5 = 60\%$ | 60% |
| Purchase | 1 | $1/3 \approx 33\%$ | 20% |

Overall $= 0.6 \times 0.333 = 20\%$. The biggest *relative* leak is cart to purchase (67% drop), though both steps lose 2 users in absolute terms. With larger numbers, prioritize by absolute lost users times the expected value of fixing the step.

Query shape:

```sql
WITH u AS (
  SELECT user_id,
         MIN(CASE WHEN event = 'view' THEN ts END) AS v,
         MIN(CASE WHEN event = 'cart' THEN ts END) AS c,
         MIN(CASE WHEN event = 'purchase' THEN ts END) AS p
  FROM events GROUP BY user_id
)
SELECT COUNT(v) AS viewers,
       COUNT(CASE WHEN c >= v THEN 1 END) AS carted,
       COUNT(CASE WHEN c >= v AND p > c THEN 1 END) AS purchased
FROM u;
```

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A funnel has 10,000 / 4,000 / 1,000 users across three steps. What are the step and overall conversion rates?",
  "options": [
    "40%, 25%; overall 10%",
    "40%, 25%; overall 65%",
    "60%, 75%; overall 10%",
    "4%, 1%; overall 5%"
  ],
  "answer": 0,
  "explanation": "Step rates: 4,000/10,000 = 40% and 1,000/4,000 = 25%. Overall = 1,000/10,000 = 10% = 0.4 × 0.25."
}
```

```quiz
{
  "id": "q2",
  "question": "Why count distinct users (or first timestamps per user) rather than events at each funnel step?",
  "options": [
    "Events are not stored",
    "A user with many events at one step would inflate that step and can produce a step rate above 100%",
    "Distinct counts are always larger",
    "SQL cannot count events"
  ],
  "answer": 1,
  "explanation": "Funnels measure how many entities progress. Repeated events by the same user must be collapsed to one."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Table `events(user_id, event, ts)` has events 'view', 'cart' and 'purchase' with integer timestamps. Build a strict funnel: a user is a *viewer* if they have a view; *carted* if their first cart is at or after their first view; *purchased* if they are carted and their first purchase is after their first cart. Return one row: `viewers`, `carted`, `purchased`, `cart_rate` (carted / viewers) and `purchase_rate` (purchased / carted), both rounded to 2 decimals.",
  "setup": "CREATE TABLE events (user_id INTEGER, event TEXT, ts INTEGER); INSERT INTO events VALUES (1,'view',1),(1,'cart',2),(1,'purchase',3),(2,'view',1),(2,'cart',2),(3,'view',1),(4,'cart',1),(4,'purchase',2),(5,'view',5),(5,'purchase',6),(6,'view',1),(6,'purchase',4),(6,'cart',5),(1,'view',9);",
  "starterCode": "WITH u AS (\n  SELECT user_id,\n         MIN(CASE WHEN event = 'view' THEN ts END) AS v\n         -- add c and p\n  FROM events\n  GROUP BY user_id\n)\nSELECT ...",
  "solution": "WITH u AS (\n  SELECT user_id,\n         MIN(CASE WHEN event = 'view' THEN ts END) AS v,\n         MIN(CASE WHEN event = 'cart' THEN ts END) AS c,\n         MIN(CASE WHEN event = 'purchase' THEN ts END) AS p\n  FROM events\n  GROUP BY user_id\n),\ncounts AS (\n  SELECT COUNT(v) AS viewers,\n         COUNT(CASE WHEN c >= v THEN 1 END) AS carted,\n         COUNT(CASE WHEN c >= v AND p > c THEN 1 END) AS purchased\n  FROM u\n)\nSELECT viewers, carted, purchased,\n       ROUND(1.0 * carted / viewers, 2) AS cart_rate,\n       ROUND(1.0 * purchased / carted, 2) AS purchase_rate\nFROM counts;",
  "hints": [
    "Compute each user's first view, cart and purchase time with MIN(CASE WHEN ...) and GROUP BY user_id.",
    "Comparisons with NULL are not true, so users without a view or cart drop out of the later counts automatically."
  ]
}
```

> [!TIP] Interview tips
> - Specify unit (user vs session), ordering (strict vs loose) and conversion window before writing SQL.
> - Report both step and overall conversion, and prioritize the leak by absolute users lost times fix value, not by percentage alone.
> - Mention validating the funnel: users who skip a step usually indicate tracking gaps, not behavior.
