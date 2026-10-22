---
id: sql-practice-dedup-and-data-cleaning
title: "练习：去重与数据清洗"
---

## 为什么重要
真实的表里有重复加载的行、三种大小写的邮箱，以及存成 'N/A' 的金额。面试官会问“找出重复”“每个键保留最新的一行”“先清洗这一列再聚合”，因为正确答案取决于你必须说清楚的决定：键是什么、哪一行胜出、NULL 代表什么。基础参见 *Duplicates: detection and dedup* 和 *NULL handling*。

## 概念
分三步进行。

1. **比较之前先规范化键。** `LOWER(TRIM(email))` 让 `'Ann@X.com '` 与 `'ann@x.com'` 相等。要按列决定哪种规范化是安全的（邮箱可以忽略大小写和空白；区分大小写的 ID 则不行）。
2. **检测：** `GROUP BY key HAVING COUNT(*) > 1` 列出重复的键；`COUNT(*) - COUNT(DISTINCT key)` 给出多余的行数。
3. **用确定性的规则解决。** 标准写法是 `ROW_NUMBER() OVER (PARTITION BY key ORDER BY created_at DESC, id DESC)`，保留 `rn = 1`。务必加上次级排序（`id`），这样重跑结果一致。替代方案：按键取 `MIN(id)` 再关联回去，或者当重复应被合并时用 `GROUP BY key` 加聚合。

**清洗数值：**
- `NULLIF(x, '')` 把占位符变成 NULL，聚合时会被跳过。`COALESCE(a, b)` 填充默认值。
- 清洗之后再转换类型：`CAST(NULLIF(NULLIF(TRIM(amount),''),'N/A') AS REAL)`。
- `AVG` 会忽略 NULL，如果把空白当成 0，均值会被悄悄拉低；要想清楚你的意思。

**NULL 键彼此不是重复。** `NULL = NULL` 不为真，所以邮箱缺失的行通常应该保留，而不是合并成一行。用 `COALESCE(key, 'missing-' || id)` 分区可以让它们保持独立。

**事件流去重**（重复点击、重试）依赖顺序：用 `LAG` 和上一行比较，落在窗口内就丢弃。

陷阱：没先检查数量就直接删除；在错误的粒度上去重；`ROW_NUMBER` 没有次级排序导致结果不确定。

## 示例讲解
表 `customers_raw(id, email, name, country, created_at, amount)`，邮箱很脏。任务：找出去除空白并转小写之后出现在多行的邮箱地址。

```sql
SELECT LOWER(TRIM(email)) AS email_norm,
       COUNT(*) AS n_rows,
       MIN(created_at) AS first_seen,
       MAX(created_at) AS last_seen
FROM customers_raw
WHERE email IS NOT NULL
GROUP BY LOWER(TRIM(email))
HAVING COUNT(*) > 1
ORDER BY email_norm;
```

结果：

| email_norm | n_rows | first_seen | last_seen |
|---|---|---|---|
| ann@x.com | 2 | 2024-01-01 | 2024-02-01 |
| bob@y.com | 2 | 2024-01-10 | 2024-01-15 |

有两个键冲突：`ann@x.com`（id 1 和 2，id 1 带有尾部空格和混合大小写）和 `bob@y.com`（id 3 和 4）。直接 `GROUP BY email` 一个都找不到，因为原始字符串不同。第 6、7 行邮箱为 NULL，被 `WHERE` 排除，因为缺失不等于相同。`first_seen`/`last_seen` 显示副本之间相隔多久，有助于决定保留哪一行。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "两行的 `email` 都是 NULL。`GROUP BY email` 会把它们放进同一组吗？`a.email = b.email` 的连接会匹配它们吗？",
  "options": [
    "两者都会",
    "GROUP BY 会把它们分到一组，但连接中 NULL = NULL 不为真，所以不匹配",
    "两者都不会",
    "连接会匹配，GROUP BY 不会"
  ],
  "explanation": "GROUP BY 把 NULL 视为同一组，但与 NULL 的相等比较结果是未知，所以按 email 连接永远不会匹配 NULL 行。要明确决定如何处理缺失的键。"
}
```

```quiz
{
  "id": "q2",
  "question": "为什么要在 `ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC)` 中再加 `id DESC` 作为第二个排序键？",
  "options": [
    "让查询更快",
    "ROW_NUMBER 需要两个键",
    "created_at 相同的行否则顺序是任意的，保留的行可能每次运行都不同",
    "它能去除 NULL"
  ],
  "explanation": "排序中的并列是任意打破的，所以去重可能在不同次运行中保留不同的行。唯一的次级排序键让结果确定。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "按邮箱去重（忽略大小写和首尾空格），每个邮箱保留 **`created_at` 最新**的一行。邮箱为 NULL 的行都是不同的人，必须全部保留。返回保留的 `id`。列：`id`。",
  "hints": [
    "用 LOWER(TRIM(email)) 规范化。",
    "对 NULL 邮箱，用 COALESCE(规范化后的值, 'missing-' || id) 作为分区键，让每行单独成组。",
    "ROW_NUMBER() OVER (PARTITION BY key ORDER BY created_at DESC, id DESC)，保留 rn = 1。"
  ]
}
```

```sql-exercise
{
  "id": "ex2",
  "prompt": "`amount` 是文本，用 `''` 和 `'N/A'` 表示缺失。按清洗后的国家（去空白、大写），返回有效金额的平均值和有效金额的个数。列：`country, avg_amount, n_valid`；平均值保留 2 位小数。",
  "hints": [
    "在 SELECT 和 GROUP BY 中都用 UPPER(TRIM(country)) 清洗国家。",
    "NULLIF(NULLIF(TRIM(amount), ''), 'N/A') 把两种占位符都变成 NULL。",
    "AVG 和 COUNT(列) 都会跳过 NULL，不需要额外过滤；AVG 之前先 CAST 为 REAL。"
  ]
}
```

```sql-exercise
{
  "id": "ex3",
  "prompt": "`raw_events` 中有重复触发的事件。丢弃与**同一用户同一类型的上一个事件间隔不足 10 秒**的事件（与紧邻的上一行比较，无论它是否被保留）。列：`user_id, event, ts`。",
  "hints": [
    "按 user_id 和 event 分区、按 ts 排序使用 LAG(ts)。",
    "当 prev_ts IS NULL 或 ts - prev_ts >= 10 时保留该行。",
    "同一用户的不同事件类型不能互相抑制。"
  ]
}
```

> [!TIP] 面试技巧
> - 写查询之前先说明键、胜出规则和次级排序。
> - 分组前先规范化（LOWER/TRIM），并解释为什么不合并 NULL 键。
> - 执行任何 DELETE 之前，先提出用 SELECT count 检查将被删除的行数。
