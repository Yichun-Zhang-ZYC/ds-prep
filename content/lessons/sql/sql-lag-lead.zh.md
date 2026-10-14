---
id: sql-lag-lead
title: LAG / LEAD
---

## 为什么重要
日环比变化、用户两次访问的间隔、“价格涨了吗？”，凡是把一行和上一行或下一行做比较的问题，都用 `LAG` / `LEAD`。它取代了笨拙的 `date = date - 1` 自连接写法。

## 概念
```sql
LAG(expr, offset = 1, default = NULL) OVER (PARTITION BY ... ORDER BY ...)
LEAD(expr, offset = 1, default = NULL) OVER (PARTITION BY ... ORDER BY ...)
```

- `LAG` 向前回看 `offset` 行；`LEAD` 向后看。
- 每个分区的第一行没有上一行，所以 `LAG` 返回默认值（不传默认值就是 NULL）。
- `PARTITION BY` 让回看在每个分组内重新开始，例如按用户分区。忘了写的话，会拿一个用户的行和另一个用户的行比较。

`LAG` 按行回看，而不是按日历天。如果某天缺数据，“上一行”就是两天前。当问题关心的是日历天时，先用日期序列补齐缺口。

## 示例讲解
每日收入及其相对前一天的变化：

```sql
SELECT day, revenue,
       revenue - LAG(revenue) OVER (ORDER BY day) AS change,
       ROUND(100.0 * (revenue - LAG(revenue) OVER (ORDER BY day))
             / LAG(revenue) OVER (ORDER BY day), 1)  AS pct_change
FROM daily_revenue;
```

每个用户相邻两次访问之间间隔的天数：

```sql
SELECT user_id, visit_date,
       julianday(visit_date) - julianday(LAG(visit_date) OVER (PARTITION BY user_id ORDER BY visit_date)) AS days_since_last
FROM visits;
```

## 检验理解

```quiz
{
  "id": "q1",
  "question": "`LAG(price, 1, 0) OVER (ORDER BY day)` 在第一行返回什么？",
  "options": ["NULL", "0", "第一个价格", "报错"],
  "explanation": "第三个参数就是没有上一行时使用的默认值。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "对每次登录，返回 `user_id`、`login_date`，以及**同一用户上一次登录的日期** `prev_login`（首次登录为 NULL）。",
  "hints": ["按用户分区，回看就不会跨用户。", "在窗口内按 login_date 排序。"]
}
```

> [!TIP] 面试技巧
> - 一定要说明按什么分区以及原因；漏写 `PARTITION BY` 是 LAG 最经典的 bug。
> - 指出“缺失日期”的问题；如果题目指的是日历天，主动提出用日期序列补齐。
> - `LAG` + `CASE` 可以快速得到“连续”或“状态变化”标记，这正是连续区间（gaps and islands）问题的入口。
