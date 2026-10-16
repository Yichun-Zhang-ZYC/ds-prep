---
id: data-engineering-data-lake
title: Data lake
estimatedMinutes: 10
difficulty: easy
tags: [data-engineering, storage, data-lake]
---

## Why it matters
Raw logs, images, JSON events and ML training data rarely fit neatly into warehouse tables. Data lakes store them cheaply, and interviewers ask how lakes differ from warehouses and how to avoid a "data swamp".

## Concept
A **data lake** stores data of any type (structured, semi-structured, unstructured) in its native format on cheap **object storage** (Amazon S3, Google Cloud Storage, Azure Data Lake Storage).

- **Schema-on-read**: no schema enforced on write; the reader (Spark, Trino/Presto, Athena, DuckDB) applies structure at query time. Warehouses are **schema-on-write**.
- Very cheap and durable storage; scales to petabytes; decoupled from any one compute engine.
- Good for: raw event archives, logs, ML datasets (images, audio, text), data science exploration, long-term retention.

Typical layout, organized by zones ("medallion"):
- **Bronze / raw**: data as ingested, immutable.
- **Silver / cleaned**: deduplicated, typed, conformed, often Parquet.
- **Gold / curated**: aggregated, business-ready tables.

Paths are partitioned for pruning: `s3://lake/events/event_date=2024-06-01/part-0001.parquet`.

Risks ("data swamp"): no catalog or ownership, inconsistent schemas, small-file explosion, no ACID guarantees (a failed job leaves partial files; concurrent writers clash), hard deletes for GDPR. Fixes: a **catalog** (AWS Glue, Hive Metastore, Unity Catalog), naming conventions, compaction, and **table formats** (Delta Lake, Iceberg, Hudi), which turn the lake into a lakehouse.

## Worked example
A mobile app emits 2 billion JSON events/day. They land in `bronze/events/dt=…/` as compressed JSON. A nightly Spark job parses, deduplicates and writes Parquet to `silver/events/` partitioned by date; Gold tables of daily active users feed the warehouse and dashboards. Data scientists query Silver directly with Athena or DuckDB.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What does 'schema-on-read' mean for a data lake?",
  "options": ["Data must match a schema before being written", "Data is stored as-is, and structure is applied by the engine when querying", "Schemas are stored in the files' names", "Reading is not allowed without a DBA"],
  "answer": 1,
  "explanation": "Lakes accept raw data; the query engine interprets it at read time."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `partition_path(base, table, date)` returning a Hive-style path like `s3://lake/silver/events/event_date=2024-06-01/`. Then write `prune(paths, start, end)` that keeps only paths whose `event_date=YYYY-MM-DD` value lies in [start, end] (inclusive, string comparison is fine for ISO dates), and `small_files(sizes_mb, threshold_mb=32)` returning how many files are below the threshold (a compaction signal).",
  "starterCode": "import re\n\ndef partition_path(base, table, date):\n    pass\n\ndef prune(paths, start, end):\n    pass\n\ndef small_files(sizes_mb, threshold_mb=32):\n    pass\n\nprint(partition_path('s3://lake/silver', 'events', '2024-06-01'))",
  "tests": "assert partition_path('s3://lake/silver', 'events', '2024-06-01') == 's3://lake/silver/events/event_date=2024-06-01/'\nps = [partition_path('s3://l', 'e', d) for d in ['2024-05-31', '2024-06-01', '2024-06-02', '2024-06-03']]\nassert prune(ps, '2024-06-01', '2024-06-02') == ps[1:3]\nassert small_files([5, 40, 31.9, 128]) == 2",
  "solution": "import re\n\ndef partition_path(base, table, date):\n    return f'{base}/{table}/event_date={date}/'\n\ndef prune(paths, start, end):\n    out = []\n    for p in paths:\n        m = re.search(r'event_date=(\\d{4}-\\d{2}-\\d{2})', p)\n        if m and start <= m.group(1) <= end:\n            out.append(p)\n    return out\n\ndef small_files(sizes_mb, threshold_mb=32):\n    return sum(1 for s in sizes_mb if s < threshold_mb)",
  "hints": ["Hive-style partitions encode key=value in the path.", "ISO date strings sort correctly as strings."]
}
```

> [!TIP] Interview tips
> - Contrast lake (schema-on-read, any format, cheap object storage) with warehouse (schema-on-write, SQL tables).
> - Describe bronze/silver/gold zones and partitioned Parquet layout.
> - Name swamp risks and the fixes: catalog, governance, compaction, table formats.
