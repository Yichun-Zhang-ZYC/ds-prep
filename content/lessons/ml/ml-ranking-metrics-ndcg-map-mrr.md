---
id: ml-ranking-metrics-ndcg-map-mrr
title: "Ranking metrics: NDCG, MAP, MRR"
estimatedMinutes: 14
difficulty: medium
tags: [ml, evaluation, ranking, recommendations, search]
---

## Why it matters
Search, recommendations and RAG retrieval are judged by how well the **top of the list** is ordered. Interviewers for these teams expect you to compute and compare NDCG, MAP and MRR.

## Concept
All are computed per query (or user) and averaged over queries, usually cut off at the top $K$ results.

- **Precision@K**: fraction of the top K that are relevant. **Recall@K**: fraction of all relevant items that appear in the top K.
- **MRR (Mean Reciprocal Rank)**: $\frac{1}{|Q|}\sum_q \frac{1}{\text{rank of first relevant}}$. Use when only the first good result matters (navigational search, "did the right answer appear?").
- **MAP (Mean Average Precision)**: for each query, average Precision@k at each rank $k$ where a relevant item appears (divided by the number of relevant items), then average over queries. Binary relevance; rewards ranking all relevant items high.
- **NDCG@K (Normalized Discounted Cumulative Gain)**: supports **graded** relevance (e.g. 0–3):
$$
\text{DCG@K} = \sum_{i=1}^{K} \frac{2^{rel_i} - 1}{\log_2(i + 1)} \qquad \text{NDCG@K} = \frac{\text{DCG@K}}{\text{IDCG@K}}
$$
  IDCG is the DCG of the ideal ordering, so NDCG ∈ [0, 1]. The log discount means position 1 matters most. (Some libraries use $rel_i$ instead of $2^{rel_i} - 1$ as the gain.)

Offline ranking metrics are proxies; confirm with online metrics (CTR, conversion, dwell time) in an A/B test. Watch out for position bias in click-based labels.

## Worked example
Top-3 results with graded relevance [3, 0, 2]. DCG = $(2^3-1)/\log_2 2 + 0 + (2^2-1)/\log_2 4 = 7 + 1.5 = 8.5$. Ideal order [3, 2, 0]: IDCG $= 7 + 3/\log_2 3 \approx 7 + 1.893 = 8.893$. NDCG@3 ≈ 0.956. The first relevant item is at rank 1, so the reciprocal rank is 1.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A Q&A search system only needs the first correct answer near the top. Which metric fits best?",
  "options": ["NDCG@10", "MRR", "Recall@100", "Accuracy"],
  "answer": 1,
  "explanation": "MRR depends only on the rank of the first relevant result."
}
```

```quiz
{
  "id": "q2",
  "question": "Why use NDCG instead of MAP for product search?",
  "options": ["NDCG is faster", "NDCG supports graded relevance (perfect vs partial match) and discounts by position", "MAP can't be averaged across queries", "NDCG ignores order"],
  "answer": 1,
  "explanation": "MAP assumes binary relevance; NDCG handles degrees of relevance."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `ndcg_at_k(rels, k)` with gain 2^rel − 1 and log2(i + 1) discount (rels are in ranked order; return 0 if IDCG is 0). Write `reciprocal_rank(rels)` (first rel > 0; 0 if none) and `average_precision_binary(rels)` treating rel > 0 as relevant (precision at each relevant position, averaged over relevant items; 0 if none).",
  "starterCode": "import math\n\ndef ndcg_at_k(rels, k):\n    pass\n\ndef reciprocal_rank(rels):\n    pass\n\ndef average_precision_binary(rels):\n    pass\n\nprint(ndcg_at_k([3, 0, 2], 3), reciprocal_rank([0, 0, 1]), average_precision_binary([1, 0, 1, 0]))",
  "tests": "import math\nexp = 8.5 / (7 + 3 / math.log2(3))\nassert abs(ndcg_at_k([3, 0, 2], 3) - exp) < 1e-12\nassert ndcg_at_k([2, 1, 0], 3) == 1.0\nassert ndcg_at_k([0, 0], 2) == 0\nassert abs(ndcg_at_k([0, 3, 3], 1)) < 1e-12\nassert abs(reciprocal_rank([0, 0, 1]) - 1 / 3) < 1e-12 and reciprocal_rank([0, 0]) == 0\nassert abs(average_precision_binary([1, 0, 1, 0]) - (1 + 2 / 3) / 2) < 1e-12",
  "solution": "import math\n\ndef _dcg(rels):\n    return sum((2 ** r - 1) / math.log2(i + 2) for i, r in enumerate(rels))\n\ndef ndcg_at_k(rels, k):\n    idcg = _dcg(sorted(rels, reverse=True)[:k])\n    return _dcg(rels[:k]) / idcg if idcg else 0\n\ndef reciprocal_rank(rels):\n    for i, r in enumerate(rels, start=1):\n        if r > 0:\n            return 1 / i\n    return 0\n\ndef average_precision_binary(rels):\n    hits, precs = 0, []\n    for i, r in enumerate(rels, start=1):\n        if r > 0:\n            hits += 1\n            precs.append(hits / i)\n    return sum(precs) / len(precs) if precs else 0",
  "hints": ["With 0-based index i, the discount is log2(i + 2).", "IDCG uses the relevances sorted descending, truncated at k."]
}
```

> [!TIP] Interview tips
> - Match the metric to the product: MRR for "first good answer", MAP for binary relevance lists, NDCG for graded relevance.
> - Be able to compute NDCG by hand for 3 items.
> - Mention position bias in click labels and validating offline gains with online A/B tests.
