---
id: sql-distinct
title: DISTINCT
estimatedMinutes: 8
difficulty: easy
tags: [basics, distinct, dedup]
---

## Why it matters
`DISTINCT` looks trivial, but interviewers use it to check two things: that you know it works on whole rows, and that you don't use it to hide a broken join.

## Concept
`SELECT DISTINCT` removes duplicate **rows** from the result. It compares all selected columns together, not just the first one.

```sql
SELECT DISTINCT country, city FROM customers;   -- unique (country, city) pairs
SELECT COUNT(DISTINCT country) FROM customers;  -- how many different countries
```

Things to know:
- `DISTINCT` treats NULLs as equal, so all NULLs collapse into one row.
- It needs a sort or hash over the whole result, so it isn't free on large tables.
- `SELECT DISTINCT a, b` returns the same rows as `SELECT a, b FROM t GROUP BY a, b`. Use `GROUP BY` when you also need aggregates.

## Worked example
Which product categories had at least one sale in March 2024?

```sql
SELECT DISTINCT p.category
FROM sales s
JOIN products p ON p.id = s.product_id
WHERE s.sale_date >= '2024-03-01' AND s.sale_date < '2024-04-01';
```

A common anti-pattern is adding `DISTINCT` to "fix" duplicates caused by a join. Find the join that multiplies rows instead; the join fan-out lesson shows how.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Table `t` has rows (A, 1), (A, 1), (A, 2), (B, NULL), (B, NULL). How many rows does `SELECT DISTINCT col1, col2 FROM t` return?",
  "options": ["2", "3", "4", "5"],
  "answer": 1,
  "explanation": "(A, 1), (A, 2) and (B, NULL). DISTINCT treats the two NULLs as duplicates of each other."
}
```

```quiz
{
  "id": "q2",
  "question": "In `SELECT DISTINCT a, b FROM t`, what does DISTINCT apply to?",
  "options": ["Only column `a`", "Only column `b`", "The combination of `a` and `b`", "Whichever column is used in ORDER BY"],
  "answer": 2,
  "explanation": "DISTINCT is a property of the whole SELECT list. There is no per-column DISTINCT except inside aggregates like COUNT(DISTINCT x)."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Return the distinct `city` values of customers in country `US`, sorted A to Z. Skip customers whose city is unknown (NULL).",
  "setup": "CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT, country TEXT, city TEXT); INSERT INTO customers VALUES (1,'Ana','US','Boston'),(2,'Ben','US','Austin'),(3,'Cai','CN','Shanghai'),(4,'Dee','US','Boston'),(5,'Eve','US',NULL),(6,'Finn','US','Austin'),(7,'Gia','CA','Toronto'),(8,'Hao','US','Chicago');",
  "starterCode": "SELECT city\nFROM customers\n",
  "solution": "SELECT DISTINCT city\nFROM customers\nWHERE country = 'US' AND city IS NOT NULL\nORDER BY city;",
  "orderMatters": true,
  "hints": ["Remove duplicate cities with DISTINCT.", "Filter out NULL cities with IS NOT NULL, then sort."]
}
```

> [!TIP] Interview tips
> - If your result has unexpected duplicates, say "let me check the join grain" before reaching for `DISTINCT`.
> - `COUNT(DISTINCT x)` is expensive on big data; mention `APPROX_COUNT_DISTINCT` (BigQuery, Snowflake) for dashboards.
> - Postgres has `DISTINCT ON (col)` to keep one row per value. It's handy, but `ROW_NUMBER()` is the portable answer.
