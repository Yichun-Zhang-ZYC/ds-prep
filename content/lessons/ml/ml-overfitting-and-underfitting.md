---
id: ml-overfitting-and-underfitting
title: Overfitting & underfitting
estimatedMinutes: 10
difficulty: easy
tags: [ml, fundamentals, generalization, learning-curves]
---

## Why it matters
Spotting and fixing overfitting is a daily ML task and a standard interview question. You'll be asked how you'd detect it, and what you'd do about it.

## Concept
- **Overfitting**: the model memorizes noise in the training data. Low training error, much higher validation error.
- **Underfitting**: the model is too simple or under-trained. Training and validation error are both high.

How to detect:
- Compare training and validation metrics.
- **Learning curves** (error vs training-set size): if the gap stays large and validation error keeps dropping with more data, more data will help (variance). If both curves plateau high and close together, more data won't help (bias).
- **Validation curves** (error vs a complexity hyperparameter, like tree depth): pick the minimum of validation error.

Fixes for overfitting: more data, data augmentation, regularization (L1/L2, dropout), simpler model, fewer features, early stopping, ensembling.

Fixes for underfitting: more expressive model, better features, less regularization, train longer.

## Worked example
A gradient-boosted model's validation AUC by number of trees:

| Trees | Train AUC | Val AUC |
|---|---|---|
| 50 | 0.82 | 0.80 |
| 200 | 0.90 | 0.85 |
| 1000 | 0.99 | 0.83 |

Validation AUC peaks around 200 trees, then falls while train AUC keeps rising: overfitting beyond ~200. Use early stopping on the validation set.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Train and validation error are both high and close together, and adding data doesn't help. What's going on?",
  "options": ["Overfitting", "Underfitting (high bias)", "Data leakage", "The test set is too small"],
  "answer": 1,
  "explanation": "When both curves plateau high together, the model lacks capacity or good features. More data won't fix bias."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `best_epoch(val_losses, patience)` implementing early stopping: walk through the list, track the best (lowest) loss so far, and stop once `patience` consecutive epochs fail to improve on it. Return the index of the best epoch seen up to the stopping point.",
  "starterCode": "def best_epoch(val_losses, patience):\n    pass\n\nprint(best_epoch([1.0, 0.8, 0.7, 0.72, 0.71, 0.73, 0.5], 3))",
  "tests": "assert best_epoch([1.0, 0.8, 0.7, 0.72, 0.71, 0.73, 0.5], 3) == 2\nassert best_epoch([1.0, 0.8, 0.7, 0.72, 0.71, 0.73, 0.5], 4) == 6\nassert best_epoch([0.5, 0.4, 0.3], 1) == 2\nassert best_epoch([0.3, 0.4, 0.5], 1) == 0",
  "solution": "def best_epoch(val_losses, patience):\n    best_i, best = 0, float('inf')\n    wait = 0\n    for i, loss in enumerate(val_losses):\n        if loss < best:\n            best, best_i, wait = loss, i, 0\n        else:\n            wait += 1\n            if wait >= patience:\n                break\n    return best_i",
  "hints": ["Reset the counter whenever you see a new best.", "With patience 3, epochs 3, 4, 5 fail to improve on 0.7, so you stop before reaching 0.5."]
}
```

> [!TIP] Interview tips
> - Always describe detection (train vs validation, learning curves) before fixes.
> - "Get more data" is a valid fix for overfitting only; say so explicitly.
> - Early stopping and regularization are the default first moves for boosted trees and neural nets.
