---
id: sql-common-table-expressions
title: 公用表表达式（WITH / CTE）
---

## 为什么重要
在现场 SQL 面试中，可读性比技巧更重要。CTE 让你一步步搭建答案，边写边讲解每一步，也可以逐块调试。

## 概念
CTE 给一个查询起名字，让语句后面的部分像使用表一样使用它：

```sql
WITH step1 AS (
  SELECT ...
),
step2 AS (
  SELECT ... FROM step1      -- later CTEs can use earlier ones
)
SELECT * FROM step2;
```

需要知道的几点：
- CTE 只在定义它的那一条语句里存在。
- 它可以被引用多次。到底是只计算一次还是每次内联展开，取决于引擎（Postgres 12+ 默认内联，除非写 `MATERIALIZED`）。
- CTE 和子查询表达能力相同，CTE 胜在可读性。

## 示例讲解
分步求出每个国家收入最高的客户：

```sql
WITH revenue AS (
  SELECT customer_id, SUM(amount) AS revenue
  FROM orders
  GROUP BY customer_id
),
ranked AS (
  SELECT c.country, c.name, r.revenue,
         ROW_NUMBER() OVER (PARTITION BY c.country ORDER BY r.revenue DESC) AS rn
  FROM revenue r
  JOIN customers c ON c.id = r.customer_id
)
SELECT country, name, revenue
FROM ranked
WHERE rn = 1;
```

每个 CTE 只做一件事，讲解起来很轻松。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "关于 CTE，哪种说法是对的？",
  "options": ["CTE 像视图一样存储在数据库里", "同一个 WITH 子句中，后面的 CTE 可以引用前面的 CTE", "CTE 总是比子查询快", "一个 CTE 只能被引用一次"],
  "explanation": "CTE 的作用域是一条语句，可以链式引用。性能通常与等价的子查询相同。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "使用 CTE，返回收入**高于各国平均收入**的国家 `country` 及其收入 `revenue`。",
  "hints": ["第一个 CTE：按国家计算收入。", "阈值就是这个 CTE 中收入列的平均值；同一个 CTE 可以引用两次。"]
}
```

> [!TIP] 面试技巧
> - 边写边讲：“先算每位客户的收入，再在国家内排名。”
> - CTE 按内容命名（`daily_active`、`first_purchase`），不要叫 `t1`、`t2`。
> - 被问到性能时，提一下物化（materialization），以及被多次引用的 CTE 可能会被重复计算。
