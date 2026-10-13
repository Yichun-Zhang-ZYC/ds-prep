---
id: sql-self-join
title: SELF JOIN
estimatedMinutes: 10
difficulty: medium
tags: [joins, self-join, hierarchy]
---

## Why it matters
"Employees who earn more than their manager" and "pairs of users in the same city" are interview classics. Both join a table to itself.

## Concept
A self join is an ordinary join where both sides are the same table under different aliases. The aliases are what make it readable:

```sql
FROM employees e          -- the employee
JOIN employees m          -- the same table, read as "manager"
  ON e.manager_id = m.id
```

Typical uses:
- **Hierarchies**: employee → manager, category → parent category.
- **Pairs**: two rows that share an attribute (same city, same order). Use `a.id < b.id` to avoid pairing a row with itself and listing each pair twice.
- **Comparisons across time** (today vs yesterday), although `LAG` is usually cleaner.

## Worked example
Employees who earn more than their manager:

```sql
SELECT e.name AS employee, e.salary, m.name AS manager, m.salary AS manager_salary
FROM employees e
JOIN employees m ON e.manager_id = m.id
WHERE e.salary > m.salary;
```

An inner join drops the CEO (no manager). Use `LEFT JOIN` if the question needs every employee.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You want each unordered pair of customers in the same city exactly once. Which condition do you add?",
  "options": ["`a.id <> b.id`", "`a.id < b.id`", "`a.city = b.city` only", "`DISTINCT` on the result"],
  "answer": 1,
  "explanation": "`<>` removes self-pairs but still returns (1, 2) and (2, 1). `<` keeps exactly one ordering of each pair."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Return the `name` of each employee who earns **more than their manager**, with the manager's name as `manager`.",
  "setup": "CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, salary INTEGER, manager_id INTEGER); INSERT INTO employees VALUES (1,'Mia',200000,NULL),(2,'Noah',150000,1),(3,'Olu',160000,2),(4,'Pia',140000,2),(5,'Quinn',210000,1),(6,'Raj',90000,4),(7,'Sara',145000,4);",
  "starterCode": "SELECT e.name\nFROM employees e\n",
  "solution": "SELECT e.name, m.name AS manager\nFROM employees e\nJOIN employees m ON e.manager_id = m.id\nWHERE e.salary > m.salary;",
  "hints": ["Join employees to itself: one alias for the employee, one for the manager.", "Match e.manager_id to m.id, then compare salaries."]
}
```

> [!TIP] Interview tips
> - Name aliases after their role (`e`, `m`, or `emp`, `mgr`); single letters like `a`/`b` make hierarchy queries hard to follow.
> - For pairs, always explain the `<` trick; interviewers look for it.
> - If asked for the whole chain of managers (not just one level), that's a recursive CTE.
