---
id: sql-funnel-conversion
title: Funnel conversion
estimatedMinutes: 15
difficulty: medium
tags: [interview-pattern, funnel, conditional-aggregation]
---

## Why it matters
"Where do users drop off between viewing a product and paying?" Funnel queries are a core product-analytics question, and the details (order of steps, time windows, unique users) separate good answers from sloppy ones.

## Concept
A funnel counts **users** who reach each step, usually requiring steps in order:

1. Reduce events to one row per user with the **first time** they did each step (conditional `MIN`).
2. Count users at each step, requiring each step to happen after the previous one.
3. Conversion between steps = users at step k / users at step k−1.

Decide up front: must steps be in order? Within one session or any time? Counting users or sessions?

## Worked example
View → cart → purchase funnel with ordered steps:

```sql
WITH firsts AS (
  SELECT user_id,
         MIN(CASE WHEN event = 'view'     THEN ts END) AS t_view,
         MIN(CASE WHEN event = 'cart'     THEN ts END) AS t_cart,
         MIN(CASE WHEN event = 'purchase' THEN ts END) AS t_purchase
  FROM events
  GROUP BY user_id
)
SELECT COUNT(t_view)                                                  AS viewed,
       COUNT(CASE WHEN t_cart > t_view THEN 1 END)                    AS carted,
       COUNT(CASE WHEN t_purchase > t_cart AND t_cart > t_view THEN 1 END) AS purchased
FROM firsts;
```

Comparisons with NULL are unknown, so a user who never carted can't count as carted or purchased. That's the behavior we want.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "1,000 users viewed, 300 added to cart, 90 purchased. What is cart-to-purchase conversion?",
  "options": ["9%", "30%", "90%", "300%"],
  "answer": 1,
  "explanation": "90 / 300 = 30%. Overall view-to-purchase conversion is 90 / 1,000 = 9%."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Return one row with the number of users who `viewed`, who `carted` **after** viewing, and who `purchased` **after** carting (and after viewing). Use each user's first time per step.",
  "setup": "CREATE TABLE events (user_id INTEGER, event TEXT, ts TEXT); INSERT INTO events VALUES (1,'view','2024-05-01 10:00'),(1,'cart','2024-05-01 10:05'),(1,'purchase','2024-05-01 10:09'),(2,'view','2024-05-01 11:00'),(2,'cart','2024-05-01 11:30'),(3,'view','2024-05-01 12:00'),(4,'cart','2024-05-01 09:00'),(4,'view','2024-05-01 09:10'),(4,'purchase','2024-05-01 09:20'),(5,'view','2024-05-02 08:00'),(5,'view','2024-05-02 08:30'),(5,'cart','2024-05-02 08:40'),(5,'purchase','2024-05-02 08:50');",
  "starterCode": "WITH firsts AS (\n  SELECT user_id,\n         MIN(CASE WHEN event = 'view' THEN ts END) AS t_view\n  FROM events\n  GROUP BY user_id\n)\nSELECT ...",
  "solution": "WITH firsts AS (\n  SELECT user_id,\n         MIN(CASE WHEN event = 'view' THEN ts END) AS t_view,\n         MIN(CASE WHEN event = 'cart' THEN ts END) AS t_cart,\n         MIN(CASE WHEN event = 'purchase' THEN ts END) AS t_purchase\n  FROM events\n  GROUP BY user_id\n)\nSELECT COUNT(t_view) AS viewed,\n       COUNT(CASE WHEN t_cart > t_view THEN 1 END) AS carted,\n       COUNT(CASE WHEN t_purchase > t_cart AND t_cart > t_view THEN 1 END) AS purchased\nFROM firsts;",
  "hints": ["Get each user's first timestamp per step with MIN(CASE ...).", "User 4 carted before viewing, so they shouldn't count as carted."]
}
```

> [!TIP] Interview tips
> - State your assumptions (ordered steps, user-level, any time window) before writing SQL.
> - Report both step-to-step and top-to-bottom conversion; they tell different stories.
> - Follow-up: "where would you look for the biggest drop?" Segment the worst step by device, source and new vs returning users.
