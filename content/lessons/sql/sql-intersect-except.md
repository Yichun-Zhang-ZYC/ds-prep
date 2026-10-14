---
id: sql-intersect-except
title: INTERSECT, EXCEPT
estimatedMinutes: 8
difficulty: easy
tags: [set-operations, intersect, except]
---

## Why it matters
"Users active in both January and February" and "users active in January but not February" can be one-liners with set operations. Knowing them gives you a quick, readable answer, plus a way to diff two query results.

## Concept
| Operation | Returns |
|---|---|
| `A INTERSECT B` | distinct rows that appear in both A and B |
| `A EXCEPT B` | distinct rows in A that don't appear in B (`MINUS` in Oracle) |

Like `UNION`, they compare **whole rows** and need matching columns. Unlike `NOT IN`, they treat NULLs as equal, so they're NULL-safe.

`INTERSECT ALL` / `EXCEPT ALL` (keep duplicates) exist in Postgres but not everywhere.

## Worked example
Retained and churned users between two months:

```sql
-- active in both months
SELECT user_id FROM activity WHERE month = '2024-01'
INTERSECT
SELECT user_id FROM activity WHERE month = '2024-02';

-- active in January, gone in February
SELECT user_id FROM activity WHERE month = '2024-01'
EXCEPT
SELECT user_id FROM activity WHERE month = '2024-02';
```

`EXCEPT` is also a handy test: `old_query EXCEPT new_query` (and the reverse) should both be empty when a refactor didn't change results.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A returns user_ids {1, 2, 3, 3} and B returns {3, 4}. What does `A EXCEPT B` return?",
  "options": ["{1, 2}", "{1, 2, 3}", "{1, 2, 4}", "{4}"],
  "answer": 0,
  "explanation": "EXCEPT returns distinct rows of A not found in B: 1 and 2."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Return the `user_id` of users who were active in `2024-01` but **not** in `2024-02`.",
  "setup": "CREATE TABLE activity (user_id INTEGER, month TEXT); INSERT INTO activity VALUES (1,'2024-01'),(2,'2024-01'),(3,'2024-01'),(3,'2024-01'),(1,'2024-02'),(4,'2024-02'),(5,'2024-01'),(5,'2024-03');",
  "starterCode": "SELECT user_id FROM activity WHERE month = '2024-01'\n",
  "solution": "SELECT user_id FROM activity WHERE month = '2024-01'\nEXCEPT\nSELECT user_id FROM activity WHERE month = '2024-02';",
  "hints": ["Subtract February's users from January's."]
}
```

> [!TIP] Interview tips
> - Offer `EXCEPT` as the short answer and `NOT EXISTS` as the version that also lets you return extra columns.
> - Mention that set operations deduplicate; if you need counts, use joins or `EXISTS`.
> - Suggest `EXCEPT` both ways for regression-testing a rewritten query.
