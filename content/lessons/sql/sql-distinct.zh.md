---
id: sql-distinct
title: DISTINCT 去重
---

## 为什么重要
`DISTINCT` 看起来很简单，但面试官借它考两件事：你是否知道它作用于整行，以及你会不会用它去掩盖一个写错的连接。

## 概念
`SELECT DISTINCT` 会从结果中去掉重复的**行**。它比较的是所有选中的列组合在一起，而不只是第一列。

```sql
SELECT DISTINCT country, city FROM customers;   -- 不重复的 (country, city) 组合
SELECT COUNT(DISTINCT country) FROM customers;  -- 有多少个不同的国家
```

需要知道的几点：
- `DISTINCT` 把所有 NULL 视为相等，多个 NULL 会合并成一行。
- 它需要对整个结果排序或哈希，在大表上并不便宜。
- `SELECT DISTINCT a, b` 与 `SELECT a, b FROM t GROUP BY a, b` 返回的行相同。如果还需要聚合，就用 `GROUP BY`。

## 示例讲解
2024 年 3 月哪些商品类别至少有一笔销售？

```sql
SELECT DISTINCT p.category
FROM sales s
JOIN products p ON p.id = s.product_id
WHERE s.sale_date >= '2024-03-01' AND s.sale_date < '2024-04-01';
```

一个常见的反模式是加 `DISTINCT` 来“修复”连接带来的重复行。正确做法是找出让行数翻倍的那个连接，“连接放大与重复行”一课会讲具体方法。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "表 `t` 有这些行：(A, 1)、(A, 1)、(A, 2)、(B, NULL)、(B, NULL)。`SELECT DISTINCT col1, col2 FROM t` 返回几行？",
  "options": ["2", "3", "4", "5"],
  "explanation": "(A, 1)、(A, 2) 和 (B, NULL)。DISTINCT 把两个 NULL 当作彼此重复。"
}
```

```quiz
{
  "id": "q2",
  "question": "在 `SELECT DISTINCT a, b FROM t` 中，DISTINCT 作用于什么？",
  "options": ["只作用于 `a` 列", "只作用于 `b` 列", "`a` 和 `b` 的组合", "ORDER BY 里用到的那一列"],
  "explanation": "DISTINCT 作用于整个 SELECT 列表。除了 COUNT(DISTINCT x) 这类聚合内部，没有“单列 DISTINCT”。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "返回国家为 `US` 的客户所在的不重复城市 `city`，按字母顺序 A 到 Z 排列。城市未知（NULL）的客户不计入。",
  "hints": ["用 DISTINCT 去掉重复城市。", "用 IS NOT NULL 去掉 NULL，再排序。"]
}
```

> [!TIP] 面试技巧
> - 结果里出现意外的重复行时，先说“我检查一下连接的粒度”，而不是直接加 `DISTINCT`。
> - 大数据量下 `COUNT(DISTINCT x)` 很贵，可以提一下看板场景用的 `APPROX_COUNT_DISTINCT`（BigQuery、Snowflake）。
> - Postgres 有 `DISTINCT ON (col)`，可以每个值保留一行。它很方便，但通用写法是 `ROW_NUMBER()`。
