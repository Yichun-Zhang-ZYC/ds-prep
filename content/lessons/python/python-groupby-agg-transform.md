---
id: python-groupby-agg-transform
title: groupby / agg / transform
estimatedMinutes: 14
difficulty: medium
tags: [python, pandas, groupby, aggregation]
---

## Why it matters
`groupby` is the most-tested pandas feature: metrics per segment, per-user features, share of total, ranking within groups. Knowing `agg` vs `transform` vs `apply` separates fluent candidates from struggling ones.

## Concept
Split → apply → combine.

```python
g = df.groupby("region")
g["revenue"].sum()                                  # Series indexed by region
g.agg(total=("revenue", "sum"),                     # named aggregation
      orders=("order_id", "nunique"),
      avg=("revenue", "mean")).reset_index()
df.groupby(["region", "month"], as_index=False)["revenue"].sum()
```

- **agg** returns **one row per group** (reduces).
- **transform** returns a result **aligned to the original rows** (same length). Perfect for "value relative to the group":
```python
df["share"] = df["revenue"] / df.groupby("region")["revenue"].transform("sum")
df["z"] = df.groupby("region")["x"].transform(lambda s: (s - s.mean()) / s.std())
df["rank"] = df.groupby("region")["revenue"].rank(ascending=False, method="first")
df["cum"] = df.groupby("user")["amount"].cumsum()
df["prev"] = df.groupby("user")["amount"].shift(1)
```
- **filter** keeps whole groups meeting a condition: `df.groupby("user").filter(lambda g: len(g) >= 3)`.
- **apply** is the flexible fallback (arbitrary function per group), but slow; prefer built-ins.
- `size()` counts rows including NaN; `count()` counts non-null values per column.
- Group keys with NaN are dropped by default (`dropna=False` to keep them).

## Worked example
| region | revenue |
|---|---|
| East | 100 |
| East | 300 |
| West | 200 |

`groupby("region")["revenue"].agg("sum")` → East 400, West 200 (2 rows).
`groupby("region")["revenue"].transform("sum")` → 400, 400, 200 (3 rows), so `share` = 0.25, 0.75, 1.0.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You want each row's revenue divided by its region's average. Which method fits?",
  "options": ["groupby().agg('mean') then divide directly", "groupby()['revenue'].transform('mean')", "groupby().filter()", "df.pivot_table()"],
  "answer": 1,
  "explanation": "transform broadcasts the group statistic back to each row, keeping the original shape."
}
```

```quiz
{
  "id": "q2",
  "question": "What's the difference between `size()` and `count()` on a groupby?",
  "options": ["None", "size counts all rows per group; count counts non-null values per column", "count includes NaN; size doesn't", "size only works on numeric columns"],
  "answer": 1,
  "explanation": "size() → rows per group; count() → non-missing values in each column."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Orders have `user`, `region`, `amount`. Write `region_summary(df)` returning a DataFrame with columns `region`, `total`, `orders`, `users` (unique users), sorted by total descending. Write `add_group_features(df)` returning a copy with `region_share` (amount / region total) and `user_order_num` (1, 2, 3… in the original row order within each user).",
  "setup": "import pandas as pd",
  "packages": ["pandas"],
  "starterCode": "import pandas as pd\n\ndef region_summary(df):\n    pass\n\ndef add_group_features(df):\n    pass\n\ndf = pd.DataFrame({'user': ['u1', 'u1', 'u2', 'u3'], 'region': ['E', 'E', 'E', 'W'], 'amount': [100, 300, 100, 200]})\nprint(region_summary(df))",
  "tests": "df = pd.DataFrame({'user': ['u1', 'u1', 'u2', 'u3'], 'region': ['E', 'E', 'E', 'W'], 'amount': [100, 300, 100, 200]})\ns = region_summary(df)\nassert list(s.columns) == ['region', 'total', 'orders', 'users']\nassert s.iloc[0].tolist() == ['E', 500, 3, 2]\nassert s.iloc[1].tolist() == ['W', 200, 1, 1]\nf = add_group_features(df)\nassert [round(x, 2) for x in f['region_share']] == [0.2, 0.6, 0.2, 1.0]\nassert list(f['user_order_num']) == [1, 2, 1, 1]\nassert 'region_share' not in df.columns",
  "solution": "import pandas as pd\n\ndef region_summary(df):\n    return (df.groupby('region')\n              .agg(total=('amount', 'sum'), orders=('amount', 'size'), users=('user', 'nunique'))\n              .reset_index()\n              .sort_values('total', ascending=False)\n              .reset_index(drop=True))\n\ndef add_group_features(df):\n    out = df.copy()\n    out['region_share'] = out['amount'] / out.groupby('region')['amount'].transform('sum')\n    out['user_order_num'] = out.groupby('user').cumcount() + 1\n    return out",
  "hints": ["Named aggregation: agg(total=('amount', 'sum'), ...).", "groupby('user').cumcount() numbers rows within each group starting at 0."]
}
```

> [!TIP] Interview tips
> - Say "agg reduces, transform keeps the shape" and pick accordingly.
> - Use named aggregation for readable output columns.
> - Avoid groupby.apply when a built-in (transform, cumsum, rank, shift, cumcount) does the job; it's much faster.
