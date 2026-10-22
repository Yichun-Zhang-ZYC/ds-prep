---
id: sql-practice-ranking-and-percentiles
title: "Practice: Ranking, percentiles and top-N"
estimatedMinutes: 15
difficulty: hard
tags: [interview-pattern, practice, window-functions, percentiles, top-n]
---

## Why it matters
'Top 3 per group', 'second highest', 'median' and 'p90 latency' appear in nearly every SQL loop. They look like separate tricks, but they are all one idea: order rows inside a partition, then pick by position. The real test is how you handle ties and small groups.

## Concept
Choose the function by how ties should behave (see *ROW_NUMBER, RANK, DENSE_RANK* and *Top-N per group*):

- `ROW_NUMBER`: unique positions, ties broken arbitrarily unless you add a tiebreaker. Use for "exactly N rows per group" or dedup.
- `RANK`: ties share a rank and leave gaps (1, 2, 2, 4). "Top 3" may return more than 3 rows.
- `DENSE_RANK`: ties share a rank, no gaps (1, 2, 2, 3). Use for "top N distinct values" and "Nth highest salary".

**Percentiles without `PERCENTILE_CONT`** (SQLite and MySQL lack it; Postgres, Snowflake and BigQuery have variants, see *Median and percentiles*). The portable recipe is nearest-rank:

1. Number rows ascending per group: `rn`, and count rows: `n = COUNT(*) OVER (PARTITION BY g)`.
2. The $p$-th percentile is the row at position $\lceil p \cdot n \rceil$.
3. The median for even $n$ is the average of positions $n/2$ and $n/2 + 1$. A single filter handles both parities: `rn IN ((n + 1) / 2, (n + 2) / 2)` with integer division.

`NTILE(k)` and `PERCENT_RANK` give bucket labels and relative rank, but `NTILE` splits tied values across buckets, so be explicit about that if ties exist.

Pitfalls: ordering `DESC` vs `ASC` when computing a percentile, `LIMIT` inside a per-group problem (it limits the whole result), and groups smaller than N (the "second highest" may not exist: return NULL, not an error).

## Worked example
Table `employees(emp_id, name, dept, salary)`. The three ranking functions side by side show exactly where they diverge on ties.

```sql
SELECT name, dept, salary,
       ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC) AS rn,
       RANK()       OVER (PARTITION BY dept ORDER BY salary DESC) AS rk,
       DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS drk
FROM employees
ORDER BY dept, salary DESC, name;
```

Result:

| name | dept | salary | rn | rk | drk |
|---|---|---|---|---|---|
| Ann | Eng | 150 | 1 | 1 | 1 |
| Bo | Eng | 140 | 2 | 2 | 2 |
| Cy | Eng | 140 | 3 | 2 | 2 |
| Di | Eng | 120 | 4 | 4 | 3 |
| Ed | Eng | 100 | 5 | 5 | 4 |
| Ivy | Ops | 70 | 1 | 1 | 1 |
| Jo | Ops | 60 | 2 | 2 | 2 |
| Flo | Sales | 90 | 1 | 1 | 1 |
| Gus | Sales | 80 | 2 | 2 | 2 |
| Hal | Sales | 80 | 3 | 2 | 2 |

In Eng, Bo and Cy tie at 140: `ROW_NUMBER` gives them 2 and 3 (arbitrary order), `RANK` gives 2 and 2 and then jumps to 4 for Di, `DENSE_RANK` gives 2 and 2 and then 3. So "top 3 salary levels in Eng" is `drk <= 3`, which returns Ann, Bo, Cy and Di (4 people, 3 distinct levels), while `rn <= 3` would silently drop Cy or Bo depending on tie-breaking.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Salaries in a department are 100, 90, 90, 80. What does `RANK() ... ORDER BY salary DESC` assign to 80, and what would `DENSE_RANK()` assign?",
  "options": [
    "3 and 3",
    "4 and 4",
    "4 and 3",
    "3 and 4"
  ],
  "answer": 2,
  "explanation": "RANK gives 1, 2, 2, 4 (a gap after the tie); DENSE_RANK gives 1, 2, 2, 3."
}
```

```quiz
{
  "id": "q2",
  "question": "A group has $n = 10$ values. Under the nearest-rank definition, which sorted position is the 90th percentile?",
  "options": [
    "9",
    "10",
    "9.5 (interpolated)",
    "1"
  ],
  "answer": 0,
  "explanation": "Position is ceil(0.9 x 10) = 9 in ascending order. Interpolating definitions (PERCENTILE_CONT) would give a value between positions 9 and 10, so name your definition."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Return everyone whose salary is among the **top 2 distinct salary levels** of their department. Columns: `name, dept, salary`.",
  "setup": "CREATE TABLE employees (emp_id INTEGER, name TEXT, dept TEXT, salary INTEGER);\nINSERT INTO employees VALUES (1,'Ann','Eng',150),(2,'Bo','Eng',140),(3,'Cy','Eng',140),(4,'Di','Eng',120),(5,'Ed','Eng',100),(6,'Flo','Sales',90),(7,'Gus','Sales',80),(8,'Hal','Sales',80),(9,'Ivy','Ops',70),(10,'Jo','Ops',60);",
  "starterCode": "WITH ranked AS (\n  SELECT name, dept, salary,\n         -- rank here\n  FROM employees\n)\nSELECT name, dept, salary FROM ranked WHERE ...",
  "solution": "WITH ranked AS (\n  SELECT name, dept, salary,\n         DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS drk\n  FROM employees\n)\nSELECT name, dept, salary\nFROM ranked\nWHERE drk <= 2;",
  "hints": [
    "You need a rank that gives tied salaries the same position and has no gaps.",
    "DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC), then filter in an outer query."
  ]
}
```

```sql-exercise
{
  "id": "ex2",
  "prompt": "Compute the **median salary per department** (average of the two middle values when the count is even). Columns: `dept, median_salary`.",
  "setup": "CREATE TABLE employees (emp_id INTEGER, name TEXT, dept TEXT, salary INTEGER);\nINSERT INTO employees VALUES (1,'Ann','Eng',150),(2,'Bo','Eng',140),(3,'Cy','Eng',140),(4,'Di','Eng',120),(5,'Ed','Eng',100),(6,'Flo','Sales',90),(7,'Gus','Sales',80),(8,'Hal','Sales',80),(9,'Ivy','Ops',70),(10,'Jo','Ops',60);",
  "starterCode": "WITH numbered AS (\n  SELECT dept, salary,\n         ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary) AS rn,\n         COUNT(*) OVER (PARTITION BY dept) AS n\n  FROM employees\n)\nSELECT ...",
  "solution": "WITH numbered AS (\n  SELECT dept, salary,\n         ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary) AS rn,\n         COUNT(*) OVER (PARTITION BY dept) AS n\n  FROM employees\n)\nSELECT dept, AVG(salary) AS median_salary\nFROM numbered\nWHERE rn IN ((n + 1) / 2, (n + 2) / 2)\nGROUP BY dept;",
  "hints": [
    "Number rows ascending per dept and count the rows per dept in the same CTE.",
    "With integer division, (n + 1) / 2 and (n + 2) / 2 are the same row for odd n and the two middle rows for even n.",
    "AVG over the one or two selected rows, grouped by dept."
  ]
}
```

```sql-exercise
{
  "id": "ex3",
  "prompt": "Return the **75th percentile salary per department using the nearest-rank method** (the value at ascending position $\\lceil 0.75 n \\rceil$). Columns: `dept, p75_salary`.",
  "setup": "CREATE TABLE employees (emp_id INTEGER, name TEXT, dept TEXT, salary INTEGER);\nINSERT INTO employees VALUES (1,'Ann','Eng',150),(2,'Bo','Eng',140),(3,'Cy','Eng',140),(4,'Di','Eng',120),(5,'Ed','Eng',100),(6,'Flo','Sales',90),(7,'Gus','Sales',80),(8,'Hal','Sales',80),(9,'Ivy','Ops',70),(10,'Jo','Ops',60);",
  "starterCode": "WITH numbered AS (\n  SELECT dept, salary,\n         ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary) AS rn,\n         COUNT(*) OVER (PARTITION BY dept) AS n\n  FROM employees\n)\nSELECT ...",
  "solution": "WITH numbered AS (\n  SELECT dept, salary,\n         ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary) AS rn,\n         COUNT(*) OVER (PARTITION BY dept) AS n\n  FROM employees\n)\nSELECT dept, salary AS p75_salary\nFROM numbered\nWHERE rn = (3 * n + 3) / 4;",
  "hints": [
    "ceil(0.75 * n) equals (3 * n + 3) / 4 with integer division.",
    "Number rows ascending, then keep the row whose rn equals that position.",
    "Each department returns exactly one row, even with ties in the salary values."
  ]
}
```

> [!TIP] Interview tips
> - Ask: 'How should ties behave?' before choosing ROW_NUMBER, RANK or DENSE_RANK.
> - If PERCENTILE_CONT is unavailable, offer the nearest-rank recipe and state which definition you use.
> - Mention the empty/small group case: fewer than N rows means fewer results (or NULL), not an error.
