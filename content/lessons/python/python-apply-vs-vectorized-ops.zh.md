---
id: python-apply-vs-vectorized-ops
title: apply vs 向量化运算
---

## 为什么重要
`df.apply(lambda row: ..., axis=1)` 是最常见的 pandas 性能错误。面试官经常递给你一段慢代码，让你把它向量化。

## 概念
- `df.apply(f, axis=1)` 对**每一行**调用一次 Python 函数，每次都构建一个 Series：往往比列运算慢 100 倍。
- `Series.apply` / `Series.map` 对每个元素调用函数：比按行 apply 快，但仍是 Python 的速度。
- **向量化**的替代方案在 C 中对整列运算：

| 按行 apply | 向量化写法 |
|---|---|
| `lambda r: r.a + r.b` | `df.a + df.b` |
| `lambda r: "big" if r.x > 10 else "small"` | `np.where(df.x > 10, "big", "small")` |
| 多分支 if/elif | `np.select(conds, choices, default)` |
| 字典查找 | `df.col.map(mapping)` |
| 分桶 | `pd.cut(df.x, bins, labels=...)` |
| 字符串操作 | `df.s.str.lower()`、`.str.contains()`、`.str.extract()` |
| 日期部分 | `df.ts.dt.dayofweek`、`.dt.month` |
| 截断 / 填充 | `df.x.clip(0, 100)`、`df.x.fillna(0)` |

- 当确实需要自定义的逐行逻辑时：可以用 `np.vectorize` 提高可读性（不提速）、对 `zip(df.a, df.b)` 用列表推导式（比 apply 快），或用 Numba。
- `groupby().apply` 同样很慢；优先使用带内置函数名的 `agg`/`transform`。

## 示例讲解
```python
# slow: ~10 s on 5M rows
df["fee"] = df.apply(lambda r: r.amount * 0.03 if r.country == "US" else r.amount * 0.05, axis=1)
# fast: ~50 ms
df["fee"] = df["amount"] * np.where(df["country"] == "US", 0.03, 0.05)
```

## 检验理解

```quiz
{
  "id": "q1",
  "question": "在 1000 万行数据上把国家代码映射为国家名，哪种方式通常最快？",
  "options": ["df.apply(lambda r: names[r.code], axis=1)", "df['code'].map(names)", "用 df.iterrows() 的 for 循环", "df['code'].apply(lambda c: names[c])"],
  "explanation": "用字典调用 Series.map 是经过优化的；iterrows 和按行 apply 是最慢的选项。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "把下面这些向量化（不用 `apply`、`iterrows` 或 Python 循环）：`fee(df)` 对 US 行返回 amount × 0.03，其他行返回 × 0.05；`tier(df)` 在 spend ≥ 1000 时返回 'gold'，spend ≥ 100 时返回 'silver'，否则返回 'bronze'；`country_name(df, mapping)` 用字典映射 `country` 代码，未知代码用 'Other'。",
  "hints": ["两个分支用 np.where，多个分支用 np.select。", "map 对缺失的键返回 NaN；用 fillna 替换。"]
}
```

> [!TIP] 面试技巧
> - 把 `apply(axis=1)` 和 `iterrows` 视为危险信号；提出 np.where/np.select/map/str/dt 等等价写法。
> - 给出大致的加速倍数（10–100 倍），并提到用 %timeit 测量。
> - 当逻辑确实需要定制时，提到 Numba 或基于 zip 的列表推导式作为更快的后备方案。
