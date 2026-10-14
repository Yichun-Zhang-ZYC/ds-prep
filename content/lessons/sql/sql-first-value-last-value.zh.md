---
id: sql-first-value-last-value
title: FIRST_VALUE / LAST_VALUE
---

## 为什么重要
“每个用户的首次获客渠道”“把每个价格和当天的开盘价比较”：`FIRST_VALUE` 能把另一行的值附加到当前行，而不压缩行数。`LAST_VALUE` 则以一个框架陷阱出名，面试官很爱考。

## 概念
```sql
FIRST_VALUE(expr) OVER (PARTITION BY ... ORDER BY ...)
LAST_VALUE(expr)  OVER (PARTITION BY ... ORDER BY ... ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
```

陷阱在于：有 `ORDER BY` 而没写框架时，默认框架截止到**当前行**。所以不写框架的 `LAST_VALUE` 只会返回当前行自己的值，而不是分区里的最后一个值。

求“最后一个值”的两种稳妥写法：`FIRST_VALUE(expr) OVER (... ORDER BY key DESC)`，或者显式写出 `UNBOUNDED FOLLOWING`。

## 示例讲解
每条记录附上该用户的初始套餐和当前套餐：

```sql
SELECT user_id, changed_at, plan,
       FIRST_VALUE(plan) OVER (PARTITION BY user_id ORDER BY changed_at) AS first_plan,
       FIRST_VALUE(plan) OVER (PARTITION BY user_id ORDER BY changed_at DESC) AS current_plan
FROM plan_changes;
```

和 `GROUP BY` + `MIN` 不同，这里每一行都保留，还能把每行与首个或最后一个值做比较。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "按时间排序的价格为 10、12、15。`LAST_VALUE(price) OVER (ORDER BY ts)` 在第一行返回什么？",
  "options": ["15", "10", "NULL", "12"],
  "explanation": "默认框架截止到当前行，所以框架内的最后一个值就是这一行本身：10。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "对每次访问，返回 `user_id`、`visit_date`、`channel`，以及该用户的**首次访问渠道** `first_channel`。",
  "hints": ["按用户分区，按 visit_date 排序，取 FIRST_VALUE。"]
}
```

> [!TIP] 面试技巧
> - 主动提到 `LAST_VALUE` 的框架陷阱，说明你真正用过这些函数。
> - “首次触点”和“末次触点”归因，正好就是 `FIRST_VALUE` 配合 `ASC` 和 `DESC`。
> - 如果每个用户只需要一行，`ROW_NUMBER() = 1` 更简单；需要保留每一行时再用 `FIRST_VALUE`。
