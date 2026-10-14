---
id: sql-postgresql-mysql
title: PostgreSQL / MySQL
estimatedMinutes: 10
difficulty: easy
tags: [dialects, postgres, mysql]
---

## Why it matters
Most interview platforms run Postgres or MySQL. Knowing the handful of differences that break queries saves you from syntax errors under time pressure.

## Concept
| Feature | PostgreSQL | MySQL (8.0+) |
|---|---|---|
| String concatenation | `a \|\| b` | `CONCAT(a, b)` (`\|\|` is OR by default) |
| Case-insensitive match | `ILIKE` | `LIKE` is case-insensitive with default collations |
| Integer division | `5 / 2 = 2` | `5 / 2 = 2.5000` (use `DIV` for integer division) |
| Date truncation | `DATE_TRUNC('month', d)` | `DATE_FORMAT(d, '%Y-%m-01')` |
| Days between | `d2 - d1` | `DATEDIFF(d2, d1)` |
| Keep one row per key | `DISTINCT ON (key)` | `ROW_NUMBER()` |
| Upsert | `INSERT ... ON CONFLICT (k) DO UPDATE` | `INSERT ... ON DUPLICATE KEY UPDATE` |
| Full outer join | supported | not supported (emulate with `LEFT JOIN UNION RIGHT JOIN`) |
| Median | `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY x)` | no built-in; use window functions |
| Strict GROUP BY | yes | yes in 8.0 (`ONLY_FULL_GROUP_BY`), lenient in old versions |

Both support CTEs, recursive CTEs and window functions (MySQL since 8.0).

## Worked example
The same "first day of month" bucket in each:

```sql
-- PostgreSQL
SELECT DATE_TRUNC('month', created_at)::date AS month, COUNT(*) FROM orders GROUP BY 1;

-- MySQL
SELECT DATE_FORMAT(created_at, '%Y-%m-01') AS month, COUNT(*) FROM orders GROUP BY month;
```

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "In MySQL, what does `SELECT 7 / 2;` return?",
  "options": ["3", "3.5000", "4", "An error"],
  "answer": 1,
  "explanation": "MySQL's / always returns a decimal. Postgres and SQLite do integer division on integers."
}
```

```quiz
{
  "id": "q2",
  "question": "You need a FULL OUTER JOIN in MySQL. What's the usual workaround?",
  "options": ["Use CROSS JOIN", "LEFT JOIN UNION (the RIGHT JOIN rows that didn't match)", "MySQL supports it since 5.7", "Use INTERSECT"],
  "answer": 1,
  "explanation": "Combine a LEFT JOIN with the unmatched rows of a RIGHT JOIN (or a second LEFT JOIN with tables swapped) using UNION."
}
```

> [!TIP] Interview tips
> - Ask which dialect the platform runs, then stick to it.
> - If you forget a function name, say what you want ("truncate to month") and write it in standard SQL; interviewers care more about logic.
> - The integer-division and `||` differences cause the most silent bugs; mention them if you switch dialects.
