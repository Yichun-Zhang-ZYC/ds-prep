---
id: ml-system-design-batch-vs-real-time-inference
title: Batch vs real-time inference
estimatedMinutes: 10
difficulty: easy
tags: [ml-system-design, serving, inference, capacity]
---

## Why it matters
"Do we score in a nightly job or at request time?" is the first serving decision in any ML design. It drives freshness, cost, latency and architecture, and interviewers expect a quantified justification.

## Concept
**Batch inference** precomputes predictions on a schedule (hourly/daily) for a known entity set and writes them to a key-value store, table or cache; the app just looks them up.
- Pros: simple, cheap per prediction, big models and heavy features are fine, no latency SLO, easy to validate before publishing.
- Cons: **stale** (hours old), wasteful if most entities never get requested, cannot use request context (query, location, cart), and cannot score new or unseen entities.

**Real-time (online) inference** computes a prediction when the request arrives.
- Pros: fresh features and context, covers any entity, adapts to the current session.
- Cons: strict latency budget (often 10-200 ms), always-on capacity sized for peak, an online feature path (feature store) and harder debugging and rollback.

**Near-real-time / streaming** updates features or predictions on events (Kafka, Flink) seconds to minutes old: a middle ground.

**Hybrid is the usual answer**: precompute expensive, slow-changing parts (user embeddings, item candidates) in batch and compute cheap, context-dependent parts (re-ranking, session features) online. Fall back to the last batch score or a heuristic when the online path times out.

Decision rules: needs request-time context or sub-minute freshness $\Rightarrow$ online; predictions are needed for a bounded known set and tolerate staleness $\Rightarrow$ batch. Examples: churn lists and email targeting (batch); fraud at checkout, search ranking, ad bidding (online).

## Worked example
A platform has 100M registered users but only 10M daily actives, each making 3 requests/day.
- **Batch**: score all 100M once daily at 5,000 scores/s per worker $= 20{,}000$ s $\approx 5.6$ worker-hours (parallelize across 20 workers: about 17 minutes). But $1 - 10/100 = 90\%$ of predictions are never read.
- **Online**: $10\text{M} \times 3 = 30\text{M}$ requests/day $\approx 347$ QPS average, peak $3\times \approx 1{,}042$ QPS. At 200 QPS per instance and 70% target utilization (140 effective): $\lceil 1042/140 \rceil = 8$ instances, running 24/7.

Choose online if freshness or context matters; otherwise batch only the 10M active users, or go hybrid.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which use case is the best fit for batch inference?",
  "options": [
    "Fraud scoring at card checkout",
    "Weekly churn-risk list for the retention team",
    "Query-dependent search ranking",
    "Real-time ad bidding"
  ],
  "answer": 1,
  "explanation": "A known user set, tolerance for staleness and no request context make batch cheapest and simplest."
}
```

```quiz
{
  "id": "q2",
  "question": "Why is a hybrid design often best for recommendations?",
  "options": [
    "It removes the need for a feature store",
    "Expensive slow-changing parts (embeddings, candidates) are precomputed, while cheap context-dependent re-ranking runs online",
    "It guarantees lower accuracy",
    "It avoids caching"
  ],
  "answer": 1,
  "explanation": "Hybrid balances cost and freshness: precompute what is costly and stable, compute online what depends on the request."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write sizing helpers. `online_qps(requests_per_day, peak_factor=1.0)` = requests / 86400 × peak. `instances_needed(qps, per_instance_qps, target_util=0.7)` = ceil(qps / (per_instance_qps × target_util)). `batch_worker_hours(n_items, items_per_sec_per_worker)` = hours of single-worker time. `wasted_fraction(n_scored, n_requested)` = fraction of batch predictions never requested.",
  "starterCode": "import math\n\ndef online_qps(requests_per_day, peak_factor=1.0):\n    pass\n\ndef instances_needed(qps, per_instance_qps, target_util=0.7):\n    pass\n\ndef batch_worker_hours(n_items, items_per_sec_per_worker):\n    pass\n\ndef wasted_fraction(n_scored, n_requested):\n    pass\n",
  "tests": "assert abs(online_qps(30_000_000) - 347.2222) < 1e-3\nassert abs(online_qps(30_000_000, 3) - 1041.667) < 1e-2\nassert instances_needed(online_qps(30_000_000, 3), 200) == 8\nassert instances_needed(100, 100, 1.0) == 1\nassert abs(batch_worker_hours(100_000_000, 5000) - 5.5556) < 1e-3\nassert abs(wasted_fraction(100_000_000, 10_000_000) - 0.9) < 1e-12\nassert wasted_fraction(10, 10) == 0",
  "solution": "import math\n\ndef online_qps(requests_per_day, peak_factor=1.0):\n    return requests_per_day / 86400 * peak_factor\n\ndef instances_needed(qps, per_instance_qps, target_util=0.7):\n    return math.ceil(qps / (per_instance_qps * target_util))\n\ndef batch_worker_hours(n_items, items_per_sec_per_worker):\n    return n_items / items_per_sec_per_worker / 3600\n\ndef wasted_fraction(n_scored, n_requested):\n    return 1 - n_requested / n_scored",
  "hints": [
    "86,400 seconds per day, 3,600 per hour.",
    "Size for peak, and leave utilization headroom (do not run at 100%)."
  ]
}
```

> [!TIP] Interview tips
> - Frame it by freshness, context needs, entity coverage, latency SLO and cost; then quantify.
> - Propose hybrid: batch the heavy stable parts, serve a thin online layer, with a batch fallback.
> - Mention that batch needs no latency SLO but can waste compute on users who never return.
