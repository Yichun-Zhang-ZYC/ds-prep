---
id: data-engineering-backfills-and-idempotency
title: "Backfills and idempotent pipelines"
estimatedMinutes: 13
difficulty: medium
tags: [data-engineering, backfill, idempotency, orchestration]
---

## Why it matters
Reprocessing history is where pipelines get exposed: a rerun that doubles revenue, a backfill that melts the warehouse, or one that silently changes numbers dashboards already showed. Idempotency & backfills introduced the patterns; this lesson is the operational playbook for running a backfill safely and answering the follow-up questions.

## Concept
Design every task to be **idempotent and parameterized by a logical partition** (date), then plan the backfill as a controlled operation:

1. **Scope**: which tables, which date range, why (bug, new column, new source). Backfill the **minimal** set; list downstream consumers.
2. **Dependency order**: upstream tables first (topological order), then downstream. Rebuilding a mart from not-yet-fixed inputs wastes the run.
3. **Partition independence**: most daily tables can run partitions **in parallel**. Tables whose day N depends on day N-1 (cumulative balances, SCD2, running totals, `depends_on_past`) must run **sequentially**; this dominates the total time.
4. **Throttle**: cap concurrency (pools, max_active_runs) so the backfill does not starve production loads or exceed source API limits.
5. **Isolate and validate**: write to a **staging table/branch**, compare against current output (row counts, sums, null rates, diff of changed keys), then **swap or publish**. Lakehouse branching/time travel makes rollback cheap.
6. **Communicate**: restating published numbers breaks trust; announce the change, versions or timestamp the correction, and refresh dependent dashboards and ML features.
7. **Avoid hidden non-determinism**: `now()`, "latest" snapshots of mutable dimensions, unversioned reference data and external API calls make a backfill produce different results than the original run. Use as-of reads (time travel, SCD2) or pinned inputs.

Pitfalls: appends instead of partition overwrite; side effects (emails, pushes to production services) replayed for old dates; backfilling downstream before upstream finishes; changing the schema mid-backfill; no cost estimate.

## Worked example
Bug: a currency conversion was wrong for the last 90 days. Chain: `orders_clean` (daily) to `daily_revenue` (daily) to `customer_ltv` (cumulative: day N = day N-1 + new revenue). Each partition takes 4 minutes; the pool allows 6 concurrent tasks (illustrative).

- `orders_clean`: 90 partitions / 6 parallel = 15 waves x 4 min = **60 min**.
- `daily_revenue`: independent partitions, also **60 min** (starts after `orders_clean` finishes the matching dates, or after all).
- `customer_ltv`: sequential dependency on the previous day, so 90 x 4 = **360 min**; parallelism does not help. Better fix: recompute from a checkpoint, or restate LTV as a sum over `daily_revenue` as of the date so partitions become independent.
- Total about 480 min (8 h), versus 1,080 min if everything ran one partition at a time.

Execution: write each table to `*_staging`, compare 90-day sums with the old tables (expect only the buggy conversions to differ, e.g. a total change of 1.8%), then swap in one transaction. Announce a restatement note to finance and refresh the dashboards.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which table's backfill is the hardest to parallelize across dates?",
  "options": [
    "Daily revenue per product",
    "A daily snapshot copied from a source",
    "A cumulative table where each day depends on the previous day's state",
    "A deduplicated events table partitioned by date"
  ],
  "answer": 2,
  "explanation": "State carried from day to day forces sequential execution (or a checkpointed restart). Independent partitions parallelize freely."
}
```

```quiz
{
  "id": "q2",
  "question": "Why backfill into a staging table and swap, rather than overwrite production partitions directly?",
  "options": [
    "It is faster",
    "Consumers never see partial or invalid results, and you can validate and roll back",
    "Staging tables avoid the need for idempotency",
    "It removes the need for communication"
  ],
  "answer": 1,
  "explanation": "Staging plus an atomic swap provides validation and an easy rollback; direct overwrite exposes half-finished data."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `backfill_minutes(n_partitions, minutes_per_partition, parallelism, sequential=False)`. Independent partitions run in waves of size `parallelism`, so the time is `ceil(n / parallelism) * minutes`. If `sequential` is True, partitions run one at a time. Zero partitions take 0 minutes.",
  "starterCode": "import math\n\ndef backfill_minutes(n_partitions, minutes_per_partition, parallelism, sequential=False):\n    pass\n",
  "tests": "assert backfill_minutes(90, 4, 6) == 60\nassert backfill_minutes(90, 4, 6, sequential=True) == 360\nassert backfill_minutes(91, 4, 6) == 64\nassert backfill_minutes(0, 4, 6) == 0\nassert backfill_minutes(5, 10, 100) == 10",
  "solution": "import math\n\ndef backfill_minutes(n_partitions, minutes_per_partition, parallelism, sequential=False):\n    if n_partitions == 0:\n        return 0\n    if sequential:\n        return n_partitions * minutes_per_partition\n    return math.ceil(n_partitions / parallelism) * minutes_per_partition",
  "hints": [
    "Use math.ceil for the number of waves.",
    "Sequential time is just n x minutes."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `backfill_order(deps)` where `deps` maps a table to its list of upstream tables (tables appearing only as upstream also count). Return a valid backfill order with upstream tables first. When several tables are ready, pick alphabetically. Raise `ValueError` on a cycle.",
  "starterCode": "def backfill_order(deps):\n    # deps: table -> list of upstream tables\n    pass\n",
  "tests": "d = {'c': ['b'], 'b': ['a'], 'a': [], 'd': ['a']}\nassert backfill_order(d) == ['a', 'b', 'c', 'd']\nassert backfill_order({'x': ['raw']}) == ['raw', 'x']\nassert backfill_order({}) == []\ntry:\n    backfill_order({'a': ['b'], 'b': ['a']})\n    assert False\nexcept ValueError:\n    pass",
  "solution": "def backfill_order(deps):\n    nodes = set(deps)\n    for ups in deps.values():\n        nodes.update(ups)\n    indeg = {n: len(set(deps.get(n, []))) for n in nodes}\n    down = {n: [] for n in nodes}\n    for n in nodes:\n        for u in set(deps.get(n, [])):\n            down[u].append(n)\n    ready = sorted(n for n in nodes if indeg[n] == 0)\n    order = []\n    while ready:\n        n = ready.pop(0)\n        order.append(n)\n        for m in down[n]:\n            indeg[m] -= 1\n            if indeg[m] == 0:\n                ready.append(m)\n        ready.sort()\n    if len(order) != len(nodes):\n        raise ValueError('cycle')\n    return order",
  "hints": [
    "Kahn's algorithm: repeatedly take tables with no unprocessed upstream.",
    "If you could not place every table, there is a cycle."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Write `run_backfill(table, dates, compute, validate)`. `table` is a list of row dicts with a `ds` field. For each date compute the new rows into staging; if `validate(rows)` is False for ANY date, return the original table unchanged (all-or-nothing). Otherwise return a new table where the rows for those dates are replaced by the staged rows. Do not mutate the input.",
  "starterCode": "def run_backfill(table, dates, compute, validate):\n    # table: list of row dicts with a 'ds' field\n    pass\n",
  "tests": "base = [{'ds': 'd1', 'rev': 9}, {'ds': 'd2', 'rev': 9}, {'ds': 'd3', 'rev': 5}]\ncomp = lambda d: [{'ds': d, 'rev': 1}]\nkey = lambda t: sorted((r['ds'], r['rev']) for r in t)\nok = run_backfill(base, ['d1', 'd2'], comp, lambda rows: all(r['rev'] >= 0 for r in rows))\nassert key(ok) == [('d1', 1), ('d2', 1), ('d3', 5)]\nassert key(base) == [('d1', 9), ('d2', 9), ('d3', 5)]\nbad = lambda d: [{'ds': d, 'rev': -1 if d == 'd2' else 1}]\nres = run_backfill(base, ['d1', 'd2'], bad, lambda rows: all(r['rev'] >= 0 for r in rows))\nassert key(res) == key(base)\nassert key(run_backfill(ok, ['d1', 'd2'], comp, lambda rows: True)) == key(ok)",
  "solution": "def run_backfill(table, dates, compute, validate):\n    staged = {}\n    for d in dates:\n        rows = compute(d)\n        if not validate(rows):\n            return list(table)\n        staged[d] = rows\n    out = [r for r in table if r['ds'] not in staged]\n    for d in dates:\n        out.extend(staged[d])\n    return out",
  "hints": [
    "Compute and validate everything before touching the table.",
    "Swap = drop old rows with ds in the staged dates, then add staged rows."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'You discover that a metric has been wrong for 6 months and the pipeline is used by 20 dashboards. Walk me through the fix.'",
  "answer": "1. **Contain**: confirm the bug and its start date, pause or flag affected dashboards, tell stakeholders the numbers will be restated.\n2. **Fix and test** the logic on a recent partition and a historical sample; add a data test that would have caught it.\n3. **Plan**: list impacted tables (lineage), order upstream first, estimate runtime and cost (partitions x minutes / parallelism), pick a throttled window off-peak.\n4. **Run into staging** with idempotent partition-scoped jobs (as-of reads for dimensions; no `now()`).\n5. **Validate**: row counts, totals before/after, diff of changed keys, reconciliation with finance or source of truth.\n6. **Publish** by atomic swap partition by partition (or branch merge), refresh downstream aggregates, ML features and extracts.\n7. **Communicate and prevent**: restatement notice with old vs new values, keep old version for audit, add monitoring/contract tests."
}
```

> [!TIP] Interview tips
> - Open with the properties: idempotent tasks, logical-date partitions, deterministic inputs, atomic publish.
> - Call out dependency order and day-to-day dependent tables, which cannot be parallelized, and estimate runtime.
> - Mention staging plus validation, throttling and communicating restated numbers; this is what separates operational experience from theory.
