---
id: ml-practice-imbalanced-data-case
title: "Practice: Imbalanced data case study"
estimatedMinutes: 13
difficulty: medium
tags: [ml, practice, imbalanced, fraud]
---

## Why it matters
"Only 0.2% of transactions are fraud; how do you build and evaluate the model?" tests whether you can sequence the decisions correctly. The tools are in Imbalanced data, ROC-AUC vs PR-AUC and Threshold selection; this case study shows how they fit together and where candidates slip.

## Concept
A reliable order of operations:

1. **Split first, resample later.** Split by time or group at the natural class ratio. Keep validation and test sets at the **true prevalence**; never resample them. Use stratification only if rows are exchangeable.
2. **Pick metrics that respect the base rate.** Report prevalence, PR-AUC (average precision; its no-skill baseline equals prevalence), recall at a fixed precision, and cost at the chosen threshold. Accuracy and ROC-AUC alone are misleading.
3. **Start with the simplest remedy**: a strong baseline with no resampling, then class weights. Gradient-boosted trees often rank well without any resampling.
4. **Handle imbalance inside training only**: class weights, negative undersampling, or SMOTE applied **within each training fold**. Oversampling before the split duplicates rows into validation, a classic leak.
5. **Restore calibration if you changed the prior.** Weights or resampling inflate probabilities. If probabilities feed a cost decision, correct them (prior correction after undersampling with rate $\beta$: $p = \beta p_s / (\beta p_s - p_s + 1)$) or fit a calibrator on untouched validation data (see Calibration).
6. **Choose the threshold from costs or capacity**, not 0.5.
7. **Monitor**: prevalence drift, alert volume, precision at the review-queue size.

Pitfalls: tuning the threshold on the test set; reporting ROC-AUC 0.97 while precision at 10% recall is 3%; undersampling so hard that rare-but-important negative patterns vanish; using accuracy as the early-stopping metric.

## Worked example
Training data: 1,000,000 transactions, 2,000 frauds (0.2%). A model that always predicts "not fraud" has 99.8% accuracy and PR-AUC at the no-skill level of 0.002.

- **Undersample** negatives to a 1:10 ratio: keep 20,000 of 998,000 negatives, so $\beta = 20{,}000 / 998{,}000 \approx 0.0200$. Training set shrinks from 1,000,000 to 22,000 rows (about 45x faster). The model outputs $p_s = 0.50$ for a transaction. Corrected probability: $0.0200 \cdot 0.5 / (0.0200 \cdot 0.5 - 0.5 + 1) \approx 0.0196$, about 2%, not 50%.
- **Evaluate on the untouched test set** (natural 0.2% prevalence): illustrative average precision 0.31 vs the 0.002 baseline; at the top 0.5% of scores (500 of 100,000) the model captures 120 of 200 frauds, i.e. precision 24% and recall 60%.
- **Decide**: if a review costs \$5 and a missed fraud \$120, flag when the corrected probability exceeds $5/120 \approx 4.2\%$. Equivalently, the break-even on the raw resampled score is about 0.68, not 0.5.

Class weights give a similar result with all 1,000,000 rows kept, at a higher compute cost; try both and compare average precision on validation.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You oversample the minority class with SMOTE on the full dataset and then run 5-fold CV. What happens?",
  "options": [
    "Nothing; CV handles it",
    "Synthetic points built from validation rows end up in training and vice versa, so scores are inflated",
    "Recall drops",
    "The model underfits"
  ],
  "answer": 1,
  "explanation": "Synthetic samples interpolate between real rows that may later be validation rows. Resample only inside the training fold and evaluate on untouched data."
}
```

```quiz
{
  "id": "q2",
  "question": "After training with class_weight='balanced' on a 1%-prevalence problem, the model's average predicted probability is about 0.3. What does this imply for using it as a probability?",
  "options": [
    "It is well calibrated",
    "It is badly overestimated; recalibrate on unweighted validation data or apply prior correction",
    "Ranking quality (AUC) must also be wrong",
    "The threshold must be 0.5"
  ],
  "answer": 1,
  "explanation": "Weights shift the effective prior toward the minority class, inflating probabilities. Ranking is largely unaffected, but probabilities need correction before cost-based decisions."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `average_precision(y, scores)`: sort by score descending (stable for ties), and average the precision at the rank of each positive: AP = mean over positives of (positives seen so far / rank).",
  "starterCode": "def average_precision(y, scores):\n    pass\n\nprint(average_precision([1, 0, 1, 0], [0.9, 0.8, 0.7, 0.1]))",
  "tests": "assert abs(average_precision([1, 0, 1, 0], [0.9, 0.8, 0.7, 0.1]) - (1 + 2 / 3) / 2) < 1e-12\nassert average_precision([1, 1, 0, 0], [0.9, 0.8, 0.2, 0.1]) == 1.0\nassert abs(average_precision([0, 0, 1], [0.9, 0.8, 0.1]) - 1 / 3) < 1e-12\nassert abs(average_precision([0, 1, 0, 1], [0.1, 0.9, 0.5, 0.4]) - (1 + 2 / 3) / 2) < 1e-12",
  "solution": "def average_precision(y, scores):\n    order = sorted(range(len(y)), key=lambda i: -scores[i])\n    tp = 0\n    total = 0.0\n    for rank, i in enumerate(order, start=1):\n        if y[i] == 1:\n            tp += 1\n            total += tp / rank\n    return total / sum(y)",
  "hints": [
    "Walk down the ranked list, keeping a running count of positives.",
    "Add `tp / rank` each time you hit a positive, then divide by the number of positives."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `stratified_split(y, test_frac)` returning `(train_idx, test_idx)`, both sorted lists of indices. For each class, take the **last** `int(test_frac * n_class + 0.5)` indices (in original order) of that class for the test set; the rest go to train.",
  "starterCode": "def stratified_split(y, test_frac):\n    pass\n\nprint(stratified_split([0] * 8 + [1] * 2, 0.25))",
  "tests": "tr, te = stratified_split([0] * 8 + [1] * 2, 0.25)\nassert te == [6, 7, 9] and tr == [0, 1, 2, 3, 4, 5, 8]\ny = [0, 1] * 10\ntr, te = stratified_split(y, 0.5)\nassert len(te) == 10 and sum(y[i] for i in te) == 5\nassert sorted(tr + te) == list(range(20))",
  "solution": "def stratified_split(y, test_frac):\n    by_class = {}\n    for i, c in enumerate(y):\n        by_class.setdefault(c, []).append(i)\n    test = []\n    for idxs in by_class.values():\n        k = int(test_frac * len(idxs) + 0.5)\n        if k:\n            test.extend(idxs[-k:])\n    ts = set(test)\n    return [i for i in range(len(y)) if i not in ts], sorted(test)",
  "hints": [
    "Group indices by class, then slice each group's tail.",
    "Beware `idxs[-0:]` returns the whole list; guard the k == 0 case."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Write `balanced_weights(y)` returning a dict class -> `n / (k * n_class)` (k = number of classes), and `weighted_logloss(y, p, w)` where `w` is that dict: sum of `w[y_i] * loss_i` divided by the sum of `w[y_i]`, with loss = -log(p) for positives and -log(1-p) for negatives.",
  "starterCode": "import math\n\ndef balanced_weights(y):\n    pass\n\ndef weighted_logloss(y, p, w):\n    pass\n\nprint(balanced_weights([0, 0, 0, 1]))",
  "tests": "import math\nw = balanced_weights([0, 0, 0, 1])\nassert abs(w[0] - 2 / 3) < 1e-12 and abs(w[1] - 2.0) < 1e-12\ny = [0, 0, 0, 1]\np = [0.1, 0.1, 0.1, 0.8]\nexp = (3 * (2 / 3) * -math.log(0.9) + 2 * -math.log(0.8)) / 4\nassert abs(weighted_logloss(y, p, w) - exp) < 1e-12\nassert abs(weighted_logloss(y, [0.5] * 4, w) - math.log(2)) < 1e-12",
  "solution": "import math\n\ndef balanced_weights(y):\n    n = len(y)\n    classes = set(y)\n    return {c: n / (len(classes) * y.count(c)) for c in classes}\n\ndef weighted_logloss(y, p, w):\n    num = 0.0\n    den = 0.0\n    for yi, pi in zip(y, p):\n        loss = -math.log(pi) if yi == 1 else -math.log(1 - pi)\n        num += w[yi] * loss\n        den += w[yi]\n    return num / den",
  "hints": [
    "Each class's total weight becomes equal: n_class * w_class = n / k.",
    "Normalize by the sum of the weights actually used."
  ]
}
```

> [!TIP] Interview tips
> - Say "split first, resample only the training fold, evaluate at natural prevalence".
> - Lead with PR-AUC and a cost-based threshold; mention the no-skill baseline equals prevalence.
> - Remember to fix probabilities (prior correction or recalibration) after weighting or resampling.
