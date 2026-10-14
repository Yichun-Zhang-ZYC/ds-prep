---
id: sql-month-over-month-growth
title: 月环比增长
---

## 为什么重要
“列出每月收入及其环比增长”几乎是每场分析类面试的热身题。一条短查询就能同时考查聚合、`LAG`、安全除法和百分比格式化。

## 概念
两步走：

1. 聚合到每月一行。
2. 用 `LAG` 把每个月和上个月比较。

增长率 % = （本月 − 上月）/ 上月 × 100。

边界情况：第一个月没有上一个值（增长率为 NULL）；上月为 0 时要用 `NULLIF` 避免除以 0；完全没有数据的月份会直接消失，除非用日历表补齐。

## 示例讲解

```sql
WITH monthly AS (
  SELECT strftime('%Y-%m', order_date) AS month, SUM(amount) AS revenue
  FROM orders
  GROUP BY month
)
SELECT month, revenue,
       LAG(revenue) OVER (ORDER BY month) AS prev_revenue,
       ROUND(100.0 * (revenue - LAG(revenue) OVER (ORDER BY month))
             / NULLIF(LAG(revenue) OVER (ORDER BY month), 0), 1) AS mom_pct
FROM monthly;
```

同比增长可以在完整的月度序列上用 `LAG(revenue, 12)`，或者把每个月与上一年的同一个月做连接。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "收入从 80 变成 100，再从 100 变回 80。两次环比变化分别是多少？",
  "options": ["+20% 和 −20%", "+25% 和 −20%", "+20% 和 −25%", "+25% 和 −25%"],
  "explanation": "(100 − 80) / 80 = +25%；(80 − 100) / 100 = −20%。因为基数变了，百分比变化并不对称。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "返回每个 `month`（`'YYYY-MM'`）、当月 `revenue`，以及环比增长率 `mom_pct`（百分比，保留 1 位小数；第一个月为 NULL）。",
  "hints": ["LAG(revenue) OVER (ORDER BY month) 就是上个月的收入。", "乘以 100.0 可以避免整数除法，并得到百分比。"]
}
```

> [!TIP] 面试技巧
> - 说明缺失月份会怎样：有缺口时 `LAG` 会和两个月前比较。
> - 对季节性业务，除了环比再给出同比。
> - 提一句单月增长噪声很大；3 个月平均增长率或趋势线更容易据此决策。
