---
id: data-engineering-lakehouse
title: Lakehouse (Delta Lake, Iceberg)
estimatedMinutes: 12
difficulty: medium
tags: [data-engineering, storage, lakehouse, delta-lake, iceberg]
---

## Why it matters
Lakehouse table formats (Delta Lake, Apache Iceberg, Apache Hudi) are now standard at Databricks, Snowflake, AWS and many big tech companies. Interviewers ask what problem they solve and how they provide ACID transactions on top of plain files.

## Concept
A **lakehouse** = data lake storage (open files like Parquet on object storage) + warehouse-like features, provided by an **open table format** with a **transaction log / metadata layer**.

How it works: the table is a set of immutable Parquet data files plus metadata (Delta: `_delta_log/` JSON commits + checkpoints; Iceberg: metadata files → manifest lists → manifests). A write creates new data files and then atomically commits a new metadata version listing which files belong to the table. Readers always see a consistent snapshot.

Features:
- **ACID transactions** and concurrent writers (optimistic concurrency).
- **Time travel**: query an older version (`VERSION AS OF 12`, `TIMESTAMP AS OF ...`) for audits, reproducible ML training sets and rollbacks.
- **Schema enforcement and evolution** (add/rename columns safely).
- **MERGE / UPDATE / DELETE** on lake data (upserts, CDC, GDPR deletes).
- **File-level statistics** for data skipping; compaction (`OPTIMIZE`), Z-ordering/clustering.
- Iceberg extras: **hidden partitioning** (partition by `day(ts)` without users filtering on a separate column) and partition evolution.
- **Open**: many engines (Spark, Trino, Flink, Snowflake, DuckDB) can read the same tables, avoiding vendor lock-in.

Maintenance: old files remain until **vacuumed/expired**, which limits time travel and costs storage.

## Worked example
A GDPR request requires deleting user 123's events. In a plain Parquet lake you'd rewrite partitions manually and risk readers seeing half-written files. With Delta/Iceberg: `DELETE FROM events WHERE user_id = 123` rewrites only affected files and commits atomically; after the retention window, `VACUUM` physically removes the old files.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "How do Delta Lake and Iceberg provide atomic commits on object storage?",
  "options": ["By locking the whole bucket", "Writers add new immutable data files, then atomically publish a new metadata/log version that defines the table's file set", "By converting Parquet to CSV", "By storing data in a relational database"],
  "answer": 1,
  "explanation": "The metadata layer is the source of truth; a commit swaps to a new version in one atomic step."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Simulate a tiny transaction log. `TableLog()` keeps a list of versions; each version is a frozenset of data file names. `commit(add, remove)` creates a new version from the latest one (version 0 is the empty table) and returns its version number. `files(version=None)` returns the sorted file list at a version (latest by default) — that's time travel. `vacuum(keep_last)` returns the sorted list of files not referenced by any of the last `keep_last` versions (safe to delete).",
  "starterCode": "class TableLog:\n    def __init__(self):\n        self.versions = [frozenset()]\n\n    def commit(self, add=(), remove=()):\n        pass\n\n    def files(self, version=None):\n        pass\n\n    def vacuum(self, keep_last):\n        pass\n",
  "tests": "t = TableLog()\nassert t.commit(add=['a.parquet', 'b.parquet']) == 1\nassert t.commit(add=['c.parquet'], remove=['a.parquet']) == 2\nassert t.files() == ['b.parquet', 'c.parquet']\nassert t.files(1) == ['a.parquet', 'b.parquet']\nassert t.files(0) == []\nassert t.vacuum(1) == ['a.parquet']\nassert t.vacuum(2) == []",
  "solution": "class TableLog:\n    def __init__(self):\n        self.versions = [frozenset()]\n\n    def commit(self, add=(), remove=()):\n        current = set(self.versions[-1])\n        current -= set(remove)\n        current |= set(add)\n        self.versions.append(frozenset(current))\n        return len(self.versions) - 1\n\n    def files(self, version=None):\n        v = self.versions[-1] if version is None else self.versions[version]\n        return sorted(v)\n\n    def vacuum(self, keep_last):\n        all_files = set().union(*self.versions)\n        live = set().union(*self.versions[-keep_last:])\n        return sorted(all_files - live)",
  "hints": ["Each commit copies the latest file set, removes, then adds.", "Files referenced by recent versions must be kept for time travel."]
}
```

> [!TIP] Interview tips
> - Define lakehouse as open files + a transactional metadata layer, giving ACID, time travel, schema evolution and MERGE.
> - Explain the commit mechanism (immutable files + atomic metadata swap).
> - Compare formats briefly (Delta: Databricks ecosystem; Iceberg: engine-neutral, hidden partitioning) and mention VACUUM/compaction.
