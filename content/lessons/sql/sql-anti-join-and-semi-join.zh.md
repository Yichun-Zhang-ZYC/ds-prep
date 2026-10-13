---
id: sql-anti-join-and-semi-join
title: 反连接与半连接
---

## 为什么重要
“从未下单的客户”“从未被浏览的商品”“做了 X 但没做 Y 的用户”，这些都是反连接，在面试中随处可见。`NOT IN` 的 NULL 陷阱是最常见的追问之一。

## 概念
- **半连接**：保留 A 中在 B 里*至少有一个*匹配的行，且不会让 A 的行重复。用 `EXISTS` 或 `IN` 实现。
- **反连接**：保留 A 中在 B 里*没有*匹配的行。用 `NOT EXISTS` 或 `LEFT JOIN ... WHERE b.key IS NULL` 实现。

| 写法 | 实现方式 | 对 NULL 安全吗？ |
|---|---|---|
| `NOT EXISTS (SELECT 1 FROM b WHERE b.k = a.k)` | 相关子查询 | 安全 |
| `LEFT JOIN b ON b.k = a.k WHERE b.k IS NULL` | 外连接 + 过滤 | 安全 |
| `WHERE a.k NOT IN (SELECT k FROM b)` | 列表成员判断 | **不安全**：`b.k` 里只要有一个 NULL，就一行都不返回 |

## 示例讲解
从未下单的客户，两种等价写法：

```sql
SELECT c.*
FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);

SELECT c.*
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.id IS NULL;
```

半连接：至少下过一单的客户，每人只出现一次（普通 `JOIN` 会让多次下单的客户重复出现）：

```sql
SELECT c.* FROM customers c
WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);
```

## 检验理解

```quiz
{
  "id": "q1",
  "question": "`orders.customer_id` 包含 1、2 和 NULL。`SELECT * FROM customers WHERE id NOT IN (SELECT customer_id FROM orders)` 返回几行？",
  "options": ["除 1 和 2 以外的所有客户", "0 行", "所有客户", "报错"],
  "explanation": "`id NOT IN (1, 2, NULL)` 展开为 `id <> 1 AND id <> 2 AND id <> NULL`。最后一项结果未知，所以没有任何行能通过。"
}
```

```quiz
{
  "id": "q2",
  "question": "用 LEFT JOIN 做反连接时，应该对哪一列判断 `IS NULL`？",
  "options": ["左表的任意一列", "右表中真实行里绝不会为 NULL 的列（如主键或连接键）", "右表任意一个可为空的列", "无所谓"],
  "explanation": "如果判断的右表列在真实行里也可能为 NULL，那些匹配上但该列恰好为 NULL 的行会被误判为“没有匹配”。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "返回**注册了但从未购买过**的用户 `email`。访客结账时 `purchases.user_id` 可能为 NULL。",
  "hints": ["先试试 NOT IN，看看 NULL 的 user_id 会造成什么结果。", "NOT EXISTS（或 LEFT JOIN ... IS NULL）对 NULL 是安全的。"]
}
```

> [!TIP] 面试技巧
> - 反连接默认用 `NOT EXISTS`，并说明原因：对 NULL 安全，优化器也处理得很好。
> - 说明半连接（`EXISTS`）不会像内连接那样让左表的行重复。
> - “做了 A 但没做 B 的用户”= 先筛出做了 A 的，再对 B 做反连接。
