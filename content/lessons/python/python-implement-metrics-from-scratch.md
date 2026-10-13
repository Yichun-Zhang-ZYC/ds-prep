---
id: python-implement-metrics-from-scratch
title: Implement metrics from scratch
estimatedMinutes: 20
difficulty: medium
tags: [metrics, precision, recall, numpy, coding]
---

## Why it matters
"Implement precision and recall without sklearn" is a common warm-up in DS and MLE coding rounds. It checks that you know the definitions and can write clean, vectorized code that handles edge cases.

## Concept
For binary labels (1 = positive):

| | Predicted 1 | Predicted 0 |
|---|---|---|
| **Actual 1** | TP | FN |
| **Actual 0** | FP | TN |

$$
\text{precision} = \frac{TP}{TP + FP} \qquad \text{recall} = \frac{TP}{TP + FN} \qquad F_1 = \frac{2PR}{P + R}
$$

Edge case: if the model predicts no positives, precision is $0/0$. sklearn returns 0 by default, and so should you, but say it out loud.

## Worked example

```python
import numpy as np

y_true = np.array([1, 0, 1, 1, 0])
y_pred = np.array([1, 1, 1, 0, 0])

tp = np.sum((y_true == 1) & (y_pred == 1))  # 2
fp = np.sum((y_true == 0) & (y_pred == 1))  # 1
fn = np.sum((y_true == 1) & (y_pred == 0))  # 1
print(tp / (tp + fp), tp / (tp + fn))       # 0.667 0.667
```

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A spam filter flags 10 emails; 8 are spam. There were 40 spam emails in total. What are precision and recall?",
  "options": ["Precision 0.8, recall 0.2", "Precision 0.2, recall 0.8", "Precision 0.8, recall 0.8", "Precision 0.25, recall 0.8"],
  "answer": 0,
  "explanation": "Precision = 8 / 10 flagged = 0.8. Recall = 8 / 40 actual spam = 0.2."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `precision_recall_f1(y_true, y_pred)` returning a tuple `(precision, recall, f1)`. Inputs are lists or arrays of 0/1. Return 0.0 for any metric whose denominator is 0.",
  "setup": "import numpy as np",
  "starterCode": "def precision_recall_f1(y_true, y_pred):\n    y_true = np.asarray(y_true)\n    y_pred = np.asarray(y_pred)\n    # your code here\n    return 0.0, 0.0, 0.0\n\nprint(precision_recall_f1([1, 0, 1, 1, 0], [1, 1, 1, 0, 0]))",
  "tests": "p, r, f = precision_recall_f1([1, 0, 1, 1, 0], [1, 1, 1, 0, 0])\nassert abs(p - 2/3) < 1e-9 and abs(r - 2/3) < 1e-9 and abs(f - 2/3) < 1e-9, (p, r, f)\np, r, f = precision_recall_f1([1, 1, 0], [0, 0, 0])\nassert (p, r, f) == (0.0, 0.0, 0.0), (p, r, f)\np, r, f = precision_recall_f1([1, 0, 0, 0], [1, 1, 0, 0])\nassert abs(p - 0.5) < 1e-9 and r == 1.0 and abs(f - 2/3) < 1e-9, (p, r, f)",
  "solution": "def precision_recall_f1(y_true, y_pred):\n    y_true = np.asarray(y_true)\n    y_pred = np.asarray(y_pred)\n    tp = int(np.sum((y_true == 1) & (y_pred == 1)))\n    fp = int(np.sum((y_true == 0) & (y_pred == 1)))\n    fn = int(np.sum((y_true == 1) & (y_pred == 0)))\n    precision = tp / (tp + fp) if tp + fp else 0.0\n    recall = tp / (tp + fn) if tp + fn else 0.0\n    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0\n    return precision, recall, f1",
  "packages": ["numpy"],
  "hints": ["Count TP, FP and FN with boolean masks.", "Guard each division with a conditional expression."]
}
```

> [!TIP] Interview tips
> - Clarify the label convention first ("is 1 the positive class?") and the zero-division behavior.
> - Vectorize with boolean masks rather than looping in Python; mention the O(n) complexity.
> - Common follow-up: "Extend it to multi-class." Explain macro vs micro averaging before coding.
