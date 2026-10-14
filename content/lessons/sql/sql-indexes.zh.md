---
id: sql-indexes
title: 索引（B-tree、复合索引）
---

## 为什么重要
“这个查询很慢，你会怎么做？”第一个答案几乎总和索引有关。面试官希望你知道 B-tree 索引为什么有用、什么时候用不上，以及复合索引中列的顺序为什么重要。

## 概念
**B-tree 索引**把一列的值排好序，并保存指向对应行的指针。查找一个值或一个范围只需 O(log n)，不必扫描整张表。

当查询在索引列上做过滤、连接或排序，**并且**只选中很小比例的行时，索引才有帮助。以下情况索引帮不上忙（或不会被使用）：
- 条件里对列套了函数：`WHERE LOWER(email) = ...`（除非对这个表达式建索引），
- 模式以通配符开头：`LIKE '%gmail.com'`，
- 大部分行都满足条件（全表扫描反而更便宜），
- 列的不同取值很少，过滤条件区分度不高。

`(a, b)` 上的**复合索引**先按 `a` 排序，同一个 `a` 内再按 `b` 排序。它能服务 `WHERE a = ?` 和 `WHERE a = ? AND b = ?`，但不能单独服务 `WHERE b = ?`（**最左前缀原则**）。等值条件的列放前面，范围条件的列放最后。

索引不是免费的：它占用存储空间，并且会拖慢每一次 `INSERT`、`UPDATE` 和 `DELETE`。

## 示例讲解
一个常见查询，以及适合它的索引：

```sql
-- Query: a user's recent orders
SELECT order_id, amount
FROM orders
WHERE user_id = 42 AND order_date >= '2024-01-01'
ORDER BY order_date DESC;

-- Index: equality column first, then the range / sort column
CREATE INDEX idx_orders_user_date ON orders (user_id, order_date);
```

如果索引里还包含 `amount`（**覆盖索引**），数据库只读索引就能回答查询，不必再读表中的行。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "在 `(country, city)` 上有一个索引。哪些过滤条件能高效使用它？（多选）",
  "options": ["`WHERE country = 'US'`", "`WHERE country = 'US' AND city = 'Boston'`", "`WHERE city = 'Boston'`", "`WHERE country = 'US' ORDER BY city`"],
  "explanation": "必须约束最左前缀（country）。只按 city 过滤无法利用 (country, city) 的排序。"
}
```

```quiz
{
  "id": "q2",
  "question": "`created_at` 上有索引，但 `WHERE DATE(created_at) = '2024-05-01'` 很慢。为什么？怎么改？",
  "options": ["DATE() 很慢，应该缓存", "对列套了函数导致用不上索引；改写成 created_at 上的范围条件", "日期上的索引不起作用", "给 DATE 建一个索引"],
  "explanation": "改写成 created_at >= '2024-05-01' AND created_at < '2024-05-02'，created_at 上的索引就能用上（或者对表达式建索引）。"
}
```

```reveal
{
  "prompt": "一张 5 亿行的事件表上，某个看板查询变慢了。说说你会怎么排查。",
  "answer": "1. **看执行计划**（`EXPLAIN` / 查询剖析）：是否在全表扫描？哪一步最耗时？\n2. **检查过滤条件**：是否作用在有索引 / 分区 / 聚簇的列上，是否可走索引（没有对列套函数）？\n3. **检查连接**：是否有放大、缺少连接键，或者在数仓里产生了巨大的 shuffle。\n4. **尽早减少数据量**：先按日期分区过滤，只选需要的列。\n5. **再做结构性优化**：添加或调整索引（OLTP），按日期和常用过滤键分区 / 聚簇（数仓），或者预聚合到汇总表。\n\n说明权衡：索引的写入成本、存储开销，以及汇总表的数据新鲜度。"
}
```

> [!TIP] 面试技巧
> - 提出任何索引建议之前，先说“我会先看执行计划”。
> - 用 **sargable**（可作为搜索参数）这个词来描述能用上索引的过滤条件。
> - 在列式数仓（BigQuery、Snowflake）里，谈分区和聚簇，而不是 B-tree 索引。
