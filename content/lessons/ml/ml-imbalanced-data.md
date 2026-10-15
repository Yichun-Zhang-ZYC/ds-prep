---
id: ml-imbalanced-data
title: Imbalanced data (resampling, class weights, SMOTE)
estimatedMinutes: 12
difficulty: medium
tags: [ml, practical, imbalanced-data, classification]
---

## Why it matters
Fraud, churn, defaults, rare diseases and click prediction all have rare positives. "How would you handle a 1:1000 class imbalance?" is one of the most common ML interview questions, and the best answers start with metrics, not SMOTE.

## Concept
Work through these in order:

1. **Use the right metric**: PR-AUC, precision/recall at the operating point, cost-weighted metrics. Not accuracy.
2. **Pick the right threshold**: often the biggest win. A model trained on imbalanced data still ranks well; it just needs a lower threshold (see threshold selection).
3. **Class weights / cost-sensitive learning**: weight minority-class errors more in the loss (`class_weight='balanced'` gives weight $\frac{n}{K \cdot n_k}$ to class $k$; `scale_pos_weight` in XGBoost ≈ negatives/positives). No data is thrown away.
4. **Resampling** (training set only, inside CV):
   - **Random undersampling** of the majority class: fast, discards data; fine when you have lots of negatives.
   - **Random oversampling** of the minority: duplicates rows; risk of overfitting them.
   - **SMOTE**: synthesize minority points by interpolating between a minority point and one of its k nearest minority neighbors: $x_{new} = x + \lambda (x_{nn} - x)$, $\lambda \sim U(0,1)$. Can create unrealistic points in high dimensions or with categorical features; often gives little gain over class weights for boosted trees.
5. **Get more positive data**, better features, or reframe (anomaly detection when positives are extremely rare or unlabeled).

Resampling and class weights distort predicted probabilities: **recalibrate** before using them as probabilities. Never resample the validation or test sets: they must reflect the real distribution.

## Worked example
900 negatives, 100 positives. Balanced class weights: negative weight $1000/(2\cdot900) \approx 0.556$, positive weight $1000/(2\cdot100) = 5$. Each positive error now counts 9× a negative error, similar in effect to oversampling positives 9×, but without duplicating rows.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You apply SMOTE to the whole dataset, then split into train and test. What's wrong?",
  "options": ["Nothing", "Synthetic points built from test-set neighbors leak into training, and the test set no longer reflects the real class balance", "SMOTE only works on images", "You should use undersampling instead"],
  "answer": 1,
  "explanation": "Resample only the training folds. Test data must stay untouched and realistic."
}
```

```quiz
{
  "id": "q2",
  "question": "What's often the cheapest, highest-impact first step for an imbalanced classifier?",
  "options": ["Collecting 10× more negatives", "Choosing an appropriate metric and decision threshold", "Switching to a deep neural network", "Removing all minority examples"],
  "answer": 1,
  "explanation": "Many 'imbalance problems' are really metric and threshold problems."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `balanced_weights(labels)` returning a dict class → n / (K · n_class). Then write `smote_point(x, neighbor, lam)` returning x + lam · (neighbor − x) for lists, and `random_undersample(rows, labels, majority, ratio, seed)` that keeps all non-majority rows and `round(ratio * n_minority_total)` randomly chosen majority rows (use `random.Random(seed).sample`), preserving original order.",
  "starterCode": "import random\nfrom collections import Counter\n\ndef balanced_weights(labels):\n    pass\n\ndef smote_point(x, neighbor, lam):\n    pass\n\ndef random_undersample(rows, labels, majority, ratio, seed):\n    pass\n\nprint(balanced_weights([0] * 9 + [1]), smote_point([1, 2], [3, 6], 0.5))",
  "tests": "w = balanced_weights([0] * 900 + [1] * 100)\nassert abs(w[0] - 1000 / 1800) < 1e-12 and abs(w[1] - 5) < 1e-12\nassert smote_point([1, 2], [3, 6], 0.5) == [2.0, 4.0]\nassert smote_point([1, 2], [3, 6], 0) == [1, 2]\nrows = list(range(20))\nlabels = [0] * 16 + [1] * 4\nr, l = random_undersample(rows, labels, 0, 2, 0)\nassert l.count(1) == 4 and l.count(0) == 8\nassert r == sorted(r)\nassert random_undersample(rows, labels, 0, 2, 0) == (r, l)",
  "solution": "import random\nfrom collections import Counter\n\ndef balanced_weights(labels):\n    c = Counter(labels)\n    n, K = len(labels), len(c)\n    return {k: n / (K * v) for k, v in c.items()}\n\ndef smote_point(x, neighbor, lam):\n    return [a + lam * (b - a) for a, b in zip(x, neighbor)]\n\ndef random_undersample(rows, labels, majority, ratio, seed):\n    maj = [i for i, l in enumerate(labels) if l == majority]\n    n_min = len(labels) - len(maj)\n    keep_maj = set(random.Random(seed).sample(maj, round(ratio * n_min)))\n    keep = [i for i in range(len(rows)) if labels[i] != majority or i in keep_maj]\n    return [rows[i] for i in keep], [labels[i] for i in keep]",
  "hints": ["n / (K · n_class) makes the total weight per class equal.", "Sample majority indices, then rebuild in original index order."]
}
```

> [!TIP] Interview tips
> - Lead with metrics and threshold, then class weights, then resampling; mention SMOTE's limits.
> - Resample only training data (inside CV), and recalibrate probabilities afterwards.
> - For extreme rarity, consider anomaly detection or collecting more positives.
