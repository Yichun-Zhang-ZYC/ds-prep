---
id: sql-practice-streaks-and-gaps
title: "练习：连续段、间隔与 Islands"
---

## 为什么重要
连续段和间隔是经典的 SQL 难题：“最长连续登录天数”“连续 3 天活跃的用户”“设备宕机的时间段”“缺失的日期”。解法的关键永远相同，认出来之后整类题都能解。本练习集训练三种变体。基础的“日期减行号”技巧参见 *Consecutive days / gaps and islands*。

## 概念
有三种工具，按题目的形状选择。

1. **日期减行号**（连续日期）。日期去重后，`date - ROW_NUMBER()` 在一段连续区间内是常数。最适合“连续 N 天”。
2. **变化标记加累计求和**（相同值的连续段，或超过阈值的间隔）。当一行开启新一段时标记 1（`LAG` 为 NULL、值变化或间隔过大），然后 `SUM(flag) OVER (ORDER BY ...)` 就是段 id。这是通用版本：不仅适用于日期，也适用于状态和任何间隔规则（如 session）。
3. **对间隔本身用 `LEAD`/`LAG`**（列出缺失的时间段）。当 `next_date - date > 1` 时，间隔从 `date + 1` 到 `next_date - 1`。

避免大部分错误的步骤：
- 先去重为每个（实体、日期）一行。
- 按实体分区，用户和设备之间不会混在一起。
- 按 `(entity, run_id)` 分组，用 `MIN`/`MAX`/`COUNT` 得到该段的起点、终点和长度。
- 明确长度指的是行数还是经过的天数；每天一行时两者一致。

陷阱：每个分区的第一行 `LAG = NULL`，所以直接写 `status <> LAG(status)` 得到的是 NULL 而不是 1（要用 `CASE ... ELSE 1`）；如果忘了分区，只按 `run_id` 分组会把不同实体合并。

## 示例讲解
表 `status_log(device_id, day, status)`，每台设备每天一行。任务：用变化标记的方法，列出每一段相同状态的连续段及其起点、终点和长度。

```sql
WITH flagged AS (
  SELECT device_id, day, status,
         CASE WHEN status = LAG(status) OVER (PARTITION BY device_id ORDER BY day)
              THEN 0 ELSE 1 END AS changed
  FROM status_log
),
runs AS (
  SELECT device_id, day, status,
         SUM(changed) OVER (PARTITION BY device_id ORDER BY day) AS run_id
  FROM flagged
)
SELECT device_id, status, MIN(day) AS start_day, MAX(day) AS end_day, COUNT(*) AS days
FROM runs
GROUP BY device_id, run_id, status
ORDER BY device_id, start_day;
```

结果：

| device_id | status | start_day | end_day | days |
|---|---|---|---|---|
| 1 | up | 2024-05-01 | 2024-05-02 | 2 |
| 1 | down | 2024-05-03 | 2024-05-05 | 3 |
| 1 | up | 2024-05-06 | 2024-05-06 | 1 |
| 2 | down | 2024-05-01 | 2024-05-01 | 1 |
| 2 | up | 2024-05-02 | 2024-05-03 | 2 |
| 3 | up | 2024-05-01 | 2024-05-01 | 1 |
| 3 | down | 2024-05-02 | 2024-05-02 | 1 |
| 3 | up | 2024-05-03 | 2024-05-03 | 1 |
| 3 | down | 2024-05-04 | 2024-05-05 | 2 |

设备 1 的读数是 up、up、down、down、down、up。标记为 1、0、1、0、0、1，累计和得到段 id 1、1、2、2、2、3，也就是 2 天的 up、3 天的 down 和 1 天的 up。设备 2、3 的段 id 也从 1 重新开始，说明分区使计数正确重置。按 `status` 和 `run_id` 一起分组是无害的，还能让你不用聚合就能选出它。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "哪种方法能处理“超过 30 分钟不活跃就开启新 session”？",
  "options": [
    "时间戳减去 ROW_NUMBER()",
    "用 LAG 计算间隔，标记间隔 > 30，再对标记累计 SUM 作为 session id",
    "按小时 GROUP BY",
    "SELECT DISTINCT user_id"
  ],
  "explanation": "时间戳不是等间隔的，所以“日期减行号”失效。变化标记加累计求和适用于任何间隔规则。"
}
```

```quiz
{
  "id": "q2",
  "question": "某用户去重后的登录日期为 03-01、03-02、03-05。用 `LEAD(login_date)` 时，哪一行标识了缺失的 03-03 和 03-04？",
  "options": [
    "03-02 这一行：下一个日期是 03-05，间隔为 03-03 到 03-04",
    "03-01 这一行",
    "03-05 这一行，其 LEAD 为 NULL",
    "没有；LEAD 找不到间隔"
  ],
  "explanation": "在 03-02 这一行，next_date 减 date 为 3 > 1，所以间隔从 date + 1 = 03-03 到 next_date - 1 = 03-04。最后一行的下一个日期为 NULL，不算间隔。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "列出所有**至少连续 3 天**的登录连续段。列：`user_id, streak_start, streak_end, length`。用户一天可能登录多次。",
  "hints": [
    "先对日期去重，之后每个用户的 julianday(date) - ROW_NUMBER() 在一段连续区间内为常数。",
    "按（user_id、该差值）分组，取 MIN、MAX 和 COUNT。",
    "HAVING COUNT(*) >= 3 只保留较长的连续段。"
  ]
}
```

```sql-exercise
{
  "id": "ex2",
  "prompt": "对每个用户，列出**登录之间的间隔**：两次登录之间每一段缺失日期的第一天和最后一天。列：`user_id, gap_start, gap_end`。不要报告首次登录之前或最后一次登录之后的时间。",
  "hints": [
    "对去重后的日期用 LEAD(login_date) 得到每次登录的下一次登录。",
    "下一个日期比当前晚超过 1 天，就存在间隔。",
    "gap_start = date(login_date, '+1 day')，gap_end = date(next_date, '-1 day')。"
  ]
}
```

```sql-exercise
{
  "id": "ex3",
  "prompt": "对每台出现过 `down` 的设备，返回其**最长连续 `down` 天数** `longest_down`。列：`device_id, longest_down`。",
  "hints": [
    "当状态与前一天不同（或没有前一天）时标记为 1。",
    "按设备对标记累计 SUM 得到段 id；按（设备、段 id、状态）分组得到每段长度。",
    "保留 status = 'down' 的段，再按设备取 MAX。"
  ]
}
```

> [!TIP] 面试技巧
> - 大声说出技巧：“先去重，标记每一段的开头，累计求和得到段 id，再按段 id 分组”。
> - 题目不只是连续日期时，用变化标记版本。
> - 提交前在脑中用分区的第一行和重复日期测试一遍。
