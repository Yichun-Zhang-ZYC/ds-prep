---
id: sql-case-when
title: CASE WHEN 条件表达式
---

## 为什么重要
`CASE WHEN` 就是 SQL 里的 if/else。分桶、清洗杂乱的类别、以及（在聚合那几课里）一次扫描统计多个指标都要用到它。几乎每道分析题都会在某处用上。

## 概念
两种写法作用相同：

```sql
-- Searched CASE: any boolean conditions
CASE
  WHEN amount >= 1000 THEN 'large'
  WHEN amount >= 100  THEN 'medium'
  ELSE 'small'
END

-- Simple CASE: compare one expression to values
CASE country WHEN 'US' THEN 'North America' WHEN 'CA' THEN 'North America' ELSE 'Other' END
```

需要记住的规则：
- 条件**从上到下**依次判断，第一个为真的生效，所以区间要从最具体的写到最宽泛的。
- 没有 `ELSE` 时，未匹配的行得到 `NULL`。
- 所有分支应返回相同类型。

## 示例讲解
按金额给订单分桶，并统计每个桶的数量：

```sql
SELECT CASE
         WHEN amount >= 1000 THEN 'large'
         WHEN amount >= 100  THEN 'medium'
         ELSE 'small'
       END AS size_bucket,
       COUNT(*) AS orders
FROM orders
GROUP BY size_bucket;
```

在 SQLite、Postgres、MySQL 和 BigQuery 里可以直接按别名分组；SQL Server 需要在 `GROUP BY` 里重复写一遍 `CASE` 表达式。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "当 `amount = 1500` 时，下面的表达式返回什么？\n\n`CASE WHEN amount >= 100 THEN 'medium' WHEN amount >= 1000 THEN 'large' END`",
  "options": ["'large'", "'medium'", "NULL", "两个标签都返回"],
  "explanation": "第一个为真的条件生效。1500 >= 100 为真，所以永远走不到 'large'。最具体的条件要放在最前面。"
}
```

```quiz
{
  "id": "q2",
  "question": "一个 `CASE` 表达式没有 `ELSE`，并且所有 `WHEN` 都不匹配，结果是什么？",
  "options": ["报错", "空字符串", "NULL", "最后一个 THEN 的值"],
  "explanation": "不写 ELSE 等同于 ELSE NULL。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "根据学生的 `score` 给出等级：`'A'`（90 及以上）、`'B'`（80 到 89）、`'C'`（70 到 79）、`'F'`（70 以下）。返回 `name` 和等级 `grade`。",
  "hints": ["条件从最高分数线往下写。", "70 以下的都可以归到 ELSE。"]
}
```

> [!TIP] 面试技巧
> - 把边界值说出来（“90 分是 A 还是 B？”）。分桶差一的错误是 `CASE` 最常见的 bug。
> - 总是写 `ELSE`，哪怕是 `ELSE 'unknown'`。悄悄出现的 NULL 会让后面的计数出错。
> - 如果同一个映射在很多查询里出现，可以建议改成一张小的映射表再做连接。
