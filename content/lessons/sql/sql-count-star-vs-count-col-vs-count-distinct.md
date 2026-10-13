---
id: sql-count-star-vs-count-col-vs-count-distinct
title: COUNT(*) vs COUNT(col) vs COUNT(DISTINCT col)
estimatedMinutes: 8
difficulty: easy
tags: [aggregation, count, nulls]
---

## Why it matters
"How many users placed an order?" and "how many orders were placed?" are different questions, and the three `COUNT` variants answer different ones. Picking the wrong one is the most common metric bug in interviews.

## Concept
| Expression | Counts |
|---|---|
| `COUNT(*)` | rows |
| `COUNT(col)` | rows where `col` is not NULL |
| `COUNT(DISTINCT col)` | distinct non-NULL values of `col` |

`COUNT(1)` is identical to `COUNT(*)` in every major database. There is no performance difference.

## Worked example

```sql
SELECT COUNT(*)                   AS orders,           -- every order
       COUNT(coupon_code)         AS orders_with_coupon,
       COUNT(DISTINCT customer_id) AS buyers,           -- unique customers
       COUNT(DISTINCT coupon_code) AS coupons_used
FROM orders;
```

A quick data-quality check is `COUNT(*) - COUNT(col)`, which gives the number of missing values in `col`.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Column `x` has values 1, 1, 2, NULL, NULL. What are `COUNT(*)`, `COUNT(x)` and `COUNT(DISTINCT x)`?",
  "options": ["5, 5, 3", "5, 3, 2", "5, 3, 3", "3, 3, 2"],
  "answer": 1,
  "explanation": "5 rows; 3 non-NULL values (1, 1, 2); 2 distinct non-NULL values (1, 2). COUNT(DISTINCT) never counts NULL."
}
```

```quiz
{
  "id": "q2",
  "question": "What does `COUNT(DISTINCT a, b)` do?",
  "options": ["Counts distinct (a, b) pairs in every database", "Is not portable: MySQL supports it, Postgres and SQLite don't", "Counts distinct a plus distinct b", "Is the same as COUNT(*)"],
  "answer": 1,
  "explanation": "Multi-column COUNT(DISTINCT) is a MySQL extension. Portable version: SELECT COUNT(*) FROM (SELECT DISTINCT a, b FROM t) d."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "From `page_views`, return one row with: total views as `views`, views by logged-in users (non-NULL `user_id`) as `logged_in_views`, and the number of unique logged-in users as `unique_users`.",
  "setup": "CREATE TABLE page_views (id INTEGER PRIMARY KEY, user_id INTEGER, page TEXT); INSERT INTO page_views VALUES (1,10,'home'),(2,10,'pricing'),(3,NULL,'home'),(4,11,'home'),(5,NULL,'docs'),(6,12,'pricing'),(7,11,'docs'),(8,10,'home');",
  "starterCode": "SELECT\nFROM page_views;",
  "solution": "SELECT COUNT(*) AS views,\n       COUNT(user_id) AS logged_in_views,\n       COUNT(DISTINCT user_id) AS unique_users\nFROM page_views;",
  "hints": ["Each of the three numbers maps to one COUNT variant."]
}
```

> [!TIP] Interview tips
> - Restate the metric before writing: "unique buyers means `COUNT(DISTINCT customer_id)`".
> - If asked "does `COUNT(1)` beat `COUNT(*)`?", the answer is no; optimizers treat them the same.
> - At scale, exact distinct counts are expensive. HyperLogLog-based `APPROX_COUNT_DISTINCT` trades about 1% error for big speedups.
