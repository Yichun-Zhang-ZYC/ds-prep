---
id: sql-group-by-having
title: GROUP BY 与 HAVING
---

## 为什么重要
大多数指标题（“每个区域的收入”“下单超过 3 次的用户”）都是一个 `GROUP BY` 加一个过滤条件。哪个条件放 `WHERE`、哪个放 `HAVING`，是经典的筛选题。

## 概念
- `GROUP BY cols` 把行按 `cols` 的每种不同组合压缩成一行。
- 每个被选中的列，要么出现在 `GROUP BY` 里，要么在聚合函数（`SUM`、`COUNT` 等）里面。
- `WHERE` 在分组**之前过滤行**；`HAVING` 在聚合**之后过滤分组**。

逻辑执行顺序：

`FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT`

这就是为什么不能在 `WHERE` 里用聚合函数：那时分组还不存在。

## 示例讲解
在已完成订单上消费超过 500 美元的客户：

```sql
SELECT customer_id,
       COUNT(*)    AS orders,
       SUM(amount) AS total_spent
FROM orders
WHERE status = 'completed'     -- row filter
GROUP BY customer_id
HAVING SUM(amount) > 500       -- group filter
ORDER BY total_spent DESC;
```

## 检验理解

```quiz
{
  "id": "q1",
  "question": "下面哪些过滤条件必须放在 `HAVING` 而不是 `WHERE`？（多选）",
  "options": ["`COUNT(*) >= 3`", "`country = 'US'`", "`AVG(price) > 20`", "`order_date >= '2024-01-01'`"],
  "explanation": "针对聚合（COUNT、AVG）的条件只能在分组之后检查，所以放 HAVING。普通列上的条件放 WHERE，而且更快，因为它在分组前就减少了数据量。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "返回**员工数至少为 2** 的部门 `department`，以及员工数 `headcount` 和平均工资 `avg_salary`。",
  "hints": ["按部门分组，再统计每组行数。", "员工数的条件是针对聚合的，所以放在 HAVING 里。"]
}
```

> [!TIP] 面试技巧
> - 行级条件即使放 `HAVING` 也能跑，也要放在 `WHERE` 里。这样更清晰，而且过滤得更早。
> - Postgres 和 BigQuery 允许 `GROUP BY 1, 2`（按列位置分组）。面试时可以用，但生产代码里最好写列名。
> - 可能的追问：“把没有员工的部门也显示出来。”这需要从部门表做 `LEFT JOIN`。
