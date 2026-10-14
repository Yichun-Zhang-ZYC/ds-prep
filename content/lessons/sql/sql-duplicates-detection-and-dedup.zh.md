---
id: sql-duplicates-detection-and-dedup
title: 重复数据的检测与去重
---

## 为什么重要
数据管道会重复加载，用户会注册两次，事件会被重试。“找出重复数据”和“每个键只保留最新一条记录”是 DS、DA 和 DE 面试中标准的数据质量题。

## 概念
先确定“重复”指什么：**键相同**（例如邮箱相同），还是**整行完全相同**。

按键检测重复：

```sql
SELECT email, COUNT(*) AS n
FROM users
GROUP BY email
HAVING COUNT(*) > 1;
```

用 `ROW_NUMBER` 加一条“谁胜出”的规则（最新、最早、信息最完整），每个键只保留一行：

```sql
WITH ranked AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY email ORDER BY updated_at DESC, id DESC) AS rn
  FROM users
)
SELECT * FROM ranked WHERE rn = 1;
```

整行完全相同的重复可以用 `SELECT DISTINCT *` 去掉，但面试通常想要的是带明确决胜字段的按键去重。

## 示例讲解
原地删除重复数据，每个邮箱保留最新的一行（Postgres 和 SQLite 都适用）：

```sql
DELETE FROM users
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY LOWER(email) ORDER BY updated_at DESC, id DESC) AS rn
    FROM users
  ) t
  WHERE rn > 1
);
```

对键做规范化（`LOWER`、`TRIM`）可以抓到只在大小写或空格上不同的重复数据。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "为什么要在 ROW_NUMBER 的 `updated_at DESC` 后面再加 `id DESC`？",
  "options": ["让查询更快", "打破并列，保证每次胜出的都是同一行", "ROW_NUMBER 要求两列", "给最终输出排序"],
  "explanation": "如果两行的 updated_at 相同，它们之间的顺序是不确定的。加一个唯一的决胜字段，去重结果才是确定的。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "`customers` 表中有重复的邮箱（大小写可能不同）。**每个小写邮箱只保留最近更新的一行**。返回 `email`（小写）和 `name`。",
  "hints": ["按 LOWER(email) 分区，而不是原始邮箱。", "按 updated_at 降序排序，保留 rn = 1。"]
}
```

> [!TIP] 面试技巧
> - 动笔前先问：“按哪个键判断重复？”“保留哪一份？”
> - 提一下从源头解决：加唯一约束，或者在管道中使用幂等的 `MERGE` / upsert。
> - 对超大表，与其执行一个大 `DELETE`，不如去重写入新表（`CREATE TABLE AS SELECT ... WHERE rn = 1`）再替换。
