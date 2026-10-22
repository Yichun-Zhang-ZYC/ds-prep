---
id: ml-practice-choosing-metrics-by-business-case
title: "Practice: Choosing metrics by business case"
estimatedMinutes: 12
difficulty: medium
tags: [ml, practice, metrics, business]
---

## Why it matters
"Which metric would you use?" has no universal answer; interviewers want to see you derive it from the **decision** the model supports, its **costs**, the **base rate** and any **capacity limits**. This lesson is a playbook plus a worked cost calculation. For metric definitions see Classification metrics, ROC-AUC vs PR-AUC, Ranking metrics and Regression metrics.

## Concept
Ask five questions, in order:

1. **What decision does the score drive?** Block/allow, rank a list, set a price, forecast a quantity? This picks the metric family (classification, ranking, probabilistic, regression).
2. **What do errors cost?** If a false negative costs $c_{FN}$ and a flag costs $c_{R}$ (review), minimize expected cost, not accuracy. If costs are unknown, ask for a rough ratio.
3. **What is the base rate?** At 0.5% positives, accuracy and ROC-AUC look flattering; use precision, recall, PR-AUC.
4. **Is there a capacity limit?** If analysts review 200 cases a day, the metric is **precision@k / recall@k / lift** at $k = 200$, not performance at an arbitrary threshold.
5. **Do you need probabilities?** For bidding, pricing or combining models, evaluate calibration with log loss or Brier, not just ranking.

Typical mappings (illustrative):

| Case | Primary metric | Why |
|---|---|---|
| Fraud / abuse | Expected cost, recall at fixed precision, PR-AUC | Rare positives, asymmetric cost |
| Cancer screening | Recall (sensitivity) with a specificity floor | A miss is far worse than a follow-up test |
| Spam filter | Precision (or FPR) at high recall | Losing real email is costly |
| Search / recommendations | NDCG@k, MRR, recall@k | Only top positions matter |
| Retention campaign with a budget | Lift or precision@k, plus uplift if causal | Capacity-limited; treat persuadables |
| Demand forecasting | MAE / WAPE; quantile loss when under- and over-stock costs differ | MAPE blows up near zero |
| Ad click bidding | Log loss, calibration | The probability is multiplied by a value |

Always add **guardrail metrics** (latency, fairness slices, complaint rate) and check the offline metric correlates with the online business metric.

## Worked example
A bank scores 100,000 transactions a day; 0.5% (500) are fraud. Each flagged transaction costs \$5 to review; a missed fraud costs \$120 (illustrative).

- No model: 500 × \$120 = \$60,000.
- Model A at a strict threshold flags 800 and catches 400 frauds: FN = 100. Cost = 800 × \$5 + 100 × \$120 = \$4,000 + \$12,000 = \$16,000. Precision 50%, recall 80%.
- Model B at a looser threshold flags 1,500 and catches 460: FN = 40. Cost = 1,500 × \$5 + 40 × \$120 = \$7,500 + \$4,800 = \$12,300. Precision 31%, recall 92%.

B has worse precision yet is \$3,700 a day cheaper. The break-even is where the marginal flag's fraud probability equals $c_R / c_{FN} = 5/120 \approx 4.2\%$: flag anything riskier than that. Reporting "precision" or "accuracy" alone would have picked the wrong model.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Perishable-goods demand forecasting: under-forecasting costs 4x as much per unit as over-forecasting. Which target quantile minimizes expected cost?",
  "options": [
    "0.5 (the median)",
    "0.8",
    "0.2",
    "The mean"
  ],
  "answer": 1,
  "explanation": "The optimal quantile is c_under / (c_under + c_over) = 4 / 5 = 0.8, so forecast high on purpose."
}
```

```quiz
{
  "id": "q2",
  "question": "Fraud analysts can review only 200 cases per day. Which evaluation is most aligned with that constraint?",
  "options": [
    "Accuracy at threshold 0.5",
    "ROC-AUC",
    "Precision@200 and recall@200",
    "Log loss"
  ],
  "answer": 2,
  "explanation": "With a fixed review budget the decision is 'take the top 200'. Precision and recall at k measure exactly that; the others do not reflect the capacity limit."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `total_cost(y, pred, review_cost, miss_cost)` for 0/1 lists: every flagged item (`pred == 1`) costs `review_cost`, every missed positive (`y == 1`, `pred == 0`) costs `miss_cost`. Return the total.",
  "starterCode": "def total_cost(y, pred, review_cost, miss_cost):\n    pass\n\nprint(total_cost([1, 0, 1, 0], [1, 1, 0, 0], 5, 120))",
  "tests": "assert total_cost([1, 0, 1, 0], [1, 1, 0, 0], 5, 120) == 130\nassert total_cost([1, 1], [0, 0], 5, 120) == 240\nassert total_cost([0, 0, 0], [1, 1, 1], 2, 50) == 6\nassert total_cost([], [], 1, 1) == 0\nassert abs(total_cost([1, 0], [0, 0], 1, 1.5) - 1.5) < 1e-12",
  "solution": "def total_cost(y, pred, review_cost, miss_cost):\n    flagged = sum(pred)\n    missed = sum(1 for yi, pi in zip(y, pred) if yi == 1 and pi == 0)\n    return flagged * review_cost + missed * miss_cost",
  "hints": [
    "Flagged count is `sum(pred)`; reviews are paid for true and false positives alike.",
    "Count misses where `y == 1` and `pred == 0`."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `best_threshold(y, scores, review_cost, miss_cost)`. Candidate thresholds are the unique values in `scores`; an item is flagged when `score >= t`. Return `(t, cost)` with the lowest total cost; break ties toward the higher threshold.",
  "starterCode": "def best_threshold(y, scores, review_cost, miss_cost):\n    pass\n\nprint(best_threshold([1, 0, 1, 0, 0, 1], [0.9, 0.8, 0.7, 0.4, 0.3, 0.2], 1, 5))",
  "tests": "y = [1, 0, 1, 0, 0, 1]\ns = [0.9, 0.8, 0.7, 0.4, 0.3, 0.2]\nt, c = best_threshold(y, s, 1, 5)\nassert t == 0.2 and abs(c - 6) < 1e-12\nt, c = best_threshold(y, s, 1, 1.5)\nassert t == 0.9 and abs(c - 4) < 1e-12\nt, c = best_threshold([0, 0], [0.5, 0.5], 1, 1)\nassert t == 0.5 and c == 2",
  "solution": "def best_threshold(y, scores, review_cost, miss_cost):\n    best = None\n    for t in sorted(set(scores), reverse=True):\n        flagged = sum(1 for s in scores if s >= t)\n        missed = sum(1 for yi, s in zip(y, scores) if yi == 1 and s < t)\n        cost = flagged * review_cost + missed * miss_cost\n        if best is None or cost < best[1] - 1e-12:\n            best = (t, cost)\n    return best",
  "hints": [
    "Loop over thresholds from high to low and only replace the best when the cost is strictly lower; that gives the higher threshold on ties.",
    "Cost at threshold t = flagged × review_cost + missed positives × miss_cost."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Write `top_k_report(y, scores, k)` returning `(precision, recall, lift)` for the k highest scores. Sort by score descending with ties kept in original order. Lift is precision divided by the overall positive rate.",
  "starterCode": "def top_k_report(y, scores, k):\n    pass\n\nprint(top_k_report([1, 0, 1, 0, 0, 1, 0, 0, 0, 0], [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.05], 3))",
  "tests": "y = [1, 0, 1, 0, 0, 1, 0, 0, 0, 0]\ns = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.05]\np, r, l = top_k_report(y, s, 3)\nassert abs(p - 2 / 3) < 1e-12 and abs(r - 2 / 3) < 1e-12 and abs(l - (2 / 3) / 0.3) < 1e-12\np, r, l = top_k_report(y, s, 1)\nassert p == 1.0 and abs(r - 1 / 3) < 1e-12 and abs(l - 1 / 0.3) < 1e-12\np, r, l = top_k_report(y, s, 10)\nassert abs(p - 0.3) < 1e-12 and r == 1.0 and abs(l - 1.0) < 1e-12",
  "solution": "def top_k_report(y, scores, k):\n    order = sorted(range(len(y)), key=lambda i: -scores[i])[:k]\n    tp = sum(y[i] for i in order)\n    precision = tp / k\n    recall = tp / sum(y)\n    lift = precision / (sum(y) / len(y))\n    return precision, recall, lift",
  "hints": [
    "Python's `sorted` is stable, so sorting indices by `-score` keeps ties in original order.",
    "Lift = precision@k / (positives / n)."
  ]
}
```

> [!TIP] Interview tips
> - Start with "what decision does this drive and what do errors cost?" before naming any metric.
> - Give the break-even rule: flag when $p > c_R/c_{FN}$ (more generally the threshold is a cost ratio).
> - Mention a primary metric, a guardrail, and how you would validate the offline-online link with an A/B test.
