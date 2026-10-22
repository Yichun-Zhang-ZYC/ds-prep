---
id: recsys-recsys-case-study
title: "Case: Designing a two-stage recommender end to end"
estimatedMinutes: 15
difficulty: hard
tags: [recsys, system-design, case-study, two-stage]
---

## Why it matters
"Design a recommender for X" is the standard recsys system-design round. A strong answer states requirements and numbers, then walks retrieval, ranking and re-ranking with data, metrics and failure modes. This case gives you a complete skeleton to adapt; component details are in Candidate generation, ranking, re-ranking, Two-tower models and Learning to rank.

## Concept
**Playbook** (spend about 40 minutes):
1. **Clarify**: surface (home feed, related items, email), objective (conversion, watch time, retention), scale (catalog, DAU, QPS), latency budget, cold-start share, freshness needs, constraints (safety, fairness, business rules).
2. **Numbers**: catalog size, QPS and peak factor, per-stage candidate counts, storage for embeddings, training data volume.
3. **Funnel**: millions $\to$ 500 to 1,000 (retrieval) $\to$ 100 to 500 (ranking) $\to$ 20 to 50 (re-ranking) $\to$ 10 to 20 shown. Each stage trades model cost for candidate count.
4. **Retrieval**: multiple sources (two-tower ANN, item-to-item, trending, recent-history, new-item exploration), merged with quotas and dedupe.
5. **Ranking**: multi-task ranker with calibrated heads, expected-value blend. **Re-ranking**: diversity (MMR/DPP), business rules, exploration slots.
6. **Data and features**: impressions with positions and logged propensities; feature store with point-in-time correctness; same code offline and online.
7. **Evaluation**: offline (time split, recall@k of retrieval, NDCG of ranker, calibration), then A/B with guardrails; interleaving for ranker changes.
8. **Failure modes**: cold start, feedback loops (see Feedback loops, popularity and position bias), timeouts and fallbacks, stale embeddings, train-serve skew.

**Pitfalls**: skipping numbers, one giant model, no fallback path, evaluating only offline accuracy, ignoring position bias in training data, forgetting freshness and index refresh.

## Worked example
**Prompt**: home feed for a marketplace: 20M items, 30M DAU, p99 budget 150 ms for the whole recommendation call. (All numbers are illustrative assumptions you would state aloud.)

**Traffic**: 30M DAU $\times$ 5 feed loads $= 150$M requests/day $\approx 1{,}740$ QPS average, peak $\approx 3\times = 5{,}200$ QPS.

**Latency budget** (ms): network and auth 20, user and context features 20, retrieval 25 (ANN plus other sources in parallel), ranking 50, re-ranking and filters 15, slack 20; total 150.

**Retrieval**: item tower embeddings, 64 dimensions, float32: $20\text{M} \times 64 \times 4\ \text{B} = 5.1$ GB (about 1.3 GB with int8 or product quantization), fits one HNSW or IVF-PQ index shard per replica. Sources: two-tower ANN (300), item-to-item from recent clicks (150), trending in category (50), new-item exploration (50, quota). Merge with dedupe to about 500.

**Ranking**: one multi-task model (click, add-to-cart, purchase, hide) over 500 candidates. If scoring costs 100 microseconds per candidate on 4 parallel workers, 500 candidates take $500 \times 100 / 4 = 12.5$ ms plus 10 ms overhead, well inside 50 ms; the budget could afford about 2,000 candidates or a heavier model. Blend $\text{score} = p_\text{buy} \cdot \text{margin\_value} + 0.3\, p_\text{cart} + 0.1\, p_\text{click} - 5\, p_\text{hide}$ (weights tuned online).

**Re-ranking**: MMR for category diversity, cap 3 per seller, 2 exploration slots for new items with logged propensities, remove seen and out-of-stock items.

**Training and evaluation**: train on impressions with position feature (constant at serving), label purchase within 7 days with a delayed-feedback correction. Offline: retrieval recall@500 against ranker-chosen and purchased items, NDCG@10, calibration. Online: A/B on revenue per session with guardrails on hide rate, latency and seller concentration.

**Fallbacks**: if ANN times out at 25 ms, serve trending plus recent-history sources; if the ranker times out, serve retrieval order. Log which path served each request.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Retrieval recall@500 is 0.80 and the ranker is perfect at ordering whatever it receives. What is the maximum end-to-end recall@10 for held-out positives?",
  "options": [
    "1.0",
    "0.80",
    "0.10",
    "0.50"
  ],
  "answer": 1,
  "explanation": "Positives that are not retrieved cannot be ranked. Even a perfect ranker is capped by retrieval recall (0.80); in practice the ranker adds further loss, which is why you track recall of the retrieval stage separately."
}
```

```quiz
{
  "id": "q2",
  "question": "A new ranker wins offline NDCG by 4% but the A/B test shows flat CTR and worse p99 latency. Which is the most plausible first check?",
  "options": [
    "Increase the learning rate",
    "Check offline-online skew (features, logged policy bias) and whether latency timeouts are dropping candidates or falling back to the popularity list",
    "Add more layers",
    "Remove the A/B test"
  ],
  "answer": 1,
  "explanation": "Timeouts silently degrade results to fallbacks, and train-serve skew or evaluating on logs from the old policy can make offline gains vanish. Verify serving correctness and latency before tuning the model."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Latency-budget arithmetic. Write `max_candidates(budget_ms, fixed_ms, per_item_us, parallelism)`: the largest integer number of candidates the ranker can score when the stage has `budget_ms` total, `fixed_ms` of fixed overhead (feature fetch, RPC), and each candidate costs `per_item_us` microseconds of compute spread perfectly over `parallelism` workers. Return 0 if the budget does not cover the overhead.",
  "starterCode": "def max_candidates(budget_ms, fixed_ms, per_item_us, parallelism):\n    pass\n\nprint(max_candidates(60, 10, 100, 4))",
  "tests": "assert max_candidates(60, 10, 100, 4) == 2000\nassert max_candidates(60, 10, 100, 1) == 500\nassert max_candidates(10, 10, 100, 4) == 0\nassert max_candidates(5, 10, 100, 4) == 0\nassert max_candidates(50, 0, 30, 3) == 5000",
  "solution": "def max_candidates(budget_ms, fixed_ms, per_item_us, parallelism):\n    remaining = budget_ms - fixed_ms\n    if remaining <= 0:\n        return 0\n    return int(remaining * 1000 * parallelism // per_item_us)",
  "hints": [
    "Remaining time in microseconds = (budget - fixed) * 1000.",
    "Throughput = parallelism / per_item_us candidates per microsecond; floor the result."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Merge candidate sources. `sources` is a dict name -> ranked list of item ids (iteration order = priority), `quotas` maps name -> guaranteed slots. Write `merge_sources(sources, quotas, total)`: first, for each source in order take up to its quota of items not already chosen; then fill remaining slots by walking the sources in order and taking any unchosen items. Never exceed `total`. Return the list in selection order.",
  "starterCode": "def merge_sources(sources, quotas, total):\n    pass\n\nprint(merge_sources({'ann': [1, 2, 3, 4], 'pop': [3, 5, 6], 'recent': [7, 2]}, {'ann': 2, 'pop': 1, 'recent': 1}, 6))",
  "tests": "S = {'ann': [1, 2, 3, 4], 'pop': [3, 5, 6], 'recent': [7, 2]}\nQ = {'ann': 2, 'pop': 1, 'recent': 1}\nassert merge_sources(S, Q, 6) == [1, 2, 3, 7, 4, 5]\nassert merge_sources(S, Q, 3) == [1, 2, 3]\nassert merge_sources(S, Q, 100) == [1, 2, 3, 7, 4, 5, 6]\nassert merge_sources({'a': [1]}, {}, 5) == [1]",
  "solution": "def merge_sources(sources, quotas, total):\n    out, seen = [], set()\n    for name, items in sources.items():\n        taken = 0\n        for it in items:\n            if len(out) >= total or taken >= quotas.get(name, 0):\n                break\n            if it not in seen:\n                seen.add(it)\n                out.append(it)\n                taken += 1\n    for name, items in sources.items():\n        for it in items:\n            if len(out) >= total:\n                return out\n            if it not in seen:\n                seen.add(it)\n                out.append(it)\n    return out",
  "hints": [
    "Keep a `seen` set so duplicates across sources are dropped.",
    "Two passes: quotas first, then fill."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Funnel recall. `pairs` is a list of `(retrieval_rank, ranker_rank)` for each held-out positive item: `retrieval_rank` is its rank in the full retrieval list, `ranker_rank` its rank among the candidates the ranker scored. Write `funnel_recall(pairs, n_retrieved, k)` returning `(retrieval_recall, final_recall)`: the share of positives with `retrieval_rank <= n_retrieved`, and the share that are also in the ranker's top `k`. This shows retrieval recall is an upper bound on end-to-end recall.",
  "starterCode": "def funnel_recall(pairs, n_retrieved, k):\n    pass\n\nprint(funnel_recall([(5, 2), (300, 40), (800, 1), (50, 12)], 500, 10))",
  "tests": "P = [(5, 2), (300, 40), (800, 1), (50, 12)]\nr, f = funnel_recall(P, 500, 10)\nassert abs(r - 0.75) < 1e-12 and abs(f - 0.25) < 1e-12\nr, f = funnel_recall(P, 1000, 50)\nassert abs(r - 1.0) < 1e-12 and abs(f - 1.0) < 1e-12\nr, f = funnel_recall(P, 10, 10)\nassert abs(r - 0.25) < 1e-12 and abs(f - 0.25) < 1e-12\nassert funnel_recall([], 10, 10) == (0.0, 0.0)",
  "solution": "def funnel_recall(pairs, n_retrieved, k):\n    if not pairs:\n        return 0.0, 0.0\n    n = len(pairs)\n    got = [(a, b) for a, b in pairs if a <= n_retrieved]\n    final = [(a, b) for a, b in got if b <= k]\n    return len(got) / n, len(final) / n",
  "hints": [
    "A positive missed by retrieval can never be recovered by the ranker.",
    "final_recall <= retrieval_recall always."
  ]
}
```

```reveal
{
  "prompt": "Follow-up: 'Two weeks after launch, CTR is up 3% but conversion is flat and the share of purchases from the top 1% of sellers rose from 40% to 55%. What happened and what do you do?'",
  "answer": "**Diagnosis**: the ranker is click-heavy (clickbait-ish listings) and a feedback loop is concentrating exposure on already-popular sellers: popular items get more impressions, so more clicks, so higher scores.\n\n**Checks**: exposure Gini and catalog coverage over time; CTR and conversion split by seller popularity bucket and by position; whether the blend weights over-reward `p_click` (conversion and hide heads should dominate); logging of propensities and whether new-item exploration traffic still runs.\n\n**Fixes**: move the blend weights toward purchase value and add a hide penalty; add a seller/item exposure cap and diversity re-ranking; train with position debiasing (position feature set constant at serving) and logQ correction in the retrieval loss; keep 2 to 5% exploration traffic with logged propensities; guardrail the next experiment on seller concentration and conversion per session, not CTR alone."
}
```

> [!TIP] Interview tips
> - Open with requirements and back-of-envelope numbers (QPS, embedding size, latency budget per stage); they justify every later choice.
> - Always give the funnel with candidate counts and say retrieval recall caps final quality.
> - Close with fallbacks, cold start, feedback loops and how you would run the A/B test (guardrails, interleaving).
