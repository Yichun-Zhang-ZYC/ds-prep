---
id: sql-practice-user-activity-and-sessions
title: "练习：用户活跃与参与度查询"
---

## 为什么重要
产品和增长团队每天都在和行为表打交道：每个事件一行、数据量巨大、没有现成的 session 列。面试官用 DAU、新老用户、次日留存和 sessionization 来考察你能否把原始事件变成用户级事实且不重复计数。

## 概念
事件日志类题目的思路：

1. **先把事件收敛到需要的粒度。** `SELECT DISTINCT user_id, date(event_ts)` 得到每个用户每天一行；几乎所有参与度指标都从这里开始。
2. **数用户，不是数事件。** 凡是“有多少用户”都用 `COUNT(DISTINCT user_id)`；一个用户有 50 个事件也只算 1 个 DAU。
3. **用 CTE 派生每个用户的锚点。** 首次出现日（`MIN`）区分新用户和老用户；注册日是同期群和留存的锚点。
4. **Session 就是间隔。** 对每个用户的事件排序，用 `LAG` 计算间隔，超过阈值（常见为 30 分钟）就标记为新 session，再对标记做累计 `SUM` 得到 session id。参见 *Sessionization*。
5. **滚动去重计数**（最近 7 天的去重用户数）不能用窗口函数，因为窗口框架内不允许 `COUNT(DISTINCT ...)`。可以把用户-日自关联到日期范围，或使用日历表。

陷阱：时间戳和日期混着比较；时区偏移导致事件跨日（参见 *Time zones*）；除错分母（留存的分母是同期群人数，而不是当天活跃人数）。相关：*DAU, MAU and stickiness*、*Retention and cohort analysis*。

## 示例讲解
表：`users(user_id, signup_date)` 和 `events(user_id, event_ts, event_type)`。任务：统计每日活跃用户，并拆分为新用户（首次活跃日）和老用户。

```sql
WITH daily AS (
  SELECT DISTINCT user_id, date(event_ts) AS d FROM events
),
first_day AS (
  SELECT user_id, MIN(d) AS d0 FROM daily GROUP BY user_id
)
SELECT d,
       COUNT(*) AS dau,
       SUM(d = d0) AS new_users,
       SUM(d <> d0) AS returning_users
FROM daily
JOIN first_day USING (user_id)
GROUP BY d
ORDER BY d;
```

结果：

| d | dau | new_users | returning_users |
|---|---|---|---|
| 2024-03-01 | 2 | 2 | 0 |
| 2024-03-02 | 3 | 1 | 2 |
| 2024-03-03 | 1 | 0 | 1 |
| 2024-03-04 | 3 | 1 | 2 |

以 2024-03-04 为例：用户 1、3、4 活跃，DAU 为 3。用户 4 是新用户；用户 1 和 3 更早出现过，所以老用户为 2。如果 `daily` 里不加 `DISTINCT`，用户 1 在 03-01 的三个事件会把当天 DAU 从 2 虚增到 4。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "为什么不能用 `COUNT(DISTINCT user_id) OVER (ORDER BY d ROWS 6 PRECEDING)` 计算“最近 7 天去重用户数”？",
  "options": [
    "窗口函数不能使用 ORDER BY",
    "大多数引擎（包括 SQLite）不支持在窗口聚合里用 DISTINCT",
    "结果会是整数",
    "ROWS 不能带数字"
  ],
  "explanation": "多数引擎不允许 COUNT(DISTINCT) 作为窗口函数。常用做法是把用户-日自关联到日期范围，或使用日历表。另外，对用户-日用 ROWS 框架本身也不对：行不等于天。"
}
```

```quiz
{
  "id": "q2",
  "question": "03-01 注册的同期群有 2 个用户，其中 1 人在 03-02 活跃。次日留存率是多少？分母是什么？",
  "options": [
    "1/3，03-02 所有活跃用户",
    "1/2，03-02 的活跃用户数",
    "1/2，分母是同期群人数（03-01 注册的用户数）",
    "1，因为有人回来了"
  ],
  "explanation": "分母永远是同期群人数，这里是 2。分子是同期群中恰好一天后活跃的人数：1。所以是 50%。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "按注册日计算**次日留存**。列：`signup_date, cohort_size, retained, d1_rate`，其中 `retained` 是注册后恰好一天有事件的用户数，`d1_rate` 保留 3 位小数。注意关联 `events` 会让用户重复，要对用户去重计数。",
  "hints": [
    "LEFT JOIN events，条件为 user_id 相同且 date(event_ts) = date(signup_date, '+1 day')。",
    "一个用户在次日有多个事件会被重复，所以用 COUNT(DISTINCT ...)。",
    "retained 统计关联到事件（非 NULL）的用户；分母是 COUNT(DISTINCT u.user_id)。"
  ]
}
```

```sql-exercise
{
  "id": "ex2",
  "prompt": "统计**每个用户的 session 数**：当与该用户上一个事件的间隔**超过 30 分钟**时开启新 session（第一个事件总是开启一个）。列：`user_id, sessions`。",
  "hints": [
    "按用户分区、按 event_ts 排序使用 LAG(event_ts)。",
    "SQLite 中两个时间戳相差的分钟数：(julianday(a) - julianday(b)) * 24 * 60。",
    "上一条为 NULL 或间隔超过 30 时标记 1，再按用户 SUM；只要数量的话不需要累计求和。"
  ]
}
```

```sql-exercise
{
  "id": "ex3",
  "prompt": "对数据中出现的每个日期，统计**以该日期结束的 3 天窗口（该日及前两天）内的去重活跃用户数**。列：`d, active_3d`。",
  "hints": [
    "先得到去重的用户-日列表。",
    "自关联：对每个日期，匹配日期在 date(d, '-2 day') 到 d 之间的用户-日。",
    "按外层日期做 COUNT(DISTINCT user_id)，因为同一用户可能在多天匹配上。"
  ]
}
```

> [!TIP] 面试技巧
> - 先说“每个用户每天一行”，表明你掌控了粒度。
> - 留存要明确同期群和分母（同期群人数，而不是活跃人数）。
> - Session 题要问清不活跃阈值，以及 session 是否可以跨午夜。
