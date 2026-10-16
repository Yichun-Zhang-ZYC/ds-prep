---
id: data-engineering-row-vs-columnar-storage
title: Row vs columnar storage
estimatedMinutes: 10
difficulty: easy
tags: [data-engineering, storage, columnar]
---

## Why it matters
Columnar storage is why analytics warehouses can scan billions of rows in seconds, and why they're bad at single-row updates. Interviewers want the "why" behind OLTP vs OLAP storage choices.

## Concept
For a table with columns (id, name, country, amount):

- **Row-oriented** stores each record contiguously: `1,Ana,US,120 | 2,Ben,CA,80 | ...`
  - Fetching or updating one whole record touches one place: ideal for OLTP (`SELECT * WHERE id = 7`, inserts, updates).
  - An aggregate over one column still reads every column of every row.
- **Column-oriented** stores each column contiguously: `1,2,... | Ana,Ben,... | US,CA,... | 120,80,...`
  - Aggregates read only the needed columns (**I/O ∝ columns used**).
  - Same-typed, often repetitive values compress very well (dictionary, run-length, delta encoding).
  - Vectorized execution: process a batch of values from one column with SIMD.
  - Inserting or updating one record touches every column file: slow for transactional writes, so columnar systems batch writes or use delta stores.

Hybrid tricks: columnar stores sort or cluster data so similar values sit together (better compression and pruning); row stores add covering indexes for some analytics; Parquet's row groups group rows, then store columns inside each group.

## Worked example
Table: 100M rows, 50 columns, 8 bytes each = 40 GB. `SELECT AVG(amount) FROM t`:
- Row store: reads ~40 GB.
- Column store: reads one column = 0.8 GB, and with compression maybe 0.2 GB: ~200× less I/O.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why does columnar data compress better than row data?",
  "options": ["It uses more disk", "Values in one column share a type and often repeat, so encodings like dictionary and run-length work well", "Rows are deleted", "It only stores numbers"],
  "answer": 1,
  "explanation": "Homogeneous, repetitive sequences compress far better than mixed-type records."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `to_columnar(rows)` converting a list of dict rows into a dict column → list. Write `run_length_encode(values)` returning a list of `(value, count)` runs. Then write `bytes_read(n_rows, n_cols, bytes_per_value, cols_needed, layout)` returning the bytes an aggregate must read: all columns for `'row'`, only `cols_needed` for `'column'`.",
  "starterCode": "def to_columnar(rows):\n    pass\n\ndef run_length_encode(values):\n    pass\n\ndef bytes_read(n_rows, n_cols, bytes_per_value, cols_needed, layout):\n    pass\n\nprint(run_length_encode(['US', 'US', 'US', 'CA', 'CA', 'US']))",
  "tests": "rows = [{'id': 1, 'c': 'US'}, {'id': 2, 'c': 'US'}, {'id': 3, 'c': 'CA'}]\nassert to_columnar(rows) == {'id': [1, 2, 3], 'c': ['US', 'US', 'CA']}\nassert run_length_encode(['US', 'US', 'US', 'CA', 'CA', 'US']) == [('US', 3), ('CA', 2), ('US', 1)]\nassert run_length_encode([]) == []\nassert bytes_read(100_000_000, 50, 8, 1, 'row') == 40_000_000_000\nassert bytes_read(100_000_000, 50, 8, 1, 'column') == 800_000_000",
  "solution": "def to_columnar(rows):\n    cols = {}\n    for r in rows:\n        for k, v in r.items():\n            cols.setdefault(k, []).append(v)\n    return cols\n\ndef run_length_encode(values):\n    runs = []\n    for v in values:\n        if runs and runs[-1][0] == v:\n            runs[-1] = (v, runs[-1][1] + 1)\n        else:\n            runs.append((v, 1))\n    return runs\n\ndef bytes_read(n_rows, n_cols, bytes_per_value, cols_needed, layout):\n    cols = n_cols if layout == 'row' else cols_needed\n    return n_rows * cols * bytes_per_value",
  "hints": ["Extend the last run when the value repeats.", "Row layout reads all columns; column layout reads only the needed ones."]
}
```

> [!TIP] Interview tips
> - Tie layout to workload: row store for point reads/writes (OLTP), column store for scans/aggregates (OLAP).
> - Mention compression, column pruning and vectorized execution as the three columnar wins.
> - Note the write penalty and how columnar systems batch writes.
