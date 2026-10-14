---
id: sql-top-n-per-group
title: 每组取前 N 名
---

## 为什么重要
“每个类别销量前 3 的商品”“每位客户最近的一笔订单”“每月最畅销的商品”：几乎每轮 SQL 面试都会出现这个模式。准备一个不用思考就能写出来的模板。

## 概念
模板分三步：

1. 如有需要，先**聚合**（例如按类别、按商品算收入）。
2. 用窗口函数在每组内**排名**。
3. 在外层查询里按名次**过滤**。

根据并列规则选排名函数（见上一课）：要恰好 N 行用 `ROW_NUMBER`，要保留并列用 `DENSE_RANK`。

## 示例讲解
每个类别收入前 2 的商品：

```sql
WITH revenue AS (
  SELECT p.category, p.name, SUM(s.qty * s.unit_price) AS revenue
  FROM sales s
  JOIN products p ON p.id = s.product_id
  GROUP BY p.category, p.name
),
ranked AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY category ORDER BY revenue DESC, name) AS rn
  FROM revenue
)
SELECT category, name, revenue
FROM ranked
WHERE rn <= 2
ORDER BY category, rn;
```

用 `name` 作为第二排序键，两个商品收入相同时结果也是确定的。

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "对每位客户返回其**最近一笔订单**：`customer_id, order_id, order_date`。如果客户在最近那一天下了两单，保留 `order_id` 较大的那一单。",
  "hints": ["每位客户恰好一行，用 ROW_NUMBER。", "先按日期降序，再按 order_id 降序作为决胜字段。"]
}
```

```reveal
{
  "prompt": "在**没有**窗口函数的数据库里（比如老版本 MySQL），怎么取每组前 N 名？",
  "answer": "用相关子查询统计同组中比当前行更大的行数：\n\n```sql\nSELECT *\nFROM products p\nWHERE (\n  SELECT COUNT(*) FROM products p2\n  WHERE p2.category = p.category AND p2.revenue > p.revenue\n) < 2;\n```\n\n它在每组内是 O(n²) 的，所以要说明只要有窗口函数就优先用窗口函数。"
}
```

> [!TIP] 面试技巧
> - 动笔前先说出三步（聚合、排名、过滤），面试官喜欢看到计划。
> - `ROW_NUMBER` 的 `ORDER BY` 里一定要加决胜字段，否则每次运行结果可能不同。
> - BigQuery 和 Snowflake 支持 `QUALIFY rn <= 2`，可以省掉外层查询。如果岗位用这些数仓，可以提一下。
