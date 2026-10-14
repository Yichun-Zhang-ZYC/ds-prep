---
id: sql-exists-vs-in
title: EXISTS vs IN
estimatedMinutes: 10
difficulty: medium
tags: [subqueries, exists, in, nulls]
---

## Why it matters
"What's the difference between `EXISTS` and `IN`?" is a common screening question. The good answer covers semantics, NULLs, and performance, in that order.

## Concept
| | `IN (subquery)` | `EXISTS (subquery)` |
|---|---|---|
| Asks | is this value in the list? | does at least one matching row exist? |
| Subquery returns | one column of values | anything (`SELECT 1` is the convention) |
| Correlated? | usually not | usually yes |
| NULL in subquery | harmless for `IN`, **breaks `NOT IN`** | no effect |
| Stops early? | engine-dependent | yes, at the first match |

For the positive case (`IN` vs `EXISTS`), modern optimizers usually produce the same semi-join plan. The real difference is the negative case: `NOT IN` vs `NOT EXISTS`.

## Worked example
Products that have been ordered at least once:

```sql
SELECT p.* FROM products p
WHERE p.id IN (SELECT o.product_id FROM order_lines o);

SELECT p.* FROM products p
WHERE EXISTS (SELECT 1 FROM order_lines o WHERE o.product_id = p.id);
```

Both return the same rows. For "never ordered", only `NOT EXISTS` stays correct if `order_lines.product_id` can be NULL.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which statement about `EXISTS (SELECT * FROM t WHERE ...)` is true?",
  "options": ["SELECT * makes it slower than SELECT 1", "The select list is ignored; only whether a row exists matters", "It returns the matching rows", "It errors if more than one row matches"],
  "answer": 1,
  "explanation": "EXISTS only checks for at least one row. SELECT 1, SELECT * and SELECT NULL behave the same."
}
```

```quiz
{
  "id": "q2",
  "question": "Which pairs always return the same result, even with NULLs in the subquery column? Select all that apply.",
  "type": "multi",
  "options": ["`IN` and `EXISTS`", "`NOT IN` and `NOT EXISTS`", "`NOT EXISTS` and `LEFT JOIN ... WHERE key IS NULL`"],
  "answer": [0, 2],
  "explanation": "IN and EXISTS agree on positive matches. NOT IN differs from NOT EXISTS as soon as the subquery yields a NULL."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Return the `name` of products that appear in at least one order line with `qty >= 5`. List each product once.",
  "setup": "CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT); CREATE TABLE order_lines (id INTEGER PRIMARY KEY, product_id INTEGER, qty INTEGER); INSERT INTO products VALUES (1,'Pen'),(2,'Notebook'),(3,'Stapler'),(4,'Marker'); INSERT INTO order_lines VALUES (1,1,10),(2,1,6),(3,2,1),(4,3,5),(5,NULL,8),(6,2,2);",
  "starterCode": "SELECT p.name\nFROM products p\nWHERE ",
  "solution": "SELECT p.name\nFROM products p\nWHERE EXISTS (\n  SELECT 1 FROM order_lines o\n  WHERE o.product_id = p.id AND o.qty >= 5\n);",
  "hints": ["A plain JOIN would list Pen twice.", "Put both the product match and the qty condition inside EXISTS."]
}
```

> [!TIP] Interview tips
> - Answer in three parts: semantics, NULL behavior (`NOT IN` trap), performance (usually equal today).
> - Avoid claiming "EXISTS is always faster"; that was true for old optimizers and interviewers may push back.
> - Prefer `EXISTS` when the check involves more than one column or extra conditions; `IN` gets awkward there.
