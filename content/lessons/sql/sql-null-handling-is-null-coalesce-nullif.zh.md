---
id: sql-null-handling-is-null-coalesce-nullif
title: NULL 处理：IS NULL、COALESCE、NULLIF
---

## 为什么重要
`NULL` 引起的 bug 是面试答案里最常见的“静默错误”：行在过滤时消失、平均值被拉偏、除法直接报错。面试官经常故意在样例数据里放一个 `NULL`。

## 概念
`NULL` 表示*未知*，所以和它做比较的结果也是未知：

- `NULL = NULL` **不为真**。要用 `IS NULL` / `IS NOT NULL`。
- `WHERE col <> 'x'` 会悄悄丢掉 `col` 为 `NULL` 的行。
- 聚合函数会跳过 `NULL`：`AVG(col)` 的分母是**非空**值的个数；`COUNT(col)` 忽略 NULL，而 `COUNT(*)` 不会。

大部分场景靠两个函数解决：

| 函数 | 返回 | 典型用法 |
|---|---|---|
| `COALESCE(a, b, …)` | 第一个非空参数 | 默认值：`COALESCE(discount, 0)` |
| `NULLIF(a, b)` | 若 `a = b` 返回 `NULL`，否则返回 `a` | 安全除法：`x / NULLIF(y, 0)` |

## 示例讲解
按活动计算转化率，有些活动访问量为 0：

```sql
SELECT campaign,
       signups * 1.0 / NULLIF(visits, 0)        AS conversion_rate,
       COALESCE(signups * 1.0 / NULLIF(visits, 0), 0) AS conversion_rate_or_zero
FROM campaign_stats;
```

`NULLIF(visits, 0)` 把除以 0 变成 `NULL`；如果报表需要一个数字，再用 `COALESCE` 把 `NULL` 变成 `0`。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "表 `t` 有 4 行，`score` 分别为 10、20、NULL、30。`AVG(score)` 返回多少？",
  "options": ["15", "20", "NULL", "报错"],
  "explanation": "AVG 忽略 NULL：(10 + 20 + 30) / 3 = 20。如果缺失要按 0 算，用 AVG(COALESCE(score, 0))，结果是 15。"
}
```

```quiz
{
  "id": "q2",
  "question": "`WHERE status <> 'cancelled'` 返回哪些行？",
  "options": ["所有没被取消的行，包括 status 为 NULL 的", "status 非空且不等于 cancelled 的行", "只有 status 为 NULL 的行"],
  "explanation": "NULL <> 'cancelled' 的结果是未知，WHERE 把未知当作假。要保留这些行，需要加上 `OR status IS NULL`。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "有些用户没有设置 `nickname`。返回每个用户的 `id` 和 `display_name`：有昵称就用昵称，没有就用 `email`。所有用户都要返回。",
  "hints": ["你需要两列中第一个非空的值。"]
}
```

```reveal
{
  "prompt": "为什么 `COUNT(col)` 和 `COUNT(*)` 可能不同？分别在什么时候用？",
  "answer": "`COUNT(*)` 统计行数；`COUNT(col)` 统计 `col` **不为空**的行数。\n\n问“有多少条记录”用 `COUNT(*)`，问“有多少条记录填了这个字段”用 `COUNT(col)`。快速做数据质量检查可以算 `COUNT(*) - COUNT(col)`，得到缺失值的数量。"
}
```

> [!TIP] 面试技巧
> - 写过滤条件前先问：“这一列可能为 NULL 吗？”面试官很欣赏这个问题。
> - 子查询里有 NULL 时，`NOT IN (subquery)` 会**一行都不返回**。优先用 `NOT EXISTS`。
> - pandas 里的 `NaN` 有类似的坑，但行为相反：`df['x'] != 'a'` 会保留 NaN 行，SQL 不会。
