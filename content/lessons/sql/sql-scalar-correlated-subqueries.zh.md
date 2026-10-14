---
id: sql-scalar-correlated-subqueries
title: 标量子查询与相关子查询
---

## 为什么重要
“工资高于本部门平均值的员工”是必考题，面试官常常要求用窗口函数和不用窗口函数各写一遍。你需要掌握子查询，也要知道它什么时候会慢。

## 概念
- **标量子查询**恰好返回一个值，可以放在任何需要值的地方：`SELECT`、`WHERE`，甚至 `ORDER BY`。如果它返回多于一行，查询会报错。
- **相关子查询**引用了外层查询的列，所以（逻辑上）对外层的每一行都要重新计算一次。

```sql
-- scalar, not correlated: computed once
SELECT name FROM employees WHERE salary > (SELECT AVG(salary) FROM employees);

-- correlated: one average per outer row's department
SELECT e.name
FROM employees e
WHERE e.salary > (SELECT AVG(e2.salary) FROM employees e2 WHERE e2.department = e.department);
```

现代优化器经常会把相关子查询改写成连接，但并不总是如此。大表上用预聚合的 CTE 或窗口函数更稳妥。

## 示例讲解
同一个问题的三种写法：

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

## 检验理解

```quiz
{
  "id": "q1",
  "question": "如果 `SELECT` 中的标量子查询返回了两行，会发生什么？",
  "options": ["使用第一行", "查询返回两行", "运行时报错（大多数数据库）", "返回 NULL"],
  "explanation": "Postgres、MySQL、SQL Server 和 BigQuery 会报错。SQLite 会悄悄使用第一行，从而掩盖 bug。用聚合或唯一键保证只返回一行。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "返回工资**高于本部门平均工资**的员工的 `name` 和 `department`。",
  "hints": ["子查询需要引用外层查询的 e.department。", "只有一名员工的部门，不可能有人高于平均值。"]
}
```

> [!TIP] 面试技巧
> - 先给出可读性好的相关子查询写法，再提出性能更好的 CTE 或窗口函数写法。
> - `SELECT` 里逐行执行的标量子查询（比如“每位客户的最近下单日期”）是常见的性能隐患，建议改为连接一个聚合后的 CTE。
> - 写 `EXISTS` / `NOT EXISTS` 时，相关子查询是最自然的写法，这正是它的用武之地。
