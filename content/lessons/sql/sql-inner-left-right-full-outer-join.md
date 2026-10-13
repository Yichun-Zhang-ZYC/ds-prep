---
id: sql-inner-left-right-full-outer-join
title: INNER, LEFT, RIGHT, FULL OUTER JOIN
estimatedMinutes: 12
difficulty: easy
tags: [joins, basics]
---

## Why it matters
Joins are the core of SQL interviews. The questions usually hinge on which rows survive: customers with no orders, orders with an unknown customer, or both.

## Concept
| Join | Keeps |
|---|---|
| `INNER JOIN` | only rows that match on both sides |
| `LEFT JOIN` | every row from the left table; right columns are NULL when there's no match |
| `RIGHT JOIN` | every row from the right table (same as a LEFT JOIN with the tables swapped) |
| `FULL OUTER JOIN` | every row from both sides; NULLs fill the missing side |

Most teams write `LEFT JOIN` and never `RIGHT JOIN`, so queries read left to right from the "main" table.

The classic trap: a filter on the right table in `WHERE` turns a `LEFT JOIN` back into an `INNER JOIN`, because the NULL rows fail the condition. Put such filters in the `ON` clause instead.

## Worked example
All customers with their 2024 order count, including customers with zero orders:

```sql
SELECT c.id, c.name, COUNT(o.id) AS orders_2024
FROM customers c
LEFT JOIN orders o
  ON o.customer_id = c.id
 AND o.order_date >= '2024-01-01'   -- filter in ON keeps customers without orders
GROUP BY c.id, c.name;
```

Note `COUNT(o.id)`, not `COUNT(*)`: for a customer with no orders the joined row has `o.id = NULL`, so the count is 0 rather than 1.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "`customers` has 10 rows, 3 of which have no orders. Every order has a valid customer. How many distinct customers appear in `customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.status = 'paid'`?",
  "options": ["All 10", "At most 7", "Exactly 3", "0"],
  "answer": 1,
  "explanation": "The WHERE filter on o.status removes the NULL rows for the 3 customers without orders, so the LEFT JOIN acts like an INNER JOIN. Move the condition into ON to keep them."
}
```

```quiz
{
  "id": "q2",
  "question": "When do you need a FULL OUTER JOIN?",
  "options": ["To get every customer, with or without orders", "To reconcile two sources and see rows missing from either side", "Whenever tables are large", "To remove duplicates"],
  "answer": 1,
  "explanation": "Reconciliation (\"which IDs exist in system A but not B, and vice versa\") is the textbook use. Every customer with or without orders only needs a LEFT JOIN."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Return every customer's `name` and their total paid amount as `paid_total` (sum of `amount` over orders with `status = 'paid'`). Customers with no paid orders must appear with `paid_total = 0`.",
  "setup": "CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT); CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER, amount REAL, status TEXT); INSERT INTO customers VALUES (1,'Ana'),(2,'Ben'),(3,'Cai'),(4,'Dee'); INSERT INTO orders VALUES (1,1,50.0,'paid'),(2,1,20.0,'refunded'),(3,2,35.0,'paid'),(4,2,15.0,'paid'),(5,3,40.0,'refunded');",
  "starterCode": "SELECT c.name\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id\n",
  "solution": "SELECT c.name, COALESCE(SUM(o.amount), 0) AS paid_total\nFROM customers c\nLEFT JOIN orders o\n  ON o.customer_id = c.id\n AND o.status = 'paid'\nGROUP BY c.id, c.name;",
  "hints": ["Putting status = 'paid' in WHERE would drop Cai and Dee.", "SUM over no matching rows is NULL; wrap it in COALESCE(..., 0)."]
}
```

> [!TIP] Interview tips
> - Before writing, say which table drives the result: "every customer, so customers on the left".
> - Explain where you put each filter: `ON` (part of the match) vs `WHERE` (after the join).
> - Count a column from the right table (`COUNT(o.id)`) after a `LEFT JOIN`, never `COUNT(*)`.
