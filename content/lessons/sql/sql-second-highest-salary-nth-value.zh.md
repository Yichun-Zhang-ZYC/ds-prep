---
id: sql-second-highest-salary-nth-value
title: 第二高的工资 / 第 N 个值
---

## 为什么重要
“找出第二高的工资”是有史以来被问得最多的 SQL 题之一。题目很短，所以面试官真正考的是边界情况：最高值有并列怎么办，没有第二高时返回什么。

## 概念
“第二高”通常指第二高的**不同**取值。三种标准做法：

| 做法 | 查询思路 | 能处理并列吗？ | 不存在时返回 NULL 吗？ |
|---|---|---|---|
| 小于最大值中的最大值 | `MAX(salary) WHERE salary < (SELECT MAX(salary) ...)` | 能 | 是 |
| DENSE_RANK | `DENSE_RANK() OVER (ORDER BY salary DESC) = 2` | 能 | 否（返回 0 行） |
| DISTINCT + OFFSET | `SELECT DISTINCT salary ... ORDER BY salary DESC LIMIT 1 OFFSET 1` | 能 | 否（返回 0 行） |

想返回 NULL 而不是 0 行，可以把查询包成标量子查询：`SELECT (SELECT ... LIMIT 1 OFFSET 1) AS second_highest`。

## 示例讲解
通用的第 N 高不同工资（这里 N = 3）：

```sql
SELECT (
  SELECT DISTINCT salary
  FROM employees
  ORDER BY salary DESC
  LIMIT 1 OFFSET 2          -- N - 1
) AS third_highest;
```

`DISTINCT` 很关键：工资为 200、200、150 时，第二高是 150，而不是 200。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "工资为 300、300、250、200。第二高的（不同）工资是多少？",
  "options": ["300", "250", "200", "不存在"],
  "explanation": "不同的取值是 300、250、200，所以第二高是 250。"
}
```

```quiz
{
  "id": "q2",
  "question": "表里只有一名员工。`SELECT MAX(salary) FROM employees WHERE salary < (SELECT MAX(salary) FROM employees)` 返回什么？",
  "options": ["0 行", "一行，值为 NULL", "唯一的那个工资", "报错"],
  "explanation": "没有 GROUP BY 的聚合总是返回一行；没有可聚合的数据时结果是 NULL。这正是这道经典题期望的输出。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "返回第二高的**不同**工资，命名为 `second_highest`。返回一行；如果不存在，值为 NULL。",
  "hints": ["两个人并列最高工资，所以“第二行”不是答案。", "取严格小于整体最大值的所有工资中的最大值。"]
}
```

> [!TIP] 面试技巧
> - 先问两个问题：“按不同取值还是按行？”和“没有第二高时怎么办？”
> - N = 2 时先给出 `MAX < MAX` 的写法；被要求推广到 N 时，再用 `DENSE_RANK` 或 `OFFSET N-1`。
> - 按部门的版本：`DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) = 2`。
