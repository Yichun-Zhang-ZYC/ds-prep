---
id: sql-joining-on-multiple-keys-non-equi-joins
title: 多键连接与非等值连接
---

## 为什么重要
真实的连接并不总是 `a.id = b.id`。价格会随时间变化，税率取决于区间，事件要匹配到它所在的会话。这些都是区间（非等值）连接，常出现在高级 SQL 面试中。

## 概念
- **复合键**：要匹配能唯一确定一行的所有列，例如 `ON a.store_id = b.store_id AND a.day = b.day`。漏掉任何一列都会导致连接放大。
- **非等值连接**：等号以外的任何条件，最典型的是区间：

```sql
JOIN price_history p
  ON p.product_id = s.product_id
 AND s.sold_at >= p.valid_from
 AND s.sold_at <  p.valid_to        -- half-open range
```

只有在区间互不重叠时，区间连接才正确。如果两条价格记录覆盖同一时刻，这笔销售会同时匹配两条，结果被放大。

## 示例讲解
为每份工资查找对应的税率区间：

```sql
SELECT e.name, e.salary, b.rate
FROM employees e
JOIN tax_brackets b
  ON e.salary >= b.lower_bound
 AND e.salary <  b.upper_bound;
```

在大表上区间连接可能很慢，因为普通的哈希连接要求等值条件。数仓里常会在区间旁边加一个等值键（如分桶或日期）来提速。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "某商品的价格表有 [1 月 1 日, 2 月 1 日) 和 [1 月 15 日, 3 月 1 日) 两条记录。一笔 1 月 20 日的销售与它做区间连接，会怎样？",
  "options": ["只匹配第一条", "两条都匹配，这笔销售被重复", "两条都不匹配", "数据库自动选最新的一条"],
  "explanation": "有效期区间重叠会破坏区间连接。信任结果之前先检查有没有重叠。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "对每笔销售，返回 `sale_id` 和收入 `qty * price`（命名为 `revenue`），价格使用 `sold_at` 时刻有效的那条。有效条件为 `valid_from <= sold_at < valid_to`。",
  "hints": ["同时匹配 product_id 和日期区间。", "valid_from 用 >=，valid_to 用 <，这样边界日期只会匹配一条。"]
}
```

> [!TIP] 面试技巧
> - 先问清楚区间能否重叠，以及没有结束时间的记录是怎么存的（NULL 还是一个很远的未来日期）。
> - 面数据工程岗位时，可以把它叫作“缓慢变化维度查找”，它和 SCD Type 2 是同一个模式。
> - 如果要求“截至某日期的最新值”但没有 valid_to 列，可以改用窗口函数（对该日期之前的行做 `ROW_NUMBER`）。
