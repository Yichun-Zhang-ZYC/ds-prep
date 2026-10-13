---
id: sql-select-where-order-by-limit
title: SELECT、WHERE、ORDER BY、LIMIT
---

## 为什么重要
几乎每道 SQL 面试题都从这里开始。面试官会看你过滤条件写得是否干净，以及是否清楚排序和 `LIMIT` 之间的关系。

## 概念
一条基本查询从上往下读，但每个子句各有分工：

| 子句 | 作用 |
|---|---|
| `SELECT` | 返回哪些列（或表达式） |
| `FROM` | 从哪张表取数 |
| `WHERE` | 保留哪些**行**，发生在分组之前 |
| `ORDER BY` | 对结果排序；`DESC` 表示从大到小 |
| `LIMIT n` | **排序之后**保留前 `n` 行 |

没有 `ORDER BY` 时，行的顺序是没有保证的，所以不带 `ORDER BY` 的 `LIMIT` 返回的是任意几行。

## 示例讲解
找出 2024 年金额最高的三笔订单：

```sql
SELECT order_id, customer_id, amount
FROM orders
WHERE order_date >= '2024-01-01'
  AND order_date <  '2025-01-01'
ORDER BY amount DESC
LIMIT 3;
```

左闭右开的日期区间（`>=` 起点、`<` 下一个起点）在列是时间戳时比 `BETWEEN` 更安全。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "`SELECT * FROM orders LIMIT 5;` 返回什么？",
  "options": ["最早的 5 笔订单", "最新的 5 笔订单", "任意 5 笔订单，顺序没有保证", "金额最大的 5 笔订单"],
  "explanation": "没有 ORDER BY 时，数据库可以按任意顺序返回行。只要“取哪几行”有意义，LIMIT 就一定要配合 ORDER BY。"
}
```

```quiz
{
  "id": "q2",
  "question": "哪个过滤条件能保留 2024-03-15 当天所有时间戳（包括 23:59:59）？",
  "options": ["`ts BETWEEN '2024-03-15' AND '2024-03-15'`", "`ts >= '2024-03-15' AND ts < '2024-03-16'`", "`ts = '2024-03-15'`"],
  "explanation": "左闭右开区间无论时间部分是多少都能覆盖整天；另外两种写法只能匹配到午夜整点。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "返回 `Electronics` 类别中**价格最高的 3 个商品**的 `name` 和 `price`，按价格从高到低排列。",
  "hints": ["在 WHERE 里过滤类别。", "先按价格降序排序，再用 LIMIT 3。"]
}
```

> [!TIP] 面试技巧
> - 主动说出“不带 `ORDER BY` 的 `LIMIT` 结果不确定”，这能体现经验。
> - 日期和时间戳用左闭右开区间。
> - 各方言写法不同：`TOP n`（SQL Server）、`FETCH FIRST n ROWS ONLY`（标准 SQL / Oracle）、`LIMIT n`（Postgres、MySQL、BigQuery、Snowflake）。
