---
id: sql-practice-hierarchies-and-self-joins
title: "Practice: Hierarchies and self-joins"
estimatedMinutes: 15
difficulty: medium
tags: [interview-pattern, practice, self-join, recursive-cte, hierarchy]
---

## Why it matters
'Employees who earn more than their manager', 'managers with at least 5 reports' and 'everyone under the VP' are staples because an org chart is a table that references itself. They test whether you can alias one table twice and know when a fixed number of joins is not enough. For basics see *Self join* and *Recursive CTEs*.

## Concept
Two patterns cover almost everything:

**1. Self-join for one hop.** Alias the table twice, one copy as the child (`e`) and one as the parent (`m`), and join `m.emp_id = e.manager_id`. The same shape answers 'who earns more than their manager', 'employee and manager side by side' and 'pairs within a department' (`a.id < b.id` removes mirrored and self pairs).

- Use `LEFT JOIN` when rows without a parent (the CEO) must survive; an `INNER JOIN` silently drops them.
- To count children, join the other direction (`e` to its reports) with `LEFT JOIN` and `COUNT(r.emp_id)`, so a manager with no reports gets 0, not a missing row. `COUNT(*)` would give 1.

**2. Recursive CTE for unlimited depth.** Anchor on the starting rows, then repeatedly join the CTE to the table to step down (or up) one level, carrying a `depth` or `path` column. Use it for 'all reports, direct and indirect', 'level of each employee' and 'chain of command'. Bound it with `UNION ALL` plus a depth guard if the data might contain a cycle.

Choosing: if the question mentions a fixed number of levels ('manager's manager'), chain self-joins; if it says 'all' or 'at any level', recurse.

Pitfalls: comparing with `manager_id = NULL` (never true; use `IS NULL`), counting the person themself in their own subtree, and forgetting that the top of the tree has a NULL parent. See *Self join* for mirrored pairs.

## Worked example
Table `employees(emp_id, name, manager_id, salary)` where `manager_id` points to another row in the same table. Task: show each employee next to their manager and flag who earns more.

```sql
SELECT e.name AS employee,
       m.name AS manager,
       e.salary,
       m.salary AS manager_salary,
       CASE WHEN e.salary > m.salary THEN 'yes' ELSE 'no' END AS earns_more
FROM employees e
LEFT JOIN employees m ON m.emp_id = e.manager_id
ORDER BY e.emp_id;
```

Result:

| employee | manager | salary | manager_salary | earns_more |
|---|---|---|---|---|
| Ava | NULL | 300 | NULL | no |
| Ben | Ava | 200 | 300 | no |
| Cal | Ava | 180 | 300 | no |
| Dee | Ben | 150 | 200 | no |
| Eli | Ben | 210 | 200 | yes |
| Fay | Cal | 120 | 180 | no |
| Gil | Dee | 100 | 150 | no |
| Hui | Dee | 90 | 150 | no |
| Ian | Eli | 95 | 210 | no |
| Jun | Fay | 130 | 120 | yes |

The `LEFT JOIN` keeps Ava, whose manager columns are NULL, and the comparison `300 > NULL` is not true, so her flag falls to `no`. Eli (210 vs Ben's 200) and Jun (130 vs Fay's 120) are the two people earning more than their manager. Filtering with `WHERE e.salary > m.salary` would return exactly those two rows and drop the CEO automatically.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You count direct reports with `LEFT JOIN employees r ON r.manager_id = e.emp_id` and `COUNT(*)`. An employee with no reports shows what?",
  "options": [
    "0",
    "1, because the NULL-extended row still counts",
    "NULL",
    "The employee is dropped"
  ],
  "answer": 1,
  "explanation": "LEFT JOIN keeps the employee with one NULL-extended row, and COUNT(*) counts rows, so it returns 1. COUNT(r.emp_id) ignores NULL and returns 0."
}
```

```quiz
{
  "id": "q2",
  "question": "'List all employees under Ben at any depth.' Which is the right tool?",
  "options": [
    "One self-join",
    "Three chained self-joins",
    "A recursive CTE anchored on Ben's direct reports",
    "GROUP BY manager_id"
  ],
  "answer": 2,
  "explanation": "Depth is unbounded, so a fixed number of joins will eventually miss levels. A recursive CTE steps one level at a time until no new rows appear."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Find employees who **earn more than their direct manager**. Columns: `name, salary, manager_name`.",
  "setup": "CREATE TABLE employees (emp_id INTEGER, name TEXT, manager_id INTEGER, salary INTEGER);\nINSERT INTO employees VALUES (1,'Ava',NULL,300),(2,'Ben',1,200),(3,'Cal',1,180),(4,'Dee',2,150),(5,'Eli',2,210),(6,'Fay',3,120),(7,'Gil',4,100),(8,'Hui',4,90),(9,'Ian',5,95),(10,'Jun',6,130);",
  "starterCode": "SELECT e.name, ...\nFROM employees e\nJOIN employees m ON ...",
  "solution": "SELECT e.name, e.salary, m.name AS manager_name\nFROM employees e\nJOIN employees m ON m.emp_id = e.manager_id\nWHERE e.salary > m.salary;",
  "hints": [
    "Join employees to itself: the manager row is the one whose emp_id equals this row's manager_id.",
    "An inner join already drops the CEO because there is no manager row.",
    "Filter e.salary > m.salary."
  ]
}
```

```sql-exercise
{
  "id": "ex2",
  "prompt": "For **every employee**, count their direct reports (0 for individual contributors). Columns: `emp_id, name, direct_reports`.",
  "setup": "CREATE TABLE employees (emp_id INTEGER, name TEXT, manager_id INTEGER, salary INTEGER);\nINSERT INTO employees VALUES (1,'Ava',NULL,300),(2,'Ben',1,200),(3,'Cal',1,180),(4,'Dee',2,150),(5,'Eli',2,210),(6,'Fay',3,120),(7,'Gil',4,100),(8,'Hui',4,90),(9,'Ian',5,95),(10,'Jun',6,130);",
  "starterCode": "SELECT e.emp_id, e.name, ...\nFROM employees e\nLEFT JOIN employees r ON ...\nGROUP BY ...",
  "solution": "SELECT e.emp_id, e.name, COUNT(r.emp_id) AS direct_reports\nFROM employees e\nLEFT JOIN employees r ON r.manager_id = e.emp_id\nGROUP BY e.emp_id, e.name;",
  "hints": [
    "Start from employees e and LEFT JOIN the rows r whose manager_id is e.emp_id.",
    "Group by e.emp_id and e.name.",
    "COUNT(r.emp_id), not COUNT(*), so people with no reports get 0."
  ]
}
```

```sql-exercise
{
  "id": "ex3",
  "prompt": "For each manager, count **all reports, direct and indirect**. Only people with at least one report appear. Columns: `emp_id, total_reports`.",
  "setup": "CREATE TABLE employees (emp_id INTEGER, name TEXT, manager_id INTEGER, salary INTEGER);\nINSERT INTO employees VALUES (1,'Ava',NULL,300),(2,'Ben',1,200),(3,'Cal',1,180),(4,'Dee',2,150),(5,'Eli',2,210),(6,'Fay',3,120),(7,'Gil',4,100),(8,'Hui',4,90),(9,'Ian',5,95),(10,'Jun',6,130);",
  "starterCode": "WITH RECURSIVE subtree(boss_id, emp_id) AS (\n  SELECT manager_id, emp_id FROM employees WHERE manager_id IS NOT NULL\n  UNION ALL\n  ...\n)\nSELECT ...",
  "solution": "WITH RECURSIVE subtree(boss_id, emp_id) AS (\n  SELECT manager_id, emp_id FROM employees WHERE manager_id IS NOT NULL\n  UNION ALL\n  SELECT s.boss_id, e.emp_id\n  FROM subtree s\n  JOIN employees e ON e.manager_id = s.emp_id\n)\nSELECT boss_id AS emp_id, COUNT(*) AS total_reports\nFROM subtree\nGROUP BY boss_id;",
  "hints": [
    "Anchor the recursive CTE with the direct (boss, employee) pairs.",
    "Recursive step: keep the same boss and move to the employees who report to the current employee.",
    "COUNT(*) per boss over the full set of pairs; each person appears once per ancestor."
  ]
}
```

> [!TIP] Interview tips
> - Say the alias roles out loud: 'e is the employee, m is the manager'.
> - Use LEFT JOIN when the top of the tree must stay, and COUNT(child.id), never COUNT(*), when zero is a valid answer.
> - Mention that a recursive CTE needs a termination guard if the data can have cycles.
