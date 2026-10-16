---
id: python-pandas-sql-equivalents
title: pandas ↔ SQL 对照
---

## 为什么重要
很多面试允许你用 SQL 或 pandas 作答，或者让你在两者之间互相翻译。记住这份对照表能让你在两边都更快，并减少 bug。

## 概念

| SQL | pandas |
|---|---|
| `SELECT a, b FROM t` | `t[["a", "b"]]` |
| `WHERE x > 5 AND y = 'k'` | `t[(t.x > 5) & (t.y == "k")]` 或 `t.query("x > 5 and y == 'k'")` |
| `WHERE c IN (...)` | `t[t.c.isin([...])]` |
| `WHERE c IS NULL` | `t[t.c.isna()]` |
| `ORDER BY a DESC LIMIT 10` | `t.sort_values("a", ascending=False).head(10)` |
| `SELECT DISTINCT a` | `t["a"].drop_duplicates()` / `.unique()` |
| `COUNT(DISTINCT a)` | `t["a"].nunique()` |
| `GROUP BY g` + 聚合 | `t.groupby("g").agg(n=("id", "count"), s=("v", "sum"))` |
| `HAVING SUM(v) > 100` | 先 `.agg(...)` 再筛选：`res[res.s > 100]` |
| `JOIN ... ON` | `a.merge(b, on="key", how="inner/left/...")` |
| `UNION ALL` / `UNION` | `pd.concat([a, b])` / `.drop_duplicates()` |
| `CASE WHEN ... END` | `np.where` / `np.select` |
| `ROW_NUMBER() OVER (PARTITION BY g ORDER BY v DESC)` | `t.groupby("g")["v"].rank(method="first", ascending=False)` |
| `SUM(v) OVER (PARTITION BY g)` | `t.groupby("g")["v"].transform("sum")` |
| `LAG(v) OVER (PARTITION BY g ORDER BY ts)` | `t.sort_values("ts").groupby("g")["v"].shift(1)` |
| 累计和 | `t.groupby("g")["v"].cumsum()` |
| `COALESCE(a, b)` | `t.a.fillna(t.b)` |

容易踩坑的差异：
- pandas 的 `groupby` 默认丢弃 NaN 键；SQL 会把 NULL 归为一组。
- pandas 连接时 NaN 键会相互匹配；SQL 中 NULL 永远不等于 NULL。
- SQL 的 `COUNT(col)` 跳过 NULL，与 pandas 的 `count()` 一样；`COUNT(*)` 对应 `size()`。
- `rank(method=...)`："first" ≈ ROW_NUMBER，"min" ≈ RANK，"dense" ≈ DENSE_RANK。

## 示例讲解
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

## 检验理解

```quiz
{
  "id": "q1",
  "question": "哪种 pandas rank 方法对应 SQL 的 DENSE_RANK()？",
  "options": ["method='first'", "method='min'", "method='dense'", "method='average'"],
  "explanation": "dense 给出连续的排名，平局之后没有空缺，与 DENSE_RANK 一致。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "翻译成 pandas。(1) `paid_revenue(orders)`：SELECT region, COUNT(*) AS orders, SUM(amount) AS revenue FROM orders WHERE status='paid' GROUP BY region HAVING SUM(amount) > 100 ORDER BY revenue DESC（返回带新索引的 DataFrame）。(2) `add_window_cols(orders)`：返回一个副本，新增整数列 `rn` = ROW_NUMBER() OVER (PARTITION BY region ORDER BY amount DESC)，以及 `region_total` = SUM(amount) OVER (PARTITION BY region)。",
  "hints": ["HAVING = 对聚合结果再做筛选。", "ROW_NUMBER ↔ rank(method='first')；SUM OVER ↔ transform('sum')。"]
}
```

> [!TIP] 面试技巧
> - 先用 SQL 子句思考，再把每个子句映射到一个 pandas 步骤（WHERE → 掩码，GROUP BY → groupby/agg，HAVING → 聚合后筛选）。
> - 窗口函数对应 groupby 上的 transform / rank / shift / cumsum。
> - 指出分组和连接中 NULL/NaN 的差异。
