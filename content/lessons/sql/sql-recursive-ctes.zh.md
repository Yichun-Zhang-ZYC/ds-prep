---
id: sql-recursive-ctes
title: 递归 CTE
---

## 为什么重要
有两类面试题需要递归：遍历深度未知的层级（组织架构、类目树），以及生成序列（用日期序列补齐缺失日期）。递归 CTE 用纯 SQL 就能搞定这两类问题。

## 概念
递归 CTE 由两部分组成，中间用 `UNION ALL` 连接：

```sql
WITH RECURSIVE tree AS (
  SELECT ...                    -- 1. anchor: the starting rows
  UNION ALL
  SELECT ... FROM tree JOIN ... -- 2. recursive step: uses the previous iteration
)
SELECT * FROM tree;
```

数据库先执行锚点部分，然后不断对上一轮产生的行执行递归部分，直到某一轮不再返回任何行。一定要保证递归会停止（深度上限，或一个最终会不成立的条件）；数据里有环会导致无限循环。

Postgres、MySQL 和 SQLite 要求写 `RECURSIVE`；SQL Server 和 Oracle 不写。

## 示例讲解
找出经理 1 名下的所有员工及其层级深度：

```sql
WITH RECURSIVE reports AS (
  SELECT id, name, manager_id, 1 AS depth
  FROM employees
  WHERE manager_id = 1                      -- direct reports
  UNION ALL
  SELECT e.id, e.name, e.manager_id, r.depth + 1
  FROM employees e
  JOIN reports r ON e.manager_id = r.id     -- reports of reports
)
SELECT * FROM reports ORDER BY depth, id;
```

日期序列是同样的思路，只是把连接换成了日期运算：从起始日期开始，每次加一天，直到结束日期。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "递归 CTE 什么时候停止？",
  "options": ["迭代 100 次之后", "递归部分不再返回新行时", "锚点部分没有返回行时", "UNION ALL 发现重复行时"],
  "explanation": "每一轮只能看到上一轮产生的行。这个集合为空时递归结束。有些引擎还有安全上限（例如 SQL Server 默认 MAXRECURSION 100）。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "生成 `2024-01-01` 到 `2024-01-07`（含）之间的每一天，命名为 `day`，并返回每天的订单数 `orders`（没有则为 0）。",
  "hints": ["在 SQLite 中，date(day, '+1 day') 可以给 'YYYY-MM-DD' 字符串加一天。", "日期到达结束日就停止，然后 LEFT JOIN 订单表并用 COUNT(o.id) 计数。"]
}
```

> [!TIP] 面试技巧
> - 分别讲清楚锚点部分、递归部分，然后讲停止条件。
> - 处理层级时提一下防环：记录路径，或者限制深度。
> - 如果数仓有 `GENERATE_SERIES` / `GENERATE_DATE_ARRAY`，说明生产环境里会用它来生成日期序列。
