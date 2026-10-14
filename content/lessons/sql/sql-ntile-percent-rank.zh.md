---
id: sql-ntile-percent-rank
title: NTILE 与 PERCENT_RANK
---

## 为什么重要
“按消费把客户分成四档”“这个用户是否在前 10%？”常出现在用户分层和增长类面试中。`NTILE` 和 `PERCENT_RANK` 可以直接回答。

## 概念
| 函数 | 返回 | 并列时 |
|---|---|---|
| `NTILE(n)` | 1..n 的桶编号，每桶行数（几乎）相等 | 相同的值可能被分到不同的桶 |
| `PERCENT_RANK()` | `(rank − 1) / (rows − 1)`，取值 0 到 1 | 并列的值相同 |
| `CUME_DIST()` | 取值 ≤ 当前值的行所占比例，取值 (0, 1] | 并列的值相同 |

`NTILE` 按**行数**切分，而不是按取值范围。10 行数据做 `NTILE(4)`，各桶分别是 3、3、2、2 行。

## 示例讲解
每位客户的消费四分位档和百分位排名：

```sql
SELECT customer_id, total_spend,
       NTILE(4) OVER (ORDER BY total_spend DESC)          AS quartile,   -- 1 = top 25%
       ROUND(PERCENT_RANK() OVER (ORDER BY total_spend), 2) AS pct_rank   -- 1.0 = highest
FROM customer_spend;
```

要找“消费前 10% 的用户”，`PERCENT_RANK() OVER (ORDER BY spend DESC) < 0.10` 和 `NTILE(10) ... = 1` 都可以。存在并列时，两者可能相差一两行。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "一张表有 10 行。`NTILE(3)` 时每个桶各有几行？",
  "options": ["3, 3, 4", "4, 3, 3", "3, 4, 3", "取决于具体数值"],
  "explanation": "余数分给前面的桶：10 = 4 + 3 + 3。"
}
```

```quiz
{
  "id": "q2",
  "question": "（升序、无并列时）最小值和最大值的 `PERCENT_RANK()` 分别是多少？",
  "options": ["0 和 1", "1/n 和 1", "0 和 (n−1)/n", "1 和 n"],
  "explanation": "PERCENT_RANK = (rank − 1) / (n − 1)，所以第一行是 0，最后一行是 1。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "把 8 位卖家**按收入从高到低分成 4 组**（第 1 组为最高）。返回 `seller` 和组号 `quartile`。",
  "hints": ["NTILE(4) 会给出 1 到 4 的桶编号。", "按收入降序排序，这样第 1 桶就是收入最高的卖家。"]
}
```

> [!TIP] 面试技巧
> - 先澄清是“按人数分档”（NTILE）还是“按数值分档”（用 `PERCENTILE_CONT` 算阈值）。在偏态数据上两者差别很大。
> - 提一下 `NTILE` 对并列值的分配是任意的；在 `ORDER BY` 里加决胜字段，分桶才可复现。
> - 回答“前 X%”时，说明排序方向（`DESC`）以及边界是否包含。
