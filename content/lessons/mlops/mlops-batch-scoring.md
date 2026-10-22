---
id: mlops-batch-scoring
title: Batch scoring
estimatedMinutes: 10
difficulty: medium
tags: [mlops, serving, batch, spark, idempotency]
---

## Why it matters
Many models never need a live endpoint: nightly churn scores, weekly lead rankings, monthly risk tiers. Interviewers ask when batch beats online serving and how to make a batch job reliable and cheap.

## Concept
**Batch (offline) scoring** runs a model over a large table on a schedule and writes predictions to a table or file store, where apps and dashboards read them.

**Batch vs online**:

| | Batch | Online |
|---|---|---|
| Latency | minutes to hours | milliseconds |
| Freshness | stale by one cycle | per request |
| Cost | cheap, high throughput, spot instances | always-on, over-provisioned |
| Features | any warehouse data | need low-latency feature store |
| Fits | recommendations lists, churn, credit limits | fraud checks, search ranking, chat |

Use batch when the set of entities is known in advance, decisions are not time-critical, or predictions can be precomputed (and sometimes cached online as lookups). A **hybrid** is common: batch features and candidate scores plus a light online re-ranker.

**Implementation patterns**:
- **Spark** or **Dask**: read a partitioned table, apply the model with a pandas UDF / `mapInPandas` (load the model **once per partition**, not per row), write partitioned output.
- **Warehouse-native**: BigQuery ML, Snowflake model functions, or SQL UDFs avoid moving data.
- Cloud services: SageMaker Batch Transform, Vertex AI batch prediction.
- Process in **chunks of N rows** to vectorise inference and bound memory.

**Reliability**:
- **Idempotent writes**: output keyed by run date, written with partition overwrite, so reruns and backfills never duplicate rows.
- **Atomic publish**: write to a staging path, validate (row count, null rate, score distribution versus last run), then swap or commit.
- Record `model_version`, `scored_at`, and the feature snapshot date with each prediction.
- Handle new entities and missing features explicitly (fallback score).
- Monitor job duration, input and output volume, and prediction drift; orchestrate with Airflow or similar.

**Pitfall**: scoring with *today's* features for a label defined at a past time (leakage), or using features not available at the time the prediction will be used.

## Worked example
A churn model scores 20 M users nightly. Inference takes 0.05 ms per row when vectorised, so $20{,}000{,}000 \times 0.05\text{ ms} = 1000$ s of compute. Spread across 50 Spark partitions that is about 20 s of model time per partition plus I/O; the job finishes in a few minutes on a small cluster.

Serving the same volume online would need an always-on service; batch also lets you validate: if today's mean score is 0.31 versus 0.12 yesterday, the publish step blocks and alerts instead of shipping bad scores to the CRM. Rerunning the job for `ds=2024-06-01` overwrites only that partition.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which use case is the best fit for batch scoring?",
  "options": ["Card-fraud decision during a payment", "Weekly ranking of leads for the sales team", "Autocomplete suggestions as the user types", "Moderating a live chat message"],
  "answer": 1,
  "explanation": "Known entities, no latency pressure, and consumers that read a table: classic batch."
}
```

```quiz
{
  "id": "q2",
  "question": "A nightly scoring job fails halfway and is rerun. How do you avoid duplicate predictions?",
  "options": ["Append and deduplicate by hand later", "Write idempotently, overwriting the partition for that run date", "Disable retries", "Score fewer users"],
  "answer": 1,
  "explanation": "Partition-overwrite (or merge on key) makes reruns safe."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement the core of an idempotent batch job. `chunked(seq, n)` returns a list of consecutive chunks of at most `n` items. `batch_score(rows, predict, batch_size)` calls `predict(list_of_rows)` once per chunk (it returns a list of scores) and returns a list of `(row['id'], score)` in input order. `write_partition(store, ds, results)` replaces `store[ds]` with `results` (so reruns never duplicate) and returns the number of rows written. `validate_output(results, max_mean_shift, prev_mean)` returns True if `abs(mean(score) - prev_mean) <= max_mean_shift` and results are non-empty.",
  "starterCode": "def chunked(seq, n):\n    pass\n\ndef batch_score(rows, predict, batch_size):\n    pass\n\ndef write_partition(store, ds, results):\n    pass\n\ndef validate_output(results, max_mean_shift, prev_mean):\n    pass\n",
  "tests": "assert chunked([1, 2, 3, 4, 5], 2) == [[1, 2], [3, 4], [5]]\nassert chunked([], 3) == []\ncalls = []\ndef predict(batch):\n    calls.append(len(batch))\n    return [r['x'] * 0.1 for r in batch]\nrows = [{'id': i, 'x': i} for i in range(5)]\nres = batch_score(rows, predict, 2)\nassert calls == [2, 2, 1]\nassert [r[0] for r in res] == [0, 1, 2, 3, 4]\nassert abs(res[4][1] - 0.4) < 1e-12\nstore = {}\nassert write_partition(store, '2024-06-01', res) == 5\nassert write_partition(store, '2024-06-01', res) == 5\nassert len(store['2024-06-01']) == 5\nassert validate_output(res, 0.1, 0.25) is True\nassert validate_output(res, 0.1, 0.5) is False\nassert validate_output([], 1.0, 0.0) is False",
  "solution": "def chunked(seq, n):\n    return [list(seq[i:i + n]) for i in range(0, len(seq), n)]\n\ndef batch_score(rows, predict, batch_size):\n    out = []\n    for chunk in chunked(rows, batch_size):\n        scores = predict(chunk)\n        out.extend((r['id'], s) for r, s in zip(chunk, scores))\n    return out\n\ndef write_partition(store, ds, results):\n    store[ds] = list(results)\n    return len(store[ds])\n\ndef validate_output(results, max_mean_shift, prev_mean):\n    if not results:\n        return False\n    mean = sum(s for _, s in results) / len(results)\n    return abs(mean - prev_mean) <= max_mean_shift",
  "hints": ["Use range(0, len(seq), n) with slicing.", "Overwriting is store[ds] = list(results); running it twice for the same ds gives the same state."]
}
```

> [!TIP] Interview tips
> - Frame batch vs online by latency, freshness, cost and feature availability, and mention hybrid designs.
> - Show reliability: idempotent partition overwrite, staging then publish after validation, versioned outputs.
> - Pitfall: loading the model per row/task or leaking future features into historical scoring runs.
