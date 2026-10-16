---
id: python-memory-and-performance
title: Memory & performance (categorical dtype, chunking)
estimatedMinutes: 12
difficulty: medium
tags: [python, pandas, performance, memory]
---

## Why it matters
"The CSV is 20 GB and my laptop has 16 GB of RAM" is a classic practical question. Knowing how to shrink DataFrames and process data in chunks (or switch tools) shows real-world experience.

## Concept
Measure first: `df.memory_usage(deep=True)` / `df.info(memory_usage="deep")`.

Shrink:
- **Downcast numerics**: `pd.to_numeric(s, downcast="integer")`, `float64 → float32` when precision allows.
- **category dtype** for low-cardinality strings: stores small integer codes plus one copy of each label. A 10M-row `country` column drops from ~600 MB (object) to ~10 MB.
- Read only what you need: `read_csv(usecols=[...], dtype={...}, parse_dates=[...])`.
- Use **Parquet** (columnar, compressed, typed): reads only needed columns, much faster than CSV.
- Delete intermediates (`del df_tmp`) and avoid unnecessary copies.

Process in pieces:
- `for chunk in pd.read_csv(path, chunksize=1_000_000): ...` and combine partial aggregates (sum of sums, counts, then divide at the end; you can't average averages unless the counts are equal).
- Filter early, aggregate early.

Speed:
- Vectorize; avoid `apply(axis=1)`/`iterrows`.
- Set an index for repeated lookups; sort before `merge_asof`.
- `pyarrow` string dtype (`dtype="string[pyarrow]"`) is faster and smaller than object strings.
- When pandas isn't enough: **Polars** (multi-threaded, lazy), **DuckDB** (SQL on Parquet/DataFrames, out-of-core), Dask/Spark for clusters.

## Worked example
Average order value per country from a 50M-row file, in chunks:

```python
sums, counts = {}, {}
for ch in pd.read_csv("orders.csv", usecols=["country", "amount"], chunksize=2_000_000):
    g = ch.groupby("country")["amount"].agg(["sum", "count"])
    for c, row in g.iterrows():          # small: one row per country
        sums[c] = sums.get(c, 0) + row["sum"]; counts[c] = counts.get(c, 0) + row["count"]
aov = {c: sums[c] / counts[c] for c in sums}
```

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which column benefits most from the category dtype?",
  "options": ["A unique transaction ID string", "A 'country' string column with 50 distinct values in 10M rows", "A float price column", "A boolean flag"],
  "answer": 1,
  "explanation": "Category shines when there are few distinct values repeated many times."
}
```

```quiz
{
  "id": "q2",
  "question": "You compute the mean per chunk and then average the chunk means. When is that wrong?",
  "options": ["Never", "When chunks contain different numbers of rows per group; combine sums and counts instead", "Only for integers", "Only when there are NaNs"],
  "answer": 1,
  "explanation": "An average of averages weights each chunk equally, not each row."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `shrink(df)` returning a copy where string columns (object dtype, or the string dtype in pandas 3; `pd.api.types.is_string_dtype` covers both) with fewer than 50% unique values become `category`, int64 columns are downcast with `pd.to_numeric(..., downcast='integer')`, and float64 columns become float32. Write `chunked_mean(chunks, key, value)` that takes an iterable of DataFrames and returns a dict key → mean of value computed from combined sums and counts (not averaged means).",
  "setup": "import pandas as pd\nimport numpy as np",
  "packages": ["pandas"],
  "starterCode": "import pandas as pd\nimport numpy as np\n\ndef shrink(df):\n    pass\n\ndef chunked_mean(chunks, key, value):\n    pass\n",
  "tests": "n = 1000\ndf = pd.DataFrame({'country': np.where(np.arange(n) % 2 == 0, 'US', 'CA'), 'id': [f'id{i}' for i in range(n)], 'qty': np.arange(n, dtype='int64') % 100, 'price': np.ones(n)})\ns = shrink(df)\nassert str(s['country'].dtype) == 'category' and str(s['id'].dtype) != 'category'\nassert s['qty'].dtype == np.int8 and s['price'].dtype == np.float32\nassert s.memory_usage(deep=True).sum() < df.memory_usage(deep=True).sum()\nc1 = pd.DataFrame({'k': ['a', 'a', 'b'], 'v': [1.0, 3.0, 10.0]})\nc2 = pd.DataFrame({'k': ['a'], 'v': [8.0]})\nm = chunked_mean([c1, c2], 'k', 'v')\nassert m == {'a': 4.0, 'b': 10.0}",
  "solution": "import pandas as pd\nimport numpy as np\n\ndef shrink(df):\n    out = df.copy()\n    for col in out.columns:\n        s = out[col]\n        if (s.dtype == object or pd.api.types.is_string_dtype(s)) and s.nunique() / len(s) < 0.5:\n            out[col] = s.astype('category')\n        elif s.dtype == np.int64:\n            out[col] = pd.to_numeric(s, downcast='integer')\n        elif s.dtype == np.float64:\n            out[col] = s.astype(np.float32)\n    return out\n\ndef chunked_mean(chunks, key, value):\n    sums, counts = {}, {}\n    for ch in chunks:\n        g = ch.groupby(key)[value].agg(['sum', 'count'])\n        for k, row in g.iterrows():\n            sums[k] = sums.get(k, 0) + row['sum']\n            counts[k] = counts.get(k, 0) + row['count']\n    return {k: sums[k] / counts[k] for k in sums}",
  "hints": ["Check s.nunique() / len(s) to decide on category.", "For 'a': (1 + 3 + 8) / 3 = 4, not the mean of chunk means (2 and 8)."]
}
```

> [!TIP] Interview tips
> - Start with measurement (`memory_usage(deep=True)`), then dtypes, then columns, then chunking.
> - Mention category dtype, Parquet, and usecols/dtype on read.
> - Know when to switch tools: Polars or DuckDB for larger-than-memory or faster single-machine work.
