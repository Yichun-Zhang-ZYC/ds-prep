---
id: sql-row-number-rank-dense-rank
title: 用 ROW_NUMBER、RANK、DENSE_RANK 排名
---

## 为什么重要
"每组取前 N 名"是 SQL 面试里出现频率最高的题型之一。面试官真正想考的，是你是否清楚这三个排名函数在遇到并列值时的区别。

## 概念
三个函数都会在 `PARTITION BY` 划分的窗口内、按 `ORDER BY` 的顺序给行编号。只有出现并列值时，它们的结果才不同：

| score | ROW_NUMBER | RANK | DENSE_RANK |
|---|---|---|---|
| 95 | 1 | 1 | 1 |
| 90 | 2 | 2 | 2 |
| 90 | 3 | 2 | 2 |
| 85 | 4 | **4** | **3** |

- `ROW_NUMBER` 总是给出唯一编号，并列时的先后顺序是任意的。
- `RANK` 给并列的行相同名次，然后跳过后面的名次。
- `DENSE_RANK` 给并列的行相同名次，但不跳号。

## 示例讲解

```sql
WITH ranked AS (
  SELECT department, name, salary,
         DENSE_RANK() OVER (
           PARTITION BY department
           ORDER BY salary DESC
         ) AS rnk
  FROM employees
)
SELECT department, name, salary
FROM ranked
WHERE rnk <= 2;
```

窗口函数不能直接写在 `WHERE` 里，因为它是在 `WHERE` 执行之后才计算的。要先放进 CTE 或子查询，再在外层过滤。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "对分数 95、90、90、85，哪个函数返回 1、2、2、3？",
  "options": ["`ROW_NUMBER`", "`RANK`", "`DENSE_RANK`", "`NTILE(4)`"],
  "explanation": "DENSE_RANK 在并列之后不跳号；RANK 会得到 1、2、2、4。"
}
```

```quiz
{
  "id": "q2",
  "question": "每个用户只保留一行：他最近的一条事件。哪种写法最稳妥？",
  "options": ["`RANK() ... = 1`", "`DENSE_RANK() ... = 1`", "`ROW_NUMBER() ... = 1`，并在 ORDER BY 里加一个决胜字段"],
  "explanation": "两条事件时间戳相同时，RANK 和 DENSE_RANK 都会返回多行。ROW_NUMBER 保证只有一行，再加上 event_id 之类的决胜字段，结果就是确定的。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "返回**每个部门工资最高的前 2 名员工**。如果两人并列第 2，两人都要返回。列：`department, name, salary`。",
  "hints": ["想想用按部门分区、按工资排序的窗口函数。", "窗口函数不能写在 WHERE 里。先在 CTE 里排名，再按名次过滤。"]
}
```

```reveal
{
  "prompt": "什么时候该用 `ROW_NUMBER` 而不是 `DENSE_RANK`？",
  "answer": "当你需要**每组恰好 N 行**时用 `ROW_NUMBER`，比如对事件去重、每个用户只保留最新一条。记得在 `ORDER BY` 里加一个确定性的决胜字段（如 `event_id`），保证每次运行结果一致。\n\n当问题关心的是**不同的取值**时用 `DENSE_RANK`，比如“第二高的工资”，并列的人应该共享同一名次。"
}
```

> [!TIP] 面试技巧
> - 动笔之前先问一句“并列怎么处理？”，这说明你知道三个函数的区别。
> - 常见追问：“不用窗口函数怎么写？”可以用相关子查询：`WHERE 2 > (SELECT COUNT(DISTINCT e2.salary) FROM employees e2 WHERE e2.department = e.department AND e2.salary > e.salary)`。
> - 常见错误：在定义 `rnk` 的同一个 `SELECT` 里就用它过滤。
