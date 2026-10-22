---
id: recsys-candidate-generation-ranking-re-ranking
title: "Candidate generation → ranking → re-ranking"
estimatedMinutes: 14
difficulty: hard
tags: [recsys, system-design, funnel, mmr, diversity]
---

## Why it matters

"Design a recommender for X" is almost always answered with a multi-stage funnel. Interviewers check that you know why one model can't score millions of items, what each stage optimizes, and how business rules and diversity enter at the end.

## Concept

Scoring every item with a heavy model is impossible (10M items x 50 ms latency budget), so serving is a **funnel** that trades recall for precision as the candidate set shrinks:
- **Candidate generation (retrieval)**: millions to ~1,000. Cheap and **recall-oriented**: two-tower ANN, item-item CF, popularity, recent-follows, and several sources merged and deduplicated.
- **Ranking**: ~1,000 to ~50. A heavy model (GBDT or deep net with cross features) predicts click, watch time, purchase. **Precision-oriented**; multi-objective scores are combined, e.g. $s = p_{\text{click}}^{a} \cdot p_{\text{like}}^{b}\cdots$.
- **Re-ranking**: ~50 to the final slate. Applies diversity (MMR, DPP), freshness, de-duplication, creator caps, ads insertion, and policy/business rules. It optimizes the **list**, not individual items.

**MMR (maximal marginal relevance)** greedily picks the next item maximizing $\lambda\, \text{rel}(i) - (1-\lambda) \max_{j \in S} \text{sim}(i, j)$, balancing relevance against redundancy with what is already selected. $\lambda = 1$ is pure relevance; smaller $\lambda$ means more diversity.

**Design points**: each stage has its own latency budget and training data (retrieval trains on in-batch negatives; ranking trains on impressions with logged position bias). Retrieval recall is an upper bound on final quality, so measure recall@k of the retrieval stage against ranker-chosen items. Keep features consistent across train and serve, and use fallbacks (popularity) when a source times out.

## Worked example

Three candidates with relevance scores $[0.9, 0.85, 0.5]$; items 0 and 1 are near-duplicates (similarity 1.0), item 2 differs (similarity 0). With $\lambda = 0.5$ MMR first picks item 0 (score 0.45). Next: item 1 gets $0.5\cdot0.85 - 0.5\cdot1 = -0.075$, item 2 gets $0.5\cdot0.5 - 0 = 0.25$, so item 2 wins and the slate is $[0, 2]$. With $\lambda=1$ the slate would be $[0, 1]$, two near-identical items.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which metric matters most for the candidate generation stage?",
  "options": [
    "Precision@1",
    "Recall@k (does the candidate set contain what the ranker would pick?)",
    "Latency of the ranker",
    "Diversity"
  ],
  "answer": 1,
  "explanation": "Retrieval is recall-oriented: anything missed there can never be recovered downstream. Precision is the ranker's job."
}
```

```quiz
{
  "id": "q2",
  "question": "Which concern belongs in the re-ranking stage rather than ranking?",
  "options": [
    "Predicting click probability from 500 features",
    "Enforcing diversity, creator caps and business rules on the final list",
    "Approximate nearest neighbor lookup",
    "Training negative sampling"
  ],
  "answer": 1,
  "explanation": "Re-ranking works on the final slate and applies list-level constraints that a per-item scorer can't express."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement MMR re-ranking: `mmr(scores, sim, k, lam)` where `sim[i][j]` is the item-item similarity. Start with the highest-scoring item, then repeatedly add the unselected item maximizing `lam*scores[i] - (1-lam)*max(sim[i][j] for j in selected)` (ties: lower index). Return the selected indices in order.",
  "setup": "",
  "packages": [],
  "starterCode": "def mmr(scores, sim, k, lam):\n    pass\n\nscores = [0.9, 0.85, 0.5]\nsim = [[1, 1, 0], [1, 1, 0], [0, 0, 1]]\nprint(mmr(scores, sim, 2, 0.5))",
  "tests": "scores = [0.9, 0.85, 0.5]\nsim = [[1, 1, 0], [1, 1, 0], [0, 0, 1]]\nassert mmr(scores, sim, 2, 0.5) == [0, 2]\nassert mmr(scores, sim, 2, 1.0) == [0, 1]\nassert mmr(scores, sim, 3, 0.5) == [0, 2, 1]\nassert mmr(scores, sim, 10, 0.5) == [0, 2, 1]\nassert mmr([0.2, 0.9], [[1, 0], [0, 1]], 1, 0.7) == [1]",
  "solution": "def mmr(scores, sim, k, lam):\n    n = len(scores)\n    selected = []\n    remaining = list(range(n))\n    while remaining and len(selected) < k:\n        best, best_val = None, None\n        for i in remaining:\n            red = max((sim[i][j] for j in selected), default=0.0)\n            val = lam * scores[i] - (1 - lam) * red\n            if best_val is None or val > best_val + 1e-12:\n                best, best_val = i, val\n        selected.append(best)\n        remaining.remove(best)\n    return selected",
  "hints": [
    "For the first pick the redundancy term is 0 (empty selected set), so it is the top score.",
    "Iterate remaining indices in ascending order and only replace the best on a strictly larger value."
  ]
}
```

> [!TIP] Interview tips
> - Draw the funnel with item counts and latency per stage, and say what each stage optimizes (recall, precision, list quality).
> - Name concrete retrieval sources (ANN, item-CF, popular, social) and blend them rather than relying on one.
> - Mention MMR/DPP for diversity, position bias in ranker training logs, and fallback paths for timeouts.
