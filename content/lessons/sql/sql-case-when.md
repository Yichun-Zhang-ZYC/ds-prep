---
id: sql-case-when
title: CASE WHEN
estimatedMinutes: 10
difficulty: easy
tags: [basics, case-when, bucketing]
---

## Why it matters
`CASE WHEN` is SQL's if/else. You'll use it to bucket values, clean messy categories, and (in the aggregation lessons) to count several things in one pass. Almost every analytics question needs it somewhere.

## Concept
Two forms do the same job:

```sql
-- Searched CASE: any boolean conditions
CASE
  WHEN amount >= 1000 THEN 'large'
  WHEN amount >= 100  THEN 'medium'
  ELSE 'small'
END

-- Simple CASE: compare one expression to values
CASE country WHEN 'US' THEN 'North America' WHEN 'CA' THEN 'North America' ELSE 'Other' END
```

Rules that matter:
- Conditions are checked **top to bottom** and the first true one wins, so order ranges from most to least specific.
- Without `ELSE`, unmatched rows get `NULL`.
- All branches should return the same type.

## Worked example
Bucket orders by size and count each bucket:

```sql
SELECT CASE
         WHEN amount >= 1000 THEN 'large'
         WHEN amount >= 100  THEN 'medium'
         ELSE 'small'
       END AS size_bucket,
       COUNT(*) AS orders
FROM orders
GROUP BY size_bucket;
```

Grouping by the alias works in SQLite, Postgres, MySQL and BigQuery. In SQL Server you must repeat the `CASE` expression in `GROUP BY`.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "For `amount = 1500`, what does this return?\n\n`CASE WHEN amount >= 100 THEN 'medium' WHEN amount >= 1000 THEN 'large' END`",
  "options": ["'large'", "'medium'", "NULL", "Both labels"],
  "answer": 1,
  "explanation": "The first true condition wins. 1500 >= 100 is true, so 'large' is never reached. Put the most specific condition first."
}
```

```quiz
{
  "id": "q2",
  "question": "A `CASE` expression has no `ELSE`, and no `WHEN` matches. What is the result?",
  "options": ["An error", "An empty string", "NULL", "The value of the last THEN"],
  "answer": 2,
  "explanation": "A missing ELSE is the same as ELSE NULL."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Label each student's `score` as `'A'` (90 or more), `'B'` (80 to 89), `'C'` (70 to 79) or `'F'` (below 70). Return `name` and the label as `grade`.",
  "setup": "CREATE TABLE students (id INTEGER PRIMARY KEY, name TEXT, score INTEGER); INSERT INTO students VALUES (1,'Ana',95),(2,'Ben',82),(3,'Cai',70),(4,'Dee',69),(5,'Eve',90),(6,'Finn',79),(7,'Gia',88);",
  "starterCode": "SELECT name,\n       CASE\n         -- your conditions\n       END AS grade\nFROM students;",
  "solution": "SELECT name,\n       CASE\n         WHEN score >= 90 THEN 'A'\n         WHEN score >= 80 THEN 'B'\n         WHEN score >= 70 THEN 'C'\n         ELSE 'F'\n       END AS grade\nFROM students;",
  "hints": ["Order the conditions from the highest threshold down.", "Everything below 70 can fall into ELSE."]
}
```

> [!TIP] Interview tips
> - Check the boundaries out loud ("is 90 an A or a B?"). Off-by-one buckets are the most common `CASE` bug.
> - Always write an `ELSE`, even if it's `ELSE 'unknown'`. Silent NULLs make later counts wrong.
> - If the same mapping appears in many queries, suggest a small lookup table and a join instead.
