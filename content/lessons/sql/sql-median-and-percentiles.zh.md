---
id: sql-median-and-percentiles
title: 中位数与百分位数
---

## 为什么重要
在偏态数据（收入、订单金额、延迟）上，平均值会误导人。面试官让你求中位数，是想看你是否意识到这一点，以及在数据库没有 `MEDIAN` 函数时能不能算出来。

## 概念
| 引擎 | 中位数 |
|---|---|
| Postgres、Snowflake | `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY x)` |
| BigQuery | `PERCENTILE_CONT(x, 0.5) OVER ()` 或 `APPROX_QUANTILES(x, 2)[OFFSET(1)]` |
| SQLite、老版本 MySQL | 用行号自己计算 |

`PERCENTILE_CONT` 会在中间两个值之间插值；`PERCENTILE_DISC` 返回数据中真实存在的一个值。

用窗口函数的通用写法：给行编号，然后对中间那一行（奇数个）或中间两行（偶数个）求平均。共 `n` 行时，中间位置是 `(n + 1) / 2` 和 `(n + 2) / 2`（整数除法）。`n` 为奇数时这两个位置是同一行。

## 示例讲解
每个国家订单金额的中位数：

```sql
WITH ranked AS (
  SELECT country, amount,
         ROW_NUMBER() OVER (PARTITION BY country ORDER BY amount) AS rn,
         COUNT(*)     OVER (PARTITION BY country)                  AS n
  FROM orders
)
SELECT country, AVG(amount) AS median_amount
FROM ranked
WHERE rn IN ((n + 1) / 2, (n + 2) / 2)
GROUP BY country;
```

同样的模式可以求任意百分位：取位置为 `CEIL(p × n)` 的那一行（最近秩法）。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "订单金额为 10、20、30、1000。哪种说法正确？",
  "options": ["均值 265，中位数 25", "均值 25，中位数 265", "均值和中位数都是 265", "偶数个数据没有中位数"],
  "explanation": "均值 = 1060 / 4 = 265。中位数 = 20 和 30 的平均 = 25。一笔大额订单把均值拉得远高于典型订单。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "返回所有配送的 `delivery_days` 的**中位数**，命名为 `median_days`。数据行数为偶数。",
  "hints": ["排序后是 1、2、3、4、9、30，中间两个是第 3 和第 4 个值。", "对 rn 为 (n + 1) / 2 或 (n + 2) / 2 的行求平均。"]
}
```

> [!TIP] 面试技巧
> - 数据可能偏态时（收入、停留时长、延迟），主动提出用中位数。
> - 同时掌握 `PERCENTILE_CONT`（插值）和 `PERCENTILE_DISC`（真实值）。
> - 数据量大时，提一下近似分位数（`APPROX_QUANTILES`、t-digest），p95/p99 延迟就是这样算的。
