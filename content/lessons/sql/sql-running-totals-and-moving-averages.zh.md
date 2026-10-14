---
id: sql-running-totals-and-moving-averages
title: 累计求和与移动平均
---

## 为什么重要
累计收入、DAU 的 7 日移动平均、年初至今合计，都是看板的常客。面试中的难点在窗口**框架**（frame）：`ROWS` 和 `RANGE` 的区别，以及默认框架遇到并列值时的行为。

## 概念
聚合函数加上 `OVER (... ORDER BY ...)` 就变成累计计算。框架子句指定当前行周围哪些行参与计算：

```sql
SUM(x) OVER (ORDER BY day ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)  -- running total
AVG(x) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)          -- 7-row moving average
SUM(x) OVER (PARTITION BY year ORDER BY day)                                 -- year-to-date
```

- `ROWS` 按物理行计数；`RANGE` 把 `ORDER BY` 取值相同的行归为一组。
- 有 `ORDER BY` 但没写框架时，默认是 `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`。如果两行的排序键相同，它们会得到相同的累计值（彼此都包含在内）。想逐行累计时，要显式写 `ROWS`。
- 移动平均的前几行用到的行数少于窗口大小。如果这一点有影响，就过滤掉这些行，或者把实际行数也显示出来。

## 示例讲解
累计收入和 3 日移动平均：

```sql
SELECT day, revenue,
       SUM(revenue) OVER (ORDER BY day ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total,
       ROUND(AVG(revenue) OVER (ORDER BY day ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS ma_3d
FROM daily_revenue;
```

和 `LAG` 一样，`ROWS` 框架按行而不是按天计数。有日期缺失时，“最近 3 行”覆盖的不止 3 天。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "两行的 `day = '2024-01-02'` 相同。用 `SUM(x) OVER (ORDER BY day)`（不写框架）时，它们会得到什么？",
  "options": ["逐行不同的累计值", "相同的累计值，且两行都包含在内", "NULL", "报错"],
  "explanation": "默认框架是 RANGE ... CURRENT ROW，会包含所有 ORDER BY 取值相同的行。"
}
```

```quiz
{
  "id": "q2",
  "question": "在每天恰好一行的表上，哪个框架给出 7 日移动平均？",
  "options": ["`ROWS BETWEEN 7 PRECEDING AND CURRENT ROW`", "`ROWS BETWEEN 6 PRECEDING AND CURRENT ROW`", "`ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING`", "`RANGE UNBOUNDED PRECEDING`"],
  "explanation": "前 6 行加当前行共 7 行。（3 PRECEDING AND 3 FOLLOWING 也是 7 行，但它是居中窗口，用到了未来的数据。）"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "对每个 `day`，返回当天的 `signups` 和截至当天的累计注册数 `cumulative_signups`。",
  "hints": ["SUM(...) OVER (ORDER BY day) 会累加。", "显式写出 ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW。"]
}
```

```sql-exercise
{
  "id": "ex2",
  "prompt": "返回 `day` 和 `dau` 的 **3 日移动平均**（当天及前 2 天），命名为 `ma_3d`，保留 2 位小数。",
  "hints": ["3 行的窗口就是 2 PRECEDING AND CURRENT ROW。"]
}
```

> [!TIP] 面试技巧
> - 显式写出框架。说一句“默认是 RANGE，会把并列行合在一起”，能体现真正的理解深度。
> - 指标优先用尾随窗口（`PRECEDING`）；居中窗口会把未来数据泄露进预测。
> - 有缺口的按日历计算的窗口，要么先补齐日期，要么在支持的数据库里用 `RANGE BETWEEN INTERVAL '6' DAY PRECEDING AND CURRENT ROW`（Postgres；BigQuery 可对数值型的日期序号用 `RANGE`）。
