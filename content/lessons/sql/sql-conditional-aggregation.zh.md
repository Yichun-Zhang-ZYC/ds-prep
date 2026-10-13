---
id: sql-conditional-aggregation
title: 条件聚合
---

## 为什么重要
“每个国家移动端订单的占比”“一条查询统计每天的注册数和购买数”都是经典题。条件聚合只需扫描一遍就能回答，不需要自连接或子查询。

## 概念
把 `CASE` 放进聚合函数里，让每一行只在条件成立时才参与计算：

```sql
SUM(CASE WHEN device = 'mobile' THEN 1 ELSE 0 END)      -- count of mobile rows
SUM(CASE WHEN device = 'mobile' THEN amount ELSE 0 END) -- mobile revenue
AVG(CASE WHEN device = 'mobile' THEN 1.0 ELSE 0 END)    -- share of mobile rows
COUNT(CASE WHEN device = 'mobile' THEN 1 END)           -- same count: COUNT skips NULL
```

Postgres 还支持 `COUNT(*) FILTER (WHERE device = 'mobile')`；在 SQLite 和 MySQL 中布尔值本身就是 0/1，所以 `SUM(device = 'mobile')` 也能用。`CASE` 写法在所有数据库里都能跑。

## 示例讲解
从一张事件表里算出每天的注册数、购买数和转化率：

```sql
SELECT event_date,
       SUM(CASE WHEN event = 'signup'   THEN 1 ELSE 0 END) AS signups,
       SUM(CASE WHEN event = 'purchase' THEN 1 ELSE 0 END) AS purchases,
       ROUND(1.0 * SUM(CASE WHEN event = 'purchase' THEN 1 ELSE 0 END)
                 / NULLIF(SUM(CASE WHEN event = 'signup' THEN 1 ELSE 0 END), 0), 3) AS conv_rate
FROM events
GROUP BY event_date;
```

在没有 `PIVOT` 关键字的数据库里，这也是把行**转成列**的方法。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "`AVG(CASE WHEN refunded THEN 1.0 ELSE 0 END)` 计算的是什么？",
  "options": ["退款次数", "退款率（退款行占比）", "平均退款金额", "永远是 1"],
  "explanation": "0/1 指示变量的平均值，就是取值为 1 的行所占的比例。"
}
```

```quiz
{
  "id": "q2",
  "question": "如果写成 `AVG(CASE WHEN refunded THEN 1.0 END)`（没有 ELSE），会怎样？",
  "options": ["和写了 ELSE 0 结果一样", "永远返回 1（或 NULL），因为未退款的行变成 NULL 被跳过了", "返回 0", "语法错误"],
  "explanation": "没有 ELSE 0 时，不匹配的行是 NULL，AVG 会忽略它们。算比率时要保留 ELSE 0；依赖“不写 ELSE”的是 COUNT 那种写法。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "对每个 `country`，返回订单数 `orders`、移动端订单数 `mobile_orders`，以及移动端收入 `mobile_revenue`（`device = 'mobile'` 的 `amount` 之和，没有则为 0）。",
  "hints": ["用 SUM 包住一个 CASE 表达式。", "收入的 THEN 分支返回 amount，ELSE 返回 0。"]
}
```

> [!TIP] 面试技巧
> - 看到“对每个 X 统计 A 和 B”，先想到条件聚合，而不是自连接。
> - 明确写出 `ELSE`。写 `ELSE 0` 和不写 `ELSE`，比率会悄悄变化。
> - 常见追问：“改成百分比。”用两个条件求和相除，分母用 `NULLIF(..., 0)` 保护。
