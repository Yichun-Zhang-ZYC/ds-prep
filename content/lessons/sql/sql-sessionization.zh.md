---
id: sql-sessionization
title: 会话切分（Sessionization）
---

## 为什么重要
原始点击流里没有会话 ID。“按 30 分钟无操作超时把事件切分成会话”是产品分析和数据工程岗位的经典 SQL 难题。

## 概念
三步窗口操作：

1. 对每个事件，用 `LAG` 取**同一用户**上一个事件的时间。
2. 没有上一个事件，或间隔超过超时阈值时，标记为新会话。
3. 对每个用户的标记做累计 `SUM`，得到会话编号。

```text
ts      gap     new_session  session_num
10:00   -       1            1
10:10   10m     0            1
11:00   50m     1            2
11:05   5m      0            2
```

同样的“标记 + 累计求和”技巧，可以给任何“满足条件就开始新一组”的数据编号。

## 示例讲解
以 30 分钟为超时，给每个用户的事件编会话号（SQLite 中 `julianday` 差值 × 1440 = 分钟）：

```sql
WITH prev AS (
  SELECT user_id, ts,
         LAG(ts) OVER (PARTITION BY user_id ORDER BY ts) AS prev_ts
  FROM clicks
),
flagged AS (
  SELECT user_id, ts,
         CASE WHEN prev_ts IS NULL
                OR (julianday(ts) - julianday(prev_ts)) * 1440 > 30
              THEN 1 ELSE 0 END AS new_session
  FROM prev
)
SELECT user_id, ts,
       SUM(new_session) OVER (PARTITION BY user_id ORDER BY ts
                              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS session_num
FROM flagged;
```

在此基础上，按 `(user_id, session_num)` 计算 `MAX(ts) − MIN(ts)` 就是会话时长，`COUNT(*)` 就是每个会话的事件数。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "为什么 LAG 必须按用户分区？",
  "options": ["只是为了性能", "否则一个用户的事件会和另一个用户的上一个事件比较", "LAG 必须写 PARTITION BY", "为了给输出排序"],
  "explanation": "没有 PARTITION BY user_id 时，“上一个事件”可能属于另一个用户，不同用户的会话就会被合并。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "以 **30 分钟**无操作为超时，给每个用户的点击编会话号。返回 `user_id`、`ts` 和 `session_num`（每个用户的第一个会话为 1）。",
  "hints": ["(julianday(a) - julianday(b)) * 1440 就是相隔的分钟数。", "间隔超过 30 分钟（或没有上一次点击）时标记为 1，再按用户对标记做累计 SUM。"]
}
```

> [!TIP] 面试技巧
> - 动笔前先讲清三步（LAG、标记、累计求和），这就是完整的解法。
> - 问清超时时长，以及会话是否在午夜或营销活动切换时也要断开。
> - 生产环境中，提一下在数据管道里增量计算会话，而不是每次都对全部历史重算。
