---
id: ml-system-design-model-selection-and-baseline
title: Model selection & baseline
estimatedMinutes: 10
difficulty: medium
tags: [ml-system-design, framework, modeling, baselines]
---

## Why it matters
Interviewers want a defensible modeling path, not a favourite algorithm: start simple, justify each step up in complexity, and know what the baseline is. "Always beat a strong baseline first" is a hallmark of senior ML engineers.

## Concept
**Baseline ladder** (climb only while the gain pays for the complexity):
1. **No-ML / heuristic**: majority class, global mean, "most popular", last value, rules. Gives the floor and the business bar.
2. **Linear / logistic regression** with good features: fast, interpretable, strong on sparse data, easy to debug.
3. **Gradient-boosted trees** (XGBoost, LightGBM): usually the best on tabular data with little tuning.
4. **Deep models**: for unstructured inputs (text, image, audio), huge ID spaces (embeddings, two-tower), sequences, or multi-task learning. Pretrained/foundation models and fine-tuning when labels are scarce.

**Choose by constraints**: data size and type, latency and cost per prediction, interpretability or regulation, training and retraining cadence, team skills, cold-start behaviour, and how hard it is to maintain.

**Multi-stage systems** for large catalogs: cheap **retrieval/candidate generation** (two-tower + ANN, popularity, co-visitation) narrows millions to hundreds, then a heavier **ranker** scores them, then **re-ranking** applies business rules and diversity. Each stage trades recall for cost.

**Baseline hygiene**: compare on the *same* split and metric; report lift over baseline, not absolute numbers; compare against the current production system, not only a toy baseline. For imbalanced data, accuracy of the majority baseline is meaningless: use lift or PR-AUC against the base rate.

Mention ensembling, distillation (train a small student from a large teacher) and the build-vs-buy / API option for LLM-style tasks, but keep the first version simple enough to ship.

## Worked example
Churn: 10,000 users, 5% churn rate, so 500 churners.
- Majority-class baseline: always predict "stays" gives accuracy 95%, recall 0. Useless as a bar.
- Random targeting of the top decile (1,000 users) finds $0.05 \times 1{,}000 = 50$ churners.
- A gradient-boosted model's top decile contains 300 churners: precision 0.30, recall $300/500 = 0.6$, **lift = 300/50 = 6**.
- A logistic regression gets 240 churners in its top decile (lift 4.8). The GBDT adds 60 churners per decile; if each is worth \$50 that is +\$3,000 per campaign. Ship it if that beats its extra serving and maintenance cost; otherwise ship the logistic model.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A binary task has a 2% positive rate. A model reports 98% accuracy. What is the best interpretation?",
  "options": ["It is excellent", "It matches the majority-class baseline; compare with PR-AUC or lift over the base rate", "It is overfit", "Accuracy cannot be computed"],
  "answer": 1,
  "explanation": "Predicting all negatives already gives 98% accuracy, so accuracy shows nothing without a baseline."
}
```

```quiz
{
  "id": "q2",
  "question": "Why use a two-stage (retrieve then rank) architecture for a catalog of 50 million items?",
  "options": ["Ranking models cannot use item features", "Scoring every item with a heavy model within the latency budget is infeasible; a cheap retrieval step narrows candidates first", "It removes the need for evaluation", "It improves calibration"],
  "answer": 1,
  "explanation": "Retrieval maximises recall cheaply over millions; the expensive ranker only scores a few hundred."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `majority_accuracy(y)` for a 0/1 list. Write `lift_at_fraction(y, scores, frac)`: take the top `frac` of items by score (k = round(frac × n), at least 1) and return (positive rate in the top k) / (overall positive rate). Write `popularity_baseline(interactions, k)`: the k most frequent items in a list of item ids, ties broken by item id ascending.",
  "starterCode": "def majority_accuracy(y):\n    pass\n\ndef lift_at_fraction(y, scores, frac):\n    pass\n\ndef popularity_baseline(interactions, k):\n    pass\n",
  "tests": "assert majority_accuracy([0] * 95 + [1] * 5) == 0.95\nassert majority_accuracy([1, 1, 0]) == 2 / 3\ny = [1, 1, 0, 0, 1, 0, 0, 0, 0, 0]\ns = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.0]\nassert abs(lift_at_fraction(y, s, 0.2) - 1 / 0.3) < 1e-12\nassert abs(lift_at_fraction(y, s, 0.5) - (3 / 5) / 0.3) < 1e-12\nassert popularity_baseline(['b', 'a', 'b', 'c', 'a', 'b'], 2) == ['b', 'a']\nassert popularity_baseline(['y', 'x'], 5) == ['x', 'y']",
  "solution": "def majority_accuracy(y):\n    return max(y.count(0), y.count(1)) / len(y)\n\ndef lift_at_fraction(y, scores, frac):\n    order = sorted(range(len(y)), key=lambda i: -scores[i])\n    k = max(1, int(round(frac * len(y))))\n    top = sum(y[i] for i in order[:k]) / k\n    return top / (sum(y) / len(y))\n\ndef popularity_baseline(interactions, k):\n    counts = {}\n    for it in interactions:\n        counts[it] = counts.get(it, 0) + 1\n    ranked = sorted(counts, key=lambda it: (-counts[it], it))\n    return ranked[:k]",
  "hints": ["Sort indices by descending score, then count positives among the first k.", "Sort by (-count, item) so ties resolve alphabetically."]
}
```

> [!TIP] Interview tips
> - Always state the baseline first (heuristic, then logistic, then GBDT) and say what result would justify going deeper.
> - Tie model choice to constraints: data type and size, latency, interpretability, cold start, maintenance.
> - For large catalogs, describe retrieval then ranking then re-ranking, and what each stage optimises.
