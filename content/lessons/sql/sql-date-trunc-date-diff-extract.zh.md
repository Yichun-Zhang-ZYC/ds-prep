---
id: sql-date-trunc-date-diff-extract
title: DATE_TRUNC、DATE_DIFF、EXTRACT
---

## 为什么重要
几乎每个指标都是“按天 / 周 / 月”。你需要给时间戳分桶、计算日期间隔、取出星期几之类的日期部分。各数据库语法不同，面试官主要看你是否理解思路，并熟练掌握一种方言。

## 概念
| 任务 | Postgres / Snowflake | BigQuery | SQLite（本站使用） |
|---|---|---|---|
| 截断到月 | `DATE_TRUNC('month', ts)` | `DATE_TRUNC(d, MONTH)` | `strftime('%Y-%m-01', d)` |
| 相隔天数 | `d2 - d1` / `DATEDIFF(day, d1, d2)` | `DATE_DIFF(d2, d1, DAY)` | `julianday(d2) - julianday(d1)` |
| 取日期部分 | `EXTRACT(DOW FROM d)` | `EXTRACT(DAYOFWEEK FROM d)` | `strftime('%w', d)`（0 = 周日） |
| 加一段时间 | `d + INTERVAL '7 days'` | `DATE_ADD(d, INTERVAL 7 DAY)` | `date(d, '+7 days')` |

注意周的定义：一周从周日还是周一开始，取决于引擎和设置。说清楚你的假设。

## 示例讲解
每月收入，以及从注册到首单的平均天数：

```sql
SELECT strftime('%Y-%m', order_date) AS month, SUM(amount) AS revenue
FROM orders
GROUP BY month
ORDER BY month;

SELECT AVG(julianday(f.first_order) - julianday(u.signup_date)) AS avg_days_to_first_order
FROM users u
JOIN (SELECT user_id, MIN(order_date) AS first_order FROM orders GROUP BY user_id) f
  ON f.user_id = u.id;
```

按截断后的日期分组（而不是按 `EXTRACT(MONTH ...)`），2023 年 1 月和 2024 年 1 月才不会混在一起。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "在两年的数据上按 `EXTRACT(MONTH FROM order_date)` 给订单分组，会出什么问题？",
  "options": ["没有问题", "不同年份的同一个月被合并到一个桶里", "对时间戳会报错", "月份会按字母顺序排序"],
  "explanation": "EXTRACT(MONTH) 返回 1–12，所以 2023 年 1 月和 2024 年 1 月落在同一组。应截断到月，或者按年和月一起分组。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "以 `'YYYY-MM'` 格式返回每个月份 `month`，以及当月订单数 `orders` 和收入 `revenue`。",
  "hints": ["在 SQLite 中，strftime('%Y-%m', d) 返回 'YYYY-MM'。", "按这个表达式（或它的别名）分组。"]
}
```

> [!TIP] 面试技巧
> - 告诉面试官你用的是哪种方言；只要前后一致，他们很少介意。
> - 澄清“周”（周日或周一开始、ISO 周）和“月”（自然月还是滚动 30 天）。
> - 计算“相隔天数”时说明首尾两天是否计入；这里很容易差一。
