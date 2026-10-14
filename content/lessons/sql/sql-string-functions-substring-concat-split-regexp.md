---
id: sql-string-functions-substring-concat-split-regexp
title: "String functions: SUBSTRING, CONCAT, SPLIT, REGEXP"
estimatedMinutes: 12
difficulty: easy
tags: [strings, cleaning, dialects]
---

## Why it matters
Real data is messy: emails in mixed case, URLs with tracking parameters, full names in one column. String functions show up in data-cleaning questions and in "count users by email domain"-style warm-ups.

## Concept
| Task | Standard / Postgres | BigQuery | SQLite (used here) |
|---|---|---|---|
| Substring | `SUBSTRING(s FROM 2 FOR 3)` | `SUBSTR(s, 2, 3)` | `substr(s, 2, 3)` |
| Concatenate | `s1 \|\| s2`, `CONCAT(s1, s2)` | `CONCAT(s1, s2)` | `s1 \|\| s2` |
| Position | `POSITION('@' IN s)` | `STRPOS(s, '@')` | `instr(s, '@')` |
| Split | `SPLIT_PART(s, '@', 2)` | `SPLIT(s, '@')[OFFSET(1)]` | `substr` + `instr` |
| Regex | `s ~ 'pattern'`, `REGEXP_REPLACE` | `REGEXP_CONTAINS`, `REGEXP_EXTRACT` | not built in |
| Clean up | `LOWER`, `UPPER`, `TRIM`, `REPLACE`, `LENGTH` | same | same |

Strings are 1-indexed in SQL. `||` with a NULL returns NULL in most databases, while `CONCAT` usually treats NULL as an empty string.

## Worked example
Email domain per user, normalized:

```sql
SELECT id,
       LOWER(TRIM(substr(email, instr(email, '@') + 1))) AS domain
FROM users;
```

In Postgres the same is `LOWER(SPLIT_PART(email, '@', 2))`; in BigQuery, `LOWER(SPLIT(email, '@')[OFFSET(1)])` or `REGEXP_EXTRACT(email, r'@(.+)$')`.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What does `substr('interview', 1, 5)` return?",
  "options": ["'nterv'", "'inter'", "'interv'", "'view'"],
  "answer": 1,
  "explanation": "Positions start at 1, and the third argument is the length: 'inter'."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Return each email **domain** (the part after `@`, lower-cased) as `domain` and the number of users with that domain as `users`.",
  "setup": "CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT); INSERT INTO users VALUES (1,'ana@Gmail.com'),(2,'ben@gmail.com'),(3,'cai@company.io'),(4,'dee@COMPANY.io'),(5,'eve@yahoo.com'),(6,'finn@gmail.com');",
  "starterCode": "SELECT email\nFROM users;",
  "solution": "SELECT LOWER(substr(email, instr(email, '@') + 1)) AS domain,\n       COUNT(*) AS users\nFROM users\nGROUP BY domain;",
  "hints": ["instr(email, '@') gives the position of @; the domain starts one character later.", "Lower-case before grouping, or Gmail.com and gmail.com stay separate."]
}
```

> [!TIP] Interview tips
> - Normalize before grouping (`LOWER`, `TRIM`); mention it even if the sample data looks clean.
> - If regex is available, it's often clearer than nested `substr`/`instr`. Name the function for your dialect.
> - For heavy parsing (URLs, JSON), mention built-in parsers like `JSON_EXTRACT` or `NET.HOST` instead of hand-written string logic.
