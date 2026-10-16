---
id: data-engineering-idempotency-and-backfills
title: Idempotency & backfills
estimatedMinutes: 12
difficulty: medium
tags: [data-engineering, pipelines, idempotency, backfill]
---

## Why it matters
Jobs fail and get retried; logic changes and history must be recomputed. If a rerun doubles revenue, the pipeline is broken. "How do you make a pipeline safe to rerun?" is a core DE interview question.

## Concept
A task is **idempotent** if running it once or many times with the same input produces the same result.

Patterns that make tasks idempotent:
- **Overwrite a partition**, don't append: `INSERT OVERWRITE ... PARTITION (ds = '{{ ds }}')`, or `DELETE WHERE ds = X` then `INSERT` in one transaction.
- **MERGE/upsert on a natural or primary key** instead of blind inserts.
- **Deterministic inputs**: parameterize by logical date/run window; never use `now()` inside transformation logic.
- **Atomic publish**: write to a temp location/table, then rename/swap, so readers never see half-written output.
- **Dedup keys** for event data (event_id) and exactly-once sinks for streams.
- Side effects (emails, API calls) need their own idempotency keys.

**Backfill** = running a pipeline for past periods: after fixing a bug, adding a column, or onboarding a new table.
- Only possible cleanly if tasks are idempotent and partitioned by logical date.
- Orchestrators support it (`airflow dags backfill -s 2024-01-01 -e 2024-03-31`, Dagster partition backfills).
- Control **parallelism** (don't overload the warehouse or source), process in chunks, and backfill **upstream before downstream** tables.
- Validate a sample of backfilled partitions against expectations before publishing widely; communicate to data consumers.

## Worked example
A buggy currency conversion inflated revenue for March. Fix the dbt model, then run the March partitions (`ds` 2024-03-01 … 03-31). Because each run overwrites its own partition, rerunning is safe; downstream aggregates for March are rebuilt next. An append-based design would have required manually deleting the bad rows first, a common source of double counting.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which write pattern is idempotent for a daily job?",
  "options": ["INSERT INTO target SELECT ... WHERE ds = today", "INSERT OVERWRITE the ds partition (or DELETE ds then INSERT, atomically)", "Append and dedupe once a month", "Write to a new table name each run"],
  "answer": 1,
  "explanation": "Overwriting the partition the run owns gives the same final state no matter how many times it runs."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement two loaders over a table stored as a list of row dicts with a `ds` field. `load_append(table, ds, rows)` appends (NOT idempotent). `load_overwrite(table, ds, rows)` returns a new table where all rows with that `ds` are replaced by `rows` (idempotent). Then write `backfill(table, dates, compute)` that calls `load_overwrite` for each date with `compute(date)` and returns the final table.",
  "starterCode": "def load_append(table, ds, rows):\n    pass\n\ndef load_overwrite(table, ds, rows):\n    pass\n\ndef backfill(table, dates, compute):\n    pass\n",
  "tests": "rows = [{'ds': '2024-03-01', 'rev': 10}]\nt = load_append([], '2024-03-01', rows)\nt = load_append(t, '2024-03-01', rows)\nassert len(t) == 2\nt2 = load_overwrite([], '2024-03-01', rows)\nt2 = load_overwrite(t2, '2024-03-01', rows)\nassert t2 == rows\nbase = [{'ds': '2024-03-01', 'rev': 999}, {'ds': '2024-03-02', 'rev': 999}, {'ds': '2024-03-03', 'rev': 5}]\nfixed = backfill(base, ['2024-03-01', '2024-03-02'], lambda d: [{'ds': d, 'rev': 1}])\nassert sorted((r['ds'], r['rev']) for r in fixed) == [('2024-03-01', 1), ('2024-03-02', 1), ('2024-03-03', 5)]\nkey = lambda t: sorted((r['ds'], r['rev']) for r in t)\nassert key(backfill(fixed, ['2024-03-01'], lambda d: [{'ds': d, 'rev': 1}])) == key(fixed)",
  "solution": "def load_append(table, ds, rows):\n    return table + list(rows)\n\ndef load_overwrite(table, ds, rows):\n    return [r for r in table if r['ds'] != ds] + list(rows)\n\ndef backfill(table, dates, compute):\n    for d in dates:\n        table = load_overwrite(table, d, compute(d))\n    return table",
  "hints": ["Overwrite = drop rows for that ds, then add the new rows.", "A backfill is just the idempotent loader run over a list of dates."]
}
```

> [!TIP] Interview tips
> - Define idempotency and give concrete patterns: partition overwrite, MERGE on keys, atomic swaps, no now().
> - Explain how idempotency enables safe retries and backfills.
> - For backfills, mention ordering (upstream first), throttled parallelism, validation and communicating with consumers.
