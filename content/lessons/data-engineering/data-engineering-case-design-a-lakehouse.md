---
id: data-engineering-case-design-a-lakehouse
title: "Case: Designing a lakehouse"
estimatedMinutes: 15
difficulty: hard
tags: [data-engineering, lakehouse, case-interview, system-design]
---

## Why it matters
"Design a data platform for a company with transactional databases, clickstream and vendor files" is the standard senior DE case. The interviewer wants a layered layout, a table format choice, and answers to the unglamorous questions: small files, schema drift, deletes and who owns what. See Lakehouse and Data lake for the building blocks; here we assemble them.

## Concept
Playbook:
1. **Requirements first**: sources, volume, freshness (minutes vs next morning), consumers (BI, ML, ad hoc), retention, governance (PII, GDPR deletes).
2. **Storage and table format**: object storage plus an open table format (Iceberg, Delta or Hudi) for ACID commits, schema evolution, time travel and `MERGE`.
3. **Medallion layers**: **bronze** = raw, append-only, immutable and replayable; **silver** = cleaned, deduplicated, conformed, keyed; **gold** = business marts and aggregates.
4. **Ingestion by source type**: databases via CDC (Debezium to Kafka) or incremental pulls; events via Kafka to bronze; files via an object-arrival trigger plus schema validation.
5. **Compute split**: Spark/Flink for ETL, a SQL engine (Trino, warehouse engine) for BI, with one shared catalog and permissions.
6. **Operations**: compaction, snapshot expiry, orphan-file cleanup, data-quality gates between layers, lineage, cost tags.

Pitfalls:
- **Small files** from streaming writes slow every query and the metadata; schedule compaction toward 128-512 MB files.
- Partitioning by a **high-cardinality column** (user_id) creates millions of tiny partitions; partition by date, cluster/sort by user.
- **Schema drift** in vendor files: land raw as strings or with a rescue column, validate, then cast in silver.
- Skipping bronze: you lose replay when silver logic has a bug.
- **GDPR deletes** need row-level `DELETE` or `MERGE` plus expiring old snapshots, otherwise deleted data survives in time travel.

## Worked example
Scenario (illustrative numbers): a retailer has a Postgres orders DB (200 GB, 50 M changes/day), clickstream (2 B events/day, ~1 KB raw) and 30 vendor CSV feeds. BI needs orders by 7 a.m.; marketing wants clickstream sessions within 15 minutes.

- Orders: Debezium to Kafka to bronze `orders_cdc`, then hourly `MERGE` into silver `orders` keyed by `order_id`, keeping the highest log position per key.
- Clickstream: Kafka to Spark Structured Streaming with 5-minute triggers into bronze, partitioned by `event_date`. That is 288 commits/day; without compaction each partition would collect hundreds of small files, so a nightly `OPTIMIZE` rewrites them.
- Size check: 2 B x 1 KB = 2 TB/day raw; Parquet compresses ~5x to ~400 GB/day. With 256 MB target files that is about 1,600 files/day after compaction.
- Vendor CSVs: land as-is, validate headers and row counts, cast into silver; failures go to a quarantine path and alert.
- Gold: dbt models (daily revenue, sessions) in the warehouse engine, rebuilt incrementally by date partition.
- Governance: one catalog, column-level tags for PII, a deletion job that `DELETE`s then expires snapshots older than 7 days.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Silver transformation logic had a bug for two weeks. What makes recovery cheap in a medallion lakehouse?",
  "options": [
    "Time travel on gold tables only",
    "An immutable bronze layer you can reprocess from",
    "Re-ingesting from the source systems",
    "Increasing the retention of Kafka"
  ],
  "answer": 1,
  "explanation": "Bronze is the replayable system of record: fix the logic and rebuild silver and gold from it, without re-extracting from sources."
}
```

```quiz
{
  "id": "q2",
  "question": "A streaming job commits every minute and queries have become slow. What is the most likely cause and fix?",
  "options": [
    "Too few partitions; add partition columns",
    "Parquet is the wrong format; switch to CSV",
    "Many small files; schedule compaction and larger trigger intervals",
    "The catalog is down; restart it"
  ],
  "answer": 2,
  "explanation": "Frequent commits produce many tiny files, which inflate listing, metadata and open-file overhead. Compact to a few hundred MB per file and trigger less often."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `plan_compaction(sizes_mb, target_mb)`. Only files smaller than `target_mb` are candidates. Sort them ascending and greedily pack them into groups whose total size does not exceed `target_mb` (start a new group when the next file would overflow). Return the list of groups (each a list of sizes), omitting groups with a single file, since rewriting one file gains nothing.",
  "starterCode": "def plan_compaction(sizes_mb, target_mb):\n    pass\n",
  "tests": "assert plan_compaction([10, 20, 30, 40, 200, 5], 100) == [[5, 10, 20, 30]]\nassert plan_compaction([300, 150], 128) == []\nassert plan_compaction([1, 1, 1, 1], 2) == [[1, 1], [1, 1]]\nassert plan_compaction([], 128) == []\nassert plan_compaction([60, 50, 40, 30], 100) == [[30, 40]]",
  "solution": "def plan_compaction(sizes_mb, target_mb):\n    small = sorted(s for s in sizes_mb if s < target_mb)\n    groups, cur, total = [], [], 0\n    for s in small:\n        if cur and total + s > target_mb:\n            groups.append(cur)\n            cur, total = [], 0\n        cur.append(s)\n        total += s\n    if cur:\n        groups.append(cur)\n    return [g for g in groups if len(g) > 1]",
  "hints": [
    "Filter out files already at or above the target first.",
    "Close the current group when adding the next file would exceed the target."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Data skipping uses min/max statistics per file. Files are tuples `(name, min_val, max_val)`. Write `files_to_scan(files, lo, hi)` returning the sorted names whose range overlaps the filter `lo <= x <= hi`, and `skipped_fraction(files, lo, hi)` returning the fraction of files that can be skipped (0.0 for an empty list).",
  "starterCode": "def files_to_scan(files, lo, hi):\n    pass\n\ndef skipped_fraction(files, lo, hi):\n    pass\n",
  "tests": "files = [('a', 1, 10), ('b', 11, 20), ('c', 21, 30), ('d', 5, 15)]\nassert files_to_scan(files, 12, 14) == ['b', 'd']\nassert files_to_scan(files, 31, 40) == []\nassert files_to_scan(files, 1, 30) == ['a', 'b', 'c', 'd']\nassert files_to_scan(files, 10, 11) == ['a', 'b', 'd']\nassert abs(skipped_fraction(files, 12, 14) - 0.5) < 1e-9\nassert skipped_fraction([], 1, 2) == 0.0",
  "solution": "def files_to_scan(files, lo, hi):\n    return sorted(n for n, mn, mx in files if mn <= hi and mx >= lo)\n\ndef skipped_fraction(files, lo, hi):\n    if not files:\n        return 0.0\n    return 1 - len(files_to_scan(files, lo, hi)) / len(files)",
  "hints": [
    "A file overlaps when min <= hi and max >= lo.",
    "skipped = 1 - scanned / total."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Design a lakehouse for an e-commerce company: orders in Postgres, clickstream events, vendor CSVs. Analysts use SQL, data scientists use notebooks.' Give your answer.",
  "answer": "**Requirements**: orders fresh within 1 hour, clickstream within 15 minutes, daily gold by 7 a.m., 2 years retention, PII and GDPR deletion.\n\n**Foundation**: object storage plus Iceberg (or Delta) tables, one catalog (Glue/Unity/Polaris) for schemas and permissions, Spark for ETL, Trino or a warehouse engine for BI, notebooks read the same tables.\n\n**Bronze**: raw, append-only, partitioned by ingest date. Orders via Debezium CDC to Kafka to bronze; clickstream via Kafka sink; vendor files land untouched with a manifest (file name, checksum, row count).\n\n**Silver**: dedupe by `event_id`, MERGE CDC into `orders` by key and log position, conform types and time zones, mask PII, apply data-quality tests (not-null keys, row-count vs source, freshness). Bad rows go to a quarantine table.\n\n**Gold**: dbt star schema (fact_orders, dim_customer as SCD2, dim_product) plus aggregates (daily revenue, sessions), partitioned by date and rebuilt idempotently per partition.\n\n**Table maintenance**: nightly compaction to 256 MB files, sort/cluster by user_id or product_id, expire snapshots after 7 days, remove orphan files, monitor file counts per partition.\n\n**Governance**: column tags for PII, row/column-level access, lineage, deletion pipeline (DELETE by user_id in all layers, then expire snapshots and compact).\n\n**Tradeoffs**: lakehouse vs warehouse-only (cost and openness vs managed simplicity), streaming vs micro-batch (freshness vs small files), strict schema on write vs rescue columns for vendor drift."
}
```

> [!TIP] Interview tips
> - Present layers and the reason for each (replay, quality, serving) rather than just naming bronze/silver/gold.
> - Proactively raise small files, partitioning choices, schema drift and GDPR deletes; they separate senior answers.
> - Justify the table format by features you need: MERGE for CDC, time travel for audits, open engines for flexibility.
