---
id: sql-dau-mau-stickiness
title: DAU / MAU / 粘性
---

## 为什么重要
DAU、MAU 以及两者的比值是标准的活跃度指标。面试官会让你算出来，然后追问定义：什么算活跃、滚动月还是自然月、这个比值该怎么解读。

## 概念
- **DAU**：某一天的不同活跃用户数。
- **MAU**：某个月的不同活跃用户数（自然月，或最近 28/30 天）。
- **粘性（stickiness）** = 平均 DAU / MAU。0.5 表示典型的月活用户大约一半的日子都会来。社交类应用目标较高（常在 0.5 以上），每周用一次的工具类产品大约在 0.1–0.2。

MAU **不是** DAU 的总和：一个用户活跃了 10 天，在 DAU 总和里算 10 次，在 MAU 里只算 1 次。每个时间窗口都要按不同用户计数。

## 示例讲解
3 月的平均 DAU、MAU 和粘性：

```sql
WITH march AS (
  SELECT user_id, event_date FROM events
  WHERE event_date >= '2024-03-01' AND event_date < '2024-04-01'
),
daily AS (
  SELECT event_date, COUNT(DISTINCT user_id) AS dau FROM march GROUP BY event_date
)
SELECT ROUND(AVG(dau), 2)                                         AS avg_dau,
       (SELECT COUNT(DISTINCT user_id) FROM march)                AS mau,
       ROUND(AVG(dau) / (SELECT COUNT(DISTINCT user_id) FROM march), 3) AS stickiness
FROM daily;
```

这里只对有活动的日子求平均。如果某些天完全没有活动，要决定是否把它们算作 DAU = 0（用日期序列补齐）。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "一个 30 天的月份里，DAU 每天都恰好是 1,000，MAU 是 10,000。粘性是多少，说明了什么？",
  "options": ["0.1：典型月活用户一个月大约活跃 3 天", "10：非常有粘性", "0.1：10% 的用户流失了", "1.0：每个人每天都回来"],
  "explanation": "1,000 / 10,000 = 0.1，典型月活用户 30 天里大约活跃 3 天。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "针对 2024 年 3 月，返回 `mau`（3 月的不同活跃用户数）和 `avg_dau`（在有活动的日子上每日不同用户数的平均值，保留 2 位小数）。",
  "hints": ["MAU 是整个月的 COUNT(DISTINCT user_id)。", "先在 CTE 里算出每天的 DAU，再求平均。"]
}
```

> [!TIP] 面试技巧
> - 明确定义“活跃”（任何事件？还是有意义的行为？），它会影响后面所有的数字。
> - 有周周期的产品优先用最近 28 天的 MAU，可以消除“2 月天数少”的影响。
> - 说明如何解读粘性下降：低活跃的新用户带来的 MAU 增长，和老用户的活跃度下降是两回事。
