---
id: sql-practice-dedup-and-data-cleaning
title: "Practice: Deduplication and data cleaning"
estimatedMinutes: 15
difficulty: medium
tags: [interview-pattern, practice, deduplication, data-cleaning, null-handling]
---

## Why it matters
Real tables have double-loaded rows, emails in three casings and amounts stored as 'N/A'. Interviewers ask for 'find duplicates', 'keep the latest row per key' and 'clean this column then aggregate' because the right answer depends on decisions you must state: what is the key, which row wins, what do NULLs mean. Basics are in *Duplicates: detection and dedup* and *NULL handling*.

## Concept
Work in three steps.

1. **Normalize the key before comparing.** `LOWER(TRIM(email))` makes `'Ann@X.com '` and `'ann@x.com'` equal. Decide per column what normalization is safe (case and whitespace for emails; never for case-sensitive IDs).
2. **Detect:** `GROUP BY key HAVING COUNT(*) > 1` lists duplicated keys; `COUNT(*) - COUNT(DISTINCT key)` gives the number of surplus rows.
3. **Resolve with a deterministic rule.** The standard pattern is `ROW_NUMBER() OVER (PARTITION BY key ORDER BY created_at DESC, id DESC)` and keep `rn = 1`. Always add a tiebreaker (`id`) so reruns give the same answer. Alternatives: `MIN(id)` per key joined back, or `GROUP BY key` with aggregates when the duplicates should be merged.

**Cleaning values:**
- `NULLIF(x, '')` turns placeholders into NULL, so aggregates skip them. `COALESCE(a, b)` fills in defaults.
- Cast only after cleaning: `CAST(NULLIF(NULLIF(TRIM(amount),''),'N/A') AS REAL)`.
- `AVG` ignores NULLs, so a blank counted as 0 would silently drag the mean down; decide which you mean.

**NULL keys are not duplicates of each other.** `NULL = NULL` is not true, so rows with a missing email should usually be kept, not collapsed into one. Partition by `COALESCE(key, 'missing-' || id)` to keep them separate.

**Event-stream dedup** (double clicks, retries) is order-based: compare each row to the previous one with `LAG` and drop it if it is within a window.

Pitfalls: deleting without checking the count first, dedup on the wrong grain, and non-deterministic `ROW_NUMBER` without a tiebreaker.

## Worked example
Table `customers_raw(id, email, name, country, created_at, amount)` with messy emails. Task: find email addresses that appear on more than one row after trimming and lowercasing.

```sql
SELECT LOWER(TRIM(email)) AS email_norm,
       COUNT(*) AS n_rows,
       MIN(created_at) AS first_seen,
       MAX(created_at) AS last_seen
FROM customers_raw
WHERE email IS NOT NULL
GROUP BY LOWER(TRIM(email))
HAVING COUNT(*) > 1
ORDER BY email_norm;
```

Result:

| email_norm | n_rows | first_seen | last_seen |
|---|---|---|---|
| ann@x.com | 2 | 2024-01-01 | 2024-02-01 |
| bob@y.com | 2 | 2024-01-10 | 2024-01-15 |

Two keys collide: `ann@x.com` (ids 1 and 2, with a trailing space and mixed case in id 1) and `bob@y.com` (ids 3 and 4). A plain `GROUP BY email` would have found none because the raw strings differ. Rows 6 and 7 have NULL email and are excluded by the `WHERE`, because missing is not the same as equal. The `first_seen`/`last_seen` columns show how far apart the copies are, which helps decide which row to keep.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Two rows both have `email = NULL`. Does `GROUP BY email` put them in the same group, and does `a.email = b.email` match them in a join?",
  "options": [
    "Yes to both",
    "GROUP BY groups them together, but the join comparison NULL = NULL is not true so they do not match",
    "No to both",
    "The join matches them, GROUP BY does not"
  ],
  "answer": 1,
  "explanation": "GROUP BY treats NULLs as one group, but equality with NULL is unknown, so a join on email never matches NULL rows. Decide explicitly how missing keys should be handled."
}
```

```quiz
{
  "id": "q2",
  "question": "Why add `id DESC` as a second ORDER BY key in `ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC)`?",
  "options": [
    "It makes the query faster",
    "ROW_NUMBER requires two keys",
    "Rows with the same created_at otherwise get an arbitrary order, so the kept row can change between runs",
    "It removes NULLs"
  ],
  "answer": 2,
  "explanation": "Ties in the ordering are broken arbitrarily, so dedup could keep different rows on different runs. A unique tiebreaker makes the result deterministic."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Deduplicate by email (ignoring case and surrounding spaces), keeping the **latest `created_at`** row of each. Rows with a NULL email are all distinct people and must all be kept. Return the kept `id`s. Column: `id`.",
  "setup": "CREATE TABLE customers_raw (id INTEGER, email TEXT, name TEXT, country TEXT, created_at TEXT, amount TEXT);\nINSERT INTO customers_raw VALUES (1,'Ann@X.com ','ann','us','2024-01-01','10'),(2,'ann@x.com','Ann','US','2024-02-01','N/A'),(3,'bob@y.com','Bob','UK ','2024-01-15',''),(4,'BOB@y.com','bob','uk','2024-01-10','25.5'),(5,'cy@z.com','Cy','us','2024-03-01','40'),(6,NULL,'Dee','us','2024-03-05','15'),(7,NULL,'Eve','uk','2024-03-06','20');\nCREATE TABLE raw_events (user_id INTEGER, event TEXT, ts INTEGER);\nINSERT INTO raw_events VALUES (1,'click',100),(1,'click',103),(1,'click',108),(1,'click',200),(1,'view',101),(2,'click',50),(2,'click',70);",
  "starterCode": "WITH ranked AS (\n  SELECT id, email, created_at,\n         ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...) AS rn\n  FROM customers_raw\n)\nSELECT id FROM ranked WHERE rn = 1;",
  "solution": "WITH ranked AS (\n  SELECT id,\n         ROW_NUMBER() OVER (\n           PARTITION BY COALESCE(LOWER(TRIM(email)), 'missing-' || id)\n           ORDER BY created_at DESC, id DESC\n         ) AS rn\n  FROM customers_raw\n)\nSELECT id FROM ranked WHERE rn = 1;",
  "hints": [
    "Normalize with LOWER(TRIM(email)).",
    "For NULL emails use COALESCE(normalized, 'missing-' || id) as the partition key so each is alone.",
    "ROW_NUMBER() OVER (PARTITION BY key ORDER BY created_at DESC, id DESC), keep rn = 1."
  ]
}
```

```sql-exercise
{
  "id": "ex2",
  "prompt": "`amount` is text and uses `''` and `'N/A'` for missing. Per cleaned country (trimmed, upper-case), return the average of the valid amounts and how many valid amounts there were. Columns: `country, avg_amount, n_valid`; round the average to 2 decimals.",
  "setup": "CREATE TABLE customers_raw (id INTEGER, email TEXT, name TEXT, country TEXT, created_at TEXT, amount TEXT);\nINSERT INTO customers_raw VALUES (1,'Ann@X.com ','ann','us','2024-01-01','10'),(2,'ann@x.com','Ann','US','2024-02-01','N/A'),(3,'bob@y.com','Bob','UK ','2024-01-15',''),(4,'BOB@y.com','bob','uk','2024-01-10','25.5'),(5,'cy@z.com','Cy','us','2024-03-01','40'),(6,NULL,'Dee','us','2024-03-05','15'),(7,NULL,'Eve','uk','2024-03-06','20');\nCREATE TABLE raw_events (user_id INTEGER, event TEXT, ts INTEGER);\nINSERT INTO raw_events VALUES (1,'click',100),(1,'click',103),(1,'click',108),(1,'click',200),(1,'view',101),(2,'click',50),(2,'click',70);",
  "starterCode": "SELECT UPPER(TRIM(country)) AS country,\n       ...\nFROM customers_raw\nGROUP BY UPPER(TRIM(country));",
  "solution": "SELECT UPPER(TRIM(country)) AS country,\n       ROUND(AVG(CAST(NULLIF(NULLIF(TRIM(amount), ''), 'N/A') AS REAL)), 2) AS avg_amount,\n       COUNT(NULLIF(NULLIF(TRIM(amount), ''), 'N/A')) AS n_valid\nFROM customers_raw\nGROUP BY UPPER(TRIM(country));",
  "hints": [
    "Clean the country with UPPER(TRIM(country)) in both SELECT and GROUP BY.",
    "NULLIF(NULLIF(TRIM(amount), ''), 'N/A') turns both placeholders into NULL.",
    "AVG and COUNT(col) both skip NULL, so no extra filtering is needed; CAST to REAL before AVG."
  ]
}
```

```sql-exercise
{
  "id": "ex3",
  "prompt": "`raw_events` contains double-fired events. Drop any event that occurs **less than 10 seconds after the previous event of the same user and type** (compare to the immediately preceding row, kept or not). Columns: `user_id, event, ts`.",
  "setup": "CREATE TABLE customers_raw (id INTEGER, email TEXT, name TEXT, country TEXT, created_at TEXT, amount TEXT);\nINSERT INTO customers_raw VALUES (1,'Ann@X.com ','ann','us','2024-01-01','10'),(2,'ann@x.com','Ann','US','2024-02-01','N/A'),(3,'bob@y.com','Bob','UK ','2024-01-15',''),(4,'BOB@y.com','bob','uk','2024-01-10','25.5'),(5,'cy@z.com','Cy','us','2024-03-01','40'),(6,NULL,'Dee','us','2024-03-05','15'),(7,NULL,'Eve','uk','2024-03-06','20');\nCREATE TABLE raw_events (user_id INTEGER, event TEXT, ts INTEGER);\nINSERT INTO raw_events VALUES (1,'click',100),(1,'click',103),(1,'click',108),(1,'click',200),(1,'view',101),(2,'click',50),(2,'click',70);",
  "starterCode": "WITH x AS (\n  SELECT user_id, event, ts,\n         LAG(ts) OVER (PARTITION BY user_id, event ORDER BY ts) AS prev_ts\n  FROM raw_events\n)\nSELECT ...",
  "solution": "WITH x AS (\n  SELECT user_id, event, ts,\n         LAG(ts) OVER (PARTITION BY user_id, event ORDER BY ts) AS prev_ts\n  FROM raw_events\n)\nSELECT user_id, event, ts\nFROM x\nWHERE prev_ts IS NULL OR ts - prev_ts >= 10;",
  "hints": [
    "LAG(ts) partitioned by user_id and event, ordered by ts.",
    "Keep a row when prev_ts IS NULL or ts - prev_ts >= 10.",
    "Different event types for the same user must not suppress each other."
  ]
}
```

> [!TIP] Interview tips
> - State the key, the winning rule and the tiebreaker before writing the query.
> - Normalize (LOWER/TRIM) before grouping, and say why NULL keys are not collapsed.
> - Offer to run a SELECT count of rows to be removed before any DELETE.
