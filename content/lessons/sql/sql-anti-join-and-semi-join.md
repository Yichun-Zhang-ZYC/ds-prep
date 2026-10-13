---
id: sql-anti-join-and-semi-join
title: Anti-join and semi-join
estimatedMinutes: 12
difficulty: medium
tags: [joins, exists, not-exists, anti-join]
---

## Why it matters
"Customers who never ordered", "products never viewed", "users who did X but not Y": these are anti-joins, and they're everywhere in interviews. The NULL trap in `NOT IN` is a favorite follow-up.

## Concept
- **Semi-join**: keep rows of A that have *at least one* match in B, without duplicating A. Written with `EXISTS` or `IN`.
- **Anti-join**: keep rows of A that have *no* match in B. Written with `NOT EXISTS` or `LEFT JOIN ... WHERE b.key IS NULL`.

| Pattern | Anti-join form | NULL-safe? |
|---|---|---|
| `NOT EXISTS (SELECT 1 FROM b WHERE b.k = a.k)` | correlated subquery | yes |
| `LEFT JOIN b ON b.k = a.k WHERE b.k IS NULL` | outer join + filter | yes |
| `WHERE a.k NOT IN (SELECT k FROM b)` | list membership | **no**: one NULL in `b.k` returns zero rows |

## Worked example
Customers who never placed an order, two equivalent ways:

```sql
SELECT c.*
FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);

SELECT c.*
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.id IS NULL;
```

Semi-join: customers who placed at least one order, each listed once (a plain `JOIN` would repeat customers with several orders):

```sql
SELECT c.* FROM customers c
WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);
```

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "`orders.customer_id` contains the values 1, 2 and NULL. How many rows does `SELECT * FROM customers WHERE id NOT IN (SELECT customer_id FROM orders)` return?",
  "options": ["Every customer except 1 and 2", "0", "Every customer", "An error"],
  "answer": 1,
  "explanation": "`id NOT IN (1, 2, NULL)` expands to `id <> 1 AND id <> 2 AND id <> NULL`. The last part is unknown, so no row passes."
}
```

```quiz
{
  "id": "q2",
  "question": "In the LEFT JOIN anti-join, which column should you test with `IS NULL`?",
  "options": ["Any column from the left table", "A right-table column that is never NULL in real rows (e.g. its primary key or the join key)", "Any nullable column from the right table", "It doesn't matter"],
  "answer": 1,
  "explanation": "If you test a right-side column that can be NULL in real rows, matched rows with that NULL would be mistaken for non-matches."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Return the `email` of users who **signed up but never made a purchase**. `purchases.user_id` can be NULL for guest checkouts.",
  "setup": "CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT); CREATE TABLE purchases (id INTEGER PRIMARY KEY, user_id INTEGER, amount REAL); INSERT INTO users VALUES (1,'ana@x.com'),(2,'ben@x.com'),(3,'cai@x.com'),(4,'dee@x.com'),(5,'eve@x.com'); INSERT INTO purchases VALUES (1,1,20.0),(2,1,15.0),(3,3,40.0),(4,NULL,12.0),(5,NULL,8.0);",
  "starterCode": "SELECT u.email\nFROM users u\nWHERE ",
  "solution": "SELECT u.email\nFROM users u\nWHERE NOT EXISTS (\n  SELECT 1 FROM purchases p WHERE p.user_id = u.id\n);",
  "hints": ["Try NOT IN first and see what happens with the NULL user_ids.", "NOT EXISTS (or LEFT JOIN ... IS NULL) is NULL-safe."]
}
```

> [!TIP] Interview tips
> - Default to `NOT EXISTS` for anti-joins and say why: it's NULL-safe and optimizers handle it well.
> - Explain that a semi-join (`EXISTS`) never duplicates the left table, unlike an inner join.
> - "Users who did A but not B" = filter to A, then anti-join against B.
