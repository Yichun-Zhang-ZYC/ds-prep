---
id: sql-time-zones
title: 时区
---

## 为什么重要
“为什么我们的日报数字和财务报表对不上？”很多时候答案就是时区：一个系统按 UTC 划分天，另一个按本地时间。面试官问这个，是想看你是否关注数据的正确性，而不只是语法。

## 概念
- 时间戳用 UTC（或带明确偏移量）**存储**，只在出报表时才**转换**。
- “一天”取决于时区。`2024-03-01 03:00 UTC` 的订单在纽约（UTC−5）属于 **2 月 29 日**。
- **夏令时**会让某些本地日期有 23 或 25 个小时，像 `−5 hours` 这样的固定偏移只在一年中的部分时间正确。数据库支持的话，用带名字的时区（`America/New_York`）。

| 引擎 | 把 UTC 时间戳转换为本地日期 |
|---|---|
| Postgres | `(ts AT TIME ZONE 'UTC' AT TIME ZONE 'America/New_York')::date` |
| BigQuery | `DATE(ts, 'America/New_York')` |
| Snowflake | `CONVERT_TIMEZONE('UTC', 'America/New_York', ts)::date` |
| SQLite | `date(ts, '-5 hours')`（只支持固定偏移） |

## 示例讲解
用 UTC 时间戳统计纽约当地时间的每日订单数（SQLite 中用固定的 −5 小时偏移）：

```sql
SELECT date(created_at_utc, '-5 hours') AS local_day, COUNT(*) AS orders
FROM orders
GROUP BY local_day;
```

同样的数据如果按 `date(created_at_utc)` 分组，午夜前后的每日数字会不同，尽管总数一样。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "某事件发生在 `2024-07-01 02:30 UTC`。它在洛杉矶（7 月为 UTC−7）属于哪一天？",
  "options": ["2024-07-01", "2024-06-30", "2024-07-02", "取决于数据库"],
  "explanation": "02:30 − 7 小时 = 6 月 30 日 19:30。"
}
```

```quiz
{
  "id": "q2",
  "question": "为什么 `date(ts, '-5 hours')` 对纽约来说不完全正确？",
  "options": ["SQLite 不能减小时", "纽约在夏令时期间是 UTC−4", "它会四舍五入到整点", "它只适用于 2000 年以后的日期"],
  "explanation": "纽约在 UTC−5（冬季）和 UTC−4（夏季）之间切换。带名字的时区能处理这一点，固定偏移不行。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "`events.ts_utc` 中的时间戳是 UTC。按 **UTC−5 的本地日期**统计事件数，返回 `local_day` 和 `events`。",
  "hints": ["先把时间戳平移 -5 小时，再取日期。", "UTC 05:00 正好是当地的午夜。"]
}
```

> [!TIP] 面试技巧
> - 数字“对不上”时，把时区列为最先检查的几项之一，和过滤条件、迟到数据一起排查。
> - 问清楚业务按哪个时区出报表。跨国公司常用 UTC 或总部时间。
> - 提到夏令时，并说明带名字的时区比固定偏移更安全。
