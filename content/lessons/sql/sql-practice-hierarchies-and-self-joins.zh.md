---
id: sql-practice-hierarchies-and-self-joins
title: "练习：层级结构与自连接"
---

## 为什么重要
“收入高于其经理的员工”“至少有 5 个下属的经理”“某 VP 下的所有人”是经典题，因为组织架构就是一张引用自身的表。它们考察你能否给同一张表起两个别名，以及何时固定次数的关联不够用。基础参见 *Self join* 和 *Recursive CTEs*。

## 概念
两种模式几乎覆盖所有题目：

**1. 一层关系用自连接。** 给表起两个别名，一个当子节点（`e`），一个当父节点（`m`），关联条件 `m.emp_id = e.manager_id`。同样的结构可以回答“谁的收入高于经理”“员工和经理并排显示”“同部门的配对”（`a.id < b.id` 去掉镜像配对和自己配自己）。

- 没有上级的行（CEO）需要保留时用 `LEFT JOIN`；`INNER JOIN` 会悄悄丢掉它们。
- 统计下属人数时，反方向关联（`e` 关联它的下属 `r`），用 `LEFT JOIN` 和 `COUNT(r.emp_id)`，这样没有下属的经理得到 0 而不是缺失行。`COUNT(*)` 会得到 1。

**2. 不限层数用递归 CTE。** 锚点选出起始行，然后反复把 CTE 与表关联，向下（或向上）走一层，同时携带 `depth` 或 `path` 列。适用于“所有下属（直接与间接）”“每个员工的层级”“汇报链”。如果数据可能有环，用 `UNION ALL` 加上深度限制来终止。

如何选择：题目提到固定层数（“经理的经理”）就串联自连接；说“所有”或“任意层级”就用递归。

陷阱：用 `manager_id = NULL` 比较（永远不成立，要用 `IS NULL`）；把人自己算进自己的子树；忘了树顶的父节点是 NULL。镜像配对参见 *Self join*。

## 示例讲解
表 `employees(emp_id, name, manager_id, salary)`，其中 `manager_id` 指向同一张表的另一行。任务：把每个员工和其经理并排显示，并标记谁的收入更高。

```sql
SELECT e.name AS employee,
       m.name AS manager,
       e.salary,
       m.salary AS manager_salary,
       CASE WHEN e.salary > m.salary THEN 'yes' ELSE 'no' END AS earns_more
FROM employees e
LEFT JOIN employees m ON m.emp_id = e.manager_id
ORDER BY e.emp_id;
```

结果：

| employee | manager | salary | manager_salary | earns_more |
|---|---|---|---|---|
| Ava | NULL | 300 | NULL | no |
| Ben | Ava | 200 | 300 | no |
| Cal | Ava | 180 | 300 | no |
| Dee | Ben | 150 | 200 | no |
| Eli | Ben | 210 | 200 | yes |
| Fay | Cal | 120 | 180 | no |
| Gil | Dee | 100 | 150 | no |
| Hui | Dee | 90 | 150 | no |
| Ian | Eli | 95 | 210 | no |
| Jun | Fay | 130 | 120 | yes |

`LEFT JOIN` 保留了 Ava，她的经理列是 NULL，`300 > NULL` 不为真，所以标记落到 `no`。Eli（210，对比 Ben 的 200）和 Jun（130，对比 Fay 的 120）是收入高于经理的两个人。如果改用 `WHERE e.salary > m.salary`，正好返回这两行，并自动去掉 CEO。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "你用 `LEFT JOIN employees r ON r.manager_id = e.emp_id` 加 `COUNT(*)` 统计直接下属数。没有下属的员工显示什么？",
  "options": [
    "0",
    "1，因为补 NULL 的那一行也被计数",
    "NULL",
    "该员工被丢掉"
  ],
  "explanation": "LEFT JOIN 为该员工保留一行补 NULL 的记录，COUNT(*) 数行，所以返回 1。COUNT(r.emp_id) 忽略 NULL，返回 0。"
}
```

```quiz
{
  "id": "q2",
  "question": "“列出 Ben 下面任意层级的所有员工。”应该用什么工具？",
  "options": [
    "一次自连接",
    "三次串联的自连接",
    "以 Ben 的直接下属为锚点的递归 CTE",
    "GROUP BY manager_id"
  ],
  "explanation": "层数不固定，固定次数的关联迟早会漏掉层级。递归 CTE 一层一层向下，直到没有新行为止。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "找出**收入高于其直属经理**的员工。列：`name, salary, manager_name`。",
  "hints": [
    "把 employees 与自身关联：经理行是 emp_id 等于当前行 manager_id 的那一行。",
    "内连接已经会去掉 CEO，因为没有经理行。",
    "过滤 e.salary > m.salary。"
  ]
}
```

```sql-exercise
{
  "id": "ex2",
  "prompt": "对**每位员工**统计其直接下属数（普通员工为 0）。列：`emp_id, name, direct_reports`。",
  "hints": [
    "从 employees e 出发，LEFT JOIN manager_id 等于 e.emp_id 的行 r。",
    "按 e.emp_id 和 e.name 分组。",
    "用 COUNT(r.emp_id) 而不是 COUNT(*)，这样没有下属的人得到 0。"
  ]
}
```

```sql-exercise
{
  "id": "ex3",
  "prompt": "对每位经理，统计其**所有下属（直接和间接）**人数。只列出至少有一个下属的人。列：`emp_id, total_reports`。",
  "hints": [
    "递归 CTE 的锚点是直接（上级、员工）配对。",
    "递归步骤：保持上级不变，移动到向当前员工汇报的员工。",
    "对全部配对按上级做 COUNT(*)；每个人对每位祖先各出现一次。"
  ]
}
```

> [!TIP] 面试技巧
> - 大声说明别名的角色：“e 是员工，m 是经理”。
> - 树顶需要保留时用 LEFT JOIN；0 是合法答案时用 COUNT(child.id)，不要用 COUNT(*)。
> - 提到如果数据可能有环，递归 CTE 需要终止保护。
