---
id: sql-funnel-conversion
title: 漏斗转化
---

## 为什么重要
“用户从浏览商品到付款，在哪一步流失了？”漏斗查询是产品分析的核心题。细节（步骤顺序、时间窗口、按用户去重）决定了答案是严谨还是粗糙。

## 概念
漏斗统计到达每一步的**用户**数，通常要求按顺序完成各步：

1. 把事件压缩成每个用户一行，记录他**第一次**完成每一步的时间（条件 `MIN`）。
2. 统计到达每一步的用户数，要求每一步发生在上一步之后。
3. 步骤间转化率 = 第 k 步用户数 / 第 k−1 步用户数。

事先确定：步骤必须有序吗？限定在同一会话内还是任意时间？统计用户还是会话？

## 示例讲解
有序步骤的“浏览 → 加购 → 购买”漏斗：

```sql
WITH firsts AS (
  SELECT user_id,
         MIN(CASE WHEN event = 'view'     THEN ts END) AS t_view,
         MIN(CASE WHEN event = 'cart'     THEN ts END) AS t_cart,
         MIN(CASE WHEN event = 'purchase' THEN ts END) AS t_purchase
  FROM events
  GROUP BY user_id
)
SELECT COUNT(t_view)                                                  AS viewed,
       COUNT(CASE WHEN t_cart > t_view THEN 1 END)                    AS carted,
       COUNT(CASE WHEN t_purchase > t_cart AND t_cart > t_view THEN 1 END) AS purchased
FROM firsts;
```

和 NULL 比较的结果是未知，所以从未加购的用户不会被算作加购或购买。这正是我们想要的行为。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "1,000 名用户浏览，300 名加购，90 名购买。加购到购买的转化率是多少？",
  "options": ["9%", "30%", "90%", "300%"],
  "explanation": "90 / 300 = 30%。从浏览到购买的整体转化率是 90 / 1,000 = 9%。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "返回一行：浏览过的用户数 `viewed`、在浏览**之后**加购的用户数 `carted`、在加购（且浏览）**之后**购买的用户数 `purchased`。每一步都使用该用户第一次发生的时间。",
  "hints": ["用 MIN(CASE ...) 取每个用户每一步的首次时间。", "用户 4 在浏览之前就加购了，不应算作加购。"]
}
```

> [!TIP] 面试技巧
> - 写 SQL 之前先说明假设（步骤有序、按用户统计、不限时间窗口）。
> - 同时给出逐步转化率和整体转化率，它们讲述的是不同的故事。
> - 常见追问：“流失最大的地方怎么查？”对最差的那一步按设备、来源、新老用户做细分。
