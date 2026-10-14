---
id: sql-duplicates-detection-and-dedup
title: Duplicates detection and dedup
estimatedMinutes: 12
difficulty: medium
tags: [interview-pattern, data-quality, row-number]
---

## Why it matters
Pipelines double-load data, users sign up twice, events get retried. "Find the duplicates" and "keep only the latest record per key" are standard data-quality questions in DS, DA and DE interviews.

## Concept
First decide what "duplicate" means: the **same key** (e.g. same email) or the **same whole row**.

Detect duplicates by key:

```sql
SELECT email, COUNT(*) AS n
FROM users
GROUP BY email
HAVING COUNT(*) > 1;
```

Keep one row per key with `ROW_NUMBER` and a rule for which one wins (latest, earliest, most complete):

```sql
WITH ranked AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY email ORDER BY updated_at DESC, id DESC) AS rn
  FROM users
)
SELECT * FROM ranked WHERE rn = 1;
```

Exact duplicates of the whole row can be removed with `SELECT DISTINCT *`, but key-based dedup with an explicit tie-breaker is what interviews usually want.

## Worked example
Delete duplicates in place, keeping the newest row per email (works in Postgres and SQLite):

```sql
DELETE FROM users
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY LOWER(email) ORDER BY updated_at DESC, id DESC) AS rn
    FROM users
  ) t
  WHERE rn > 1
);
```

Normalizing the key (`LOWER`, `TRIM`) catches duplicates that differ only by case or whitespace.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why add `id DESC` after `updated_at DESC` inside ROW_NUMBER?",
  "options": ["It makes the query faster", "It breaks ties so the same row wins every time", "ROW_NUMBER requires two columns", "To sort the final output"],
  "answer": 1,
  "explanation": "If two rows share the same updated_at, the order between them is undefined. A unique tie-breaker makes the dedup deterministic."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "The `customers` table has duplicate emails (case may differ). Keep **one row per lower-cased email: the most recently updated** one. Return `email` (lower-cased) and `name`.",
  "setup": "CREATE TABLE customers (id INTEGER PRIMARY KEY, email TEXT, name TEXT, updated_at TEXT); INSERT INTO customers VALUES (1,'ana@x.com','Ana','2024-01-01'),(2,'ANA@x.com','Ana S.','2024-03-01'),(3,'ben@x.com','Ben','2024-02-01'),(4,'cai@x.com','Cai','2024-01-15'),(5,'cai@x.com','Cai Li','2024-01-10'),(6,'dee@x.com','Dee','2024-04-01');",
  "starterCode": "SELECT LOWER(email) AS email, name\nFROM customers;",
  "solution": "WITH ranked AS (\n  SELECT LOWER(email) AS email, name,\n         ROW_NUMBER() OVER (PARTITION BY LOWER(email) ORDER BY updated_at DESC, id DESC) AS rn\n  FROM customers\n)\nSELECT email, name\nFROM ranked\nWHERE rn = 1;",
  "hints": ["Partition by LOWER(email), not the raw email.", "Order by updated_at DESC and keep rn = 1."]
}
```

> [!TIP] Interview tips
> - Ask "duplicate by which key?" and "which copy should win?" before writing anything.
> - Mention fixing the source too: a unique constraint or an idempotent `MERGE` / upsert in the pipeline.
> - For huge tables, dedup in a new table (`CREATE TABLE AS SELECT ... WHERE rn = 1`) and swap, instead of a big `DELETE`.
