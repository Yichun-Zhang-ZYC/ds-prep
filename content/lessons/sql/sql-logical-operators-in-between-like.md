---
id: sql-logical-operators-in-between-like
title: Logical operators, IN, BETWEEN, LIKE
estimatedMinutes: 10
difficulty: easy
tags: [basics, filtering, operators]
---

## Why it matters
Filters are where silent bugs hide: a missing pair of parentheses around `OR`, an inclusive `BETWEEN` on timestamps, or a `LIKE` that can't use an index. Interviewers notice.

## Concept
| Operator | Meaning | Watch out for |
|---|---|---|
| `AND`, `OR`, `NOT` | combine conditions | `AND` binds tighter than `OR`; use parentheses |
| `IN (a, b, c)` | equals any value in the list | `NOT IN` with a NULL in the list returns no rows |
| `BETWEEN x AND y` | `>= x AND <= y` | **inclusive** on both ends |
| `LIKE 'ab%'` | pattern match: `%` any string, `_` one character | case sensitivity depends on the database |

Operator precedence is the classic trap. `a OR b AND c` means `a OR (b AND c)`.

## Worked example
Find premium or enterprise customers who signed up in 2024. Without parentheses this query is wrong:

```sql
-- Wrong: returns ALL enterprise customers, any year
SELECT * FROM customers
WHERE plan = 'premium' OR plan = 'enterprise' AND signup_date >= '2024-01-01';

-- Right
SELECT * FROM customers
WHERE plan IN ('premium', 'enterprise')
  AND signup_date >= '2024-01-01';
```

`IN` is easier to read than a chain of `OR`s and avoids the precedence problem entirely.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which rows does `WHERE price BETWEEN 10 AND 20` keep?",
  "options": ["10 < price < 20", "10 <= price < 20", "10 <= price <= 20", "10 < price <= 20"],
  "answer": 2,
  "explanation": "BETWEEN is inclusive on both ends. That's why half-open ranges are safer for dates and timestamps."
}
```

```quiz
{
  "id": "q2",
  "question": "Which patterns match the string `'data_2024'`? Select all that apply.",
  "type": "multi",
  "options": ["`LIKE 'data%'`", "`LIKE '%2024'`", "`LIKE 'data_202_'`", "`LIKE 'Data%'` in a case-sensitive database"],
  "answer": [0, 1, 2],
  "explanation": "`%` matches any string and `_` matches exactly one character. `'data_202_'` works because `_` matches both the underscore and the final 4. 'Data%' fails when matching is case-sensitive (e.g. Postgres; use ILIKE there)."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Return the `email` of users who are on the `pro` or `team` plan **and** whose email ends with `@gmail.com`.",
  "setup": "CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT, plan TEXT); INSERT INTO users VALUES (1,'ana@gmail.com','pro'),(2,'ben@yahoo.com','pro'),(3,'cai@gmail.com','free'),(4,'dee@gmail.com','team'),(5,'eve@company.io','team'),(6,'finn@gmail.com','enterprise'),(7,'gia@gmail.com','pro');",
  "starterCode": "SELECT email\nFROM users\nWHERE ",
  "solution": "SELECT email\nFROM users\nWHERE plan IN ('pro', 'team')\n  AND email LIKE '%@gmail.com';",
  "hints": ["Use IN for the plan list so you don't need parentheses around OR.", "A pattern that ends with a fixed string starts with %."]
}
```

> [!TIP] Interview tips
> - When you mix `AND` and `OR`, add parentheses even if precedence would work. It shows care and avoids review comments.
> - `LIKE '%term'` (leading wildcard) can't use a normal B-tree index. Mention full-text search or a reversed-string index if asked about performance.
> - `NOT IN (subquery)` returns nothing if the subquery yields a NULL. Prefer `NOT EXISTS`.
