---
id: sql-join-fan-out-and-duplicate-rows
title: Join fan-out and duplicate rows
estimatedMinutes: 12
difficulty: medium
tags: [joins, grain, debugging]
---

## Why it matters
Inflated revenue after a join is the most common real-world SQL bug, and interviewers love it: "why is total revenue 3× too high?" The answer is almost always fan-out.

## Concept
Every table has a **grain**: what one row represents (one order, one order line, one user per day). Joining to a table with *many* rows per key multiplies the rows on the other side.

If `orders` has one row per order and `order_items` has three lines for order 7, then `orders JOIN order_items` has three rows for order 7. Summing `orders.amount` afterwards counts that order three times.

Two joins that each fan out multiply each other: 3 items × 2 payments = 6 rows for the order.

## Worked example
Wrong and right ways to get revenue and item count per customer:

```sql
-- Wrong: o.amount is repeated once per item line
SELECT o.customer_id, SUM(o.amount) AS revenue, COUNT(i.id) AS items
FROM orders o
JOIN order_items i ON i.order_id = o.id
GROUP BY o.customer_id;

-- Right: aggregate the "many" side to the order grain first
WITH items_per_order AS (
  SELECT order_id, COUNT(*) AS items
  FROM order_items
  GROUP BY order_id
)
SELECT o.customer_id, SUM(o.amount) AS revenue, SUM(COALESCE(ip.items, 0)) AS items
FROM orders o
LEFT JOIN items_per_order ip ON ip.order_id = o.id
GROUP BY o.customer_id;
```

A quick check: compare `COUNT(*)` before and after the join, or check that the join key is unique on the side you expect (`SELECT key, COUNT(*) ... HAVING COUNT(*) > 1`).

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Order 7 has 3 item lines and 2 payment rows. You join orders to both tables on order_id. How many rows does order 7 produce?",
  "options": ["3", "5", "6", "1"],
  "answer": 2,
  "explanation": "Each item line pairs with each payment: 3 × 2 = 6. Aggregate each child table to the order grain before joining."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Return each `customer_id` with total order revenue as `revenue` (sum of `orders.amount`) and the number of item lines as `items`. Avoid double-counting revenue.",
  "setup": "CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER, amount REAL); CREATE TABLE order_items (id INTEGER PRIMARY KEY, order_id INTEGER, sku TEXT); INSERT INTO orders VALUES (1,100,50.0),(2,100,30.0),(3,200,80.0),(4,300,20.0); INSERT INTO order_items VALUES (1,1,'A'),(2,1,'B'),(3,1,'C'),(4,2,'A'),(5,3,'D'),(6,3,'E');",
  "starterCode": "SELECT o.customer_id, SUM(o.amount) AS revenue, COUNT(i.id) AS items\nFROM orders o\nLEFT JOIN order_items i ON i.order_id = o.id\nGROUP BY o.customer_id;",
  "solution": "WITH items_per_order AS (\n  SELECT order_id, COUNT(*) AS items\n  FROM order_items\n  GROUP BY order_id\n)\nSELECT o.customer_id,\n       SUM(o.amount) AS revenue,\n       SUM(COALESCE(ip.items, 0)) AS items\nFROM orders o\nLEFT JOIN items_per_order ip ON ip.order_id = o.id\nGROUP BY o.customer_id;",
  "hints": ["Run the starter query: customer 100's revenue comes out as 180 instead of 80.", "Count items per order in a CTE first, so the join is one-to-one."]
}
```

> [!TIP] Interview tips
> - State the grain of every table before joining: "orders is one row per order, items is one row per line".
> - Rule of thumb: aggregate each "many" table to the grain you need, then join.
> - `DISTINCT` inside `SUM` is not a fix: two different orders with the same amount would collapse into one.
