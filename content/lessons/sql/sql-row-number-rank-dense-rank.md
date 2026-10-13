---
id: sql-row-number-rank-dense-rank
title: Ranking with ROW_NUMBER, RANK, DENSE_RANK
estimatedMinutes: 15
difficulty: medium
tags: [window-functions, ranking, top-n]
---

## Why it matters
"Top N per group" is one of the most common SQL interview questions. The interviewer is really checking whether you know how the three ranking functions treat ties.

## Concept
All three number rows within a `PARTITION BY` window, in `ORDER BY` order. They differ only when values tie:

| score | ROW_NUMBER | RANK | DENSE_RANK |
|---|---|---|---|
| 95 | 1 | 1 | 1 |
| 90 | 2 | 2 | 2 |
| 90 | 3 | 2 | 2 |
| 85 | 4 | **4** | **3** |

- `ROW_NUMBER` always gives unique numbers. Ties are broken arbitrarily.
- `RANK` gives ties the same number, then skips ahead.
- `DENSE_RANK` gives ties the same number and never skips.

## Worked example

```sql
WITH ranked AS (
  SELECT department, name, salary,
         DENSE_RANK() OVER (
           PARTITION BY department
           ORDER BY salary DESC
         ) AS rnk
  FROM employees
)
SELECT department, name, salary
FROM ranked
WHERE rnk <= 2;
```

You can't filter on a window function in `WHERE`, because it's computed after `WHERE` runs. Wrap it in a CTE or subquery first.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which function returns 1, 2, 2, 3 for the scores 95, 90, 90, 85?",
  "options": ["`ROW_NUMBER`", "`RANK`", "`DENSE_RANK`", "`NTILE(4)`"],
  "answer": 2,
  "explanation": "DENSE_RANK does not skip ranks after ties. RANK would give 1, 2, 2, 4."
}
```

```quiz
{
  "id": "q2",
  "question": "You need to keep exactly one row per user: their most recent event. Which is the safest choice?",
  "options": ["`RANK() ... = 1`", "`DENSE_RANK() ... = 1`", "`ROW_NUMBER() ... = 1` with a tie-breaker in ORDER BY"],
  "answer": 2,
  "explanation": "RANK and DENSE_RANK both return several rows when two events share a timestamp. ROW_NUMBER guarantees one, and a tie-breaker such as event_id makes the choice deterministic."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Return the **top 2 highest-paid employees in each department**. If two people tie for 2nd place, include both. Columns: `department, name, salary`.",
  "setup": "CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, department TEXT, salary INTEGER); INSERT INTO employees VALUES (1,'Ava','Engineering',185000),(2,'Ben','Engineering',172000),(3,'Chen','Engineering',172000),(4,'Iris','Engineering',160000),(5,'Dana','Marketing',128000),(6,'Eli','Marketing',119000),(7,'Jon','Marketing',101000),(8,'Farah','Sales',141000),(9,'Gus','Sales',133000);",
  "starterCode": "-- Top 2 per department, ties included\nSELECT department, name, salary\nFROM employees\n",
  "solution": "WITH ranked AS (\n  SELECT department, name, salary,\n         DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS rnk\n  FROM employees\n)\nSELECT department, name, salary\nFROM ranked\nWHERE rnk <= 2;",
  "hints": ["Think about a window function partitioned by department and ordered by salary.", "Window functions can't go in WHERE. Rank in a CTE, then filter on the rank."]
}
```

```reveal
{
  "prompt": "When would you pick `ROW_NUMBER` over `DENSE_RANK`?",
  "answer": "Use `ROW_NUMBER` when you need **exactly N rows per group**, for example deduplicating events to keep the latest one per user. Add a deterministic tie-breaker to `ORDER BY` (such as `event_id`) so results are stable between runs.\n\nUse `DENSE_RANK` when the question is about **distinct values**, such as \"the 2nd highest salary\", where ties should share a place."
}
```

> [!TIP] Interview tips
> - Ask "how should ties be handled?" before writing anything. It shows you know the three functions differ.
> - Common follow-up: "Now do it without window functions." Use a correlated subquery: `WHERE 2 > (SELECT COUNT(DISTINCT e2.salary) FROM employees e2 WHERE e2.department = e.department AND e2.salary > e.salary)`.
> - Pitfall: filtering on `rnk` in the same `SELECT` that defines it.
