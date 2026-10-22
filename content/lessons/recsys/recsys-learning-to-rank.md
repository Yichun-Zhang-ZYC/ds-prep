---
id: recsys-learning-to-rank
title: "Learning to rank (pointwise, pairwise, listwise)"
estimatedMinutes: 13
difficulty: hard
tags: [recsys, learning-to-rank, ranknet, lambdarank, ndcg]
---

## Why it matters

Ranking models decide what users see first in search, feeds and recommendations. Interviewers ask you to contrast pointwise, pairwise and listwise losses and to say why optimizing NDCG directly is hard.

## Concept

Learning to rank (LTR) trains a scoring function $f(x_{q,d})$ so that, for each query (or user) $q$, relevant documents get higher scores than irrelevant ones. Only the **order** within a list matters.

- **Pointwise**: treat each item independently as regression or classification (e.g. predict click probability with log loss). Simple and calibrated, but ignores the list structure and the fact that only relative order matters.
- **Pairwise**: learn from pairs $(i, j)$ with $y_i > y_j$. RankNet loss: $\log(1 + e^{-(s_i - s_j)})$. It directly penalizes mis-ordered pairs (BPR, hinge loss in RankSVM are variants), but treats all pairs equally, so errors at rank 100 count as much as errors at rank 1.
- **Listwise**: optimize a function of the whole list: ListNet (cross-entropy between score and label distributions), or **LambdaRank/LambdaMART**, which multiplies each pair's gradient by $|\Delta \text{NDCG}|$ (the change from swapping the two items), so top positions matter more.

**Why not optimize NDCG directly?** It is piecewise constant in scores (sorting), so gradients are zero or undefined. LambdaRank sidesteps this by defining gradients (lambdas) without an explicit loss. **LambdaMART** = LambdaRank with gradient-boosted trees, the long-time industry default (XGBoost `rank:ndcg`, LightGBM `lambdarank`).

**Practical points**: features are query-document pairs (BM25, CTR, embeddings similarity, freshness); labels come from human ratings or clicks, and click data suffers from **position bias**, so use inverse propensity weighting or position as a feature at training only. In recommendations a pointwise multi-task ranker (predict click, like, watch) combined with a weighted score is still the most common production setup.

## Worked example

Scores $s = [2, 1, 0]$ with labels $[2, 1, 0]$ give three correctly ordered pairs: $(0,1)$ with margin 1, $(0,2)$ with margin 2, $(1,2)$ with margin 1. The RankNet losses are $\log(1+e^{-1}) = 0.313$, $\log(1+e^{-2}) = 0.127$ and $0.313$, so the mean is $0.251$. Reversing the scores to $[0, 1, 2]$ makes every margin negative: the losses are $\log(1+e^{1}) = 1.313$, $\log(1+e^{2}) = 2.127$, $1.313$, mean $1.585$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What does LambdaRank add on top of RankNet's pairwise gradient?",
  "options": [
    "A larger learning rate",
    "Scaling each pair's gradient by the |change in NDCG| from swapping the pair",
    "A different model architecture",
    "Removal of the sigmoid"
  ],
  "answer": 1,
  "explanation": "Swaps near the top change NDCG more, so those pairs get larger lambdas. This steers a pairwise loss toward a listwise metric."
}
```

```quiz
{
  "id": "q2",
  "question": "Why can't we run gradient descent on NDCG directly?",
  "options": [
    "NDCG is not defined for binary labels",
    "It depends on sorted order, which is piecewise constant in the scores, so gradients are zero almost everywhere",
    "NDCG is always 1",
    "It needs labels at serving time"
  ],
  "answer": 1,
  "explanation": "Small score changes either keep the order (zero gradient) or flip it (discontinuous jump). Surrogates like LambdaRank or smooth approximations are used."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `ranknet_loss(scores, labels)`: the mean over all ordered pairs `(i, j)` with `labels[i] > labels[j]` of `log(1 + exp(-(scores[i] - scores[j])))`. Return 0.0 if there are no such pairs. Use a numerically stable form.",
  "setup": "",
  "packages": [],
  "starterCode": "import math\n\ndef ranknet_loss(scores, labels):\n    pass\n\nprint(ranknet_loss([2, 1, 0], [2, 1, 0]))",
  "tests": "import math\ngood = ranknet_loss([2, 1, 0], [2, 1, 0])\nassert abs(good - 0.2511504620264728) < 1e-9\nbad = ranknet_loss([0, 1, 2], [2, 1, 0])\nexp = (2 * math.log(1 + math.exp(1)) + math.log(1 + math.exp(2))) / 3\nassert abs(bad - exp) < 1e-9\nassert ranknet_loss([1, 2], [1, 1]) == 0.0\nassert abs(ranknet_loss([5, 5], [1, 0]) - math.log(2)) < 1e-12\nassert abs(ranknet_loss([-800, 0], [1, 0]) - 800) < 1e-6",
  "solution": "import math\n\ndef ranknet_loss(scores, labels):\n    total, n = 0.0, 0\n    for i in range(len(scores)):\n        for j in range(len(scores)):\n            if labels[i] > labels[j]:\n                d = scores[i] - scores[j]\n                total += max(-d, 0.0) + math.log1p(math.exp(-abs(d)))\n                n += 1\n    return total / n if n else 0.0",
  "hints": [
    "Stable form: log(1 + exp(-d)) = max(-d, 0) + log1p(exp(-|d|)).",
    "Compare labels, not scores, to decide which pairs to include."
  ]
}
```

> [!TIP] Interview tips
> - Define the three families and their weakness: pointwise ignores order, pairwise ignores position, listwise is harder to optimize.
> - Mention LambdaMART as the strong default and explain the |delta NDCG| weighting.
> - Raise position bias in click logs and how you debias (IPS, position feature, randomized swaps).
