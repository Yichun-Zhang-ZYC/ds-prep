---
id: ml-practice-debugging-a-model
title: "Practice: Debugging an underperforming model"
estimatedMinutes: 12
difficulty: medium
tags: [ml, practice, debugging, evaluation]
---

## Why it matters
"Your model has 0.71 validation AUC and the target is 0.80. What do you do?" is a staple ML interview question. Strong candidates do not list random tricks; they run a **diagnostic playbook** that narrows the cause before changing anything. See Overfitting and underfitting and Bias-variance tradeoff for the theory; this lesson is the applied checklist.

## Concept
Debug in this order, cheapest checks first:

1. **Is the pipeline right?** Label definition, join fan-out, duplicated rows, wrong target window, train/serve feature skew. A bug beats any modeling fix.
2. **Is the evaluation right?** Split matches deployment (time- or group-based, not random on correlated rows); no leakage (see Data leakage); metric matches the business goal.
3. **Baseline and ceiling.** Compare with a trivial baseline (majority class, last value, simple logistic regression) and with a human or noise ceiling. A gap to baseline of only 1% may mean the signal is weak, not the model.
4. **Bias or variance?** Compare training error, validation error and target error:
   - Training error already above target means **high bias**: add capacity, better features, less regularization, train longer.
   - Low training error but a big train-validation gap means **high variance**: more data, regularization, simpler model, fewer features, bagging, early stopping.
5. **Learning curves.** Plot error vs training-set size. Validation error still falling and a large gap: more data helps. Both curves flat and close but above target: you need a richer model or new features, not more rows.
6. **Error analysis by slice.** Break errors down by segment (new vs old users, device, region, label noise, time). Fix the worst large slice; an average metric hides it.
7. **Optimization sanity.** Can the model overfit 100 rows? If not, suspect a bug (wrong loss, learning rate, unscaled inputs, label misalignment). Check for NaNs and constant predictions.

Change **one thing at a time** and keep a log; tune hyperparameters last, because they rarely fix a data or evaluation problem.

## Worked example
A churn model shows train AUC 0.98, validation AUC 0.71, production AUC 0.66 (illustrative numbers).

- The 0.27 gap points to **variance** or an evaluation flaw. The split was random over user-month rows, so the same user appears on both sides. Switching to a group split by user drops validation AUC to 0.68, now close to production: the earlier number was optimistic.
- Learning curve: validation AUC rises by under 0.005 when going from 50% to 100% of the data, so more rows will not help. Reducing max depth and adding L2 raises validation AUC to 0.72 and shrinks the gap.
- Slicing by tenure: users under 30 days have AUC 0.55 and are 40% of the volume. They lack history features. Adding onboarding-event features lifts that slice to 0.65 and the overall AUC to 0.76.

Notice the order: evaluation fix, then variance, then slice-specific features. A bigger model would have made the first problem worse.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Training error is 12% and validation error is 13%; the target is 5%. What is the best next step?",
  "options": [
    "Collect 10x more data",
    "Add regularization",
    "Increase model capacity or add better features",
    "Stop early to prevent overfitting"
  ],
  "answer": 2,
  "explanation": "Both errors are high and close together: high bias. More data or regularization will not help; the model needs more capacity or more informative features."
}
```

```quiz
{
  "id": "q2",
  "question": "A model has train AUC 0.99 and validation AUC 0.70 on a random split of per-visit rows, with many visits per user. What should you check first?",
  "options": [
    "Whether the same users appear in train and validation",
    "Whether to switch from ReLU to tanh",
    "Whether the learning rate is too small",
    "Whether to add more layers"
  ],
  "answer": 0,
  "explanation": "Correlated rows from one entity on both sides inflate the validation score and teach the model to memorize users. Fix the evaluation (group split) before touching the model."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `diagnose(train_err, val_err, target_err, tol=0.03)`. Return `\"high_bias\"` if `train_err - target_err > tol`; otherwise `\"high_variance\"` if `val_err - train_err > tol`; otherwise `\"ok\"`.",
  "starterCode": "def diagnose(train_err, val_err, target_err, tol=0.03):\n    pass\n\nprint(diagnose(0.15, 0.17, 0.05), diagnose(0.02, 0.12, 0.05))",
  "tests": "assert diagnose(0.15, 0.17, 0.05) == 'high_bias'\nassert diagnose(0.02, 0.12, 0.05) == 'high_variance'\nassert diagnose(0.04, 0.06, 0.05) == 'ok'\nassert diagnose(0.15, 0.30, 0.05) == 'high_bias'\nassert diagnose(0.08, 0.10, 0.05, tol=0.05) == 'ok'",
  "solution": "def diagnose(train_err, val_err, target_err, tol=0.03):\n    if train_err - target_err > tol:\n        return 'high_bias'\n    if val_err - train_err > tol:\n        return 'high_variance'\n    return 'ok'",
  "hints": [
    "Check bias first: a model that cannot fit the training set has a bias problem regardless of the gap.",
    "Use strict `>` comparisons against `tol`."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `worst_slice(rows, min_count)`. Each row is `(slice_name, y_true, y_pred)`. Return `(slice_name, error_rate, count)` for the slice with the highest error rate among slices with at least `min_count` rows. Break ties by larger count, then alphabetical name.",
  "starterCode": "def worst_slice(rows, min_count):\n    pass\n\nrows = [('new', 1, 0), ('new', 0, 0), ('old', 1, 1)]\nprint(worst_slice(rows, 1))",
  "tests": "rows = [('new', 1, 0), ('new', 0, 0), ('new', 1, 0), ('new', 0, 1), ('old', 1, 1), ('old', 0, 0), ('old', 1, 0), ('old', 0, 0), ('old', 1, 1), ('old', 0, 0), ('tiny', 1, 0)]\nassert worst_slice(rows, 3) == ('new', 0.75, 4)\nassert worst_slice(rows, 1) == ('tiny', 1.0, 1)\nr = worst_slice(rows, 5)\nassert r[0] == 'old' and abs(r[1] - 1 / 6) < 1e-12 and r[2] == 6\nassert worst_slice([('a', 1, 0), ('b', 1, 0)], 1) == ('a', 1.0, 1)",
  "solution": "def worst_slice(rows, min_count):\n    stats = {}\n    for s, yt, yp in rows:\n        n, e = stats.get(s, (0, 0))\n        stats[s] = (n + 1, e + (yt != yp))\n    cands = [(-e / n, -n, s, n, e / n) for s, (n, e) in stats.items() if n >= min_count]\n    best = min(cands)\n    return (best[2], best[4], best[3])",
  "hints": [
    "Accumulate (count, errors) per slice in a dict.",
    "Pick the best with `min` over a key like `(-error_rate, -count, name)`."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Write `verdict(train_err, val_err)` where both are lists of errors measured at increasing training-set sizes. Look only at the last point (and the one before it). Return `\"increase_capacity\"` if `train_err[-1] > 0.10`; else if `val_err[-1] - train_err[-1] > 0.05` return `\"more_data\"` when `val_err[-2] - val_err[-1] > 0.005`, otherwise `\"regularize\"`; else `\"ok\"`.",
  "starterCode": "def verdict(train_err, val_err):\n    pass\n\nprint(verdict([0.01, 0.02, 0.03], [0.30, 0.22, 0.18]))",
  "tests": "assert verdict([0.01, 0.02, 0.03], [0.30, 0.22, 0.18]) == 'more_data'\nassert verdict([0.01, 0.02, 0.03], [0.20, 0.181, 0.18]) == 'regularize'\nassert verdict([0.14, 0.15, 0.15], [0.20, 0.19, 0.19]) == 'increase_capacity'\nassert verdict([0.04, 0.05, 0.05], [0.09, 0.08, 0.08]) == 'ok'\nassert verdict([0.01, 0.03], [0.30, 0.20]) == 'more_data'",
  "solution": "def verdict(train_err, val_err):\n    if train_err[-1] > 0.10:\n        return 'increase_capacity'\n    if val_err[-1] - train_err[-1] > 0.05:\n        return 'more_data' if val_err[-2] - val_err[-1] > 0.005 else 'regularize'\n    return 'ok'",
  "hints": [
    "Test the conditions in the stated order.",
    "The improvement is `val_err[-2] - val_err[-1]` (positive when the validation error is still falling)."
  ]
}
```

> [!TIP] Interview tips
> - Say the order out loud: data and labels, evaluation, baseline, bias vs variance, learning curves, slices, then tuning.
> - Quantify with the train-validation-target triple; "it overfits" without numbers is weak.
> - Always mention checking that offline and online distributions match before trusting any offline gain.
