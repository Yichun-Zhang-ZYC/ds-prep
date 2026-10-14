---
id: sql-intersect-except
title: INTERSECT 与 EXCEPT
---

## 为什么重要
“1 月和 2 月都活跃的用户”“1 月活跃但 2 月不活跃的用户”，用集合运算一行就能写完。掌握它们能让你快速给出易读的答案，还能用来比对两个查询的结果。

## 概念
| 运算 | 返回 |
|---|---|
| `A INTERSECT B` | 同时出现在 A 和 B 中的不重复行 |
| `A EXCEPT B` | 在 A 中但不在 B 中的不重复行（Oracle 里叫 `MINUS`） |

和 `UNION` 一样，它们比较的是**整行**，并要求列匹配。与 `NOT IN` 不同，它们把 NULL 视为相等，所以对 NULL 是安全的。

`INTERSECT ALL` / `EXCEPT ALL`（保留重复）在 Postgres 中有，但并非所有数据库都支持。

## 示例讲解
两个月之间的留存用户和流失用户：

```sql
-- active in both months
SELECT user_id FROM activity WHERE month = '2024-01'
INTERSECT
SELECT user_id FROM activity WHERE month = '2024-02';

-- active in January, gone in February
SELECT user_id FROM activity WHERE month = '2024-01'
EXCEPT
SELECT user_id FROM activity WHERE month = '2024-02';
```

`EXCEPT` 也是很方便的测试手段：重构没有改变结果时，`old_query EXCEPT new_query`（以及反过来）都应该为空。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "A 返回 user_id {1, 2, 3, 3}，B 返回 {3, 4}。`A EXCEPT B` 返回什么？",
  "options": ["{1, 2}", "{1, 2, 3}", "{1, 2, 4}", "{4}"],
  "explanation": "EXCEPT 返回 A 中不在 B 里的不重复行：1 和 2。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "返回在 `2024-01` 活跃、但在 `2024-02` **不**活跃的用户 `user_id`。",
  "hints": ["从 1 月的用户中减去 2 月的用户。"]
}
```

> [!TIP] 面试技巧
> - 用 `EXCEPT` 给出简短答案，再提一句 `NOT EXISTS` 写法还能顺便返回其他列。
> - 说明集合运算会去重；如果需要计数，用连接或 `EXISTS`。
> - 建议用双向 `EXCEPT` 对改写后的查询做回归测试。
