---
id: sql-top-n-per-group
title: Top N per group
estimatedMinutes: 15
difficulty: medium
tags: [window-functions, top-n, interview-pattern]
---

## Why it matters
"Top 3 products per category", "latest order per customer", "best-selling item each month": the same pattern shows up in almost every SQL round. Have one template you can write without thinking.

## Concept
The template has three steps:

1. **Aggregate** if needed (e.g. revenue per product per category).
2. **Rank** inside each group with a window function.
3. **Filter** on the rank in an outer query.

Pick the ranking function from the tie rule (see the previous lesson): `ROW_NUMBER` for exactly N, `DENSE_RANK` to keep ties.

## Worked example
Top 2 products by revenue in each category:

```sql
WITH revenue AS (
  SELECT p.category, p.name, SUM(s.qty * s.unit_price) AS revenue
  FROM sales s
  JOIN products p ON p.id = s.product_id
  GROUP BY p.category, p.name
),
ranked AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY category ORDER BY revenue DESC, name) AS rn
  FROM revenue
)
SELECT category, name, revenue
FROM ranked
WHERE rn <= 2
ORDER BY category, rn;
```

`name` as a second sort key makes the result deterministic when two products tie on revenue.

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "For each customer, return their **most recent order**: `customer_id, order_id, order_date`. If a customer placed two orders on the same latest date, keep the one with the higher `order_id`.",
  "setup": "CREATE TABLE orders (order_id INTEGER PRIMARY KEY, customer_id INTEGER, order_date TEXT, amount REAL); INSERT INTO orders VALUES (101,1,'2024-01-05',30.0),(102,1,'2024-02-10',45.0),(103,2,'2024-01-20',12.5),(104,2,'2024-01-20',80.0),(105,3,'2023-12-31',22.0),(106,1,'2024-02-01',15.0);",
  "starterCode": "WITH ranked AS (\n  SELECT customer_id, order_id, order_date,\n         -- rank here\n  FROM orders\n)\nSELECT customer_id, order_id, order_date\nFROM ranked\n",
  "solution": "WITH ranked AS (\n  SELECT customer_id, order_id, order_date,\n         ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC, order_id DESC) AS rn\n  FROM orders\n)\nSELECT customer_id, order_id, order_date\nFROM ranked\nWHERE rn = 1;",
  "hints": ["Exactly one row per customer means ROW_NUMBER.", "Order by date descending, then order_id descending as the tie-breaker."]
}
```

```reveal
{
  "prompt": "How would you get the top N per group in a database **without** window functions (e.g. old MySQL)?",
  "answer": "Use a correlated subquery that counts how many rows in the same group beat the current one:\n\n```sql\nSELECT *\nFROM products p\nWHERE (\n  SELECT COUNT(*) FROM products p2\n  WHERE p2.category = p.category AND p2.revenue > p.revenue\n) < 2;\n```\n\nIt's O(n²) per group, so mention that window functions are the better choice whenever they're available."
}
```

> [!TIP] Interview tips
> - Name the three steps (aggregate, rank, filter) before typing. Interviewers like seeing the plan.
> - Always add a tie-breaker to `ORDER BY` inside `ROW_NUMBER`. Without one, results can change between runs.
> - BigQuery and Snowflake support `QUALIFY rn <= 2`, which removes the outer query. Mention it if the role uses those warehouses.
