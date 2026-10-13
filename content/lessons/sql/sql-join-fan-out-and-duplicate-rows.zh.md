---
id: sql-join-fan-out-and-duplicate-rows
title: 连接放大与重复行
---

## 为什么重要
连接之后收入被放大，是现实中最常见的 SQL bug，也是面试官最爱的题：“为什么总收入高了 3 倍？”答案几乎总是连接放大（fan-out）。

## 概念
每张表都有**粒度**：一行代表什么（一笔订单、一个订单明细、每个用户每天一行）。与一张“每个键对应多行”的表连接，会让另一边的行成倍增加。

如果 `orders` 每笔订单一行，而 `order_items` 里订单 7 有三条明细，那么 `orders JOIN order_items` 中订单 7 会有三行。之后再对 `orders.amount` 求和，这笔订单就被算了三次。

两个都会放大的连接会相乘：3 条明细 × 2 条支付记录 = 这笔订单 6 行。

## 示例讲解
计算每位客户收入和商品明细数的错误写法与正确写法：

```sql
-- Wrong: o.amount is repeated once per item line
SELECT o.customer_id, SUM(o.amount) AS revenue, COUNT(i.id) AS items
FROM orders o
JOIN order_items i ON i.order_id = o.id
GROUP BY o.customer_id;

-- Right: aggregate the "many" side to the order grain first
WITH items_per_order AS (
  SELECT order_id, COUNT(*) AS items
  FROM order_items
  GROUP BY order_id
)
SELECT o.customer_id, SUM(o.amount) AS revenue, SUM(COALESCE(ip.items, 0)) AS items
FROM orders o
LEFT JOIN items_per_order ip ON ip.order_id = o.id
GROUP BY o.customer_id;
```

快速自查：对比连接前后的 `COUNT(*)`，或者确认连接键在你预期的那一侧是唯一的（`SELECT key, COUNT(*) ... HAVING COUNT(*) > 1`）。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "订单 7 有 3 条明细和 2 条支付记录。你把订单表按 order_id 同时连接这两张表，订单 7 会产生几行？",
  "options": ["3", "5", "6", "1"],
  "explanation": "每条明细都会和每条支付记录配对：3 × 2 = 6。连接之前先把每张子表聚合到订单粒度。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "返回每个 `customer_id` 的订单总收入 `revenue`（`orders.amount` 之和）和商品明细条数 `items`。不要重复计算收入。",
  "hints": ["运行初始代码：客户 100 的收入算出来是 180，而不是 80。", "先在 CTE 里按订单统计明细数，让连接变成一对一。"]
}
```

> [!TIP] 面试技巧
> - 连接前先说出每张表的粒度：“orders 每笔订单一行，items 每条明细一行。”
> - 经验法则：先把每张“多”的表聚合到需要的粒度，再连接。
> - 在 `SUM` 里加 `DISTINCT` 不是解决办法：两笔金额相同的不同订单会被合并成一笔。
