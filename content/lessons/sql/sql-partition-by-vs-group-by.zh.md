---
id: sql-partition-by-vs-group-by
title: PARTITION BY 与 GROUP BY
---

## 为什么重要
“`GROUP BY` 和 `PARTITION BY` 有什么区别？”是最常见的 SQL 概念题之一。一句话回答：`GROUP BY` 会压缩行，`PARTITION BY` 会保留行。

## 概念
| | `GROUP BY` | `PARTITION BY`（在 `OVER` 中） |
|---|---|---|
| 输出行数 | 每组一行 | 每个输入行一行 |
| 能否选择未分组的列 | 不能 | 能 |
| 典型用途 | 每组的合计 | 每行的值 + 组级数字（占比、排名、累计） |
| 执行时机 | 第 3 步（`SELECT` 之前） | 第 5 步（在 `SELECT` 中） |

两者可以在同一个查询里同时使用：窗口函数在分组**之后**，基于分组后的行计算。

## 示例讲解
每位员工的工资占其部门工资总额的比例：

```sql
SELECT name, department, salary,
       SUM(salary) OVER (PARTITION BY department) AS dept_payroll,
       ROUND(100.0 * salary / SUM(salary) OVER (PARTITION BY department), 1) AS pct_of_dept
FROM employees;
```

如果用 `GROUP BY department`，每个部门只剩一行，员工姓名就没了。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "一张表有 100 行，分属 5 个部门。`SELECT department, COUNT(*) ... GROUP BY department` 和 `SELECT department, COUNT(*) OVER (PARTITION BY department) ...` 分别返回几行？",
  "options": ["5 和 5", "5 和 100", "100 和 5", "100 和 100"],
  "explanation": "GROUP BY 每个部门返回一行；窗口函数保留全部 100 行，并在每行上重复显示部门人数。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "对每笔订单，返回 `order_id`、`region`、`amount`，以及该订单占所在区域总收入的百分比 `pct_of_region`（保留 1 位小数）。",
  "hints": ["需要保留每一笔订单，所以不能用 GROUP BY。", "用 amount 除以 SUM(amount) OVER (PARTITION BY region)。"]
}
```

> [!TIP] 面试技巧
> - 先说“压缩行 vs 保留行”，再给一个一句话的例子。
> - 提一下两者可以组合：先 `GROUP BY`，再用窗口函数给分组排名。
> - 占总量的比例是窗口函数的经典用法；能用窗口一次扫描完成时，不要再和聚合子查询做自连接。
