---
id: python-apply-vs-vectorized-ops
title: apply vs vectorized ops
estimatedMinutes: 10
difficulty: medium
tags: [python, pandas, performance, vectorization]
---

## Why it matters
`df.apply(lambda row: ..., axis=1)` is the most common pandas performance mistake. Interviewers often hand you slow code and ask you to vectorize it.

## Concept
- `df.apply(f, axis=1)` calls a Python function **once per row**, building a Series each time: often 100× slower than column operations.
- `Series.apply` / `Series.map` call a function per element: faster than row-wise apply, still Python speed.
- **Vectorized** alternatives operate on whole columns in C:

| Row-wise apply | Vectorized |
|---|---|
| `lambda r: r.a + r.b` | `df.a + df.b` |
| `lambda r: "big" if r.x > 10 else "small"` | `np.where(df.x > 10, "big", "small")` |
| multi-branch if/elif | `np.select(conds, choices, default)` |
| lookup in a dict | `df.col.map(mapping)` |
| bucketing | `pd.cut(df.x, bins, labels=...)` |
| string ops | `df.s.str.lower()`, `.str.contains()`, `.str.extract()` |
| date parts | `df.ts.dt.dayofweek`, `.dt.month` |
| clip / fill | `df.x.clip(0, 100)`, `df.x.fillna(0)` |

- When you truly need custom per-row logic: try `np.vectorize` for readability (not speed), list comprehensions over `zip(df.a, df.b)` (faster than apply), or Numba.
- `groupby().apply` is similarly slow; prefer `agg`/`transform` with built-in names.

## Worked example
```python
# slow: ~10 s on 5M rows
df["fee"] = df.apply(lambda r: r.amount * 0.03 if r.country == "US" else r.amount * 0.05, axis=1)
# fast: ~50 ms
df["fee"] = df["amount"] * np.where(df["country"] == "US", 0.03, 0.05)
```

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which is typically fastest for mapping country codes to names on 10M rows?",
  "options": ["df.apply(lambda r: names[r.code], axis=1)", "df['code'].map(names)", "A for loop with df.iterrows()", "df['code'].apply(lambda c: names[c])"],
  "answer": 1,
  "explanation": "Series.map with a dict is optimized; iterrows and row-wise apply are the slowest options."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Vectorize these (no `apply`, `iterrows` or Python loops): `fee(df)` returns amount × 0.03 for US rows and × 0.05 otherwise; `tier(df)` returns 'gold' if spend ≥ 1000, 'silver' if spend ≥ 100, else 'bronze'; `country_name(df, mapping)` maps `country` codes with a dict, using 'Other' for unknown codes.",
  "setup": "import pandas as pd\nimport numpy as np",
  "packages": ["pandas"],
  "starterCode": "import pandas as pd\nimport numpy as np\n\ndef fee(df):\n    pass\n\ndef tier(df):\n    pass\n\ndef country_name(df, mapping):\n    pass\n",
  "tests": "import inspect\ndf = pd.DataFrame({'country': ['US', 'CA', 'FR'], 'amount': [100.0, 100.0, 200.0], 'spend': [50, 150, 5000]})\nassert np.allclose(fee(df), [3.0, 5.0, 10.0])\nassert list(tier(df)) == ['bronze', 'silver', 'gold']\nassert list(country_name(df, {'US': 'United States', 'CA': 'Canada'})) == ['United States', 'Canada', 'Other']\nsrc = inspect.getsource(fee) + inspect.getsource(tier) + inspect.getsource(country_name)\nassert 'apply' not in src and 'iterrows' not in src and 'for ' not in src",
  "solution": "import pandas as pd\nimport numpy as np\n\ndef fee(df):\n    return df['amount'] * np.where(df['country'] == 'US', 0.03, 0.05)\n\ndef tier(df):\n    return pd.Series(np.select([df['spend'] >= 1000, df['spend'] >= 100], ['gold', 'silver'], default='bronze'), index=df.index)\n\ndef country_name(df, mapping):\n    return df['country'].map(mapping).fillna('Other')",
  "hints": ["np.where for two branches, np.select for several.", "map returns NaN for missing keys; fillna replaces them."]
}
```

> [!TIP] Interview tips
> - Spot `apply(axis=1)` and `iterrows` as red flags; propose np.where/np.select/map/str/dt equivalents.
> - Quote rough speedups (10–100×) and mention measuring with %timeit.
> - When logic is truly custom, mention Numba or zipped list comprehensions as faster fallbacks.
