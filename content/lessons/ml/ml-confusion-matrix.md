---
id: ml-confusion-matrix
title: Confusion matrix
estimatedMinutes: 8
difficulty: easy
tags: [ml, evaluation, classification]
---

## Why it matters
Every classification metric is built from the confusion matrix. Interviewers often hand you one and ask you to compute metrics, or to explain which errors the model makes and what they cost the business.

## Concept
For binary classification (rows = actual, columns = predicted):

| | Predicted positive | Predicted negative |
|---|---|---|
| **Actual positive** | TP (true positive) | FN (false negative, Type II error) |
| **Actual negative** | FP (false positive, Type I error) | TN (true negative) |

Derived rates:
- Recall / TPR / sensitivity $= TP/(TP + FN)$
- Specificity / TNR $= TN/(TN + FP)$
- FPR $= FP/(FP + TN) = 1 -$ specificity
- Precision / PPV $= TP/(TP + FP)$; NPV $= TN/(TN + FN)$

For $K$ classes, it's a $K \times K$ matrix: the diagonal holds correct predictions, and off-diagonal cells show **which classes get confused** (e.g. "3" vs "8" in digit recognition), which guides data collection and feature work.

Attach **costs** to each cell to evaluate business impact: expected cost $= c_{FP}\cdot FP + c_{FN}\cdot FN$. Normalizing rows (by actual class) shows per-class recall; normalizing columns shows per-class precision.

## Worked example
Churn model on 1,000 users: TP = 80, FN = 20, FP = 120, TN = 780. Recall = 0.80, precision = 80/200 = 0.40, FPR = 120/900 ≈ 0.13. If a retention offer costs \$10 and saving a churner is worth \$100 (assuming every targeted churner is saved), net value = 80·100 − 200·10 = \$6,000, so the model is worth using despite 40% precision.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A model labels a legitimate transaction as fraud. Which cell is that?",
  "options": ["True positive", "False positive", "False negative", "True negative"],
  "answer": 1,
  "explanation": "Predicted positive (fraud), actually negative (legit): a false positive."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `confusion_matrix(y_true, y_pred, labels)` returning a list of lists where `M[i][j]` counts rows with actual `labels[i]` and predicted `labels[j]`. Then write `expected_cost(M, cost)` where `cost[i][j]` is the cost of predicting `labels[j]` when the truth is `labels[i]`; return the total cost.",
  "starterCode": "def confusion_matrix(y_true, y_pred, labels):\n    pass\n\ndef expected_cost(M, cost):\n    pass\n\nM = confusion_matrix([1, 1, 0, 0, 1], [1, 0, 0, 1, 1], [1, 0])\nprint(M, expected_cost(M, [[0, 100], [10, 0]]))",
  "tests": "M = confusion_matrix([1, 1, 0, 0, 1], [1, 0, 0, 1, 1], [1, 0])\nassert M == [[2, 1], [1, 1]]\nassert expected_cost(M, [[0, 100], [10, 0]]) == 110\nM3 = confusion_matrix(['a', 'b', 'c', 'a'], ['a', 'c', 'c', 'b'], ['a', 'b', 'c'])\nassert M3 == [[1, 1, 0], [0, 0, 1], [0, 0, 1]]",
  "solution": "def confusion_matrix(y_true, y_pred, labels):\n    idx = {l: i for i, l in enumerate(labels)}\n    M = [[0] * len(labels) for _ in labels]\n    for t, p in zip(y_true, y_pred):\n        M[idx[t]][idx[p]] += 1\n    return M\n\ndef expected_cost(M, cost):\n    return sum(M[i][j] * cost[i][j] for i in range(len(M)) for j in range(len(M)))",
  "hints": ["Map each label to its row/column index.", "Total cost = Σ count × cost over all cells."]
}
```

> [!TIP] Interview tips
> - Draw the 2×2 grid and label TP/FP/FN/TN before computing anything; it prevents mix-ups.
> - Translate cells into business costs; it turns metrics into a decision.
> - For multiclass, point out which classes are confused and what you'd do about it.
