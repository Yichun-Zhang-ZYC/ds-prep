---
id: sql-exists-vs-in
title: EXISTS 与 IN
---

## 为什么重要
“`EXISTS` 和 `IN` 有什么区别？”是常见的筛选题。好的回答依次覆盖语义、NULL 和性能。

## 概念
| | `IN (子查询)` | `EXISTS (子查询)` |
|---|---|---|
| 判断的是 | 这个值在不在列表里 | 是否至少存在一行匹配 |
| 子查询返回 | 一列值 | 什么都行（惯例写 `SELECT 1`） |
| 是否相关子查询 | 通常不是 | 通常是 |
| 子查询里有 NULL | 对 `IN` 无害，**会破坏 `NOT IN`** | 没有影响 |
| 能否提前结束 | 取决于引擎 | 能，找到第一行就停止 |

对于正向判断（`IN` 和 `EXISTS`），现代优化器通常会生成相同的半连接执行计划。真正的区别在否定形式：`NOT IN` 与 `NOT EXISTS`。

## 示例讲解
至少被下单过一次的商品：

```sql
SELECT p.* FROM products p
WHERE p.id IN (SELECT o.product_id FROM order_lines o);

SELECT p.* FROM products p
WHERE EXISTS (SELECT 1 FROM order_lines o WHERE o.product_id = p.id);
```

两者返回相同的行。但对于“从未被下单”，如果 `order_lines.product_id` 可能为 NULL，只有 `NOT EXISTS` 仍然正确。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "关于 `EXISTS (SELECT * FROM t WHERE ...)`，哪种说法是对的？",
  "options": ["SELECT * 比 SELECT 1 慢", "选择列表会被忽略，只关心是否存在行", "它会返回匹配的行", "匹配多于一行时会报错"],
  "explanation": "EXISTS 只检查是否至少有一行。SELECT 1、SELECT * 和 SELECT NULL 效果相同。"
}
```

```quiz
{
  "id": "q2",
  "question": "即使子查询的列里有 NULL，哪些组合的结果也总是相同？（多选）",
  "options": ["`IN` 和 `EXISTS`", "`NOT IN` 和 `NOT EXISTS`", "`NOT EXISTS` 和 `LEFT JOIN ... WHERE key IS NULL`"],
  "explanation": "IN 和 EXISTS 在正向匹配上结果一致。子查询一旦返回 NULL，NOT IN 就和 NOT EXISTS 不同了。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "返回至少出现在一条 `qty >= 5` 的订单明细中的商品 `name`，每个商品只列一次。",
  "hints": ["普通的 JOIN 会让 Pen 出现两次。", "把商品匹配和 qty 条件都写进 EXISTS 里。"]
}
```

> [!TIP] 面试技巧
> - 分三部分回答：语义、NULL 行为（`NOT IN` 陷阱）、性能（如今通常相同）。
> - 不要断言“EXISTS 总是更快”。这在老的优化器上成立，面试官可能会反驳。
> - 判断涉及多列或额外条件时优先用 `EXISTS`，这时 `IN` 写起来会很别扭。
