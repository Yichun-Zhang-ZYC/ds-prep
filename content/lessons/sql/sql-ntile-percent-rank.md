---
id: sql-ntile-percent-rank
title: NTILE, PERCENT_RANK
estimatedMinutes: 10
difficulty: medium
tags: [window-functions, percentiles, bucketing]
---

## Why it matters
"Split customers into spend quartiles" and "is this user in the top 10%?" come up in segmentation and growth interviews. `NTILE` and `PERCENT_RANK` answer them directly.

## Concept
| Function | Returns | Ties |
|---|---|---|
| `NTILE(n)` | bucket number 1..n with (nearly) equal row counts | tied values can land in different buckets |
| `PERCENT_RANK()` | `(rank − 1) / (rows − 1)`, from 0 to 1 | ties share a value |
| `CUME_DIST()` | share of rows with a value ≤ this one, from >0 to 1 | ties share a value |

`NTILE` splits by **row count**, not by value range. With 10 rows and `NTILE(4)`, the buckets get 3, 3, 2, 2 rows.

## Worked example
Spend quartiles and percentile rank per customer:

```sql
SELECT customer_id, total_spend,
       NTILE(4) OVER (ORDER BY total_spend DESC)          AS quartile,   -- 1 = top 25%
       ROUND(PERCENT_RANK() OVER (ORDER BY total_spend), 2) AS pct_rank   -- 1.0 = highest
FROM customer_spend;
```

For "top 10% of users by spend", `PERCENT_RANK() OVER (ORDER BY spend DESC) < 0.10` or `NTILE(10) ... = 1` both work. They can differ by a row or two when values tie.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A table has 10 rows. How many rows go into each bucket with `NTILE(3)`?",
  "options": ["3, 3, 4", "4, 3, 3", "3, 4, 3", "It depends on the values"],
  "answer": 1,
  "explanation": "The remainder is given to the first buckets: 10 = 4 + 3 + 3."
}
```

```quiz
{
  "id": "q2",
  "question": "What is `PERCENT_RANK()` for the lowest value and for the highest value (no ties, ascending order)?",
  "options": ["0 and 1", "1/n and 1", "0 and (n−1)/n", "1 and n"],
  "answer": 0,
  "explanation": "PERCENT_RANK = (rank − 1) / (n − 1), so the first row is 0 and the last row is 1."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Split the 8 sellers into **4 groups by revenue, highest first** (group 1 = top). Return `seller` and the group number as `quartile`.",
  "setup": "CREATE TABLE sellers (seller TEXT, revenue INTEGER); INSERT INTO sellers VALUES ('A',900),('B',750),('C',720),('D',600),('E',410),('F',380),('G',150),('H',90);",
  "starterCode": "SELECT seller,\n       -- quartile here\nFROM sellers;",
  "solution": "SELECT seller,\n       NTILE(4) OVER (ORDER BY revenue DESC) AS quartile\nFROM sellers;",
  "hints": ["NTILE(4) gives bucket numbers 1 to 4.", "Order by revenue descending so bucket 1 holds the top sellers."]
}
```

> [!TIP] Interview tips
> - Clarify "quartile by count" (NTILE) versus "quartile by value" (thresholds from `PERCENTILE_CONT`). They differ on skewed data.
> - Mention that `NTILE` breaks ties arbitrarily; add a tie-breaker to `ORDER BY` for reproducible buckets.
> - For "top X%", state the direction (`DESC`) and whether the boundary is inclusive.
