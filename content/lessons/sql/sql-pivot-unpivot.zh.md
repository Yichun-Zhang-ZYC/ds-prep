---
id: sql-pivot-unpivot
title: 行转列 / 列转行
---

## 为什么重要
报表希望每个月或每个类别占一列；分析工具则希望数据是“长”而整齐的。把行转成列（pivot）再转回来（unpivot），是常见的“重塑这张表”面试题。

## 概念
**行转列**（长 → 宽）用条件聚合，在所有数据库里都能用：

```sql
SELECT product,
       SUM(CASE WHEN quarter = 'Q1' THEN revenue ELSE 0 END) AS q1,
       SUM(CASE WHEN quarter = 'Q2' THEN revenue ELSE 0 END) AS q2
FROM sales
GROUP BY product;
```

**列转行**（宽 → 长）用 `UNION ALL` 把每一列各写一个 `SELECT` 堆起来：

```sql
SELECT product, 'Q1' AS quarter, q1 AS revenue FROM wide_sales
UNION ALL
SELECT product, 'Q2', q2 FROM wide_sales;
```

SQL Server、Snowflake 和 BigQuery 也有 `PIVOT` / `UNPIVOT` 关键字，但列清单仍然要写死。动态行转列（类别未知）需要生成 SQL，或交给 BI 工具。

## 示例讲解
按团队统计各状态的工单数，每个状态一列：

```sql
SELECT team,
       COUNT(CASE WHEN status = 'open'    THEN 1 END) AS open,
       COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending,
       COUNT(CASE WHEN status = 'closed'  THEN 1 END) AS closed
FROM tickets
GROUP BY team;
```

## 检验理解

```quiz
{
  "id": "q1",
  "question": "行转列时写了 `SUM(CASE WHEN quarter = 'Q3' THEN revenue END)`（没有 ELSE）。某商品没有 Q3 销售，它的 q3 列显示什么？",
  "options": ["0", "NULL", "报错", "Q2 的值"],
  "explanation": "这个商品的 CASE 结果全是 NULL，对全 NULL 求 SUM 得到 NULL。如果报表要显示 0，就加上 ELSE 0（或用 COALESCE）。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "把 `sales` 转成每个 `product` 一行，列 `q1`、`q2`、`q3`、`q4` 分别是该季度的收入（没有则为 0）。",
  "hints": ["每个季度写一个 SUM(CASE ...)。", "Ink 有两行 Q1，SUM 会把它们加起来。"]
}
```

> [!TIP] 面试技巧
> - 说明行转列会把类别写死；出现新类别时需要改代码（或使用动态行转列）。
> - 表里保持长格式，只在报表层做行转列。
> - 列转行适合同时比较多个指标列（例如看板上每个指标一行）。
