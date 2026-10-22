---
id: sql-practice-ecommerce-analytics
title: "练习：电商分析查询"
---

## 为什么重要
电商是 SQL 面试最常见的场景：月收入、客单价、复购用户、畅销商品。查询本身不长，但陷阱（什么算收入、关联后重复计数、没有订单的客户）正是区分强弱候选人的地方。

## 概念
每道电商题都按同一套思路来：

1. **先确定粒度和指标。** `orders` 每单一行，`order_items` 每个订单行一行。收入是对订单行求 `SUM(qty * unit_price)`，并且要说明哪些状态计入（通常只算 `completed`，取消和退款不算）。
2. **先过滤再聚合**，并把状态过滤放对位置：内连接放在 `WHERE`；如果 `LEFT JOIN` 要保留没有符合条件订单的客户，则放在 `ON` 里。
3. **小心扇出。** 订单关联订单行后，`COUNT(*)` 数的是行而不是订单。用 `COUNT(DISTINCT order_id)`，并且关联后不要对订单级字段（如运费）求 `SUM`。参见 *Join fan-out and duplicate rows*。
4. **谨慎选择分母。** AOV 是收入除以去重订单数；复购率是复购客户数除以至少下过一单的客户数；转化率是去重用户的比值。乘以 `1.0` 避免整数除法。
5. **没有任何订单的客户** 需要从客户表出发做 `LEFT JOIN`，再用 `COALESCE(..., 0)`。

常见陷阱：把退款算进收入；`LEFT JOIN` 后对右表加 `WHERE`（悄悄变成内连接）；“销量第一的商品”出现并列时要用 `RANK` 或明确并列规则。参见 *Top-N per group* 和 *Conditional aggregation*。

## 示例讲解
表结构：`customers`、`orders(order_id, customer_id, order_date, status)`、`order_items(order_id, product_id, qty, unit_price)`、`products(product_id, name, category)`。任务：统计已完成订单的月收入、订单数和客单价。

```sql
SELECT strftime('%Y-%m', o.order_date) AS month,
       SUM(i.qty * i.unit_price) AS revenue,
       COUNT(DISTINCT o.order_id) AS orders,
       ROUND(SUM(i.qty * i.unit_price) * 1.0 / COUNT(DISTINCT o.order_id), 2) AS aov
FROM orders o
JOIN order_items i ON i.order_id = o.order_id
WHERE o.status = 'completed'
GROUP BY month
ORDER BY month;
```

结果：

| month | revenue | orders | aov |
|---|---|---|---|
| 2024-01 | 1208.0 | 2 | 604.0 |
| 2024-02 | 850.0 | 2 | 425.0 |
| 2024-03 | 1040.0 | 2 | 520.0 |

手算验证 1 月：订单 1 是 900 + 4 x 2 = 908，订单 2 是 300，所以收入为 1208，共 2 单，AOV 为 604。订单 3（已取消）被过滤掉。注意 `COUNT(DISTINCT o.order_id)` 必不可少：订单 1 有两行，用 `COUNT(*)` 会得到 1 月 3 单，从而低估 AOV。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "把 `orders` 和 `order_items` 关联后，你用 `SUM(qty * unit_price) / COUNT(*)` 计算客单价（AOV）。错在哪里？",
  "options": [
    "没错，COUNT(*) 就是订单数",
    "SUM 应该加 DISTINCT",
    "COUNT(*) 统计的是订单行数，导致 AOV 偏低；应除以 COUNT(DISTINCT order_id)",
    "应该改用 FULL JOIN"
  ],
  "explanation": "关联后每个订单按行数重复出现，COUNT(*) 是订单行数。AOV 的分母必须是去重后的订单数。"
}
```

```quiz
{
  "id": "q2",
  "question": "你想列出所有客户（包括没有已完成订单的），并给出其已完成订单的收入。`status = 'completed'` 应该放在哪里？",
  "options": [
    "LEFT JOIN 之后的 WHERE",
    "LEFT JOIN 的 ON 子句",
    "HAVING",
    "放哪里都一样"
  ],
  "explanation": "对右表的 WHERE 条件会把补 NULL 的行过滤掉，LEFT JOIN 就退化成内连接。放在 ON 里才能保留没有匹配订单的客户。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "返回**每位客户**已完成订单的收入 `revenue`（没有则为 0）。列：`customer_id, revenue`。",
  "hints": [
    "从 `customers` 出发做 LEFT JOIN，没有订单的客户才不会丢。",
    "状态条件放在 ON 子句，而不是 WHERE。",
    "用 COALESCE(..., 0) 包住 SUM。"
  ]
}
```

```sql-exercise
{
  "id": "ex2",
  "prompt": "在至少有一个已完成订单的客户中，有多少比例的客户有**两个或以上**已完成订单？返回一行 `repeat_rate`（0 到 1 之间的小数）。",
  "hints": [
    "先统计每位客户的已完成订单数。",
    "分母是至少有一个已完成订单的客户，所以没有订单的客户不能出现。",
    "使用 SUM(CASE WHEN n >= 2 ...) * 1.0 / COUNT(*)。"
  ]
}
```

```sql-exercise
{
  "id": "ex3",
  "prompt": "对每个品类，找出**已完成订单收入最高的商品**及其占该品类已完成收入的比例，保留 3 位小数。列：`category, name, share`。忽略并列。",
  "hints": [
    "在 CTE 中按（品类、商品）计算收入，只关联已完成订单。",
    "用 ROW_NUMBER() OVER (PARTITION BY category ORDER BY revenue DESC) 选出第一名。",
    "SUM(revenue) OVER (PARTITION BY category) 同时给出品类总额；外层过滤 rn = 1。"
  ]
}
```

> [!TIP] 面试技巧
> - 写 SQL 之前先说出收入的定义（哪些状态、是否扣除退款）。
> - 每次关联之后，都说一下现在的粒度，以及 `COUNT` 会数出什么。
> - 主动问清“销量第一”并列怎么处理，以及是否包含零订单客户。
