---
id: sql-retention-and-cohort-analysis
title: 留存与同期群分析
---

## 为什么重要
留存是产品团队最关心的指标，“做一张同期群留存表”是 DS/DA 面试的招牌题。它综合考查日期分桶、连接和条件计数。

## 概念
- **同期群（cohort）**是同一时间段开始使用产品的一组用户（例如按注册月份划分）。
- **第 N 期留存** = 该群体中在加入后第 N 期仍然活跃的用户占比。
- 查询分三步：给每个用户分配同期群；计算每次活动相对于同期群的期数偏移；按（同期群、偏移）统计不同用户数，再除以群体大小。

先对齐定义：什么算“活跃”、注册当期是不是第 0 期、按自然月还是 30 天窗口。

## 示例讲解
按月的同期群留存表（使用 SQLite 日期运算）：

```sql
WITH cohorts AS (
  SELECT id AS user_id, strftime('%Y-%m', signup_date) AS cohort
  FROM users
),
activity_months AS (
  SELECT DISTINCT user_id, strftime('%Y-%m', activity_date) AS month
  FROM activity
),
offsets AS (
  SELECT c.cohort, c.user_id,
         (CAST(substr(a.month, 1, 4) AS INT) * 12 + CAST(substr(a.month, 6, 2) AS INT))
       - (CAST(substr(c.cohort, 1, 4) AS INT) * 12 + CAST(substr(c.cohort, 6, 2) AS INT)) AS month_n
  FROM cohorts c
  JOIN activity_months a ON a.user_id = c.user_id
)
SELECT cohort, month_n, COUNT(DISTINCT user_id) AS active_users
FROM offsets
GROUP BY cohort, month_n
ORDER BY cohort, month_n;
```

用 `active_users` 除以群体大小（`month_n = 0` 时的人数，或从 `cohorts` 中统计）就得到留存率。在 Postgres 中计算偏移更简单：`DATE_PART('month', AGE(month, cohort))` 再加上 12 × 年数。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "统计留存用户时，为什么用 `COUNT(DISTINCT user_id)` 而不是 `COUNT(*)`？",
  "options": ["更快", "一个用户在同一个月里可能有很多条活动记录", "COUNT(*) 会忽略 NULL", "GROUP BY 要求这样写"],
  "explanation": "留存统计的是用户，而不是事件。要先去重到每个用户每期一行。"
}
```

```quiz
{
  "id": "q2",
  "question": "1 月同期群有 200 名用户，其中 50 人在 3 月活跃。1 月同期群的第 2 个月留存是多少？",
  "options": ["25%", "50 人", "2.5%", "取决于 2 月"],
  "explanation": "50 / 200 = 25%。经典留存不要求中间每个月都活跃；那种叫“滚动”或“无界”留存。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "对每个注册月份同期群 `cohort`（`'YYYY-MM'`），返回群体大小 `cohort_size`，以及其中在**下一个自然月**活跃的用户数 `retained_m1`。",
  "hints": ["同期群 'YYYY-MM' 的下一个月是 strftime('%Y-%m', date(cohort || '-01', '+1 month'))。", "LEFT JOIN 活动表，没有活动的用户也计入 cohort_size；留存用户用 COUNT(DISTINCT CASE ... END) 统计。"]
}
```

> [!TIP] 面试技巧
> - 第一分钟先对齐定义：活跃事件、期的长度、第 0 期，以及最近的同期群数据是否完整。
> - 指出越新的同期群可观察的期数越少；不要拿刚满 2 个月的同期群去比较第 6 个月留存。
> - 常见追问：“留存曲线变平”（习惯形成），以及第 N 天留存（`activity_date = signup_date + N`）。
