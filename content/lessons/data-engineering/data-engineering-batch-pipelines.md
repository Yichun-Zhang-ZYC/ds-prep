---
id: data-engineering-batch-pipelines
title: Batch pipelines
estimatedMinutes: 12
difficulty: medium
tags: [data-engineering, pipelines, batch]
---

## Why it matters
Most company data still flows through scheduled batch jobs: nightly loads, hourly aggregates, daily ML feature refreshes. Interviewers ask you to design one that is reliable, observable and recoverable.

## Concept
A batch pipeline processes a bounded chunk of data (e.g. "yesterday") on a schedule.

Typical stages:
1. **Extract / ingest**: pull from sources (DB snapshots, CDC files, APIs, event logs) into a raw/landing zone.
2. **Validate**: schema checks, row counts vs source, null/uniqueness tests; stop or quarantine on failure.
3. **Transform**: clean, deduplicate, join, aggregate (SQL/dbt, Spark).
4. **Load / publish**: write to target tables atomically (write to a staging table/partition, then swap).
5. **Downstream triggers**: refresh dashboards, notify consumers, kick off ML jobs.

Design principles:
- **Process by logical date** (the partition the run is responsible for), not "now", so reruns and backfills are deterministic.
- **Idempotent** tasks: rerunning a day overwrites that day's partition instead of appending duplicates.
- **Incremental** where possible: process only new/changed data.
- **Dependencies & orchestration**: a DAG (Airflow, Dagster) with retries, timeouts and SLAs.
- **Observability**: logs, row counts per stage, data freshness metrics, alerts on failure or anomalies.
- **Late-arriving data**: reprocess a trailing window (e.g. the last 3 days) or use watermarks.

Batch vs streaming: batch is simpler, cheaper and easier to backfill; choose streaming only when the business needs fresher data than the batch cadence can deliver.

## Worked example
Daily revenue pipeline for `ds = 2024-06-01`: copy the orders table snapshot to `raw/orders/ds=2024-06-01`, check the row count is within ±20% of the 7-day average, build `fct_orders` for that `ds` with `INSERT OVERWRITE PARTITION (ds='2024-06-01')`, then refresh the dashboard. If the job fails at 3 a.m., rerunning it produces the same result without duplicates.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why should a daily job compute 'the data for its logical date' rather than 'the last 24 hours from now'?",
  "options": ["It runs faster", "Reruns and backfills produce the same deterministic output regardless of when they execute", "Schedulers require it", "It avoids using SQL"],
  "answer": 1,
  "explanation": "Tying work to a fixed partition makes the job reproducible and idempotent."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `volume_check(today_count, history_counts, tolerance=0.2)` returning True if today's row count is within ±tolerance of the mean of history_counts. Write `run_pipeline(ds, extract, transform, store)`: call `rows = extract(ds)`, raise `ValueError` if `rows` is empty, call `out = transform(rows)`, then **overwrite** `store[ds] = out` (a dict acting as a partitioned table) and return `len(out)`.",
  "starterCode": "def volume_check(today_count, history_counts, tolerance=0.2):\n    pass\n\ndef run_pipeline(ds, extract, transform, store):\n    pass\n",
  "tests": "assert volume_check(1000, [900, 1000, 1100]) is True\nassert volume_check(700, [900, 1000, 1100]) is False\nsource = {'2024-06-01': [{'amount': 10}, {'amount': -1}, {'amount': 5}], '2024-06-02': []}\nstore = {}\nextract = lambda ds: source[ds]\ntransform = lambda rows: [r for r in rows if r['amount'] > 0]\nassert run_pipeline('2024-06-01', extract, transform, store) == 2\nassert run_pipeline('2024-06-01', extract, transform, store) == 2\nassert len(store['2024-06-01']) == 2 and len(store) == 1\ntry:\n    run_pipeline('2024-06-02', extract, transform, store)\n    assert False\nexcept ValueError:\n    pass",
  "solution": "def volume_check(today_count, history_counts, tolerance=0.2):\n    mean = sum(history_counts) / len(history_counts)\n    return abs(today_count - mean) <= tolerance * mean\n\ndef run_pipeline(ds, extract, transform, store):\n    rows = extract(ds)\n    if not rows:\n        raise ValueError(f'no source rows for {ds}')\n    out = transform(rows)\n    store[ds] = out\n    return len(out)",
  "hints": ["Compare |today − mean| with tolerance × mean.", "Assigning store[ds] overwrites the partition, so reruns don't duplicate."]
}
```

> [!TIP] Interview tips
> - Walk through ingest → validate → transform → publish, with retries, alerts and SLAs.
> - Emphasize logical-date partitions, idempotent overwrites and backfill-ability.
> - Mention late-arriving data and data-quality gates that stop bad data from publishing.
