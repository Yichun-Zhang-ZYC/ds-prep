---
id: sql-self-join
title: 自连接（SELF JOIN）
---

## 为什么重要
“工资比自己经理高的员工”“同城用户两两配对”都是面试经典题，两者都是把一张表和它自己连接。

## 概念
自连接就是普通的连接，只是两边是同一张表、用了不同的别名。别名决定了可读性：

```sql
FROM employees e          -- the employee
JOIN employees m          -- the same table, read as "manager"
  ON e.manager_id = m.id
```

典型用法：
- **层级关系**：员工 → 经理，类目 → 父类目。
- **配对**：两行共享某个属性（同城、同一订单）。用 `a.id < b.id` 避免一行和自己配对、以及每对出现两次。
- **跨时间比较**（今天 vs 昨天），不过通常用 `LAG` 更简洁。

## 示例讲解
工资比自己经理高的员工：

```sql
SELECT e.name AS employee, e.salary, m.name AS manager, m.salary AS manager_salary
FROM employees e
JOIN employees m ON e.manager_id = m.id
WHERE e.salary > m.salary;
```

内连接会去掉 CEO（没有经理）。如果题目需要所有员工，就用 `LEFT JOIN`。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "想让同城客户的每个无序组合恰好出现一次，应该加什么条件？",
  "options": ["`a.id <> b.id`", "`a.id < b.id`", "只写 `a.city = b.city`", "对结果用 `DISTINCT`"],
  "explanation": "`<>` 去掉了自己和自己配对，但仍会同时返回 (1, 2) 和 (2, 1)。`<` 让每一对只保留一种顺序。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "返回**工资高于其经理**的员工 `name`，以及经理的名字 `manager`。",
  "hints": ["把 employees 和自己连接：一个别名代表员工，另一个代表经理。", "用 e.manager_id 匹配 m.id，再比较工资。"]
}
```

> [!TIP] 面试技巧
> - 别名按角色命名（`e`、`m` 或 `emp`、`mgr`）；`a`/`b` 这样的字母会让层级查询很难读。
> - 做配对时一定要讲出 `<` 这个技巧，面试官会看这一点。
> - 如果问的是整条汇报链（不只一层），那就要用递归 CTE。
