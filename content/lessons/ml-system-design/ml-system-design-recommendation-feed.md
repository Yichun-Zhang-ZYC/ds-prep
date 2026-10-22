---
id: ml-system-design-recommendation-feed
title: Recommendation feed
estimatedMinutes: 15
difficulty: hard
tags: [ml-system-design, recommendation, ranking, case-interview]
---

## Why it matters
"Design a recommendation feed" (home feed, video, e-commerce) is the most common ML system design question. It tests whether you can combine retrieval, ranking, objectives, cold start and evaluation under latency limits.

## Concept
Follow the framework: requirements $\to$ data $\to$ model $\to$ serving $\to$ evaluation.

1. **Requirements and objective**: scale (users, items, QPS), latency (~200 ms end to end), freshness. Goal is long-term user value, not clicks alone; clickbait optimizes the wrong thing. Add guardrails (diversity, creator fairness, safety, complaints).
2. **Funnel** (cannot score millions of items per request): **candidate generation** (millions to ~1,000) $\to$ **ranking** (~1,000 to ~100) $\to$ **re-ranking / policy** (~100 to ~20 shown).
   - **Retrieval**: multiple sources merged: **two-tower** embeddings with ANN index (FAISS/ScaNN/HNSW), collaborative filtering, item-to-item co-engagement, followed/subscribed authors, trending/fresh content, rule-based.
   - **Ranking**: heavier model (GBDT or deep multi-task net) using user, item, context and cross features. **Multi-task** heads (p(click), p(like), p(share), E[watch time], p(hide)) combined as $\text{score} = \sum_k w_k\,\hat p_k$ with weights tuned online.
   - **Re-ranking**: diversity (MMR), dedup, freshness, business rules, ads mixing, exploration slots.
3. **Data and labels**: impressions with logged position and features at serve time (avoid leakage and skew); positives from clicks/watch/likes, negatives from impressions not clicked; **position bias** (use position as a feature at train, remove at serve, or inverse propensity weights); sampling for scale; time-based splits.
4. **Cold start**: new users (onboarding, popularity, context) and new items (content embeddings, creator signals, exploration with bandits).
5. **Serving**: batch-precomputed user/item embeddings and candidates, online features from a feature store, ANN lookup, caching, fallbacks (popular items) on timeout.
6. **Evaluation**: offline recall@K, NDCG, AUC/log-loss on a time split with calibration check; then **A/B test** on engagement (sessions, watch time, retention) plus guardrails. Beware **feedback loops** and filter bubbles: log exploration, keep a holdout, retrain frequently.

## Worked example
Funnel for a video app with 10M videos and a 200 ms budget: retrieval returns 1,000 candidates (30 ms), feature fetch (30 ms), ranker scores 1,000 candidates (60 ms), re-ranking trims to 20 (10 ms), with about 70 ms left for network and slack.
NDCG@4 for ranked relevance $[3, 2, 0, 1]$: DCG $= \frac{7}{\log_2 2} + \frac{3}{\log_2 3} + 0 + \frac{1}{\log_2 5} = 7 + 1.893 + 0.431 = 9.323$. Ideal order $[3,2,1,0]$: $7 + 1.893 + 0.5 = 9.393$. NDCG $= 9.323/9.393 \approx 0.993$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why use a multi-stage funnel instead of one model scoring all items?",
  "options": [
    "Multi-stage models are always more accurate",
    "The corpus is too large to score every item within the latency budget, so cheap retrieval narrows candidates for heavier rankers",
    "It avoids needing labels",
    "It removes cold start"
  ],
  "answer": 1,
  "explanation": "Cost per item rises with model complexity, so early stages are cheap and recall-oriented, later stages are expensive and precision-oriented."
}
```

```quiz
{
  "id": "q2",
  "question": "Which is a way to handle position bias in training data?",
  "options": [
    "Ignore it",
    "Use position as a training feature (set to a constant at serving) or inverse-propensity weighting",
    "Only train on top-ranked items",
    "Remove all clicks"
  ],
  "answer": 1,
  "explanation": "Items shown higher get more clicks regardless of relevance; modelling or reweighting position separates relevance from exposure."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `ndcg_at_k(rels, k)` (rels are graded relevances in ranked order; gain $2^{rel}-1$, discount $\\log_2(i+1)$ for 1-based position $i$; return 0.0 if the ideal DCG is 0), `recall_at_k(recommended, relevant, k)` (fraction of the relevant set found in the top k; 0.0 if the relevant set is empty), and `blend_score(preds, weights)` = sum of `weights[k] * preds[k]` over the keys in `weights`.",
  "starterCode": "import math\n\ndef ndcg_at_k(rels, k):\n    pass\n\ndef recall_at_k(recommended, relevant, k):\n    pass\n\ndef blend_score(preds, weights):\n    pass\n",
  "tests": "assert abs(ndcg_at_k([3, 2, 0, 1], 4) - 0.9926) < 1e-3\nassert abs(ndcg_at_k([3, 2, 1, 0], 4) - 1.0) < 1e-12\nassert ndcg_at_k([0, 0, 0], 3) == 0.0\nassert abs(ndcg_at_k([0, 1], 1) - 0.0) < 1e-12\nassert abs(recall_at_k(['a', 'b', 'c', 'd'], {'a', 'd', 'z'}, 3) - 1 / 3) < 1e-12\nassert recall_at_k(['a'], set(), 5) == 0.0\nassert abs(blend_score({'click': 0.1, 'like': 0.02, 'hide': 0.01}, {'click': 1.0, 'like': 5.0, 'hide': -10.0}) - 0.1) < 1e-12",
  "solution": "import math\n\ndef _dcg(rels, k):\n    return sum((2 ** r - 1) / math.log2(i + 2) for i, r in enumerate(rels[:k]))\n\ndef ndcg_at_k(rels, k):\n    ideal = _dcg(sorted(rels, reverse=True), k)\n    if ideal == 0:\n        return 0.0\n    return _dcg(rels, k) / ideal\n\ndef recall_at_k(recommended, relevant, k):\n    if not relevant:\n        return 0.0\n    return len(set(recommended[:k]) & set(relevant)) / len(relevant)\n\ndef blend_score(preds, weights):\n    return sum(w * preds[key] for key, w in weights.items())",
  "hints": [
    "With 0-based index i, the discount is log2(i + 2).",
    "Ideal DCG sorts the relevances in descending order (and also truncates to k)."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Design the home feed for a short-video app with 100M DAU.' Outline your answer.",
  "answer": "**1. Requirements**: 100M DAU, ~20 feed requests/user/day $\\approx$ 23k QPS average and ~70k peak; p99 < 200 ms; fresh uploads should be eligible within minutes. North star: long-term retention / satisfied watch time; guardrails: creator diversity, harmful content, session-end complaints.\n\n**2. Data**: impression logs with position and serve-time features; labels: watch fraction, like, share, follow, hide/skip. Time-based split; downsample negatives and correct calibration.\n\n**3. Candidate generation (~2,000)**: two-tower user/video embeddings + ANN, item-to-item co-watch, followed creators, trending by region, fresh-video pool with exploration quota.\n\n**4. Ranking**: multi-task deep model (p(finish), p(like), p(share), p(skip)) with user history sequence features; score = weighted sum tuned via online experiments.\n\n**5. Re-ranking**: diversity across creators/topics (MMR), dedup watched, safety filter, ad slots, exploration slots for new videos/creators.\n\n**6. Serving**: user/item embeddings refreshed by batch/stream jobs, features in an online feature store, feed cached for a few seconds, fallback to popular content on timeout.\n\n**7. Evaluation and iteration**: offline recall@K/NDCG/AUC + calibration; interleaving then A/B on retention and watch time with guardrails; monitor drift, feedback loops and cold-start cohort performance; continuous retraining.\n\n**Tradeoffs**: engagement vs wellbeing, exploration vs exploitation, freshness vs cache hit rate, model complexity vs latency."
}
```

> [!TIP] Interview tips
> - Always state the funnel (retrieve, rank, re-rank) and why; give item counts at each stage.
> - Choose objectives beyond clicks (multi-task, long-term value) and name guardrails.
> - Cover position bias, cold start, feedback loops, and evaluation from offline NDCG to online A/B.
