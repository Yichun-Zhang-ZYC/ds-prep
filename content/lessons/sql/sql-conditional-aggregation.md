---
id: sql-conditional-aggregation
title: Conditional aggregation
estimatedMinutes: 12
difficulty: medium
tags: [aggregation, case-when, pivot]
---

## Why it matters
"Show the share of mobile orders per country" or "count signups and purchases per day in one query" are classic. Conditional aggregation answers them in one pass without self-joins or subqueries.

## Concept
Put a `CASE` inside the aggregate so each row contributes only when a condition holds:

```sql
SUM(CASE WHEN device = 'mobile' THEN 1 ELSE 0 END)      -- count of mobile rows
SUM(CASE WHEN device = 'mobile' THEN amount ELSE 0 END) -- mobile revenue
AVG(CASE WHEN device = 'mobile' THEN 1.0 ELSE 0 END)    -- share of mobile rows
COUNT(CASE WHEN device = 'mobile' THEN 1 END)           -- same count: COUNT skips NULL
```

Postgres also supports `COUNT(*) FILTER (WHERE device = 'mobile')`, and in SQLite and MySQL a boolean is already 0/1, so `SUM(device = 'mobile')` works. The `CASE` form runs everywhere.

## Worked example
Daily signups, purchases and conversion rate from one events table:

```sql
SELECT event_date,
       SUM(CASE WHEN event = 'signup'   THEN 1 ELSE 0 END) AS signups,
       SUM(CASE WHEN event = 'purchase' THEN 1 ELSE 0 END) AS purchases,
       ROUND(1.0 * SUM(CASE WHEN event = 'purchase' THEN 1 ELSE 0 END)
                 / NULLIF(SUM(CASE WHEN event = 'signup' THEN 1 ELSE 0 END), 0), 3) AS conv_rate
FROM events
GROUP BY event_date;
```

This is also how you **pivot** rows into columns in databases without a `PIVOT` keyword.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What does `AVG(CASE WHEN refunded THEN 1.0 ELSE 0 END)` compute?",
  "options": ["Number of refunds", "Refund rate (share of rows refunded)", "Average refund amount", "Always 1"],
  "answer": 1,
  "explanation": "The average of a 0/1 indicator is the fraction of rows where it's 1."
}
```

```quiz
{
  "id": "q2",
  "question": "You write `AVG(CASE WHEN refunded THEN 1.0 END)` (no ELSE). What happens?",
  "options": ["Same result as with ELSE 0", "Always returns 1 (or NULL), because non-refunded rows become NULL and are skipped", "Returns 0", "Syntax error"],
  "answer": 1,
  "explanation": "Without ELSE 0, non-matching rows are NULL and AVG ignores them. Keep ELSE 0 for rates; the COUNT form is the one that relies on the missing ELSE."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "For each `country`, return the number of orders as `orders`, the number of mobile orders as `mobile_orders`, and mobile revenue as `mobile_revenue` (sum of `amount` where `device = 'mobile'`, 0 if none).",
  "setup": "CREATE TABLE orders (id INTEGER PRIMARY KEY, country TEXT, device TEXT, amount REAL); INSERT INTO orders VALUES (1,'US','mobile',20.0),(2,'US','desktop',50.0),(3,'US','mobile',30.0),(4,'DE','desktop',40.0),(5,'DE','desktop',10.0),(6,'JP','mobile',15.0),(7,'JP','tablet',25.0),(8,'JP','mobile',5.0);",
  "starterCode": "SELECT country,\n       COUNT(*) AS orders\nFROM orders\nGROUP BY country;",
  "solution": "SELECT country,\n       COUNT(*) AS orders,\n       SUM(CASE WHEN device = 'mobile' THEN 1 ELSE 0 END) AS mobile_orders,\n       SUM(CASE WHEN device = 'mobile' THEN amount ELSE 0 END) AS mobile_revenue\nFROM orders\nGROUP BY country;",
  "hints": ["Wrap a CASE expression in SUM.", "For revenue, return amount in the THEN branch and 0 in ELSE."]
}
```

> [!TIP] Interview tips
> - When you see "for each X, count A and B", reach for conditional aggregation before a self-join.
> - Name the `ELSE` explicitly. `ELSE 0` vs no `ELSE` changes rates silently.
> - Follow-up: "make it a percentage". Divide two conditional sums and guard the denominator with `NULLIF(..., 0)`.
