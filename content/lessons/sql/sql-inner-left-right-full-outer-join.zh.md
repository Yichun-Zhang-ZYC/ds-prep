---
id: sql-inner-left-right-full-outer-join
title: INNER、LEFT、RIGHT、FULL OUTER JOIN
---

## 为什么重要
连接是 SQL 面试的核心。题目通常取决于哪些行能保留下来：没有订单的客户、客户不存在的订单，或者两者都要。

## 概念
| 连接 | 保留 |
|---|---|
| `INNER JOIN` | 只保留两边都能匹配上的行 |
| `LEFT JOIN` | 左表的每一行；没有匹配时右表的列为 NULL |
| `RIGHT JOIN` | 右表的每一行（等同于把两表对调后做 LEFT JOIN） |
| `FULL OUTER JOIN` | 两边的每一行；缺失的一边用 NULL 填充 |

大多数团队只写 `LEFT JOIN`、从不写 `RIGHT JOIN`，这样查询总是从“主表”开始从左往右读。

经典陷阱：把右表的过滤条件写在 `WHERE` 里，会让 `LEFT JOIN` 退化成 `INNER JOIN`，因为那些 NULL 行不满足条件。这类条件应该写在 `ON` 子句里。

## 示例讲解
列出所有客户及其 2024 年的订单数，包括没有订单的客户：

```sql
SELECT c.id, c.name, COUNT(o.id) AS orders_2024
FROM customers c
LEFT JOIN orders o
  ON o.customer_id = c.id
 AND o.order_date >= '2024-01-01'   -- filter in ON keeps customers without orders
GROUP BY c.id, c.name;
```

注意是 `COUNT(o.id)` 而不是 `COUNT(*)`：没有订单的客户，连接后那一行的 `o.id = NULL`，所以计数是 0 而不是 1。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "`customers` 有 10 行，其中 3 位客户没有订单，所有订单的客户都存在。`customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.status = 'paid'` 的结果里最多出现几个不同的客户？",
  "options": ["全部 10 位", "最多 7 位", "正好 3 位", "0 位"],
  "explanation": "WHERE 里对 o.status 的过滤去掉了那 3 位无订单客户的 NULL 行，LEFT JOIN 实际上变成了 INNER JOIN。把条件挪到 ON 里才能保留他们。"
}
```

```quiz
{
  "id": "q2",
  "question": "什么时候需要 FULL OUTER JOIN？",
  "options": ["要拿到所有客户，无论有没有订单", "对账：查看两个数据源里任何一边缺失的行", "表很大的时候", "去重的时候"],
  "explanation": "对账（“哪些 ID 在系统 A 里有、B 里没有，反之亦然”）是教科书式用法。拿到所有客户（无论有没有订单）只需要 LEFT JOIN。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "返回每位客户的 `name` 和已支付总额 `paid_total`（`status = 'paid'` 的订单 `amount` 之和）。没有已支付订单的客户也要出现，且 `paid_total = 0`。",
  "hints": ["把 status = 'paid' 写在 WHERE 里会丢掉 Cai 和 Dee。", "没有匹配行时 SUM 为 NULL，用 COALESCE(..., 0) 包住。"]
}
```

> [!TIP] 面试技巧
> - 动笔前先说清楚由哪张表决定结果：“要所有客户，所以客户表放左边。”
> - 解释每个过滤条件放在哪里：`ON`（属于匹配条件）还是 `WHERE`（连接之后再过滤）。
> - `LEFT JOIN` 之后计数要数右表的某一列（`COUNT(o.id)`），不要用 `COUNT(*)`。
