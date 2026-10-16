---
id: python-polars-and-duckdb
title: Polars & DuckDB (modern alternatives)
estimatedMinutes: 12
difficulty: medium
tags: [python, polars, duckdb, performance]
---

## Why it matters
When pandas is too slow or data doesn't fit in memory, teams increasingly reach for **Polars** and **DuckDB** before moving to a cluster. Interviewers ask when you'd use them and how lazy/columnar execution helps.

## Concept
**Polars**: a DataFrame library written in Rust on Apache Arrow.
- Multi-threaded by default; no index; strict types.
- **Expression API**: `pl.col("x")` expressions are composed and optimized.
- **Lazy mode** (`scan_parquet`, `.lazy()` … `.collect()`): builds a query plan, then applies **predicate pushdown** (filter while reading), **projection pushdown** (read only needed columns) and can stream larger-than-memory data.

```python
import polars as pl
out = (pl.scan_parquet("orders/*.parquet")
         .filter(pl.col("status") == "paid")
         .group_by("region")
         .agg(pl.col("amount").sum().alias("revenue"),
              pl.col("user_id").n_unique().alias("users"))
         .sort("revenue", descending=True)
         .collect())
```

**DuckDB**: an in-process analytical (OLAP) SQL database ("SQLite for analytics").
- Columnar, vectorized, multi-threaded; spills to disk for larger-than-memory queries.
- Queries Parquet/CSV files and pandas/Polars DataFrames **directly** with SQL:

```python
import duckdb
duckdb.sql("""
    SELECT region, SUM(amount) AS revenue
    FROM 'orders/*.parquet'
    WHERE status = 'paid'
    GROUP BY region ORDER BY revenue DESC
""").df()
```

When to use what:
- **pandas**: small/medium data, ecosystem compatibility, quick EDA.
- **Polars**: faster DataFrame pipelines, lazy optimization, big single-machine jobs.
- **DuckDB**: SQL-first analysis on local files, joins over large Parquet sets, prototyping warehouse queries.
- **Spark / warehouse (BigQuery, Snowflake)**: data beyond one machine, shared production pipelines.

All three interoperate via Arrow (`pl.from_pandas`, `duckdb.sql(...).pl()`), often with zero copy.

## Worked example
A 30 GB Parquet dataset on a 16 GB laptop: pandas `read_parquet` fails with out-of-memory. `pl.scan_parquet(...).filter(...).group_by(...).collect(streaming=True)` or a DuckDB SQL query reads only the needed columns and row groups and finishes in seconds to minutes.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What does predicate pushdown in Polars lazy mode do?",
  "options": ["Sorts data before filtering", "Applies filters while scanning files, so less data is read into memory", "Pushes results to a database", "Converts SQL to Python"],
  "answer": 1,
  "explanation": "With a query plan, filters move down to the scan, skipping rows/row groups early."
}
```

```quiz
{
  "id": "q2",
  "question": "You need ad-hoc SQL joins over 200 local Parquet files without setting up a server. Best fit?",
  "options": ["pandas read_csv in a loop", "DuckDB", "A Spark cluster", "SQLite"],
  "answer": 1,
  "explanation": "DuckDB queries Parquet directly, in-process, with a columnar engine built for analytics."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Polars and DuckDB aren't available in this browser sandbox, so implement the core idea of a lazy query plan in plain Python. `LazyFrame(rows)` stores a list of dict rows; `.filter(fn)` and `.select(*cols)` return new LazyFrames that only **record** steps; `.collect()` executes them. Also track how many rows were read: `collect()` should apply all filters in a single pass over the data, so `rows_scanned` equals the input size even with several filters.",
  "starterCode": "class LazyFrame:\n    def __init__(self, rows, steps=None):\n        self.rows = rows\n        self.steps = steps or []\n        self.rows_scanned = 0\n\n    def filter(self, fn):\n        pass\n\n    def select(self, *cols):\n        pass\n\n    def collect(self):\n        pass\n",
  "tests": "rows = [{'region': 'E', 'status': 'paid', 'amount': 10}, {'region': 'W', 'status': 'refund', 'amount': 5}, {'region': 'E', 'status': 'paid', 'amount': 7}]\nlf = LazyFrame(rows).filter(lambda r: r['status'] == 'paid').filter(lambda r: r['amount'] > 8).select('region', 'amount')\nassert lf.rows_scanned == 0\nout = lf.collect()\nassert out == [{'region': 'E', 'amount': 10}]\nassert lf.rows_scanned == 3\nbase = LazyFrame(rows)\nbase.filter(lambda r: False)\nassert base.collect() == rows",
  "solution": "class LazyFrame:\n    def __init__(self, rows, steps=None):\n        self.rows = rows\n        self.steps = steps or []\n        self.rows_scanned = 0\n\n    def filter(self, fn):\n        return LazyFrame(self.rows, self.steps + [('filter', fn)])\n\n    def select(self, *cols):\n        return LazyFrame(self.rows, self.steps + [('select', cols)])\n\n    def collect(self):\n        filters = [arg for kind, arg in self.steps if kind == 'filter']\n        selects = [arg for kind, arg in self.steps if kind == 'select']\n        cols = selects[-1] if selects else None\n        out = []\n        self.rows_scanned = 0\n        for r in self.rows:\n            self.rows_scanned += 1\n            if all(f(r) for f in filters):\n                out.append({c: r[c] for c in cols} if cols else r)\n        return out",
  "hints": ["filter/select return a new LazyFrame with one more recorded step.", "In collect, combine all filters into one check per row."]
}
```

> [!TIP] Interview tips
> - Position them: pandas for convenience, Polars for fast/lazy DataFrames, DuckDB for SQL on local files, Spark/warehouses beyond one machine.
> - Explain lazy evaluation with predicate and projection pushdown.
> - Mention Arrow and Parquet as the common columnar formats that make them interoperate.
