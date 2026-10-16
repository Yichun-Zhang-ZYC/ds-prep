---
id: data-engineering-file-formats-csv-json-parquet-avro-orc
title: "File formats: CSV, JSON, Parquet, Avro, ORC"
estimatedMinutes: 12
difficulty: easy
tags: [data-engineering, storage, file-formats]
---

## Why it matters
File format choice changes storage cost, query speed and pipeline reliability by 10× or more. "Which format would you use for X and why?" is a common DE screening question.

## Concept

| Format | Layout | Schema | Strengths | Weaknesses | Typical use |
|---|---|---|---|---|---|
| **CSV** | Row, text | None (header at best) | Universal, human-readable | No types, quoting/escaping bugs, large, slow to parse | Small exports, spreadsheets |
| **JSON / JSONL** | Row, text | Self-describing per record | Nested data, flexible, readable | Verbose, slow, schema drift | APIs, raw event logs |
| **Avro** | Row, binary | Schema embedded (JSON schema), strong evolution rules | Fast writes, compact, schema evolution, great for streaming | Poor for column scans | Kafka messages, ingestion, CDC |
| **Parquet** | Columnar, binary | Embedded, typed | Column pruning, compression, predicate pushdown via row-group stats | Slow single-row writes, not appendable in place | Analytics, lakes, ML datasets |
| **ORC** | Columnar, binary | Embedded, typed | Similar to Parquet, strong in Hive ecosystem, built-in indexes | Less universal than Parquet | Hive/Presto-heavy stacks |

Parquet internals: file → **row groups** (e.g. ~128 MB) → **column chunks** → pages. Each column chunk stores min/max statistics, so engines skip row groups that can't match a filter. Encodings (dictionary, run-length) plus compression (Snappy, ZSTD) make repeated values tiny.

Rules of thumb:
- **Write path / streaming** → Avro (row-oriented, schema registry).
- **Read path / analytics** → Parquet (or ORC), ideally inside a table format (Delta/Iceberg).
- Use compressed JSONL for raw landing when schemas are messy, then convert to Parquet.
- Avoid many tiny files; target ~100 MB–1 GB per file.

## Worked example
1 billion events, 20 columns, 300 GB as CSV. As Parquet with ZSTD: ~40 GB. A query reading 3 columns scans ~6 GB instead of 300 GB, and row-group statistics skip most of the file for a selective date filter.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which format is best for Kafka messages that need schema evolution?",
  "options": ["CSV", "Parquet", "Avro", "Plain text"],
  "answer": 2,
  "explanation": "Avro is row-oriented, compact, and pairs with a schema registry for compatible evolution."
}
```

```quiz
{
  "id": "q2",
  "question": "Why can Parquet skip data for a filter like `WHERE event_date = '2024-06-01'`?",
  "options": ["It sorts all data automatically", "Row groups store min/max statistics per column, so non-matching row groups are skipped", "It indexes every row like a B-tree", "It stores data as CSV inside"],
  "answer": 1,
  "explanation": "Predicate pushdown uses column chunk statistics."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Simulate Parquet row-group skipping. Each row group is a dict with `min` and `max` for a column and a `bytes` size. Write `groups_to_read(row_groups, lo, hi)` returning indices of row groups that may contain values in [lo, hi] (overlap check), and `bytes_scanned(row_groups, lo, hi, n_cols_read, n_cols_total)` = sum of bytes of readable groups × n_cols_read / n_cols_total.",
  "starterCode": "def groups_to_read(row_groups, lo, hi):\n    pass\n\ndef bytes_scanned(row_groups, lo, hi, n_cols_read, n_cols_total):\n    pass\n\nrg = [{'min': 1, 'max': 10, 'bytes': 100}, {'min': 11, 'max': 20, 'bytes': 100}, {'min': 21, 'max': 30, 'bytes': 100}]\nprint(groups_to_read(rg, 12, 15))",
  "tests": "rg = [{'min': 1, 'max': 10, 'bytes': 100}, {'min': 11, 'max': 20, 'bytes': 100}, {'min': 21, 'max': 30, 'bytes': 100}]\nassert groups_to_read(rg, 12, 15) == [1]\nassert groups_to_read(rg, 10, 21) == [0, 1, 2]\nassert groups_to_read(rg, 31, 40) == []\nassert bytes_scanned(rg, 12, 15, 2, 20) == 10.0\nassert bytes_scanned(rg, 0, 100, 20, 20) == 300.0",
  "solution": "def groups_to_read(row_groups, lo, hi):\n    return [i for i, g in enumerate(row_groups) if g['max'] >= lo and g['min'] <= hi]\n\ndef bytes_scanned(row_groups, lo, hi, n_cols_read, n_cols_total):\n    total = sum(row_groups[i]['bytes'] for i in groups_to_read(row_groups, lo, hi))\n    return total * n_cols_read / n_cols_total",
  "hints": ["Two ranges overlap when max ≥ lo and min ≤ hi.", "Column pruning scales bytes by the share of columns read."]
}
```

> [!TIP] Interview tips
> - Split formats into row (CSV, JSON, Avro: good for writes/streaming) vs columnar (Parquet, ORC: good for analytics).
> - Explain Parquet's row groups, column statistics and compression.
> - Mention schema evolution (Avro + schema registry) and the small-files problem.
