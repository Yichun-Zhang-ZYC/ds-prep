---
id: sql-practice-conditional-aggregation-and-pivots
title: "练习：条件聚合与透视"
---

## 为什么重要
报表需要把类别放在列上，面试官想要“只扫一遍表”，而且很多引擎没有 `PIVOT` 关键字。`SUM(CASE WHEN ...)` 是可移植的答案，同样的思路还能解决“同时做过 A 和 B 的用户”、转化率以及宽表转长表。基础参见 *Conditional aggregation* 和 *Pivot and unpivot*。

## 概念
**透视（长表变宽表）。** 按行键分组，每个类别输出一列：`SUM(CASE WHEN cat = 'X' THEN amount ELSE 0 END)`。类别列表固定写在查询里；没有动态 SQL 的话，SQL 无法根据数据生成列。

同一技巧的变体：
- **计数和比率：** `COUNT(CASE WHEN cond THEN 1 END)` 或 `AVG(CASE WHEN cond THEN 1.0 ELSE 0 END)` 直接得到占比。`COUNT` 会忽略省略 `ELSE` 产生的 NULL；`SUM` 需要 `ELSE 0`，避免空组的总和为 NULL。
- **“同时做过 A 和 B”：** 按用户分组，在 `HAVING` 中要求 `SUM(CASE WHEN cat='A' THEN 1 ELSE 0 END) > 0 AND SUM(CASE WHEN cat='B' THEN 1 ELSE 0 END) > 0`。这样可以取代自连接或两个 `IN` 子查询，只扫一遍表。
- **分组内占总量的百分比：** 在同一个 `SELECT` 里用条件求和除以总和。

**逆透视（宽表变长表）。** 对每一列写一个 `SELECT`，用 `UNION ALL` 合并，并给出字面量标签（`'q1' AS quarter`）。Postgres 可以用 `CROSS JOIN LATERAL (VALUES ...)`，Snowflake 和 Spark 有 `UNPIVOT`/`stack`。如果空值不应算作数据，逆透视后再过滤 NULL。

陷阱：忘了 `ELSE 0`，或搞不清 `ELSE NULL` 的语义；整数除法（乘以 `1.0`）；试图在 `WHERE` 中过滤条件聚合（应放在 `HAVING`）。

## 示例讲解
表 `sales(sale_id, customer_id, sale_date, category, region, amount)`。任务：一次扫描得到月收入，每个类别一列，外加总计。

```sql
SELECT strftime('%Y-%m', sale_date) AS month,
       SUM(CASE WHEN category = 'Electronics' THEN amount ELSE 0 END) AS electronics,
       SUM(CASE WHEN category = 'Furniture'   THEN amount ELSE 0 END) AS furniture,
       SUM(CASE WHEN category = 'Stationery'  THEN amount ELSE 0 END) AS stationery,
       SUM(amount) AS total
FROM sales
GROUP BY month
ORDER BY month;
```

结果：

| month | electronics | furniture | stationery | total |
|---|---|---|---|---|
| 2024-01 | 100 | 250 | 20 | 370 |
| 2024-02 | 150 | 150 | 0 | 300 |
| 2024-03 | 120 | 0 | 30 | 150 |

每个 `CASE` 把一行的金额放入且仅放入一列，其他列得到 0，所以各列之和等于 `total`。检查 3 月：Stationery 30 加 Electronics 120，总计 150。某月不存在的类别（3 月的 Furniture）因为 `ELSE 0` 显示 0 而不是 NULL。不用条件求和的话，同样的结果需要三个独立查询再拼接。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "你想一次扫描得到 `amount > 100` 的行占比。哪个表达式正确？",
  "options": [
    "AVG(CASE WHEN amount > 100 THEN 1.0 ELSE 0 END)",
    "COUNT(amount > 100) / COUNT(*)",
    "任何引擎中 SUM(amount > 100) / COUNT(*)，整数除法",
    "先 WHERE amount > 100 再 COUNT(*)"
  ],
  "explanation": "1/0 标记的 AVG 就是占比。COUNT(布尔值) 数的是非 NULL 的值，也就是每一行。整数除法会截断为 0 或 1，而 WHERE 会把分母的行过滤掉。"
}
```

```quiz
{
  "id": "q2",
  "question": "为什么 `WHERE SUM(CASE WHEN category = 'A' THEN 1 ELSE 0 END) > 0` 是无效的？",
  "options": [
    "WHERE 中不允许 CASE",
    "SUM 需要 DISTINCT",
    "聚合函数不能出现在 WHERE 中，因为 WHERE 在分组之前执行；应使用 HAVING",
    "它是有效的"
  ],
  "explanation": "WHERE 在 GROUP BY 之前过滤行，所以不能使用聚合。针对聚合值的条件要放在 HAVING 中。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "对每个地区，返回**其收入中 Electronics 所占的比例** `electronics_share`，保留 3 位小数。列：`region, electronics_share`。",
  "hints": [
    "分子：SUM(CASE WHEN category = 'Electronics' THEN amount ELSE 0 END)。",
    "分母：同一个 SELECT 中的 SUM(amount)。",
    "乘以 1.0，避免整数除法。"
  ]
}
```

```sql-exercise
{
  "id": "ex2",
  "prompt": "找出**既买过 Electronics 又买过 Furniture** 的客户。列：`customer_id`。",
  "hints": [
    "按 customer_id 分组。",
    "在 HAVING 中要求这两个类别的条件计数都大于 0。",
    "也可以写成 COUNT(DISTINCT CASE ...) 条件或两个 EXISTS，但一次扫描最简单。"
  ]
}
```

```sql-exercise
{
  "id": "ex3",
  "prompt": "`product_sales` 是宽表（每个季度一列，NULL 表示没有数据）。把它逆透视，并返回每个产品的**最佳季度**及其收入。列：`product, best_quarter, revenue`。假设没有并列。",
  "hints": [
    "用 UNION ALL 合并四个 SELECT，每个季度列一个，并带上字面量的季度标签。",
    "逆透视后去掉 NULL 的收入。",
    "ROW_NUMBER() OVER (PARTITION BY product ORDER BY revenue DESC) = 1。"
  ]
}
```

> [!TIP] 面试技巧
> - 说明透视的列清单是写死的，动态透视需要动态 SQL 或 BI 层。
> - SUM 配 ELSE 0，让空组显示 0，并说出来。
> - “同时有 A 和 B”用 HAVING 中的条件计数，比自连接更好。
