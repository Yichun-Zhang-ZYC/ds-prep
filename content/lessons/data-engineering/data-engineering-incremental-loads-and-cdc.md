---
id: data-engineering-incremental-loads-and-cdc
title: Incremental loads & CDC (change data capture)
estimatedMinutes: 14
difficulty: medium
tags: [data-engineering, cdc, incremental, pipelines]
---

## Why it matters
Reloading a 2-billion-row table every night is slow and expensive. Interviewers ask how you'd move only what changed, and how to capture updates and deletes correctly.

## Concept
**Incremental load strategies**:
- **Append-only**: new rows have increasing IDs or timestamps; load `WHERE id > last_max_id`.
- **High-watermark on `updated_at`**: load rows with `updated_at > last_watermark`, then **upsert (MERGE)** into the target by primary key. Store the watermark after a successful load. Caveats: deletes are invisible, `updated_at` must be reliably maintained, and clock skew or long transactions can cause missed rows (use a small overlap window and dedupe).
- **Full refresh**: simplest, fine for small tables.

**Change Data Capture (CDC)** reads the database's **transaction log** (PostgreSQL WAL, MySQL binlog) and emits every insert/update/delete as an event, typically with tools like **Debezium → Kafka**, or managed services (Fivetran, AWS DMS).
- Captures **deletes** and every intermediate change, with low latency and little load on the source.
- Events carry the operation (`c`, `u`, `d`), before/after images, and a log position (LSN) for ordering.
- Applying CDC to a target: for each key, keep the **latest event by log position**; deletes remove the row (or set a soft-delete flag). In a lakehouse: `MERGE INTO target USING changes ON key WHEN MATCHED AND op='d' THEN DELETE WHEN MATCHED THEN UPDATE WHEN NOT MATCHED THEN INSERT`.
- Keeping the change stream also lets you build SCD Type 2 history.

## Worked example
Watermark approach: last run's watermark = `2024-06-01 00:00`. Query source `WHERE updated_at > '2024-05-31 23:55'` (5-minute overlap), MERGE by `order_id`, then set the watermark to the max `updated_at` seen. A cancelled order that was hard-deleted in the source never shows up, so the warehouse still counts it. CDC would emit a delete event and fix that.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What's a key limitation of updated_at-based incremental loads compared with log-based CDC?",
  "options": ["They can't handle inserts", "Hard deletes in the source aren't captured", "They require Kafka", "They only work with Parquet"],
  "answer": 1,
  "explanation": "A deleted row simply disappears; there's nothing with a newer updated_at to load."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `apply_cdc(target, events)` where `target` is a dict key → row and `events` is a list of dicts with `op` ('c', 'u' or 'd'), `key`, `lsn` (log position) and `row` (None for deletes). Events may arrive out of order: for each key apply only the event with the highest `lsn`. Return a new dict (don't mutate the input). Then write `next_watermark(rows, current)` returning the max `updated_at` among rows, or `current` if rows is empty.",
  "starterCode": "def apply_cdc(target, events):\n    pass\n\ndef next_watermark(rows, current):\n    pass\n",
  "tests": "target = {1: {'status': 'new'}, 2: {'status': 'new'}}\nevents = [\n    {'op': 'u', 'key': 1, 'lsn': 12, 'row': {'status': 'shipped'}},\n    {'op': 'u', 'key': 1, 'lsn': 10, 'row': {'status': 'paid'}},\n    {'op': 'd', 'key': 2, 'lsn': 11, 'row': None},\n    {'op': 'c', 'key': 3, 'lsn': 13, 'row': {'status': 'new'}},\n]\nout = apply_cdc(target, events)\nassert out == {1: {'status': 'shipped'}, 3: {'status': 'new'}}\nassert 2 in target\nassert next_watermark([{'updated_at': '2024-06-01T10:00'}, {'updated_at': '2024-06-01T12:30'}], '2024-05-31') == '2024-06-01T12:30'\nassert next_watermark([], '2024-05-31') == '2024-05-31'",
  "solution": "def apply_cdc(target, events):\n    latest = {}\n    for e in events:\n        k = e['key']\n        if k not in latest or e['lsn'] > latest[k]['lsn']:\n            latest[k] = e\n    out = dict(target)\n    for k, e in latest.items():\n        if e['op'] == 'd':\n            out.pop(k, None)\n        else:\n            out[k] = e['row']\n    return out\n\ndef next_watermark(rows, current):\n    if not rows:\n        return current\n    return max(r['updated_at'] for r in rows)",
  "hints": ["First reduce events to the latest per key by lsn.", "Deletes remove the key; creates and updates set the row."]
}
```

> [!TIP] Interview tips
> - Compare append-only, updated_at watermark + MERGE, and log-based CDC; name what each misses.
> - For CDC, mention Debezium/Kafka, ordering by log position, and handling deletes.
> - Talk about overlap windows, dedup, and storing the watermark only after a successful load.
