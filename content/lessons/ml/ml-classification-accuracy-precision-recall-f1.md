---
id: ml-classification-accuracy-precision-recall-f1
title: "Classification: accuracy, precision, recall, F1"
estimatedMinutes: 12
difficulty: easy
tags: [ml, evaluation, classification, metrics]
---

## Why it matters
"Which metric would you use for fraud / spam / cancer screening?" is one of the most frequent ML interview questions. The answer depends on class balance and on the cost of false positives vs false negatives.

## Concept
From the confusion-matrix counts TP, FP, FN, TN:

$$
\text{Accuracy} = \frac{TP + TN}{TP + FP + FN + TN} \qquad \text{Precision} = \frac{TP}{TP + FP} \qquad \text{Recall} = \frac{TP}{TP + FN}
$$

$$
F_1 = \frac{2 \cdot \text{Precision} \cdot \text{Recall}}{\text{Precision} + \text{Recall}} \qquad F_\beta = (1 + \beta^2)\frac{P \cdot R}{\beta^2 P + R}
$$

- **Precision**: of the items flagged, how many were right? Matters when false positives are costly (spam filter hiding real email, blocking good customers).
- **Recall** (sensitivity, TPR): of the real positives, how many did we catch? Matters when misses are costly (cancer screening, fraud).
- **F1** is the harmonic mean: high only when both are high. $F_\beta$ with $\beta > 1$ favors recall.
- **Accuracy** misleads under imbalance: with 1% positives, predicting "all negative" scores 99%.
- **Specificity** (TNR) $= TN/(TN + FP)$.

Multiclass averaging: **macro** (average per-class scores; every class counts equally), **micro** (pool counts; dominated by large classes; equals accuracy for single-label problems), **weighted** (by class support).

All of these depend on the **decision threshold**; changing it trades precision for recall.

## Worked example
1,000 transactions, 20 fraud. Model flags 30: 15 fraud (TP), 15 legit (FP); misses 5 fraud (FN). Precision = 15/30 = 0.50, recall = 15/20 = 0.75, F1 = 2·0.5·0.75/1.25 = 0.60. Accuracy = (15 + 965)/1000 = 0.98, barely above the 0.98 of flagging nothing.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "For an initial cancer screening test, which metric matters most?",
  "options": ["Precision", "Recall", "Accuracy", "Specificity"],
  "answer": 1,
  "explanation": "Missing a cancer (false negative) is far worse than an extra follow-up test, so you want high recall."
}
```

```quiz
{
  "id": "q2",
  "question": "Precision = 0.9 and recall = 0.1. What is F1?",
  "options": ["0.18", "0.50", "0.90", "0.10"],
  "answer": 0,
  "explanation": "2·0.9·0.1 / (0.9 + 0.1) = 0.18. The harmonic mean punishes the imbalance."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `binary_metrics(y_true, y_pred)` returning a dict with `'accuracy'`, `'precision'`, `'recall'`, `'f1'` (use 0.0 when a denominator is 0). Then write `macro_f1(y_true, y_pred)` for multiclass labels: the average of per-class F1, treating each class as positive in turn.",
  "starterCode": "def binary_metrics(y_true, y_pred):\n    pass\n\ndef macro_f1(y_true, y_pred):\n    pass\n\nprint(binary_metrics([1, 1, 0, 0, 1, 0], [1, 0, 0, 1, 1, 0]))\nprint(macro_f1(['a', 'b', 'c', 'a'], ['a', 'b', 'a', 'a']))",
  "tests": "m = binary_metrics([1, 1, 0, 0, 1, 0], [1, 0, 0, 1, 1, 0])\nassert abs(m['accuracy'] - 4 / 6) < 1e-12\nassert abs(m['precision'] - 2 / 3) < 1e-12 and abs(m['recall'] - 2 / 3) < 1e-12\nassert abs(m['f1'] - 2 / 3) < 1e-12\nz = binary_metrics([1, 0], [0, 0])\nassert z['precision'] == 0.0 and z['f1'] == 0.0\nmf = macro_f1(['a', 'b', 'c', 'a'], ['a', 'b', 'a', 'a'])\nassert abs(mf - (0.8 + 1.0 + 0.0) / 3) < 1e-12",
  "solution": "def _f1(p, r):\n    return 2 * p * r / (p + r) if p + r else 0.0\n\ndef binary_metrics(y_true, y_pred):\n    tp = sum(1 for t, p in zip(y_true, y_pred) if t == 1 and p == 1)\n    fp = sum(1 for t, p in zip(y_true, y_pred) if t == 0 and p == 1)\n    fn = sum(1 for t, p in zip(y_true, y_pred) if t == 1 and p == 0)\n    acc = sum(1 for t, p in zip(y_true, y_pred) if t == p) / len(y_true)\n    prec = tp / (tp + fp) if tp + fp else 0.0\n    rec = tp / (tp + fn) if tp + fn else 0.0\n    return {'accuracy': acc, 'precision': prec, 'recall': rec, 'f1': _f1(prec, rec)}\n\ndef macro_f1(y_true, y_pred):\n    classes = sorted(set(y_true) | set(y_pred))\n    scores = []\n    for c in classes:\n        m = binary_metrics([1 if t == c else 0 for t in y_true], [1 if p == c else 0 for p in y_pred])\n        scores.append(m['f1'])\n    return sum(scores) / len(scores)",
  "hints": ["Count TP, FP, FN directly from pairs.", "For macro F1, binarize labels one class at a time."]
}
```

> [!TIP] Interview tips
> - Always ask "what's the cost of a false positive vs a false negative?" before picking a metric.
> - Call out accuracy's failure under imbalance with a concrete number.
> - Mention that precision/recall depend on the threshold, then point to PR curves and threshold selection.
