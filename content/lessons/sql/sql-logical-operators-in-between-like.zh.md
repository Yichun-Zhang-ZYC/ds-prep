---
id: sql-logical-operators-in-between-like
title: 逻辑运算符、IN、BETWEEN、LIKE
---

## 为什么重要
过滤条件是隐蔽 bug 的高发区：`OR` 两侧漏了括号、在时间戳上用了包含两端的 `BETWEEN`、写了一个用不上索引的 `LIKE`。面试官都会注意到。

## 概念
| 运算符 | 含义 | 注意 |
|---|---|---|
| `AND`、`OR`、`NOT` | 组合多个条件 | `AND` 优先级高于 `OR`，记得加括号 |
| `IN (a, b, c)` | 等于列表中的任意一个值 | 列表里有 NULL 时，`NOT IN` 一行都不返回 |
| `BETWEEN x AND y` | 等价于 `>= x AND <= y` | 两端都是**闭区间** |
| `LIKE 'ab%'` | 模式匹配：`%` 匹配任意字符串，`_` 匹配一个字符 | 是否区分大小写取决于数据库 |

运算符优先级是经典陷阱。`a OR b AND c` 的意思是 `a OR (b AND c)`。

## 示例讲解
找出 2024 年注册的 premium 或 enterprise 客户。不加括号的写法是错的：

```sql
-- Wrong: returns ALL enterprise customers, any year
SELECT * FROM customers
WHERE plan = 'premium' OR plan = 'enterprise' AND signup_date >= '2024-01-01';

-- Right
SELECT * FROM customers
WHERE plan IN ('premium', 'enterprise')
  AND signup_date >= '2024-01-01';
```

`IN` 比一串 `OR` 更易读，也彻底避开了优先级问题。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "`WHERE price BETWEEN 10 AND 20` 保留哪些行？",
  "options": ["10 < price < 20", "10 <= price < 20", "10 <= price <= 20", "10 < price <= 20"],
  "explanation": "BETWEEN 两端都包含。这就是为什么日期和时间戳更适合用左闭右开区间。"
}
```

```quiz
{
  "id": "q2",
  "question": "哪些模式能匹配字符串 `'data_2024'`？（多选）",
  "options": ["`LIKE 'data%'`", "`LIKE '%2024'`", "`LIKE 'data_202_'`", "在区分大小写的数据库里写 `LIKE 'Data%'`"],
  "explanation": "`%` 匹配任意字符串，`_` 恰好匹配一个字符。`'data_202_'` 能匹配，是因为 `_` 既能匹配下划线，也能匹配最后的 4。区分大小写时（如 Postgres），'Data%' 匹配不上，那里要用 ILIKE。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "返回套餐为 `pro` 或 `team`，**并且**邮箱以 `@gmail.com` 结尾的用户的 `email`。",
  "hints": ["套餐列表用 IN，就不用给 OR 加括号了。", "以固定字符串结尾的模式，开头是 %。"]
}
```

> [!TIP] 面试技巧
> - 混用 `AND` 和 `OR` 时，即使优先级恰好正确也加上括号。这体现细心，也能避免代码评审时被指出。
> - `LIKE '%term'`（前导通配符）用不上普通的 B-tree 索引。被问到性能时，可以提全文检索或反转字符串索引。
> - 子查询结果里有 NULL 时，`NOT IN (子查询)` 什么都不返回，优先用 `NOT EXISTS`。
