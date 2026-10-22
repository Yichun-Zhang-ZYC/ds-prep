---
id: recsys-evaluation-offline-metrics-vs-online-metrics
title: "Evaluation: offline metrics vs online metrics"
estimatedMinutes: 14
difficulty: medium
tags: [recsys, evaluation, ndcg, map, recall, ab-testing]
---

## Why it matters

Choosing and computing the right metric is the most common recsys interview question after the architecture. You must compute Recall@k, MAP and NDCG by hand, and explain why offline wins don't always translate into online wins.

## Concept

**Offline metrics** score a ranked list against held-out interactions (use a **time-based split**, never random, to avoid leakage). For a ranked list $r_1, \ldots, r_k$ with relevant set $\mathcal{R}$:
- **Precision@k** $= \frac{|\text{hits in top }k|}{k}$; **Recall@k** $= \frac{|\text{hits in top }k|}{|\mathcal{R}|}$ (the retrieval-stage metric).
- **MRR** $= \frac1{\text{rank of first hit}}$.
- **AP@k** $= \frac{1}{\min(|\mathcal{R}|, k)} \sum_{i \le k} P@i \cdot \text{rel}_i$; **MAP** is the mean over users.
- **NDCG@k** $= \text{DCG@k}/\text{IDCG@k}$ with $\text{DCG@k} = \sum_{i=1}^{k} \frac{2^{\text{rel}_i}-1}{\log_2(i+1)}$. It supports **graded** relevance and discounts lower positions; IDCG is the DCG of the ideal ordering.

**Beyond accuracy**: coverage, diversity, novelty, serendipity, calibration of recommendations, and fairness. **Online metrics** are the real goal: CTR, watch time, conversion, retention, revenue per session, measured with an **A/B test**, plus guardrails (latency, complaints, creator health). Interleaving gives a more sensitive comparison of two rankers.

**Why offline and online disagree**: logged data comes from the old policy (**selection and exposure bias**), so unseen items are unlabeled; position bias inflates top slots; offline accuracy ignores feedback loops, novelty effects and user fatigue; and optimizing clicks can hurt long-term retention. Use counterfactual estimators (IPS, doubly robust) with logged propensities for better offline estimates, and always validate with an online experiment.

## Worked example

A ranked list has graded relevance $[3, 2, 0, 1]$ and $k = 3$. $\text{DCG@3} = 7/1 + 3/\log_2 3 + 0 = 7 + 1.893 = 8.893$. The ideal order is $[3, 2, 1]$: $\text{IDCG@3} = 7 + 1.893 + 1/2 = 9.393$, so $\text{NDCG@3} = 0.947$. Binary example: ranked items $[1,2,3,4]$ with relevant set $\{1,3,9\}$ and $k=3$. Hits at ranks 1 and 3, so $\text{Recall@3} = 2/3$ and $\text{AP@3} = (1/1 + 2/3)/\min(3,3) = 0.556$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why use a time-based split for recommender evaluation?",
  "options": [
    "It is faster",
    "A random split leaks future behavior into training and overstates performance",
    "It balances classes",
    "It's required by the metric definition"
  ],
  "answer": 1,
  "explanation": "In production you predict the future from the past. Random splits let the model see later interactions, inflating offline metrics."
}
```

```quiz
{
  "id": "q2",
  "question": "Your new ranker improves offline NDCG by 3% but A/B shows no CTR change. A likely reason?",
  "options": [
    "NDCG is always wrong",
    "Offline labels come from the old policy's exposure, so the metric rewards imitating it; also position bias and novelty effects",
    "The A/B test is always more noisy",
    "NDCG ignores position"
  ],
  "answer": 1,
  "explanation": "Logged data only labels what the old system showed. A new ranker surfacing unseen items gets no offline credit, and clicks are position-biased."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `recall_at_k(ranked, relevant, k)`, `ap_at_k(ranked, relevant, k)` (divide by `min(len(relevant), k)`) and `ndcg_at_k(rels, k)`. For NDCG, `rels` is the list of graded relevances in ranked order, gain is `2**rel - 1`, discount is `log2(i + 1)` for 1-based rank `i`, and the ideal DCG uses `rels` sorted descending. Return 0.0 when the ideal DCG is 0.",
  "setup": "",
  "packages": [],
  "starterCode": "import math\n\ndef recall_at_k(ranked, relevant, k):\n    pass\n\ndef ap_at_k(ranked, relevant, k):\n    pass\n\ndef ndcg_at_k(rels, k):\n    pass\n\nprint(recall_at_k([1, 2, 3, 4], {1, 3, 9}, 3), ap_at_k([1, 2, 3, 4], {1, 3, 9}, 3), ndcg_at_k([3, 2, 0, 1], 3))",
  "tests": "assert abs(recall_at_k([1, 2, 3, 4], {1, 3, 9}, 3) - 2 / 3) < 1e-12\nassert abs(recall_at_k([1, 2, 3, 4], {1, 3, 9}, 1) - 1 / 3) < 1e-12\nassert abs(ap_at_k([1, 2, 3, 4], {1, 3, 9}, 3) - (1 + 2 / 3) / 3) < 1e-12\nassert abs(ap_at_k([5, 6], {1}, 2)) < 1e-12\nassert abs(ap_at_k([1, 2], {1, 2, 3, 4}, 2) - 1.0) < 1e-12\nassert abs(ndcg_at_k([3, 2, 0, 1], 3) - 0.9467676761267002) < 1e-9\nassert abs(ndcg_at_k([3, 2, 0, 1], 4) - 0.9926195041747018) < 1e-9\nassert abs(ndcg_at_k([3, 2, 1, 0], 3) - 1.0) < 1e-12\nassert ndcg_at_k([0, 0, 0], 3) == 0.0",
  "solution": "import math\n\ndef recall_at_k(ranked, relevant, k):\n    hits = sum(1 for x in ranked[:k] if x in relevant)\n    return hits / len(relevant) if relevant else 0.0\n\ndef ap_at_k(ranked, relevant, k):\n    hits, total = 0, 0.0\n    for i, x in enumerate(ranked[:k], start=1):\n        if x in relevant:\n            hits += 1\n            total += hits / i\n    denom = min(len(relevant), k)\n    return total / denom if denom else 0.0\n\ndef _dcg(rels, k):\n    return sum((2 ** r - 1) / math.log2(i + 1) for i, r in enumerate(rels[:k], start=1))\n\ndef ndcg_at_k(rels, k):\n    ideal = _dcg(sorted(rels, reverse=True), k)\n    return _dcg(rels, k) / ideal if ideal > 0 else 0.0",
  "hints": [
    "AP only adds precision at ranks where the item is a hit.",
    "Position i (1-based) has discount log2(i + 1), so enumerate with start=1."
  ]
}
```

> [!TIP] Interview tips
> - Pick the metric to the stage: Recall@k for retrieval, NDCG/MAP for ranking, online CTR/retention for the product goal.
> - Mention time-based splits, sampled-negative evaluation pitfalls, and position bias in logged data.
> - Say offline metrics are for iteration speed and must be confirmed with an A/B test with guardrails.
