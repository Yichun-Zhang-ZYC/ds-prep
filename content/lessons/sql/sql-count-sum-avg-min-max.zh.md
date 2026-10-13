---
id: sql-count-sum-avg-min-max
title: COUNT、SUM、AVG、MIN、MAX
---

## 为什么重要
每个指标最初都是一个聚合。面试官会检查边界情况：整数除法、NULL，以及“平均值的平均值”。

## 概念
| 函数 | 返回 | 对 NULL 的处理 |
|---|---|---|
| `COUNT(*)` | 行数 | 每一行都计数 |
| `COUNT(col)` | `col` 不为 NULL 的行数 | 跳过 NULL |
| `SUM(col)` | 总和 | 跳过 NULL；全部为 NULL 时返回 NULL |
| `AVG(col)` | 非 NULL 值的均值 | 跳过 NULL（分母也随之变化） |
| `MIN` / `MAX` | 最小 / 最大值 | 跳过 NULL；数字、文本、日期都适用 |

没有 `GROUP BY` 时，聚合会把整张表压缩成一行。

当心**整数除法**：在 SQLite、Postgres 和 SQL Server 中 `5 / 2 = 2`。除之前先乘以 `1.0`（或做类型转换）。

## 示例讲解
每位客户的订单数、收入和平均客单价：

```sql
SELECT customer_id,
       COUNT(*)                    AS orders,
       SUM(amount)                 AS revenue,
       ROUND(AVG(amount), 2)       AS avg_order_value,
       MIN(order_date)             AS first_order,
       MAX(order_date)             AS last_order
FROM orders
GROUP BY customer_id;
```

整体的平均客单价是所有订单的 `SUM(amount) / COUNT(*)`，**而不是**每位客户平均值的平均。后者会低估订单多的客户的权重。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "在 SQLite 中，`SELECT 7 / 2;` 返回什么？",
  "options": ["3.5", "3", "4", "报错"],
  "explanation": "两个操作数都是整数，所以是整数除法。写成 7 * 1.0 / 2 或 CAST(7 AS REAL) / 2 才能得到 3.5。"
}
```

```quiz
{
  "id": "q2",
  "question": "客户 A 有 1 笔 100 美元的订单，客户 B 有 3 笔 10 美元的订单。所有订单的平均客单价是多少？",
  "options": ["$55", "$32.50", "$40", "$10"],
  "explanation": "总收入 130 美元 / 4 笔订单 = 32.50 美元。对每位客户的平均值再求平均得到 (100 + 10) / 2 = 55 美元，这是错的。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "对每个 `product_id`，返回评论数 `reviews` 和平均评分 `avg_rating`（保留 2 位小数）。有些评论没有评分（NULL），它们不计入平均分，但要计入评论数。",
  "hints": ["COUNT(*) 统计所有评论；AVG 本身就会跳过 NULL 评分。", "用 ROUND(..., 2) 包住 AVG。"]
}
```

> [!TIP] 面试技巧
> - 说清楚你用的是哪个分母：“按所有订单平均”还是“按客户平均”，它们回答的是不同的问题。
> - 第一次对计数做除法时就提到整数除法，这是经典陷阱。
> - 对日期用 `MIN`/`MAX` 可以快速得到每个用户的首次和最近一次活跃时间，留存和流失类题目经常用到。
