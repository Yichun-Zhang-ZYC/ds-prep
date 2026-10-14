---
id: sql-consecutive-days-gaps-and-islands
title: 连续天数 / 连续区间（Gaps and Islands）
---

## 为什么重要
“连续 3 天登录的用户”“最长连续天数”“传感器离线的时间段”，这些都是 gaps-and-islands 问题。它是面试官最爱的难题之一，因为没见过一次的话，很难想到其中的技巧。

## 概念
对于连续的日期，**日期减去行号在同一段连续区间内是常数**：

| login_date | row_number | 日期 − 行号 |
|---|---|---|
| 3 月 1 日 | 1 | 2 月 29 日 |
| 3 月 2 日 | 2 | 2 月 29 日 |
| 3 月 3 日 | 3 | 2 月 29 日 |
| 3 月 5 日 | 4 | 3 月 1 日 |
| 3 月 6 日 | 5 | 3 月 1 日 |

差值相同的行构成一个“岛”（连续段）。按差值分组，就能得到每段的开始、结束和长度。

两个关键细节：
- 先对日期去重（同一天登录两次会破坏这个算术关系）。
- 行号要 `PARTITION BY user_id`，每个用户的连续段才互不干扰。

## 示例讲解
每个用户的所有连续段（SQLite 用 `julianday` 做日期运算）：

```sql
WITH days AS (
  SELECT DISTINCT user_id, login_date FROM logins
),
grouped AS (
  SELECT user_id, login_date,
         julianday(login_date) - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date) AS grp
  FROM days
)
SELECT user_id, MIN(login_date) AS streak_start, MAX(login_date) AS streak_end, COUNT(*) AS length
FROM grouped
GROUP BY user_id, grp;
```

同样的思路适用于任何有序序列：连续的 ID，或者相同状态的连续段（用基于 `LAG` 的变化标记再做累计 `SUM`）。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "某用户在 1 月 1 日（两次）、1 月 2 日和 1 月 3 日登录。如果不去重，会出什么问题？",
  "options": ["没问题", "重复的那一行让行号错位，一段连续被拆成两个岛", "julianday 遇到重复会报错", "连续天数变长"],
  "explanation": "3 个日期共 4 行，行号变成 1、2、3、4，日期 − 行号就不再是常数了。要先对日期 DISTINCT。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "对每个用户，返回其**最长连续登录天数** `longest_streak`。列：`user_id, longest_streak`。同一用户一天可能登录多次。",
  "hints": ["在同一段连续区间内，julianday(date) − ROW_NUMBER() 是常数。", "按（用户、分组）计数，再对每个用户取 MAX。"]
}
```

> [!TIP] 面试技巧
> - 在白板上画出那张小表（日期、行号、差值），面试官一眼就能看懂这个技巧。
> - 在面试官帮你发现 bug 之前，主动说“先对日期去重”。
> - “至少连续 N 天”只需要对每个岛加 `HAVING COUNT(*) >= N`。
