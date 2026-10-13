---
id: sql-null-handling-is-null-coalesce-nullif
title: "NULL handling: IS NULL, COALESCE, NULLIF"
estimatedMinutes: 12
difficulty: easy
tags: [nulls, coalesce, three-valued-logic]
---

## Why it matters
`NULL` bugs are the most common silent error in interview answers: rows vanish from filters, averages shift, and divisions blow up. Interviewers often plant a `NULL` in the sample data on purpose.

## Concept
`NULL` means *unknown*, so comparisons with it are also unknown:

- `NULL = NULL` is **not true**. Use `IS NULL` / `IS NOT NULL`.
- `WHERE col <> 'x'` silently drops rows where `col` is `NULL`.
- Aggregates skip `NULL`s: `AVG(col)` divides by the count of **non-null** values, and `COUNT(col)` ignores them while `COUNT(*)` does not.

Two functions do most of the work:

| Function | Returns | Typical use |
|---|---|---|
| `COALESCE(a, b, …)` | the first non-null argument | default values: `COALESCE(discount, 0)` |
| `NULLIF(a, b)` | `NULL` if `a = b`, else `a` | safe division: `x / NULLIF(y, 0)` |

## Worked example
Conversion rate per campaign, where some campaigns had zero visits:

```sql
SELECT campaign,
       signups * 1.0 / NULLIF(visits, 0)        AS conversion_rate,
       COALESCE(signups * 1.0 / NULLIF(visits, 0), 0) AS conversion_rate_or_zero
FROM campaign_stats;
```

`NULLIF(visits, 0)` turns a divide-by-zero into `NULL`, and `COALESCE` turns that `NULL` into `0` if the report needs a number.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Table `t` has 4 rows with `score` values 10, 20, NULL, 30. What does `AVG(score)` return?",
  "options": ["15", "20", "NULL", "An error"],
  "answer": 1,
  "explanation": "AVG ignores NULL: (10 + 20 + 30) / 3 = 20. Use AVG(COALESCE(score, 0)) if missing should count as 0, which gives 15."
}
```

```quiz
{
  "id": "q2",
  "question": "Which rows does `WHERE status <> 'cancelled'` return?",
  "options": ["Every row that isn't cancelled, including NULL status", "Rows with a non-null status other than cancelled", "Only rows with NULL status"],
  "answer": 1,
  "explanation": "NULL <> 'cancelled' evaluates to unknown, which WHERE treats as false. Add `OR status IS NULL` to keep them."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Some users never set a `nickname`. Return each user's `id` and a `display_name`: the nickname if present, otherwise the `email`. Include every user.",
  "setup": "CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT, nickname TEXT); INSERT INTO users VALUES (1,'ana@x.com','Ana'),(2,'ben@x.com',NULL),(3,'chen@x.com','CC'),(4,'dee@x.com',NULL);",
  "starterCode": "SELECT id,\n       -- display_name here\nFROM users;",
  "solution": "SELECT id, COALESCE(nickname, email) AS display_name\nFROM users;",
  "hints": ["You need the first non-null value out of two columns."]
}
```

```reveal
{
  "prompt": "Why can `COUNT(col)` and `COUNT(*)` give different answers, and when would you use each?",
  "answer": "`COUNT(*)` counts rows. `COUNT(col)` counts rows where `col` is **not null**.\n\nUse `COUNT(*)` for \"how many records\" and `COUNT(col)` for \"how many records have this field filled in\". A quick data-quality check is `COUNT(*) - COUNT(col)`, which gives the number of missing values."
}
```

> [!TIP] Interview tips
> - Before writing a filter, ask: \"Can this column be NULL?\" Interviewers reward the question.
> - `NOT IN (subquery)` returns **no rows** if the subquery contains a NULL. Prefer `NOT EXISTS`.
> - In pandas the same trap appears as `NaN`: `df['x'] != 'a'` keeps NaN rows, unlike SQL.
