---
id: deep-learning-early-stopping
title: Early stopping
estimatedMinutes: 8
difficulty: easy
tags: [deep-learning, regularization, training]
---

## Why it matters
Early stopping is the cheapest regularizer and a staple of training-loop questions: what to monitor, how patience works, and why the test set must stay untouched.

## Concept
Training loss keeps falling, but **validation loss falls, bottoms out, then rises** as the model starts to memorize. Early stopping halts training near that minimum and **restores the best checkpoint**.

**Algorithm**: after each epoch, evaluate on the validation set. If the monitored metric improves by more than `min_delta`, save the weights and reset a counter; otherwise increment it. Stop when the counter reaches `patience`.

- **Monitor** validation loss (smooth, differentiable) or a task metric such as AUC. Never the test set, or you leak information. Use a separate validation split.
- **Patience** trades off noise tolerance against wasted compute: too small stops on a noisy plateau, too large wastes time. Typical: 3 to 10 epochs, more with a low learning rate.
- **Interaction with LR schedules**: with ReduceLROnPlateau, patience of early stopping should be larger than the scheduler's patience, so the LR drop gets a chance to help. Cosine schedules usually run to the end instead.
- **Why it regularizes**: weights start small and grow during training, so stopping early limits effective model capacity. For linear models with gradient descent it behaves similarly to L2 regularization.
- **Caveats**: the validation set is reused for the stopping decision, so its score is slightly optimistic (report on the test set). It couples model selection with training and can hide double-descent behaviour, and with very noisy validation sets it can stop too soon. Large LLM pre-training doesn't use it because it runs a fixed token budget.

## Worked example
Validation losses per epoch (0-indexed): $0.90,\ 0.70,\ 0.60,\ 0.62,\ 0.61,\ 0.63,\ 0.55$, with patience 3.

- Epoch 2 (0.60) is the best so far, so the counter resets at 0.
- Epoch 3: 0.62 is worse, counter 1. Epoch 4: 0.61 is worse than 0.60, counter 2. Epoch 5: 0.63, counter 3, so **stop at epoch 5** and restore epoch 2.

Epoch 6 would have reached 0.55, so patience 3 missed a better model. Patience 4 would have kept training, which shows the noise-versus-cost trade-off. Note the weights restored are those of epoch 2, not epoch 5.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which dataset should early stopping monitor?",
  "options": [
    "The training set",
    "The test set",
    "Any of them, they are equivalent",
    "A held-out validation set"
  ],
  "answer": 3,
  "explanation": "Training loss keeps falling, and monitoring the test set leaks it into model selection. Use a validation split."
}
```

```quiz
{
  "id": "q2",
  "question": "Training stops after `patience` epochs without improvement. Which weights should you keep?",
  "options": [
    "The weights from the final epoch",
    "The weights from the best validation epoch",
    "The average of all epochs",
    "The weights from epoch 0"
  ],
  "answer": 1,
  "explanation": "By the time the counter triggers, the model has already degraded for `patience` epochs. Restore the best checkpoint."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `early_stopping(val_losses, patience, min_delta=0.0)` that scans the losses epoch by epoch. An epoch is an improvement if `loss < best - min_delta` (the first epoch always counts). On improvement record it as the best epoch and reset the counter, otherwise increment the counter. Stop at the first epoch where the counter reaches `patience`. Return `(best_epoch, stop_epoch)`; if it never triggers, `stop_epoch` is the last epoch index.",
  "starterCode": "def early_stopping(val_losses, patience, min_delta=0.0):\n    pass\n\nlosses = [0.9, 0.7, 0.6, 0.62, 0.61, 0.63, 0.55]\nprint(early_stopping(losses, 3), early_stopping(losses, 4))",
  "tests": "losses = [0.9, 0.7, 0.6, 0.62, 0.61, 0.63, 0.55]\nassert early_stopping(losses, 3) == (2, 5)\nassert early_stopping(losses, 4) == (6, 6)\nassert early_stopping([1.0, 0.995, 0.99], 1, 0.01) == (0, 1)\nassert early_stopping([1.0, 0.995, 0.99], 5) == (2, 2)\nassert early_stopping([0.5], 2) == (0, 0)",
  "solution": "def early_stopping(val_losses, patience, min_delta=0.0):\n    best = float('inf')\n    best_epoch = 0\n    counter = 0\n    for epoch, loss in enumerate(val_losses):\n        if loss < best - min_delta:\n            best = loss\n            best_epoch = epoch\n            counter = 0\n        else:\n            counter += 1\n            if counter >= patience:\n                return best_epoch, epoch\n    return best_epoch, len(val_losses) - 1",
  "hints": [
    "Start with best = infinity so epoch 0 is always an improvement.",
    "Check the counter right after incrementing it and return immediately."
  ]
}
```

> [!TIP] Interview tips
> - Say 'restore best weights', not just 'stop': the final epoch's weights are already past the best.
> - Monitor a held-out validation set, never the test set.
> - Discuss patience and min_delta as noise filters, and mention it acts as implicit regularization.
