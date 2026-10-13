---
id: sql-order-of-execution
title: Order of execution
estimatedMinutes: 10
difficulty: easy
tags: [basics, execution-order, aliases]
---

## Why it matters
"Why can't I use my column alias in `WHERE`?" and "why can't I filter on a window function?" have the same answer: the logical order of execution. Knowing it lets you debug queries instead of guessing.

## Concept
SQL is written in one order but evaluated, logically, in another:

| Step | Clause | What exists at this point |
|---|---|---|
| 1 | `FROM` / `JOIN` | raw rows from tables |
| 2 | `WHERE` | row filter; no aggregates, no `SELECT` aliases |
| 3 | `GROUP BY` | groups are formed |
| 4 | `HAVING` | group filter; aggregates allowed |
| 5 | `SELECT` | expressions, aliases, **window functions** computed |
| 6 | `DISTINCT` | duplicates removed |
| 7 | `ORDER BY` | can use aliases and window results |
| 8 | `LIMIT` / `OFFSET` | rows trimmed |

The optimizer may physically run things in a different order, but results always behave as if this order were followed.

## Worked example
This fails in most databases because `WHERE` runs before the alias exists:

```sql
-- Error: column "total" does not exist
SELECT order_id, qty * price AS total
FROM order_items
WHERE total > 100;

-- Fix 1: repeat the expression
SELECT order_id, qty * price AS total FROM order_items WHERE qty * price > 100;

-- Fix 2: compute it in a subquery or CTE first
WITH t AS (SELECT order_id, qty * price AS total FROM order_items)
SELECT * FROM t WHERE total > 100;
```

The same logic explains why a window function needs a CTE before you can filter on it: windows are computed in step 5, after `WHERE` and `HAVING`.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Where can you reference a column alias defined in `SELECT`, in standard SQL?",
  "options": ["WHERE", "GROUP BY", "HAVING", "ORDER BY"],
  "answer": 3,
  "explanation": "ORDER BY runs after SELECT, so aliases are visible there. Some engines (SQLite, MySQL, BigQuery) also allow aliases in GROUP BY or HAVING as an extension, but don't rely on it in an interview."
}
```

```quiz
{
  "id": "q2",
  "question": "Which runs first logically?",
  "options": ["HAVING", "WHERE", "SELECT", "ORDER BY"],
  "answer": 1,
  "explanation": "FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Each row of `order_items` is one line of an order. Return `order_id` and the line total `qty * price` as `total`, keeping only lines whose total is **greater than 100**.",
  "setup": "CREATE TABLE order_items (id INTEGER PRIMARY KEY, order_id INTEGER, qty INTEGER, price REAL); INSERT INTO order_items VALUES (1,10,2,30.0),(2,10,1,150.0),(3,11,5,25.0),(4,12,3,20.0),(5,13,10,12.5),(6,13,1,99.0);",
  "starterCode": "SELECT order_id, qty * price AS total\nFROM order_items\n",
  "solution": "SELECT order_id, qty * price AS total\nFROM order_items\nWHERE qty * price > 100;",
  "hints": ["The alias doesn't exist yet when WHERE runs.", "Repeat the expression in WHERE, or wrap the query in a CTE."]
}
```

> [!TIP] Interview tips
> - Recite the order once at the start of a tricky question; it frames your answer.
> - "Logical order" is not "physical order". Mention that the optimizer can push filters down, reorder joins, and so on.
> - When a window result must be filtered, say "I'll compute it in a CTE, then filter". BigQuery and Snowflake also offer `QUALIFY`.
