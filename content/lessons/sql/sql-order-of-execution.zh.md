---
id: sql-order-of-execution
title: 执行顺序
---

## 为什么重要
“为什么在 `WHERE` 里用不了列别名？”和“为什么不能直接按窗口函数过滤？”答案是同一个：逻辑执行顺序。掌握它，调试查询时就不用靠猜。

## 概念
SQL 的书写顺序和（逻辑上的）执行顺序不一样：

| 步骤 | 子句 | 此时有什么 |
|---|---|---|
| 1 | `FROM` / `JOIN` | 表中的原始行 |
| 2 | `WHERE` | 行过滤；不能用聚合，也看不到 `SELECT` 里的别名 |
| 3 | `GROUP BY` | 形成分组 |
| 4 | `HAVING` | 分组过滤；可以用聚合 |
| 5 | `SELECT` | 计算表达式、别名和**窗口函数** |
| 6 | `DISTINCT` | 去重 |
| 7 | `ORDER BY` | 可以使用别名和窗口函数结果 |
| 8 | `LIMIT` / `OFFSET` | 截取行 |

优化器实际执行的物理顺序可能不同，但结果总是和按这个顺序执行一致。

## 示例讲解
下面的写法在大多数数据库里会报错，因为 `WHERE` 执行时别名还不存在：

```sql
-- Error: column "total" does not exist
SELECT order_id, qty * price AS total
FROM order_items
WHERE total > 100;

-- Fix 1: repeat the expression
SELECT order_id, qty * price AS total FROM order_items WHERE qty * price > 100;

-- Fix 2: compute it in a subquery or CTE first
WITH t AS (SELECT order_id, qty * price AS total FROM order_items)
SELECT * FROM t WHERE total > 100;
```

同样的道理也解释了为什么要先用 CTE 才能按窗口函数过滤：窗口函数在第 5 步计算，晚于 `WHERE` 和 `HAVING`。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "在标准 SQL 中，`SELECT` 里定义的列别名可以在哪里引用？",
  "options": ["WHERE", "GROUP BY", "HAVING", "ORDER BY"],
  "explanation": "ORDER BY 在 SELECT 之后执行，所以能看到别名。有些引擎（SQLite、MySQL、BigQuery）作为扩展也允许在 GROUP BY 或 HAVING 里用别名，但面试时不要依赖这一点。"
}
```

```quiz
{
  "id": "q2",
  "question": "逻辑上哪个子句最先执行？",
  "options": ["HAVING", "WHERE", "SELECT", "ORDER BY"],
  "explanation": "FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "`order_items` 的每一行是订单中的一个明细。返回 `order_id` 和明细金额 `qty * price`（命名为 `total`），只保留金额**大于 100** 的明细。",
  "hints": ["WHERE 执行时别名还不存在。", "在 WHERE 里重复写表达式，或者先把查询放进 CTE。"]
}
```

> [!TIP] 面试技巧
> - 遇到棘手的题，先把执行顺序说一遍，能帮你理清思路。
> - “逻辑顺序”不等于“物理顺序”。可以提一下优化器会下推过滤条件、调整连接顺序等。
> - 需要按窗口函数结果过滤时，说“我先在 CTE 里算出来再过滤”。BigQuery 和 Snowflake 还支持 `QUALIFY`。
