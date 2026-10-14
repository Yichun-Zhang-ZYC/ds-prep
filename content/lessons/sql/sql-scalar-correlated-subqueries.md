---
id: sql-scalar-correlated-subqueries
title: Scalar and correlated subqueries
estimatedMinutes: 12
difficulty: medium
tags: [subqueries, correlated, performance]
---

## Why it matters
"Employees who earn more than their department's average" is a staple, and interviewers often ask for it with and without window functions. You need to know subqueries, and when they're slow.

## Concept
- A **scalar subquery** returns exactly one value and can be used anywhere a value fits: `SELECT`, `WHERE`, even `ORDER BY`. If it returns more than one row, the query errors.
- A **correlated subquery** references a column from the outer query, so it is (logically) re-evaluated for every outer row.

```sql
-- scalar, not correlated: computed once
SELECT name FROM employees WHERE salary > (SELECT AVG(salary) FROM employees);

-- correlated: one average per outer row's department
SELECT e.name
FROM employees e
WHERE e.salary > (SELECT AVG(e2.salary) FROM employees e2 WHERE e2.department = e.department);
```

Modern optimizers often rewrite correlated subqueries into joins, but not always. On large tables a pre-aggregated CTE or a window function is safer.

## Worked example
The same question three ways:

```sql
-- 1. Correlated subquery
SELECT e.name, e.department, e.salary
FROM employees e
WHERE e.salary > (SELECT AVG(salary) FROM employees x WHERE x.department = e.department);

-- 2. Pre-aggregate and join
WITH dept AS (SELECT department, AVG(salary) AS avg_sal FROM employees GROUP BY department)
SELECT e.name, e.department, e.salary
FROM employees e JOIN dept d ON d.department = e.department
WHERE e.salary > d.avg_sal;

-- 3. Window function
SELECT name, department, salary
FROM (SELECT *, AVG(salary) OVER (PARTITION BY department) AS avg_sal FROM employees) t
WHERE salary > avg_sal;
```

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What happens if a scalar subquery used in `SELECT` returns two rows?",
  "options": ["The first row is used", "The query returns two rows", "Runtime error (in most databases)", "NULL is returned"],
  "answer": 2,
  "explanation": "Postgres, MySQL, SQL Server and BigQuery raise an error. SQLite silently uses the first row, which hides bugs. Guarantee one row with an aggregate or a unique key."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Return the `name` and `department` of employees who earn **more than the average salary of their own department**.",
  "setup": "CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, department TEXT, salary INTEGER); INSERT INTO employees VALUES (1,'Ava','Eng',180000),(2,'Ben','Eng',150000),(3,'Chen','Eng',120000),(4,'Dana','Sales',90000),(5,'Eli','Sales',110000),(6,'Fay','Sales',100000),(7,'Gus','HR',70000);",
  "starterCode": "SELECT e.name, e.department\nFROM employees e\nWHERE e.salary > (\n  -- department average here\n);",
  "solution": "SELECT e.name, e.department\nFROM employees e\nWHERE e.salary > (\n  SELECT AVG(x.salary) FROM employees x WHERE x.department = e.department\n);",
  "hints": ["The subquery needs to reference e.department from the outer query.", "A department with one employee can never have someone above its average."]
}
```

> [!TIP] Interview tips
> - Offer the correlated version for clarity, then mention the CTE or window version for performance.
> - Scalar subqueries in `SELECT` that run per row (e.g. "latest order date per customer") are a common performance smell; suggest a join to an aggregated CTE.
> - Correlated subqueries are the natural way to write `EXISTS` / `NOT EXISTS`; that's where they shine.
