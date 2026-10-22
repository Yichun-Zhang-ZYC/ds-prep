---
id: sql-practice-ecommerce-analytics
title: "Practice: E-commerce analytics queries"
estimatedMinutes: 15
difficulty: medium
tags: [interview-pattern, practice, e-commerce, aggregation]
---

## Why it matters
E-commerce is the default setting for SQL screens: revenue by month, average order value, repeat buyers, best sellers. The queries are short, but the traps (what counts as revenue, double-counting after a join, customers with zero orders) separate strong candidates from average ones.

## Concept
Run the same playbook on every e-commerce question:

1. **Pin the grain and the metric.** Orders are one row per order; `order_items` is one row per order line. Revenue is `SUM(qty * unit_price)` over lines, and you must say which statuses count (usually `completed` only; cancelled and refunded orders are excluded).
2. **Filter before you aggregate**, and put the status filter in the right place: in `WHERE` for inner joins, in the `ON` clause when a `LEFT JOIN` must keep customers with no qualifying orders.
3. **Beware fan-out.** After joining orders to items, `COUNT(*)` counts lines, not orders. Use `COUNT(DISTINCT order_id)`, and never `SUM` an order-level column (such as shipping fee) after the join. See *Join fan-out and duplicate rows*.
4. **Pick the denominator deliberately.** AOV is revenue divided by distinct orders; repeat rate is repeat customers divided by customers with at least one order; conversion is a ratio of distinct users. Multiply by `1.0` to avoid integer division.
5. **Customers with nothing** need a `LEFT JOIN` from the customers table plus `COALESCE(..., 0)`.

Common pitfalls: counting refunds as revenue, `LEFT JOIN` followed by a `WHERE` on the right table (silently turns it into an inner join), and forgetting that "top product" ties need `RANK` or a stated tie rule. See *Top-N per group* and *Conditional aggregation*.

## Worked example
Schema: `customers`, `orders(order_id, customer_id, order_date, status)`, `order_items(order_id, product_id, qty, unit_price)`, `products(product_id, name, category)`. Task: monthly revenue, order count and average order value for completed orders.

```sql
SELECT strftime('%Y-%m', o.order_date) AS month,
       SUM(i.qty * i.unit_price) AS revenue,
       COUNT(DISTINCT o.order_id) AS orders,
       ROUND(SUM(i.qty * i.unit_price) * 1.0 / COUNT(DISTINCT o.order_id), 2) AS aov
FROM orders o
JOIN order_items i ON i.order_id = o.order_id
WHERE o.status = 'completed'
GROUP BY month
ORDER BY month;
```

Result:

| month | revenue | orders | aov |
|---|---|---|---|
| 2024-01 | 1208.0 | 2 | 604.0 |
| 2024-02 | 850.0 | 2 | 425.0 |
| 2024-03 | 1040.0 | 2 | 520.0 |

Check by hand for January: order 1 is 900 + 4 x 2 = 908 and order 2 is 300, so revenue is 1208 over 2 orders and AOV is 604. Order 3 (cancelled) is excluded by the filter. Note that `COUNT(DISTINCT o.order_id)` is essential: order 1 has two lines, so `COUNT(*)` would report 3 orders in January and understate AOV.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "After joining `orders` to `order_items`, you compute average order value as `SUM(qty * unit_price) / COUNT(*)`. What is wrong?",
  "options": [
    "Nothing, COUNT(*) counts orders",
    "SUM should use DISTINCT",
    "COUNT(*) counts order lines, so AOV is understated; divide by COUNT(DISTINCT order_id)",
    "The join should be a FULL JOIN"
  ],
  "answer": 2,
  "explanation": "The join repeats each order once per line, so COUNT(*) is the number of lines. AOV needs distinct orders in the denominator."
}
```

```quiz
{
  "id": "q2",
  "question": "You want every customer, including those with no completed orders, with their completed revenue. Where should `status = 'completed'` go?",
  "options": [
    "In WHERE after the LEFT JOIN",
    "In the ON clause of the LEFT JOIN",
    "In HAVING",
    "It does not matter"
  ],
  "answer": 1,
  "explanation": "A WHERE on the right table removes the NULL-extended rows, turning the LEFT JOIN into an inner join. Putting the condition in ON keeps customers with no matching orders."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Return **every customer's** revenue from completed orders as `revenue` (0 if none). Columns: `customer_id, revenue`.",
  "setup": "CREATE TABLE customers (customer_id INTEGER, name TEXT);\nINSERT INTO customers VALUES (1,'Ann'),(2,'Bo'),(3,'Cy'),(4,'Di'),(5,'Ed'),(6,'Flo');\nCREATE TABLE products (product_id INTEGER, name TEXT, category TEXT);\nINSERT INTO products VALUES (1,'Laptop','Electronics'),(2,'Phone','Electronics'),(3,'Desk','Furniture'),(4,'Chair','Furniture'),(5,'Pen','Stationery');\nCREATE TABLE orders (order_id INTEGER, customer_id INTEGER, order_date TEXT, status TEXT);\nINSERT INTO orders VALUES (1,1,'2024-01-05','completed'),(2,1,'2024-01-20','completed'),(3,5,'2024-01-22','cancelled'),(4,2,'2024-02-03','completed'),(5,3,'2024-02-10','completed'),(6,1,'2024-02-14','refunded'),(7,3,'2024-03-01','completed'),(8,4,'2024-03-05','completed');\nCREATE TABLE order_items (order_id INTEGER, product_id INTEGER, qty INTEGER, unit_price REAL);\nINSERT INTO order_items VALUES (1,1,1,900),(1,5,4,2),(2,3,1,300),(3,2,1,600),(4,4,2,120),(4,5,5,2),(5,2,1,600),(6,3,1,300),(7,1,1,900),(7,4,1,120),(8,5,10,2);",
  "starterCode": "SELECT c.customer_id, ...\nFROM customers c\nLEFT JOIN ...",
  "solution": "SELECT c.customer_id,\n       COALESCE(SUM(i.qty * i.unit_price), 0) AS revenue\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.customer_id AND o.status = 'completed'\nLEFT JOIN order_items i ON i.order_id = o.order_id\nGROUP BY c.customer_id;",
  "hints": [
    "Start from `customers` and LEFT JOIN so customers without orders survive.",
    "Put the status condition in the ON clause, not WHERE.",
    "Wrap the SUM in COALESCE(..., 0)."
  ]
}
```

```sql-exercise
{
  "id": "ex2",
  "prompt": "What share of customers with at least one completed order have **two or more** completed orders? Return one row with `repeat_rate` (a fraction between 0 and 1).",
  "setup": "CREATE TABLE customers (customer_id INTEGER, name TEXT);\nINSERT INTO customers VALUES (1,'Ann'),(2,'Bo'),(3,'Cy'),(4,'Di'),(5,'Ed'),(6,'Flo');\nCREATE TABLE products (product_id INTEGER, name TEXT, category TEXT);\nINSERT INTO products VALUES (1,'Laptop','Electronics'),(2,'Phone','Electronics'),(3,'Desk','Furniture'),(4,'Chair','Furniture'),(5,'Pen','Stationery');\nCREATE TABLE orders (order_id INTEGER, customer_id INTEGER, order_date TEXT, status TEXT);\nINSERT INTO orders VALUES (1,1,'2024-01-05','completed'),(2,1,'2024-01-20','completed'),(3,5,'2024-01-22','cancelled'),(4,2,'2024-02-03','completed'),(5,3,'2024-02-10','completed'),(6,1,'2024-02-14','refunded'),(7,3,'2024-03-01','completed'),(8,4,'2024-03-05','completed');\nCREATE TABLE order_items (order_id INTEGER, product_id INTEGER, qty INTEGER, unit_price REAL);\nINSERT INTO order_items VALUES (1,1,1,900),(1,5,4,2),(2,3,1,300),(3,2,1,600),(4,4,2,120),(4,5,5,2),(5,2,1,600),(6,3,1,300),(7,1,1,900),(7,4,1,120),(8,5,10,2);",
  "starterCode": "WITH per_customer AS (\n  SELECT customer_id, COUNT(*) AS n\n  FROM orders\n  ...\n)\nSELECT ...",
  "solution": "WITH per_customer AS (\n  SELECT customer_id, COUNT(*) AS n\n  FROM orders\n  WHERE status = 'completed'\n  GROUP BY customer_id\n)\nSELECT ROUND(SUM(CASE WHEN n >= 2 THEN 1 ELSE 0 END) * 1.0 / COUNT(*), 3) AS repeat_rate\nFROM per_customer;",
  "hints": [
    "First count completed orders per customer.",
    "The denominator is customers with at least one completed order, so customers with none must not appear.",
    "Use SUM(CASE WHEN n >= 2 ...) * 1.0 / COUNT(*)."
  ]
}
```

```sql-exercise
{
  "id": "ex3",
  "prompt": "For each category, find the **top product by completed revenue** and its share of the category's completed revenue, rounded to 3 decimals. Columns: `category, name, share`. Ignore ties.",
  "setup": "CREATE TABLE customers (customer_id INTEGER, name TEXT);\nINSERT INTO customers VALUES (1,'Ann'),(2,'Bo'),(3,'Cy'),(4,'Di'),(5,'Ed'),(6,'Flo');\nCREATE TABLE products (product_id INTEGER, name TEXT, category TEXT);\nINSERT INTO products VALUES (1,'Laptop','Electronics'),(2,'Phone','Electronics'),(3,'Desk','Furniture'),(4,'Chair','Furniture'),(5,'Pen','Stationery');\nCREATE TABLE orders (order_id INTEGER, customer_id INTEGER, order_date TEXT, status TEXT);\nINSERT INTO orders VALUES (1,1,'2024-01-05','completed'),(2,1,'2024-01-20','completed'),(3,5,'2024-01-22','cancelled'),(4,2,'2024-02-03','completed'),(5,3,'2024-02-10','completed'),(6,1,'2024-02-14','refunded'),(7,3,'2024-03-01','completed'),(8,4,'2024-03-05','completed');\nCREATE TABLE order_items (order_id INTEGER, product_id INTEGER, qty INTEGER, unit_price REAL);\nINSERT INTO order_items VALUES (1,1,1,900),(1,5,4,2),(2,3,1,300),(3,2,1,600),(4,4,2,120),(4,5,5,2),(5,2,1,600),(6,3,1,300),(7,1,1,900),(7,4,1,120),(8,5,10,2);",
  "starterCode": "WITH rev AS (\n  SELECT p.category, p.name, SUM(i.qty * i.unit_price) AS revenue\n  FROM order_items i\n  ...\n)\nSELECT ...",
  "solution": "WITH rev AS (\n  SELECT p.category, p.name, SUM(i.qty * i.unit_price) AS revenue\n  FROM order_items i\n  JOIN orders o ON o.order_id = i.order_id AND o.status = 'completed'\n  JOIN products p ON p.product_id = i.product_id\n  GROUP BY p.category, p.name\n),\nranked AS (\n  SELECT category, name, revenue,\n         ROW_NUMBER() OVER (PARTITION BY category ORDER BY revenue DESC) AS rn,\n         SUM(revenue) OVER (PARTITION BY category) AS cat_revenue\n  FROM rev\n)\nSELECT category, name, ROUND(revenue * 1.0 / cat_revenue, 3) AS share\nFROM ranked\nWHERE rn = 1;",
  "hints": [
    "Compute revenue per (category, product) in a CTE, joining only completed orders.",
    "Use ROW_NUMBER() OVER (PARTITION BY category ORDER BY revenue DESC) to pick the top product.",
    "SUM(revenue) OVER (PARTITION BY category) gives the category total in the same pass; filter rn = 1 in the outer query."
  ]
}
```

> [!TIP] Interview tips
> - State the revenue definition out loud first (which statuses, gross vs net of refunds) before writing any SQL.
> - After every join, say what the grain is now and what a `COUNT` would count.
> - Ask what to do with ties for 'top product' and whether to include customers with zero orders.
