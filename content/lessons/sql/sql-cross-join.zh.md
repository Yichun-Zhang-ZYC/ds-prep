---
id: sql-cross-join
title: CROSS JOIN 交叉连接
---

## 为什么重要
`CROSS JOIN` 本身很少是答案，但它是搭建完整网格（每个日期 × 每个商品）的标准技巧，让缺失的组合显示为 0，而不是直接消失。

## 概念
`CROSS JOIN` 返回所有行的组合：`m` 行的表与 `n` 行的表交叉，得到 `m × n` 行。它没有 `ON` 条件。

```sql
SELECT s.size, c.color
FROM sizes s
CROSS JOIN colors c;     -- 3 sizes × 4 colors = 12 rows
```

忘了写连接条件（`FROM a, b` 且没有 `WHERE`）就会意外产生交叉连接。在真实的表上，这可能意味着几十亿行。

## 示例讲解
每家门店每天的销售额，没有销售的日子显示为 0：

```sql
WITH grid AS (
  SELECT d.day, st.store_id
  FROM calendar d
  CROSS JOIN stores st
)
SELECT g.day, g.store_id, COALESCE(SUM(s.amount), 0) AS revenue
FROM grid g
LEFT JOIN sales s ON s.store_id = g.store_id AND s.sale_date = g.day
GROUP BY g.day, g.store_id;
```

没有这个网格的话，某天没有销售的门店就根本没有那一行，图表或平均值会悄悄把它漏掉。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "表 A 有 5 行，表 B 有 0 行。`A CROSS JOIN B` 返回几行？",
  "options": ["5", "0", "1", "报错"],
  "explanation": "5 × 0 = 0。和空表做交叉连接结果为空，当某一边被过滤到一行不剩时，这是个隐蔽的 bug。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "返回每个（`month`、`region`）组合，以及该地区当月的收入 `revenue`，没有销售时为 0。用 `months` 和 `regions` 表搭建网格。",
  "hints": ["先用 CROSS JOIN 搭出 3 × 2 的网格，再把销售数据 LEFT JOIN 上去。", "用 COALESCE 把求和结果补成 0。"]
}
```

> [!TIP] 面试技巧
> - 题目说“包括为 0 的日期”时，想到网格：日历表 `CROSS JOIN` 维度表，再 `LEFT JOIN` 事实表。
> - 对大表做交叉连接之前，先估算输出行数并说出来。
> - 很多数仓有日期序列生成函数（`GENERATE_SERIES`、`GENERATE_DATE_ARRAY`）；递归 CTE 在任何数据库里都能用。
