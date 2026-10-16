---
id: data-engineering-exactly-once-semantics
title: Exactly-once semantics
estimatedMinutes: 12
difficulty: hard
tags: [data-engineering, streaming, reliability, delivery-semantics]
---

## Why it matters
"Can you guarantee each payment is counted exactly once?" separates candidates who understand distributed failure from those who repeat marketing claims. You should explain delivery semantics and how real systems achieve "effectively exactly-once".

## Concept
Failures (crashes, timeouts, retries) force a choice:
- **At-most-once**: no retries / commit before processing. Messages may be **lost**, never duplicated.
- **At-least-once**: retry until acknowledged / commit after processing. **No loss**, but **duplicates** possible. The common default.
- **Exactly-once**: each message affects the final result **once**. True "delivery exactly once" over a network is impossible; systems achieve **exactly-once processing (effect)** by combining:
  1. **Replayable source** with tracked positions (Kafka offsets).
  2. **Deterministic processing + checkpointed state** (Flink/Spark checkpoints) that are restored consistently with source offsets.
  3. **Idempotent or transactional sinks**:
     - Idempotent writes: upsert by a unique key / event ID, so reprocessing a duplicate has no extra effect.
     - Transactions: write output and commit source offsets atomically (Kafka transactions with idempotent producers, Flink two-phase commit sinks, Delta Lake commits with offsets in the checkpoint).

End-to-end guarantee is only as strong as the weakest link: an exactly-once Flink job writing to a non-idempotent HTTP API (e.g. "send email") can still duplicate side effects. Use **idempotency keys** for external calls, and **deduplicate** by event ID downstream (within a time window).

## Worked example
A consumer processes a payment, writes `+$50` to a balance table, then crashes before committing the Kafka offset. On restart it reprocesses the message: with `UPDATE balance = balance + 50` the account is credited twice (at-least-once). With `INSERT ... ON CONFLICT (payment_id) DO NOTHING` into a ledger and balances computed from the ledger, the duplicate is ignored: effectively exactly-once.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A consumer commits offsets only after successfully writing results. Which semantics does it get, and what's the risk?",
  "options": ["At-most-once; data loss", "At-least-once; duplicates after a crash between write and commit", "Exactly-once; no risk", "None; Kafka requires commit first"],
  "answer": 1,
  "explanation": "If it crashes after writing but before committing, the message is processed again."
}
```

```quiz
{
  "id": "q2",
  "question": "Which sink design makes at-least-once delivery produce exactly-once results?",
  "options": ["Appending every message to a table", "Upserting by a unique event_id (idempotent writes)", "Increasing Kafka retention", "Using more partitions"],
  "answer": 1,
  "explanation": "Reprocessing a duplicate overwrites the same row instead of adding a new effect."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Simulate redelivery. Messages are `(event_id, account, amount)`. Write `apply_non_idempotent(balances, messages)` that adds every amount (duplicates count twice). Write `apply_idempotent(balances, messages, seen)` that skips event_ids already in the set `seen` (and adds new ones to it). Both return the updated balances dict (copy the input dict). Then write `dedup_window(events, window)` taking `(ts, event_id)` pairs in order and returning the list of event_ids kept, dropping an event if the same id was kept within the last `window` seconds.",
  "starterCode": "def apply_non_idempotent(balances, messages):\n    pass\n\ndef apply_idempotent(balances, messages, seen):\n    pass\n\ndef dedup_window(events, window):\n    pass\n",
  "tests": "msgs = [('p1', 'A', 50), ('p2', 'B', 20), ('p1', 'A', 50)]\nassert apply_non_idempotent({'A': 0}, msgs) == {'A': 100, 'B': 20}\nseen = set()\nb = apply_idempotent({'A': 0}, msgs, seen)\nassert b == {'A': 50, 'B': 20} and seen == {'p1', 'p2'}\nb2 = apply_idempotent(b, [('p2', 'B', 20)], seen)\nassert b2 == {'A': 50, 'B': 20}\nev = [(0, 'x'), (5, 'x'), (20, 'x'), (21, 'y')]\nassert dedup_window(ev, 10) == ['x', 'x', 'y']",
  "solution": "def apply_non_idempotent(balances, messages):\n    out = dict(balances)\n    for _, acct, amt in messages:\n        out[acct] = out.get(acct, 0) + amt\n    return out\n\ndef apply_idempotent(balances, messages, seen):\n    out = dict(balances)\n    for eid, acct, amt in messages:\n        if eid in seen:\n            continue\n        seen.add(eid)\n        out[acct] = out.get(acct, 0) + amt\n    return out\n\ndef dedup_window(events, window):\n    last_kept = {}\n    kept = []\n    for ts, eid in events:\n        if eid in last_kept and ts - last_kept[eid] <= window:\n            continue\n        last_kept[eid] = ts\n        kept.append(eid)\n    return kept",
  "hints": ["Idempotency = remember which event_ids you've applied.", "In dedup_window, compare with the time the id was last kept."]
}
```

> [!TIP] Interview tips
> - Define at-most-once, at-least-once and exactly-once, and tie each to commit timing.
> - Say "exactly-once effect = replayable source + checkpointed state + idempotent/transactional sink".
> - Warn that external side effects need idempotency keys; the guarantee is end-to-end only if every hop supports it.
