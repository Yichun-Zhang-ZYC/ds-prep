---
id: ml-roc-auc-vs-pr-auc
title: ROC-AUC vs PR-AUC
estimatedMinutes: 12
difficulty: medium
tags: [ml, evaluation, classification, imbalanced-data]
---

## Why it matters
"When would you use PR-AUC instead of ROC-AUC?" is a classic question, especially for fraud, ads and medical problems with rare positives. You should also be able to explain what AUC means in plain words.

## Concept
Both summarize performance across **all thresholds**.

**ROC curve**: TPR (recall) vs FPR as the threshold varies. **ROC-AUC** = area under it.
- Interpretation: the probability that a randomly chosen positive gets a higher score than a randomly chosen negative.
- 0.5 = random, 1.0 = perfect ranking.
- **Insensitive to class balance**: FPR is computed only over negatives, so with millions of negatives, a big increase in false positives barely moves FPR.

**PR curve**: precision vs recall. **PR-AUC** (≈ **average precision**) = area under it.
- Baseline = positive rate (e.g. 0.01 for 1% fraud), not 0.5.
- Focuses on the positive class and on false positives relative to true positives, which is exactly what matters when positives are rare.

Rule of thumb: balanced classes, or you care about both classes equally → ROC-AUC. Rare positives and you act on flagged items → PR-AUC (plus precision@k at the operating point).

Both are **ranking** metrics: they ignore calibration and the specific threshold you'll deploy. Report the metric at your operating point too.

## Worked example
Fraud rate 0.5%. Model A: ROC-AUC 0.95, PR-AUC 0.30. Model B: ROC-AUC 0.96, PR-AUC 0.18. ROC says they're about equal; PR-AUC shows A's top-scored alerts are far cleaner. Investigators review the top alerts, so A is the better model.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What does ROC-AUC = 0.8 mean?",
  "options": ["80% accuracy", "80% of predictions are positive", "A random positive is ranked above a random negative 80% of the time", "Precision is 0.8"],
  "answer": 2,
  "explanation": "ROC-AUC equals the probability of correctly ordering a random positive/negative pair."
}
```

```quiz
{
  "id": "q2",
  "question": "With 0.1% positives, what PR-AUC does a random classifier get?",
  "options": ["0.5", "About 0.001", "0", "1.0"],
  "answer": 1,
  "explanation": "A random classifier's precision equals the positive rate at every recall."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `roc_auc(y, scores)` using the pairwise definition: the fraction of (positive, negative) pairs where the positive scores higher, counting ties as 0.5. Then write `average_precision(y, scores)`: sort by score descending and average the precision at the position of each positive.",
  "starterCode": "def roc_auc(y, scores):\n    pass\n\ndef average_precision(y, scores):\n    pass\n\ny = [1, 0, 1, 0, 0, 1]\ns = [0.9, 0.8, 0.7, 0.3, 0.2, 0.1]\nprint(roc_auc(y, s), average_precision(y, s))",
  "tests": "y = [1, 0, 1, 0, 0, 1]\ns = [0.9, 0.8, 0.7, 0.3, 0.2, 0.1]\nassert abs(roc_auc(y, s) - 5 / 9) < 1e-12\nassert abs(average_precision(y, s) - (1 + 2 / 3 + 3 / 6) / 3) < 1e-12\nassert roc_auc([1, 0], [0.5, 0.5]) == 0.5\nassert roc_auc([1, 1, 0], [0.9, 0.8, 0.1]) == 1.0\nassert average_precision([1, 1, 0], [0.9, 0.8, 0.1]) == 1.0",
  "solution": "def roc_auc(y, scores):\n    pos = [s for t, s in zip(y, scores) if t == 1]\n    neg = [s for t, s in zip(y, scores) if t == 0]\n    total = 0.0\n    for p in pos:\n        for n in neg:\n            total += 1.0 if p > n else 0.5 if p == n else 0.0\n    return total / (len(pos) * len(neg))\n\ndef average_precision(y, scores):\n    order = sorted(range(len(y)), key=lambda i: -scores[i])\n    hits, precs = 0, []\n    for rank, i in enumerate(order, start=1):\n        if y[i] == 1:\n            hits += 1\n            precs.append(hits / rank)\n    return sum(precs) / len(precs)",
  "hints": ["ROC-AUC: compare every positive with every negative.", "AP: precision at each positive's rank, then average."]
}
```

> [!TIP] Interview tips
> - Explain ROC-AUC as "probability a positive outranks a negative".
> - Say why ROC looks optimistic under heavy imbalance (huge TN count keeps FPR small) and switch to PR-AUC.
> - Remind them both are threshold-free ranking metrics; still choose and report an operating threshold.
