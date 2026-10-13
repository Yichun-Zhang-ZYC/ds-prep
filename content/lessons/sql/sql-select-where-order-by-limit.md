---
id: sql-select-where-order-by-limit
title: SELECT, WHERE, ORDER BY, LIMIT
estimatedMinutes: 10
difficulty: easy
tags: [basics, filtering, sorting]
---

## Why it matters
Almost every SQL interview question starts here. Interviewers watch for clean filtering and for whether you know how sorting and `LIMIT` interact.

## Concept
A basic query reads top to bottom, but each clause has one job:

| Clause | Job |
|---|---|
| `SELECT` | which columns (or expressions) to return |
| `FROM` | which table |
| `WHERE` | which **rows** to keep, before any grouping |
| `ORDER BY` | sort the result; `DESC` for largest first |
| `LIMIT n` | keep the first `n` rows **after** sorting |

Without `ORDER BY`, row order is not guaranteed, so `LIMIT` without `ORDER BY` returns arbitrary rows.

## Worked example
Find the three most expensive orders placed in 2024:

```sql
SELECT order_id, customer_id, amount
FROM orders
WHERE order_date >= '2024-01-01'
  AND order_date <  '2025-01-01'
ORDER BY amount DESC
LIMIT 3;
```

The half-open date range (`>=` start, `<` next start) is safer than `BETWEEN` when the column holds timestamps.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What does `SELECT * FROM orders LIMIT 5;` return?",
  "options": ["The 5 oldest orders", "The 5 newest orders", "Any 5 orders, in no guaranteed order", "The 5 largest orders"],
  "answer": 2,
  "explanation": "Without ORDER BY the database may return rows in any order. Always pair LIMIT with ORDER BY when the choice of rows matters."
}
```

```quiz
{
  "id": "q2",
  "question": "Which filter keeps every timestamp on 2024-03-15, including 23:59:59?",
  "options": ["`ts BETWEEN '2024-03-15' AND '2024-03-15'`", "`ts >= '2024-03-15' AND ts < '2024-03-16'`", "`ts = '2024-03-15'`"],
  "answer": 1,
  "explanation": "A half-open range covers the whole day regardless of the time part. The other two only match midnight exactly."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Return the `name` and `price` of the **3 most expensive products** in the `Electronics` category, most expensive first.",
  "setup": "CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, category TEXT, price REAL); INSERT INTO products VALUES (1,'Laptop','Electronics',1299.0),(2,'Headphones','Electronics',199.0),(3,'Monitor','Electronics',349.0),(4,'Desk','Furniture',450.0),(5,'Phone','Electronics',899.0),(6,'Chair','Furniture',220.0),(7,'Keyboard','Electronics',89.0);",
  "starterCode": "SELECT name, price\nFROM products\n",
  "solution": "SELECT name, price\nFROM products\nWHERE category = 'Electronics'\nORDER BY price DESC\nLIMIT 3;",
  "orderMatters": true,
  "hints": ["Filter the category in WHERE.", "Sort by price descending before applying LIMIT 3."]
}
```

> [!TIP] Interview tips
> - Say out loud that `LIMIT` without `ORDER BY` is non-deterministic. It signals experience.
> - Use half-open ranges for dates and timestamps.
> - Dialects differ: `TOP n` (SQL Server), `FETCH FIRST n ROWS ONLY` (standard / Oracle), `LIMIT n` (Postgres, MySQL, BigQuery, Snowflake).
