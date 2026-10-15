---
id: ml-cross-validation
title: Cross-validation (k-fold, stratified, time-series split)
estimatedMinutes: 12
difficulty: medium
tags: [ml, fundamentals, evaluation, model-selection]
---

## Why it matters
Cross-validation (CV) is how you choose models and hyperparameters when data is limited. Interviewers test whether you know the variants and when a naive k-fold gives misleading scores.

## Concept
**k-fold CV**: split the data into $k$ folds. For each fold, train on the other $k-1$ and evaluate on it. Report the mean (and standard deviation) of the $k$ scores. Every row is used for validation exactly once. Common $k$: 5 or 10.

Variants:
- **Stratified k-fold**: each fold keeps the class proportions. Use for classification, especially with imbalance.
- **Group k-fold**: all rows of a group (user, patient) stay in the same fold, so the model is never validated on groups it trained on.
- **Time-series split (forward chaining)**: fold 1 trains on $[1..t_1]$ and validates on $(t_1..t_2]$; fold 2 trains on $[1..t_2]$, and so on. Never train on the future.
- **Leave-one-out (LOO)**: $k = n$. Nearly unbiased, high variance and expensive; mostly for tiny datasets.
- **Nested CV**: an inner CV loop tunes hyperparameters and an outer loop estimates performance of the whole tuning procedure. Avoids optimistic estimates when you tune heavily.

All preprocessing that learns from data (scaling, imputation, target encoding, feature selection) must be fit **inside** each training fold, typically with a pipeline. Fitting it on the full dataset first leaks validation information.

## Worked example
5-fold CV AUCs: 0.81, 0.84, 0.79, 0.83, 0.82 → mean 0.818, std ≈ 0.017. A competing model with mean 0.822 and similar spread isn't clearly better; the difference is well within fold-to-fold noise.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You standardize all features on the full dataset, then run 5-fold CV. What's wrong?",
  "options": ["Nothing", "The scaler saw validation rows, which leaks information; fit it inside each training fold", "Standardization should be done after training", "5 folds are too few"],
  "answer": 1,
  "explanation": "Any transform fit on data must be fit on training folds only. Use a pipeline so it's refit per fold."
}
```

```quiz
{
  "id": "q2",
  "question": "Your dataset has several rows per patient. Which CV scheme should you use?",
  "options": ["Plain k-fold", "Stratified k-fold", "Group k-fold by patient", "Leave-one-out"],
  "answer": 2,
  "explanation": "Rows from the same patient are correlated. Group k-fold keeps each patient in a single fold."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `kfold_indices(n, k)` returning a list of `(train_idx, val_idx)` pairs for k-fold CV without shuffling. Fold sizes should differ by at most 1, with the first `n % k` folds getting one extra row (like scikit-learn).",
  "starterCode": "def kfold_indices(n, k):\n    pass\n\nfor tr, va in kfold_indices(7, 3):\n    print(tr, va)",
  "tests": "f = kfold_indices(7, 3)\nassert [v for _, v in f] == [[0, 1, 2], [3, 4], [5, 6]]\nassert f[1][0] == [0, 1, 2, 5, 6]\nf = kfold_indices(10, 5)\nassert all(len(v) == 2 for _, v in f)\nassert sorted(i for _, v in f for i in v) == list(range(10))\nassert all(set(t).isdisjoint(v) and len(t) + len(v) == 10 for t, v in f)",
  "solution": "def kfold_indices(n, k):\n    sizes = [n // k + (1 if i < n % k else 0) for i in range(k)]\n    out, start = [], 0\n    for s in sizes:\n        val = list(range(start, start + s))\n        train = list(range(0, start)) + list(range(start + s, n))\n        out.append((train, val))\n        start += s\n    return out",
  "hints": ["Fold sizes: n // k, plus 1 for the first n % k folds.", "Train indices are everything before and after the validation block."]
}
```

> [!TIP] Interview tips
> - Match the CV scheme to the data: stratified for imbalance, group for repeated entities, forward-chaining for time.
> - Report mean ± std across folds; small differences between models may be noise.
> - Say "fit preprocessing inside the fold (pipelines)"; leakage through preprocessing is a classic trap.
