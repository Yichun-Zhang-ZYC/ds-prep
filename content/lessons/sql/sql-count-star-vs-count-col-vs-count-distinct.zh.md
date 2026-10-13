---
id: sql-count-star-vs-count-col-vs-count-distinct
title: COUNT(*)、COUNT(col) 与 COUNT(DISTINCT col)
---

## 为什么重要
“有多少用户下过单？”和“下了多少单？”是两个不同的问题，三种 `COUNT` 分别回答不同的问题。选错是面试里最常见的指标 bug。

## 概念
| 表达式 | 统计的是 |
|---|---|
| `COUNT(*)` | 行数 |
| `COUNT(col)` | `col` 不为 NULL 的行数 |
| `COUNT(DISTINCT col)` | `col` 中不同的非 NULL 值的个数 |

在所有主流数据库里 `COUNT(1)` 和 `COUNT(*)` 完全相同，没有性能差别。

## 示例讲解

```sql
SELECT COUNT(*)                   AS orders,           -- every order
       COUNT(coupon_code)         AS orders_with_coupon,
       COUNT(DISTINCT customer_id) AS buyers,           -- unique customers
       COUNT(DISTINCT coupon_code) AS coupons_used
FROM orders;
```

一个快速的数据质量检查是 `COUNT(*) - COUNT(col)`，得到 `col` 中缺失值的数量。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "列 `x` 的值为 1、1、2、NULL、NULL。`COUNT(*)`、`COUNT(x)`、`COUNT(DISTINCT x)` 分别是多少？",
  "options": ["5, 5, 3", "5, 3, 2", "5, 3, 3", "3, 3, 2"],
  "explanation": "5 行；3 个非 NULL 值（1、1、2）；2 个不同的非 NULL 值（1、2）。COUNT(DISTINCT) 从不统计 NULL。"
}
```

```quiz
{
  "id": "q2",
  "question": "`COUNT(DISTINCT a, b)` 是做什么的？",
  "options": ["在所有数据库里统计不同的 (a, b) 组合", "不可移植：MySQL 支持，Postgres 和 SQLite 不支持", "统计不同的 a 加上不同的 b", "与 COUNT(*) 相同"],
  "explanation": "多列 COUNT(DISTINCT) 是 MySQL 的扩展。通用写法：SELECT COUNT(*) FROM (SELECT DISTINCT a, b FROM t) d。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "从 `page_views` 返回一行：总浏览量 `views`、登录用户（`user_id` 非 NULL）的浏览量 `logged_in_views`、以及不同登录用户数 `unique_users`。",
  "hints": ["三个数字分别对应一种 COUNT 写法。"]
}
```

> [!TIP] 面试技巧
> - 写之前先复述指标：“独立买家数就是 `COUNT(DISTINCT customer_id)`。”
> - 被问“`COUNT(1)` 比 `COUNT(*)` 快吗？”答案是不会，优化器对两者一视同仁。
> - 数据量大时精确去重计数很贵。基于 HyperLogLog 的 `APPROX_COUNT_DISTINCT` 用约 1% 的误差换来大幅提速。
