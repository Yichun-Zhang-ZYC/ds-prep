---
id: ml-system-design-search-ranking
title: Search ranking
estimatedMinutes: 14
difficulty: medium
tags: [ml-system-design, search, ranking, learning-to-rank]
---

## Why it matters
"Design search for an e-commerce site / help center" is a staple ML design question. It tests whether you split the problem into retrieval and ranking stages, pick the right relevance metrics, and handle biased click data.

## Concept
**Multi-stage funnel** (latency budget ~100-200 ms end to end):
1. **Query understanding**: normalization, spell correction, intent/category classification, synonyms, entity tagging.
2. **Retrieval (recall-oriented)**: from millions of docs to ~1,000 candidates. Lexical (BM25 on an inverted index) plus **dense/embedding retrieval** (two-tower encoder, ANN index such as HNSW), merged with a union or **Reciprocal Rank Fusion**: $\text{RRF}(d)=\sum_r \frac{1}{k+\text{rank}_r(d)}$, $k\approx60$.
3. **Ranking (precision-oriented)**: a learning-to-rank model (LambdaMART/GBDT first, then a neural or cross-encoder reranker on the top ~100) using query, document, user and context features (BM25 score, embedding similarity, popularity, price, CTR, freshness, personalization).
4. **Re-ranking / business rules**: diversity, de-duplication, sponsored slots, availability, policy filters.

**Labels**:
- *Human judgments* (graded 0-4): clean but expensive and small.
- *Clicks / purchases / dwell time*: abundant but noisy and **position-biased**: users click the top result because it is on top. Fixes: log the position and use it as a training-only feature, inverse-propensity weighting (weight by $1/P(\text{examined at rank})$, estimated by result randomization), or click models.
- *LLM judges* are increasingly used to label relevance at scale; validate them against human labels.

**Loss**: pointwise (regress relevance), pairwise (RankNet), or **listwise** (LambdaRank/LambdaMART optimizes NDCG gradients directly).

**Metrics**:
- Offline: $\text{DCG@k}=\sum_{i=1}^{k}\frac{2^{rel_i}-1}{\log_2(i+1)}$, $\text{NDCG@k}=\text{DCG@k}/\text{IDCG@k}$; MRR for navigational queries; recall@K for the retrieval stage.
- Online: CTR, zero-result rate, query reformulation rate, add-to-cart/conversion, time to first click. Guardrail: latency p99.

Tail queries lack click data, so lean on content features and embeddings; head queries can be cached.

## Worked example
Four results are graded $[3,2,0,1]$ in the order shown. With gain $2^{rel}-1$:

$\text{DCG@4}=\frac{7}{\log_2 2}+\frac{3}{\log_2 3}+\frac{0}{\log_2 4}+\frac{1}{\log_2 5}=7+1.893+0+0.431=9.323$

The ideal order is $[3,2,1,0]$: $\text{IDCG@4}=7+1.893+0.5+0=9.393$. So $\text{NDCG@4}=9.323/9.393\approx0.993$. Swapping the last two results would fix it.

Fusion: a doc ranked 1st by BM25 and 3rd by the dense retriever gets $\frac{1}{61}+\frac{1}{63}\approx0.0323$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Users click the first search result far more often than the fifth, even when the fifth is equally relevant. How should you treat raw click logs as training labels?",
  "options": [
    "Use them directly; clicks equal relevance",
    "Correct for position bias (position feature at training only, inverse propensity weighting, or randomization)",
    "Discard clicks and use only purchases",
    "Train only on queries with a single result"
  ],
  "answer": 1,
  "explanation": "Clicks confound relevance with examination probability. Debias them, ideally with a small randomized-position experiment to estimate propensities."
}
```

```quiz
{
  "id": "q2",
  "question": "Why use a two-stage retrieve-then-rank architecture instead of scoring every document with the best model?",
  "options": [
    "Rankers cannot use text features",
    "Scoring millions of docs with a heavy model violates the latency budget; cheap retrieval keeps recall high and the expensive ranker only sees ~100-1,000 candidates",
    "Retrieval models are always more accurate",
    "It avoids needing labels"
  ],
  "answer": 1,
  "explanation": "Retrieval is optimized for recall at low cost; ranking spends compute where precision matters."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `dcg(rels, k)` with gain $2^{rel}-1$ and discount $\\log_2(i+1)$ (1-indexed positions), `ndcg(rels, k)` = DCG@k of the list divided by DCG@k of the ideal (sorted descending) ordering (return 0.0 if the ideal is 0), and `mrr(lists)` where each inner list holds relevance (0/1) in ranked order; the reciprocal rank is 1/position of the first nonzero entry, or 0 if none.",
  "starterCode": "import math\n\ndef dcg(rels, k):\n    pass\n\ndef ndcg(rels, k):\n    pass\n\ndef mrr(lists):\n    pass\n\nprint(ndcg([3, 2, 0, 1], 4), mrr([[0, 1], [1, 0], [0, 0]]))",
  "tests": "assert abs(dcg([3, 2, 0, 1], 4) - 9.32346581878) < 1e-6\nassert abs(ndcg([3, 2, 0, 1], 4) - 0.99261950) < 1e-6\nassert abs(ndcg([3, 2, 1, 0], 4) - 1.0) < 1e-12\nassert ndcg([0, 0], 5) == 0.0\nassert abs(ndcg([0, 3], 1) - 0.0) < 1e-12\nassert abs(mrr([[0, 1], [1, 0], [0, 0]]) - 0.5) < 1e-12\nassert mrr([]) == 0.0",
  "solution": "import math\n\ndef dcg(rels, k):\n    return sum((2 ** r - 1) / math.log2(i + 2) for i, r in enumerate(rels[:k]))\n\ndef ndcg(rels, k):\n    ideal = dcg(sorted(rels, reverse=True), k)\n    return dcg(rels, k) / ideal if ideal > 0 else 0.0\n\ndef mrr(lists):\n    if not lists:\n        return 0.0\n    total = 0.0\n    for l in lists:\n        for i, r in enumerate(l):\n            if r:\n                total += 1 / (i + 1)\n                break\n    return total / len(lists)",
  "hints": [
    "With 0-indexed enumerate, the discount is log2(i + 2).",
    "The ideal ranking is the same relevances sorted in descending order, truncated at k."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Design product search for an e-commerce marketplace.' Outline your answer.",
  "answer": "**Requirements**: ~50M products, 10k QPS peak, p99 < 200 ms, goal = purchases per search with relevance guardrails.\n\n**Pipeline**: query understanding (spell, category classifier) -> retrieval: BM25 + two-tower ANN, merge with RRF to ~1,000 -> LTR ranker (LambdaMART on features; cross-encoder rerank on the top 50 if latency allows) -> business rules (diversity, stock, ads).\n\n**Data**: labels from purchases/add-to-cart weighted above clicks, debiased for position; human/LLM relevance judgments for an evaluation set; hard negatives from impressions without clicks.\n\n**Evaluation**: offline NDCG@10, recall@1000 for retrieval, sliced by head/tail queries; online A/B on conversion with latency and zero-result guardrails; interleaving for faster ranker comparisons.\n\n**Operations**: cache head queries, incremental index updates for price/stock, monitor drift in query mix, feedback loop (the ranker only collects clicks on what it shows) mitigated by exploration."
}
```

> [!TIP] Interview tips
> - Always separate retrieval (recall) from ranking (precision) and say which metric belongs to each.
> - Mention position bias unprompted; it is the classic click-data trap.
> - Name the loss family (pointwise, pairwise, listwise) and tie NDCG to graded relevance.
> - Cover cold start for new items and tail queries, plus the latency budget.
