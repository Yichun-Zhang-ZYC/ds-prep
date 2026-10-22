---
id: data-engineering-case-late-arriving-data
title: "Case: Late-arriving and out-of-order data"
estimatedMinutes: 13
difficulty: hard
tags: [data-engineering, late-data, event-time, case-interview]
---

## Why it matters
Real data arrives late: mobile apps flush events hours later, partners send corrections, and dimension rows show up after the facts that reference them. "How do you keep daily numbers correct when data arrives late?" tests event time vs processing time, reprocessing windows and the tradeoff between freshness and completeness. See Windowing and watermarks for the streaming side; this case covers batch, lakehouse and dimension scenarios.

## Concept
Start with the two clocks: **event time** (when it happened) and **ingest/processing time** (when we received it). Store both, always.

Playbook:
1. **Measure lateness**: from history compute the distribution of `ingest_time - event_time`. This drives every decision (and shows if a few devices cause most of the tail).
2. **Choose a completeness policy** (the "SLA of correctness"): e.g. numbers are final after 3 days, provisional before. Publish provisional numbers with a visible flag.
3. **Batch pattern: rolling reprocessing window.** Each run recomputes the last N event-date partitions (N from the lateness distribution) using idempotent partition overwrites. Partition by **event date**, filter late-arriving rows by ingest time for incremental reads (`ingest_ts > last_run`), then rewrite the affected event-date partitions.
4. **Streaming pattern**: event-time windows with a watermark and allowed lateness; later events go to a side output and are merged by a periodic batch correction (lambda-style reconciliation).
5. **Beyond the window**: ultra-late data (rare) is handled by a periodic full or weekly correction job, or counted in the day it arrives with a "late" flag, depending on business needs.
6. **Late-arriving dimensions**: fact refers to a key not in the dimension yet. Insert an **inferred member** (placeholder, flagged), or park facts in a retry queue; update when the real row arrives. For SCD2, a late change means splitting intervals.
7. **Out-of-order updates**: apply by source version/sequence number, not arrival order (see the CDC case).
8. **Downstream impact**: restated partitions must trigger rebuilds of aggregates and notify consumers; monitor the late-data rate as a quality metric.

Pitfalls: partitioning by ingest date (you lose clean event-date queries); a lookback that is too short silently drops data; too long wastes compute; trusting client clocks without bounds (clamp future timestamps).

## Worked example
Mobile app events (illustrative): 1 M events/day. Measured lateness by days after event day: 92% same day, 6% on D+1, 1.5% on D+2 or D+3 (cumulative 99.5%), 0.5% later.

- Report computed at midnight of day D with no reprocessing: day D is only about 92% complete. Dashboards for yesterday look 8% low.
- Lookback of 2 days (recompute D and D-1 every night): final completeness 98%. Lookback 3: 99.5%. The last 0.5% needs a weekly correction or is accepted as error.
- Cost: lookback 3 recomputes 3 partitions per night, 3x the compute of a no-reprocessing job, but each is a small daily partition. If a day costs 20 minutes, that is 60 minutes nightly.
- Policy: yesterday's number is "provisional" and flagged; numbers older than 3 days are final. A revenue-critical table might use a 7-day window.

Late dimension example: an order arrives for `customer_id = 9` but the customer row is not loaded yet. Insert `dim_customer(customer_id=9, name='Unknown', inferred=true)` with a surrogate key, load the fact against it, and when the real record arrives update the same row (Type 1 for the inferred attributes) so the fact needs no change.

In the exercises you will compute the smallest lookback for a coverage target and simulate rolling reprocessing.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why partition event data by event date rather than by ingest date for daily reporting?",
  "options": [
    "Event dates are always correct",
    "Late events can be corrected by rewriting the event-date partition, and queries by business date prune cleanly",
    "Ingest dates cannot be stored",
    "It avoids the need for idempotency"
  ],
  "answer": 1,
  "explanation": "Business questions are asked in event time. With event-date partitions, late rows just trigger a rewrite of the partitions they belong to; keep the ingest time as a column for incremental reads and audits."
}
```

```quiz
{
  "id": "q2",
  "question": "A nightly job processes only yesterday's event-date partition. 6% of events arrive a day late. What is the effect?",
  "options": [
    "None, partitions are self-correcting",
    "Dashboards double count events",
    "Totals are permanently understated unless a lookback or correction job reprocesses older partitions",
    "The job fails with a schema error"
  ],
  "answer": 2,
  "explanation": "Rows arriving after the partition was processed are never included unless later runs recompute that partition."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `lookback_days(lateness_dist, coverage)`. `lateness_dist[k]` is the fraction of events that arrive k days after their event day. Return the smallest number of event-date partitions to recompute (k + 1) so the cumulative fraction is at least `coverage` (use a tolerance of 1e-9 for float comparison). If never reached, return the length of the list.",
  "starterCode": "def lookback_days(lateness_dist, coverage):\n    # lateness_dist[k] = fraction of events arriving k days after their event day\n    pass\n",
  "tests": "d = [0.92, 0.06, 0.015, 0.005]\nassert lookback_days(d, 0.9) == 1\nassert lookback_days(d, 0.98) == 2\nassert lookback_days(d, 0.995) == 3\nassert lookback_days(d, 1.0) == 4\nassert lookback_days(d, 0.0) == 1",
  "solution": "def lookback_days(lateness_dist, coverage):\n    total = 0.0\n    for k, f in enumerate(lateness_dist):\n        total += f\n        if total >= coverage - 1e-9:\n            return k + 1\n    return len(lateness_dist)",
  "hints": [
    "Accumulate fractions day by day.",
    "Compare with coverage - 1e-9 to avoid float noise."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Events are `(event_day, ingest_day)` pairs. Write `daily_job(events, run_day, lookback)` that recomputes the partitions for event days `run_day - lookback + 1 .. run_day`, counting only events with `ingest_day <= run_day`, and returns `{event_day: count}`. Then write `simulate(events, run_days, lookback)` that runs the job for each run day in order, overwriting partitions in a table dict, and returns the table.",
  "starterCode": "def daily_job(events, run_day, lookback):\n    # events: list of (event_day, ingest_day)\n    # recompute partitions for event days run_day-lookback+1 .. run_day\n    # using events with ingest_day <= run_day; return {event_day: count}\n    pass\n\ndef simulate(events, run_days, lookback):\n    # apply daily_job for each run day, overwriting partitions; return the table\n    pass\n",
  "tests": "ev = [(1, 1)] * 3 + [(1, 2)] + [(1, 4)] + [(2, 2)] * 2 + [(2, 3)]\nassert daily_job(ev, 2, 1) == {2: 2}\nassert daily_job(ev, 2, 2) == {1: 4, 2: 2}\ndef final(lb):\n    t = simulate(ev, [1, 2, 3, 4], lb)\n    return {d: t[d] for d in (1, 2)}\nassert final(1) == {1: 3, 2: 2}\nassert final(3) == {1: 4, 2: 3}\nassert final(4) == {1: 5, 2: 3}",
  "solution": "def daily_job(events, run_day, lookback):\n    out = {}\n    for d in range(run_day - lookback + 1, run_day + 1):\n        out[d] = sum(1 for e, i in events if e == d and i <= run_day)\n    return out\n\ndef simulate(events, run_days, lookback):\n    table = {}\n    for r in run_days:\n        table.update(daily_job(events, r, lookback))\n    return table",
  "hints": [
    "A run can only see events already ingested by run_day.",
    "Overwrite with dict.update so partitions outside the window keep their old values."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Daily active users in the dashboard keep changing for several days after the day ends. Product is upset. What do you do?'",
  "answer": "**Explain the cause**: events arrive late (offline mobile, batching, retries) and the job re-counts past partitions, so numbers are restated. This is normal, but surprise is not.\n\n**Quantify**: lateness distribution of ingest minus event time by platform/app version. Likely 90%+ within a day, a long tail of a few percent.\n\n**Set expectations**: show a provisional flag for recent days (e.g. last 2 days), define 'final' after N days where N covers 99.5% of events; show the as-of timestamp.\n\n**Engineering options**:\n- Keep the rolling lookback (N days) with idempotent partition overwrites; put the snapshot version in the output so consumers can reproduce what was reported.\n- If a stable number matters (finance), freeze the number at N days and handle later arrivals as adjustments in the day they arrive.\n- Reduce lateness at source: SDK flush on background, smaller batches, cap retries, fix a slow device cohort.\n- Streaming: event-time windows with watermark + side output for late events and a nightly reconciliation.\n\n**Guardrails**: monitor the late-event rate, alert on abnormal lateness, clamp future timestamps, and keep both event and ingest times in every table.\n\n**Tradeoff to state**: freshness vs completeness vs stability of published numbers; you can optimize two."
}
```

> [!TIP] Interview tips
> - Name the two clocks and always keep both event time and ingest time.
> - Quantify lateness first, then size the lookback window from the distribution and state the cost.
> - Cover dimensions too: inferred members for late-arriving keys, and applying out-of-order updates by version.
