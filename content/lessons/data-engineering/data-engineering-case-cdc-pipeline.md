---
id: data-engineering-case-cdc-pipeline
title: "Case: Change data capture pipeline"
estimatedMinutes: 14
difficulty: hard
tags: [data-engineering, cdc, debezium, case-interview]
---

## Why it matters
"Replicate our Postgres orders table into the warehouse with minutes of latency, including deletes" is a classic case. It tests whether you understand log-based CDC, ordering, snapshots, schema changes and failure modes. Incremental loads and CDC covers the basics; this lesson builds the end-to-end pipeline.

## Concept
Reference architecture: **Postgres WAL, Debezium (Kafka Connect), Kafka topic per table, sink to bronze, MERGE into silver**.

Key design points:
- **Initial snapshot, then stream.** The connector takes a consistent snapshot (`op = r`), records the log position (LSN), then streams changes from it. Downstream, treat `r` like an insert.
- **Event shape**: `op` (c/u/d/r), `before`, `after`, `source.lsn`, `ts_ms`, and the primary key. Key the Kafka topic by primary key so per-row order is preserved within a partition.
- **Apply rule**: per key, keep the event with the highest LSN (or Kafka offset); `d` removes the row or sets `_deleted = true`. Keep a **tombstone** with its LSN so an older, late event cannot resurrect the row.
- **Delivery is at-least-once**, so the apply step must be idempotent: ignore events with LSN <= what is already applied.
- **Raw change log in bronze**, merged state in silver. The log also feeds SCD Type 2 history and audits, and lets you replay.
- **Schema evolution**: use a schema registry with compatibility rules; adding a nullable column is safe, renames and type changes need a migration plan.
- **Operations**: an unconsumed **replication slot** makes Postgres retain WAL and can fill the disk, so alert on slot lag. Monitor connector status, consumer lag, end-to-end freshness, and row-count reconciliation against the source.

Alternatives: query-based incremental load on `updated_at` (cannot see hard deletes, misses same-timestamp updates), or periodic full refresh for small tables. Managed options: DMS, Fivetran, Datastream.

## Worked example
Orders table, illustrative load: 20 M changes/day (avg 230/s, peak maybe 1,500/s), ~500 bytes per event, so about 10 GB/day on Kafka; 3 partitions comfortably cover the peak.

Event sequence for order 7 (LSNs are increasing log positions):
1. `r` lsn 100: status `new` (snapshot)
2. `u` lsn 140: status `paid`
3. `u` lsn 180: status `shipped`
4. `d` lsn 220: row deleted (fraud cleanup)

If events 2 and 3 arrive swapped (retry or multiple partitions), the apply rule keeps lsn 180, so status is `shipped`, not `paid`. The `MERGE` into silver:

```sql
MERGE INTO silver.orders t
USING (SELECT * FROM (
         SELECT *, ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY lsn DESC) rn
         FROM bronze.orders_cdc WHERE batch_id = :batch) WHERE rn = 1) s
ON t.order_id = s.order_id
WHEN MATCHED AND s.op = 'd' AND s.lsn > t.lsn THEN DELETE
WHEN MATCHED AND s.lsn > t.lsn THEN UPDATE SET *
WHEN NOT MATCHED AND s.op <> 'd' THEN INSERT *
```

Deduping within the batch first is essential: a MERGE with two source rows for the same key is ambiguous (and errors in most engines). Rerunning the batch changes nothing because of the `lsn >` conditions. If deletes must be auditable, use soft deletes instead of `DELETE`.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why prefer log-based CDC over polling `WHERE updated_at > :last`?",
  "options": [
    "It is simpler to configure",
    "It uses less storage on the target",
    "It captures deletes and every intermediate change with low load on the source",
    "It guarantees exactly-once delivery"
  ],
  "answer": 2,
  "explanation": "Reading the transaction log sees every committed change, including deletes, without querying the tables. Delivery is still typically at-least-once, so consumers must be idempotent."
}
```

```quiz
{
  "id": "q2",
  "question": "A downstream consumer receives the same CDC event twice, and two updates for one key out of order. Which apply rule is safe?",
  "options": [
    "Apply events in arrival order",
    "Apply an event only if its LSN is greater than the LSN already applied for that key",
    "Always take the latest arrival timestamp",
    "Drop duplicates but accept any order"
  ],
  "answer": 1,
  "explanation": "Comparing source log positions makes the apply step idempotent and order-insensitive. Arrival time reflects transport, not the order of changes at the source."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `apply_cdc(events, state=None)` where events are dicts `{'key','op','lsn','after'}` with op in `c`, `u`, `d`, and `state` maps key to `(lsn, row_or_None)`. For each event, ignore it if the state already has an LSN >= the event's LSN; otherwise store `(lsn, after)`, or `(lsn, None)` for a delete (a tombstone). Return a new state (do not mutate the input). Also write `visible(state)` returning key to row for non-deleted rows. The result must not depend on event order or duplicates.",
  "starterCode": "def apply_cdc(events, state=None):\n    # events: dicts {'key', 'op' ('c','u','d'), 'lsn', 'after'}\n    # state: key -> (lsn, row or None)\n    pass\n\ndef visible(state):\n    pass\n",
  "tests": "ev = [\n    {'key': 'k1', 'op': 'c', 'lsn': 1, 'after': {'v': 1}},\n    {'key': 'k1', 'op': 'u', 'lsn': 3, 'after': {'v': 3}},\n    {'key': 'k1', 'op': 'u', 'lsn': 2, 'after': {'v': 2}},\n    {'key': 'k2', 'op': 'c', 'lsn': 4, 'after': {'v': 9}},\n    {'key': 'k2', 'op': 'd', 'lsn': 5, 'after': None},\n]\nexp = {'k1': {'v': 3}}\nassert visible(apply_cdc(ev)) == exp\nassert visible(apply_cdc(list(reversed(ev)))) == exp\nst = apply_cdc(ev)\nassert visible(apply_cdc(ev, st)) == exp\nassert visible(apply_cdc([ev[3]], apply_cdc([ev[4]]))) == {}\nassert visible(apply_cdc([])) == {}",
  "solution": "def apply_cdc(events, state=None):\n    state = dict(state or {})\n    for e in events:\n        cur = state.get(e['key'])\n        if cur is not None and cur[0] >= e['lsn']:\n            continue\n        row = None if e['op'] == 'd' else e['after']\n        state[e['key']] = (e['lsn'], row)\n    return state\n\ndef visible(state):\n    return {k: row for k, (lsn, row) in state.items() if row is not None}",
  "hints": [
    "Compare the stored LSN with the event's LSN before overwriting.",
    "Keeping the tombstone prevents an older create from resurrecting a deleted key."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `bootstrap(snapshot, snapshot_lsn, events)`: start from a snapshot dict (key to row) taken at `snapshot_lsn`, treat every snapshot row as having that LSN, apply the events with the same rule (events at or below the snapshot LSN are stale and ignored), and return the visible key to row dict.",
  "starterCode": "def bootstrap(snapshot, snapshot_lsn, events):\n    # snapshot: key -> row taken consistently at snapshot_lsn\n    # reuse the apply_cdc / visible logic (redefine it here)\n    pass\n",
  "tests": "snap = {'a': {'v': 1}, 'b': {'v': 1}}\nev = [\n    {'key': 'a', 'op': 'u', 'lsn': 90, 'after': {'v': 0}},\n    {'key': 'a', 'op': 'u', 'lsn': 110, 'after': {'v': 2}},\n    {'key': 'b', 'op': 'd', 'lsn': 120, 'after': None},\n    {'key': 'c', 'op': 'c', 'lsn': 105, 'after': {'v': 9}},\n]\nassert bootstrap(snap, 100, ev) == {'a': {'v': 2}, 'c': {'v': 9}}\nassert bootstrap(snap, 100, list(reversed(ev))) == {'a': {'v': 2}, 'c': {'v': 9}}\nassert bootstrap(snap, 100, []) == snap",
  "solution": "def bootstrap(snapshot, snapshot_lsn, events):\n    state = {k: (snapshot_lsn, row) for k, row in snapshot.items()}\n    for e in events:\n        cur = state.get(e['key'])\n        if cur is not None and cur[0] >= e['lsn']:\n            continue\n        state[e['key']] = (e['lsn'], None if e['op'] == 'd' else e['after'])\n    return {k: row for k, (lsn, row) in state.items() if row is not None}",
  "hints": [
    "Initialize state as `{k: (snapshot_lsn, row)}`.",
    "Events with lsn <= snapshot_lsn are already reflected in the snapshot."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Design a pipeline that mirrors 200 Postgres tables to the warehouse within 5 minutes, handling deletes and schema changes.' Outline your answer.",
  "answer": "**Capture**: Debezium on a Postgres logical replication slot (pgoutput), one Kafka topic per table, keyed by primary key, Avro with a schema registry. Run against a read replica or with a dedicated slot per connector; alert on slot lag and WAL disk usage.\n\n**Snapshot**: initial incremental snapshot per table (chunked, so large tables do not block), with the LSN recorded; later, ad-hoc re-snapshots for repair.\n\n**Land**: Kafka Connect sink (or Spark streaming) writes raw change events to bronze Iceberg/Delta tables partitioned by ingest hour, append-only, including op, lsn, ts_ms and the full `after` image.\n\n**Apply**: every 5 minutes a MERGE per table dedupes the batch by key with highest LSN, then merges into silver with `lsn >` guards (idempotent), handling deletes by DELETE or a soft-delete flag.\n\n**Schema changes**: registry compatibility BACKWARD; additive columns flow through automatically (table schema evolution on); breaking changes alert and require a migration/backfill, communicated through data contracts.\n\n**Quality**: reconcile row counts and checksums between source and silver on a sample; freshness SLA monitor (max `ts_ms` lag); dead-letter topic for unparseable events.\n\n**Cost and safety**: avoid replicating PII columns (column exclude lists), mask at the connector, compact the bronze tables.\n\n**Tradeoffs**: Debezium vs managed (DMS/Fivetran): control vs operational burden; MERGE every 5 minutes vs append-only merge-on-read views; hard vs soft deletes."
}
```

> [!TIP] Interview tips
> - Describe the full path: snapshot then stream, topic keyed by primary key, raw log in bronze, MERGE with LSN guards into silver.
> - State that delivery is at-least-once and show how the apply step is idempotent and order-insensitive.
> - Mention operational risks: replication slot lag filling the source disk, schema changes, and reconciliation against the source.
