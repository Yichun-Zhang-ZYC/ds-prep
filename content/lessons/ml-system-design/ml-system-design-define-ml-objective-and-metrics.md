---
id: ml-system-design-define-ml-objective-and-metrics
title: Define ML objective & metrics
estimatedMinutes: 12
difficulty: medium
tags: [ml-system-design, framework, metrics, objectives]
---

## Why it matters
Interviewers want to see that you separate the **business metric** (what the company cares about), the **ML objective** (what you train on) and the **evaluation metrics** (offline and online). A model that wins on loss but moves nothing in the product is the most common failure story.

## Concept
Build a chain from business to model:
1. **Business metric**: revenue, retention, time well spent, fraud losses.
2. **Online metrics**: primary (what the A/B test decides on) plus **guardrails** (latency, complaints, unsubscribes, diversity, cost) that must not regress.
3. **ML objective**: a trainable proxy such as click, purchase, watch-time, or fraud label. State the gap between proxy and goal (clicks reward clickbait).
4. **Offline metrics**: cheap to compute, correlated with online. Choose by task and imbalance.

**Choosing offline metrics**
- Balanced classification: accuracy, ROC-AUC. Imbalanced: PR-AUC, precision/recall at a threshold, and cost-weighted metrics.
- Ranking/recommendation: $\text{Precision@}k = \frac{\text{relevant in top }k}{k}$, $\text{Recall@}k = \frac{\text{relevant in top }k}{\text{all relevant}}$, NDCG, MRR. Use Precision@k when users see only $k$ slots; Recall@k for candidate retrieval.
- Probabilities used downstream (bidding, pricing): log loss and calibration.
- Regression: MAE (robust) vs RMSE (penalises big misses); consider quantile loss for asymmetric costs.

**Objective design**: pointwise (predict each label), pairwise (order pairs), listwise (optimise the list). For several goals, train separate heads and combine, e.g. $\text{score} = P(\text{click}) \cdot E[\text{watch} \mid \text{click}]$, or a weighted sum tuned online. Beware **label leakage** and **metric gaming**.

Always name at least one guardrail; it shows product sense.

## Worked example
Video feed. Business goal: long-term retention. Objective A: predict $P(\text{click})$ — easy, abundant labels, but it favours clickbait. Objective B: predict expected watch time given click, and rank by $P(\text{click}) \cdot E[\text{watch}]$. Primary online metric: sessions per user per week; guardrails: p99 latency, "not interested" rate, creator diversity.

Offline check for a top-5 list where the relevance labels in ranked order are $[1, 0, 1, 1, 0]$ and the user has 4 relevant videos in total (one not shown):
- Precision@3: top 3 = $[1,0,1]$ → $2/3 \approx 0.667$.
- Recall@3: $2/4 = 0.5$.
- Precision@5: $3/5 = 0.6$; Recall@5: $3/4 = 0.75$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Fraud rate is 0.1%. Which offline metric is least informative?",
  "options": ["PR-AUC", "Precision at a fixed recall", "Accuracy", "Cost-weighted loss"],
  "answer": 2,
  "explanation": "A model that always predicts 'not fraud' gets 99.9% accuracy; it says nothing about detection quality."
}
```

```quiz
{
  "id": "q2",
  "question": "What is a guardrail metric?",
  "options": ["The metric the A/B test is designed to improve", "A metric that must not get worse while the primary metric improves", "The training loss", "A metric used only offline"],
  "answer": 1,
  "explanation": "Guardrails (latency, complaints, revenue per user) catch harmful side effects of optimising the primary metric."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `precision_at_k(rel, k)` and `recall_at_k(rel, k, total_relevant)` for a ranked 0/1 relevance list (return 0.0 if `total_relevant` is 0). Then write `threshold_at_precision(y, p, target)`: the lowest score threshold t (predict positive when p >= t) whose precision is at least `target`, i.e. the one with the highest recall; return `None` if no threshold qualifies.",
  "starterCode": "def precision_at_k(rel, k):\n    pass\n\ndef recall_at_k(rel, k, total_relevant):\n    pass\n\ndef threshold_at_precision(y, p, target):\n    pass\n",
  "tests": "rel = [1, 0, 1, 1, 0]\nassert abs(precision_at_k(rel, 3) - 2 / 3) < 1e-12\nassert abs(recall_at_k(rel, 3, 4) - 0.5) < 1e-12\nassert abs(recall_at_k(rel, 5, 4) - 0.75) < 1e-12\nassert recall_at_k(rel, 3, 0) == 0.0\ny = [1, 1, 0, 1, 0, 0]\np = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4]\nassert threshold_at_precision(y, p, 0.7) == 0.6\nassert threshold_at_precision(y, p, 0.99) == 0.8\nassert threshold_at_precision(y, p, 1.1) is None",
  "solution": "def precision_at_k(rel, k):\n    return sum(rel[:k]) / k\n\ndef recall_at_k(rel, k, total_relevant):\n    return sum(rel[:k]) / total_relevant if total_relevant else 0.0\n\ndef threshold_at_precision(y, p, target):\n    best = None\n    for t in sorted(set(p), reverse=True):\n        sel = [yi for yi, pi in zip(y, p) if pi >= t]\n        if sum(sel) / len(sel) >= target:\n            best = t\n    return best",
  "hints": ["Sum of the first k relevance flags = number of relevant items in the top k.", "Try each distinct score as a threshold, from high to low; keep the last one that meets the target."]
}
```

> [!TIP] Interview tips
> - Draw the chain business metric → online metric (+ guardrails) → ML objective → offline metric.
> - Name the proxy gap explicitly (clicks vs satisfaction) and how you would mitigate it.
> - Pick metrics by imbalance and by what the user sees (Precision@k for a visible list, Recall@k for retrieval).
