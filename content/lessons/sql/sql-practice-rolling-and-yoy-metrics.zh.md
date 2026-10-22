---
id: sql-practice-rolling-and-yoy-metrics
title: "练习：滚动窗口与同比指标"
---

## 为什么重要
指标类题目常以“和去年同期相比”或“最近 7 天”收尾。窗口函数本身不难，危险在于日历逻辑：缺失的日期或月份会悄悄让基于行的窗口和 `LAG` 偏移错位。面试官会观察你是否注意到。语法参见 *Running totals and moving averages*、*LAG and LEAD* 和 *Month-over-month growth*。

## 概念
**基于行 vs 基于日历。** `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW` 表示 7 *行*，只有每天恰好出现一次时才是 7 *天*。三种安全的做法：

1. **先补全日历。** 把数据左连接到日期骨架（日历表或递归 CTE），用 `COALESCE(revenue, 0)` 填充，再用 `ROWS`。
2. **对日期做自连接或相关子查询**，例如 `JOIN daily p ON p.day BETWEEN date(d.day, '-2 day') AND d.day`。有缺口时也适用，而且去重计数只能这样做。
3. **在支持的引擎中用带数值偏移的 `RANGE`**（需要数值型排序键，如天序号）。

**同比 / 环比。**
- `LAG(revenue, 12)` 只有在每个月都恰好出现一次时才对。缺了一个月就会和错误的期间比较。按平移后的键关联（`strftime('%Y-%m', month || '-01', '-1 year')`，或 `month - INTERVAL '1 year'`）更稳健，并且在没有上年数据时得到 NULL。
- 增长率是 $\frac{\text{当期} - \text{上期}}{\text{上期}}$；用 `NULLIF(prior, 0)` 防止分母为零或 NULL。
- 比较等长的期间：当月未完结与上年整月比较会产生误导。

**期间内的累计：** `SUM(x) OVER (PARTITION BY year ORDER BY month)` 在每年重置（年初至今）。

**不完整的窗口。** 开头的行没有 $k$ 个邻居。要决定输出 NULL（用同一框架的 `COUNT(*) OVER (...)` 检查）还是较短窗口的平均。

陷阱：窗口里漏了 `ORDER BY`；默认的 `RANGE` 框架对相同日期会重复累加；整数除法。

## 示例讲解
表 `monthly(month, revenue)`，故意缺少一个月（2023-04）。任务：通过关联上一年的同一个月，计算 2024 年每个月的同比增长。

```sql
SELECT c.month,
       c.revenue,
       p.revenue AS prior_year,
       ROUND((c.revenue - p.revenue) * 100.0 / p.revenue, 1) AS yoy_pct
FROM monthly c
LEFT JOIN monthly p
  ON p.month = strftime('%Y-%m', c.month || '-01', '-1 year')
WHERE c.month >= '2024-01'
ORDER BY c.month;
```

结果：

| month | revenue | prior_year | yoy_pct |
|---|---|---|---|
| 2024-01 | 120 | 100 | 20 |
| 2024-02 | 125 | 110 | 13.6 |
| 2024-03 | 150 | 120 | 25 |
| 2024-04 | 140 | NULL | NULL |
| 2024-05 | 156 | 130 | 20 |
| 2024-06 | 175 | 140 | 25 |

检验 2024-06：175 对比 2023-06 的 140，$(175 - 140)/140 = 25\%$。2024-04 没有对应的 2023-04 行，所以 `prior_year` 和 `yoy_pct` 为 NULL，这才是诚实的答案。如果用 `LAG(revenue, 12) OVER (ORDER BY month)`，缺失的那一行会让所有偏移错一位，每个 2024 年的月份都会和其真实对应月份的前一个月比较（例如 2024-04 对 2023-03 的 120），而 1 月会得到 NULL。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "表里每天一行，但缺少周末。`AVG(x) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)` 计算的是……的平均？",
  "options": [
    "最近 7 个日历日",
    "最近 7 行，跨越的日历天数超过 7 天",
    "加上 PARTITION BY 才是最近 7 个工作日",
    "总是恰好 7 天"
  ],
  "explanation": "ROWS 按行数而不是时间计数。有缺口时，框架在日历上会往前延伸更远。想要 7 个日历日，应使用日历骨架、日期范围自连接或 RANGE。"
}
```

```quiz
{
  "id": "q2",
  "question": "本月收入为 80，去年同月为 0。同比增长应显示什么？",
  "options": [
    "无穷大",
    "100%",
    "NULL（未定义），用 NULLIF(prior, 0) 做除数",
    "0%"
  ],
  "explanation": "从零开始的增长是未定义的。NULLIF(prior, 0) 把零分母变成 NULL，查询不会报错，结果也如实地标为缺失。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "`daily` 中缺少一些日期。对每一行，返回**以该日结束的 3 个日历日的收入之和**（该日及前两天；缺失的日子不贡献）。列：`day, rolling_3d`。",
  "hints": [
    "ROWS 框架按行计数而不是日历日，所以要用日期。",
    "对 p.day BETWEEN date(d.day, '-2 day') AND d.day 使用相关子查询（或自连接）。",
    "对匹配的行求 SUM；每个外层行至少匹配自己。"
  ]
}
```

```sql-exercise
{
  "id": "ex2",
  "prompt": "返回每个月的**年初至今收入**（在自然年内累计，每年 1 月重置）。列：`month, revenue, ytd`。",
  "hints": [
    "按年份部分分区：substr(month, 1, 4)。",
    "按 month 排序，用显式的 ROWS 框架累加到当前行。",
    "新分区会自动重置总和。"
  ]
}
```

```sql-exercise
{
  "id": "ex3",
  "prompt": "以 `monthly` 的**前三行**（月份）作为基线，返回收入**严格高于这三个月平均值**的月份。只考虑拥有完整三行历史的月份。列：`month, revenue, prev3_avg`（保留 2 位小数）。",
  "hints": [
    "框架 ROWS BETWEEN 3 PRECEDING AND 1 PRECEDING 不包含当前行。",
    "同一框架上的 COUNT(*) 告诉你是否有三行可用。",
    "不能在 WHERE 中过滤窗口函数的结果；先包一层 CTE。"
  ]
}
```

> [!TIP] 面试技巧
> - 先问“是否保证每天/每月都有数据？”，并说明如何处理缺口。
> - 做同比时，除非日历完整，否则优先按平移后的日期关联，而不是 LAG(12)。
> - 说明开头的期间应输出 NULL 还是部分窗口的平均。
