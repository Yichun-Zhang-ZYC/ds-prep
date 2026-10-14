---
id: sql-second-highest-salary-nth-value
title: Second highest salary / Nth value
estimatedMinutes: 12
difficulty: medium
tags: [interview-pattern, ranking, edge-cases]
---

## Why it matters
"Find the second highest salary" is one of the most-asked SQL questions ever. It's short, so the interviewer is really grading edge cases: ties at the top, and what to return when there's no second value.

## Concept
"Second highest" usually means the second highest **distinct** value. Three standard approaches:

| Approach | Query sketch | Handles ties? | Returns NULL if missing? |
|---|---|---|---|
| MAX below MAX | `MAX(salary) WHERE salary < (SELECT MAX(salary) ...)` | yes | yes |
| DENSE_RANK | `DENSE_RANK() OVER (ORDER BY salary DESC) = 2` | yes | no (returns zero rows) |
| DISTINCT + OFFSET | `SELECT DISTINCT salary ... ORDER BY salary DESC LIMIT 1 OFFSET 1` | yes | no (zero rows) |

To return NULL instead of zero rows, wrap the query as a scalar subquery: `SELECT (SELECT ... LIMIT 1 OFFSET 1) AS second_highest`.

## Worked example
Nth highest distinct salary in general (N = 3 here):

```sql
SELECT (
  SELECT DISTINCT salary
  FROM employees
  ORDER BY salary DESC
  LIMIT 1 OFFSET 2          -- N - 1
) AS third_highest;
```

`DISTINCT` matters: with salaries 200, 200, 150 the second highest is 150, not 200.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Salaries are 300, 300, 250, 200. What is the second highest salary (distinct)?",
  "options": ["300", "250", "200", "There is none"],
  "answer": 1,
  "explanation": "The distinct values are 300, 250, 200, so the second highest is 250."
}
```

```quiz
{
  "id": "q2",
  "question": "The table has a single employee. What does `SELECT MAX(salary) FROM employees WHERE salary < (SELECT MAX(salary) FROM employees)` return?",
  "options": ["Zero rows", "One row with NULL", "The only salary", "An error"],
  "answer": 1,
  "explanation": "An aggregate without GROUP BY always returns one row; with nothing to aggregate it's NULL. That's exactly the expected output in the classic version of this question."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Return the second highest **distinct** salary as `second_highest`. Return one row, with NULL if no such salary exists.",
  "setup": "CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, salary INTEGER); INSERT INTO employees VALUES (1,'Ava',180000),(2,'Ben',180000),(3,'Chen',150000),(4,'Dana',150000),(5,'Eli',120000);",
  "starterCode": "SELECT salary\nFROM employees\nORDER BY salary DESC;",
  "solution": "SELECT MAX(salary) AS second_highest\nFROM employees\nWHERE salary < (SELECT MAX(salary) FROM employees);",
  "hints": ["Two people share the top salary, so 'second row' isn't the answer.", "Take the max of everything strictly below the overall max."]
}
```

> [!TIP] Interview tips
> - Ask two questions first: "distinct values or rows?" and "what if there's no second?".
> - Give the `MAX < MAX` answer for N = 2, then generalize with `DENSE_RANK` or `OFFSET N-1` when asked for N.
> - Per-department version: `DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) = 2`.
