---
id: ml-training-validation-test-split
title: Training / validation / test split
estimatedMinutes: 10
difficulty: easy
tags: [ml, fundamentals, evaluation, data-splitting]
---

## Why it matters
Every reported model metric is only as honest as the split behind it. Interviewers check whether you know what each set is for and how to split when data has time order or groups.

## Concept
- **Training set**: fit model parameters.
- **Validation set**: choose hyperparameters, features and models; decide when to stop training.
- **Test set**: touched **once** at the end for an unbiased estimate of performance on new data.

If you tune on the test set, it stops being a test set: the reported score becomes optimistic. Typical sizes are 60/20/20 or 80/10/10; with millions of rows, the validation and test sets can be a small percentage.

How to split matters as much as how much:
- **Random split**: fine for i.i.d. rows.
- **Stratified split**: keep class proportions equal across sets (important for rare classes).
- **Time-based split**: train on the past, validate and test on the future. Required for forecasting and for any model that will predict future events.
- **Group split**: keep all rows of the same user / patient / session in one set, or the model will be graded on people it has already seen.

## Worked example
Churn model on 2 years of monthly user snapshots. A random split puts the same user's March and April rows in train and test, and lets the model "see the future". Better: train on months 1–18, validate on 19–21, test on 22–24, and make sure each user's features only use data available at prediction time.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You tried 50 hyperparameter settings and picked the one with the best test-set score. What's the problem?",
  "options": ["Nothing; that's what the test set is for", "The test score is now optimistically biased because it was used for model selection", "The model will underfit", "The training set is too small"],
  "answer": 1,
  "explanation": "Selecting on the test set leaks information. Use a validation set (or cross-validation) for selection, and keep the test set for the final estimate."
}
```

```quiz
{
  "id": "q2",
  "question": "You're building a model to predict next week's sales. How should you split?",
  "options": ["Random 80/20", "Stratified by store", "By time: train on earlier weeks, test on later weeks", "Use all data for training"],
  "answer": 2,
  "explanation": "The model will predict the future, so evaluation must mimic that: train on the past, test on the future."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `time_split(rows, val_frac, test_frac)` where `rows` is a list of `(timestamp, value)` in any order. Sort by timestamp and return `(train, val, test)` lists: the last `round(n * test_frac)` rows go to test, the `round(n * val_frac)` rows before them to validation, the rest to train.",
  "starterCode": "def time_split(rows, val_frac, test_frac):\n    pass\n\nrows = [(t, t * 10) for t in [5, 1, 9, 3, 7, 2, 8, 4, 6, 10]]\nprint(time_split(rows, 0.2, 0.2))",
  "tests": "rows = [(t, t * 10) for t in [5, 1, 9, 3, 7, 2, 8, 4, 6, 10]]\ntr, va, te = time_split(rows, 0.2, 0.2)\nassert [r[0] for r in tr] == [1, 2, 3, 4, 5, 6]\nassert [r[0] for r in va] == [7, 8]\nassert [r[0] for r in te] == [9, 10]\ntr, va, te = time_split(rows, 0.1, 0.3)\nassert len(tr) == 6 and len(va) == 1 and len(te) == 3\nassert max(r[0] for r in tr) < min(r[0] for r in va) < min(r[0] for r in te)",
  "solution": "def time_split(rows, val_frac, test_frac):\n    rows = sorted(rows)\n    n = len(rows)\n    n_test = round(n * test_frac)\n    n_val = round(n * val_frac)\n    cut1 = n - n_test - n_val\n    cut2 = n - n_test\n    return rows[:cut1], rows[cut1:cut2], rows[cut2:]",
  "hints": ["Sort first, then slice.", "Compute the cut points from the end of the list."]
}
```

> [!TIP] Interview tips
> - Say what each set is for, and that the test set is used once.
> - Ask "is there time order or grouping?" before choosing a split; random splits on temporal or grouped data inflate scores.
> - For small data, mention cross-validation for model selection plus a held-out test set.
