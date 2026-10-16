---
id: python-pandas-sql-equivalents
title: pandas ↔ SQL equivalents
estimatedMinutes: 12
difficulty: medium
tags: [python, pandas, sql]
---

## Why it matters
Many interviews let you answer in SQL or pandas, or ask you to translate between them. Having the mapping memorized makes you fast in both and reduces bugs.

## Concept

| SQL | pandas |
|---|---|
| `SELECT a, b FROM t` | `t[["a", "b"]]` |
| `WHERE x > 5 AND y = 'k'` | `t[(t.x > 5) & (t.y == "k")]` or `t.query("x > 5 and y == 'k'")` |
| `WHERE c IN (...)` | `t[t.c.isin([...])]` |
| `WHERE c IS NULL` | `t[t.c.isna()]` |
| `ORDER BY a DESC LIMIT 10` | `t.sort_values("a", ascending=False).head(10)` |
| `SELECT DISTINCT a` | `t["a"].drop_duplicates()` / `.unique()` |
| `COUNT(DISTINCT a)` | `t["a"].nunique()` |
| `GROUP BY g` + aggregates | `t.groupby("g").agg(n=("id", "count"), s=("v", "sum"))` |
| `HAVING SUM(v) > 100` | `.agg(...)` then filter: `res[res.s > 100]` |
| `JOIN ... ON` | `a.merge(b, on="key", how="inner/left/...")` |
| `UNION ALL` / `UNION` | `pd.concat([a, b])` / `.drop_duplicates()` |
| `CASE WHEN ... END` | `np.where` / `np.select` |
| `ROW_NUMBER() OVER (PARTITION BY g ORDER BY v DESC)` | `t.groupby("g")["v"].rank(method="first", ascending=False)` |
| `SUM(v) OVER (PARTITION BY g)` | `t.groupby("g")["v"].transform("sum")` |
| `LAG(v) OVER (PARTITION BY g ORDER BY ts)` | `t.sort_values("ts").groupby("g")["v"].shift(1)` |
| running total | `t.groupby("g")["v"].cumsum()` |
| `COALESCE(a, b)` | `t.a.fillna(t.b)` |

Differences that bite:
- pandas `groupby` drops NaN keys by default; SQL groups NULLs together.
- pandas joins match NaN keys to each other; SQL NULL never equals NULL.
- SQL `COUNT(col)` skips NULLs like pandas `count()`; `COUNT(*)` is `size()`.
- `rank(method=...)`: "first" ≈ ROW_NUMBER, "min" ≈ RANK, "dense" ≈ DENSE_RANK.

## Worked example
```sql
SELECT region, COUNT(*) AS orders, SUM(amount) AS revenue
FROM orders WHERE status = 'paid'
GROUP BY region HAVING SUM(amount) > 1000
ORDER BY revenue DESC;
```
```python
res = (orders[orders.status == "paid"]
       .groupby("region", as_index=False)
       .agg(orders=("amount", "size"), revenue=("amount", "sum")))
res = res[res.revenue > 1000].sort_values("revenue", ascending=False)
```

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which pandas rank method matches SQL DENSE_RANK()?",
  "options": ["method='first'", "method='min'", "method='dense'", "method='average'"],
  "answer": 2,
  "explanation": "dense gives consecutive ranks with no gaps after ties, like DENSE_RANK."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Translate to pandas. (1) `paid_revenue(orders)`: SELECT region, COUNT(*) AS orders, SUM(amount) AS revenue FROM orders WHERE status='paid' GROUP BY region HAVING SUM(amount) > 100 ORDER BY revenue DESC (return a DataFrame with a fresh index). (2) `add_window_cols(orders)`: return a copy with `rn` = ROW_NUMBER() OVER (PARTITION BY region ORDER BY amount DESC) as int and `region_total` = SUM(amount) OVER (PARTITION BY region).",
  "setup": "import pandas as pd",
  "packages": ["pandas"],
  "starterCode": "import pandas as pd\n\ndef paid_revenue(orders):\n    pass\n\ndef add_window_cols(orders):\n    pass\n",
  "tests": "o = pd.DataFrame({'region': ['E', 'E', 'W', 'W', 'N'], 'status': ['paid', 'paid', 'paid', 'refund', 'paid'], 'amount': [80, 50, 120, 500, 30]})\nr = paid_revenue(o)\nassert list(r.columns) == ['region', 'orders', 'revenue']\nassert r.values.tolist() == [['E', 2, 130], ['W', 1, 120]]\nw = add_window_cols(o)\nassert list(w['rn']) == [1, 2, 2, 1, 1]\nassert list(w['region_total']) == [130, 130, 620, 620, 30]\nassert 'rn' not in o.columns",
  "solution": "import pandas as pd\n\ndef paid_revenue(orders):\n    res = (orders[orders['status'] == 'paid']\n           .groupby('region', as_index=False)\n           .agg(orders=('amount', 'size'), revenue=('amount', 'sum')))\n    return res[res['revenue'] > 100].sort_values('revenue', ascending=False).reset_index(drop=True)\n\ndef add_window_cols(orders):\n    out = orders.copy()\n    out['rn'] = out.groupby('region')['amount'].rank(method='first', ascending=False).astype(int)\n    out['region_total'] = out.groupby('region')['amount'].transform('sum')\n    return out",
  "hints": ["HAVING = filter the aggregated result.", "ROW_NUMBER ↔ rank(method='first'); SUM OVER ↔ transform('sum')."]
}
```

> [!TIP] Interview tips
> - Think in SQL clauses, then map each to a pandas step (WHERE → mask, GROUP BY → groupby/agg, HAVING → filter after agg).
> - Window functions map to transform / rank / shift / cumsum on a groupby.
> - Call out NULL/NaN differences in grouping and joins.
