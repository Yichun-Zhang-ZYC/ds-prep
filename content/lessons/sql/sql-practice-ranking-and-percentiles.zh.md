---
id: sql-practice-ranking-and-percentiles
title: "练习：排名、百分位与 Top-N"
---

## 为什么重要
“每组前 3 名”“第二高”“中位数”“p90 延迟”几乎出现在每一轮 SQL 面试中。它们看似不同的技巧，其实是同一个想法：在分区内排序，再按位置挑选。真正的考点是如何处理并列和小分组。

## 概念
根据并列时的期望行为选择函数（参见 *ROW_NUMBER, RANK, DENSE_RANK* 和 *Top-N per group*）：

- `ROW_NUMBER`：位置唯一，除非加上次级排序，否则并列的先后是任意的。适用于“每组恰好 N 行”或去重。
- `RANK`：并列共享名次并留下空缺（1, 2, 2, 4）。“前 3 名”可能返回超过 3 行。
- `DENSE_RANK`：并列共享名次且无空缺（1, 2, 2, 3）。适用于“前 N 个不同的值”和“第 N 高的薪水”。

**没有 `PERCENTILE_CONT` 时的百分位**（SQLite 和 MySQL 没有；Postgres、Snowflake、BigQuery 有各自的写法，参见 *Median and percentiles*）。可移植的做法是最近秩（nearest-rank）：

1. 每组升序编号 `rn`，并统计行数 `n = COUNT(*) OVER (PARTITION BY g)`。
2. 第 $p$ 百分位是位置 $\lceil p \cdot n \rceil$ 上的那一行。
3. $n$ 为偶数时，中位数是位置 $n/2$ 与 $n/2 + 1$ 的平均值。用一个过滤条件同时处理奇偶：`rn IN ((n + 1) / 2, (n + 2) / 2)`（整数除法）。

`NTILE(k)` 和 `PERCENT_RANK` 给出分桶标签和相对排名，但 `NTILE` 会把相同的值拆到不同的桶里，有并列时要明确说明。

陷阱：算百分位时 `DESC` 与 `ASC` 搞反；在分组问题里用 `LIMIT`（它限制的是整个结果）；分组行数不足 N（“第二高”可能不存在，应返回 NULL 而不是报错）。

## 示例讲解
表 `employees(emp_id, name, dept, salary)`。把三个排名函数并排放在一起，可以清楚看到它们在并列时的分歧。

```sql
SELECT name, dept, salary,
       ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC) AS rn,
       RANK()       OVER (PARTITION BY dept ORDER BY salary DESC) AS rk,
       DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS drk
FROM employees
ORDER BY dept, salary DESC, name;
```

结果：

| name | dept | salary | rn | rk | drk |
|---|---|---|---|---|---|
| Ann | Eng | 150 | 1 | 1 | 1 |
| Bo | Eng | 140 | 2 | 2 | 2 |
| Cy | Eng | 140 | 3 | 2 | 2 |
| Di | Eng | 120 | 4 | 4 | 3 |
| Ed | Eng | 100 | 5 | 5 | 4 |
| Ivy | Ops | 70 | 1 | 1 | 1 |
| Jo | Ops | 60 | 2 | 2 | 2 |
| Flo | Sales | 90 | 1 | 1 | 1 |
| Gus | Sales | 80 | 2 | 2 | 2 |
| Hal | Sales | 80 | 3 | 2 | 2 |

在 Eng 部门，Bo 和 Cy 并列 140：`ROW_NUMBER` 给出 2 和 3（顺序任意），`RANK` 给出 2 和 2，随后 Di 跳到 4，`DENSE_RANK` 给出 2 和 2，随后是 3。所以“Eng 前 3 个薪水档位”是 `drk <= 3`，会返回 Ann、Bo、Cy、Di（4 个人，3 个不同档位），而 `rn <= 3` 会根据并列的处理悄悄丢掉 Cy 或 Bo。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "某部门薪水为 100、90、90、80。`RANK() ... ORDER BY salary DESC` 给 80 的名次是多少？`DENSE_RANK()` 呢？",
  "options": [
    "3 和 3",
    "4 和 4",
    "4 和 3",
    "3 和 4"
  ],
  "explanation": "RANK 得到 1, 2, 2, 4（并列之后有空缺）；DENSE_RANK 得到 1, 2, 2, 3。"
}
```

```quiz
{
  "id": "q2",
  "question": "某组有 $n = 10$ 个值。按最近秩定义，第 90 百分位对应升序后的第几个位置？",
  "options": [
    "9",
    "10",
    "9.5（插值）",
    "1"
  ],
  "explanation": "位置为 ceil(0.9 x 10) = 9（升序）。插值定义（PERCENTILE_CONT）会给出位置 9 和 10 之间的值，所以要说明你用的定义。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "返回薪水处于所在部门**前 2 个不同薪水档位**的所有员工。列：`name, dept, salary`。",
  "hints": [
    "需要并列薪水名次相同且没有空缺的排名。",
    "DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC)，然后在外层过滤。"
  ]
}
```

```sql-exercise
{
  "id": "ex2",
  "prompt": "计算**每个部门的薪水中位数**（人数为偶数时取中间两个值的平均）。列：`dept, median_salary`。",
  "hints": [
    "在同一个 CTE 中按部门升序编号并统计行数。",
    "整数除法下，n 为奇数时 (n + 1) / 2 与 (n + 2) / 2 是同一行，n 为偶数时是中间两行。",
    "对选出的一两行按部门做 AVG。"
  ]
}
```

```sql-exercise
{
  "id": "ex3",
  "prompt": "用**最近秩方法**返回每个部门的**第 75 百分位薪水**（升序位置 $\\lceil 0.75 n \\rceil$ 上的值）。列：`dept, p75_salary`。",
  "hints": [
    "整数除法下 ceil(0.75 * n) 等于 (3 * n + 3) / 4。",
    "按升序编号，保留 rn 等于该位置的那一行。",
    "即使薪水有并列，每个部门也恰好返回一行。"
  ]
}
```

> [!TIP] 面试技巧
> - 选择 ROW_NUMBER、RANK 还是 DENSE_RANK 之前，先问“并列怎么处理”。
> - 没有 PERCENTILE_CONT 时，给出最近秩做法，并说明你采用的定义。
> - 提到空分组/小分组的情况：行数不足 N 就返回更少的结果（或 NULL），而不是报错。
