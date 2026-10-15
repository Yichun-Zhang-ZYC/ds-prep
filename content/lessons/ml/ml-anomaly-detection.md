---
id: ml-anomaly-detection
title: Anomaly detection (Isolation Forest, One-Class SVM)
estimatedMinutes: 12
difficulty: medium
tags: [ml, unsupervised, anomaly-detection, fraud]
---

## Why it matters
Fraud, intrusion, defective products and broken data pipelines all need anomaly detection, usually with few or no labels. Interviewers ask which method you'd pick and, importantly, how you'd evaluate it.

## Concept
Families of methods:
- **Statistical**: z-scores, IQR rule (outside $[Q_1 - 1.5\,\text{IQR},\ Q_3 + 1.5\,\text{IQR}]$), robust z-scores with median/MAD. Good for single metrics.
- **Density / distance**: low likelihood under a GMM or KDE; k-NN distance; **Local Outlier Factor** (density relative to neighbors).
- **Isolation Forest**: build random trees that split on random features at random thresholds. Anomalies are few and different, so they get **isolated in fewer splits**. Score uses average path length: shorter → more anomalous. Fast, scales well, handles high dimensions, little tuning (`contamination` sets the threshold).
- **One-Class SVM**: learns a boundary around normal data (often RBF kernel); `nu` ≈ upper bound on the fraction of outliers. Sensitive to scaling and hyperparameters; slow on large data.
- **Reconstruction-based**: autoencoders or PCA; high reconstruction error = anomaly.
- **Time series**: compare to a forecast or seasonal baseline (residual-based detection).

Evaluation: if you have even a few labels, use **precision@k** or PR-AUC (anomalies are rare, so accuracy and ROC-AUC flatter you). Without labels, review top-scored cases with experts and track alert volume. Expect concept drift: fraudsters adapt.

## Worked example
Daily order counts: Q1 = 900, Q3 = 1,100, IQR = 200. Fences: 900 − 300 = 600 and 1,100 + 300 = 1,400. A day with 1,650 orders is flagged. Before calling it fraud, check for a promotion: anomalies aren't always bad, they're just unusual.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why does Isolation Forest isolate anomalies in fewer splits?",
  "options": ["Anomalies have larger feature values", "Anomalies are rare and far from dense regions, so random splits separate them quickly", "It uses labeled data", "Trees are deeper for anomalies"],
  "answer": 1,
  "explanation": "Random partitions reach isolated points with short paths; points in dense regions need many splits."
}
```

```quiz
{
  "id": "q2",
  "question": "Only 0.1% of transactions are fraud. Which metric best evaluates an anomaly detector?",
  "options": ["Accuracy", "Precision at the top k alerts / PR-AUC", "R²", "Mean squared error"],
  "answer": 1,
  "explanation": "With extreme imbalance, accuracy is ~99.9% for a model that flags nothing. Precision@k reflects what investigators actually review."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `iqr_outliers(xs)` returning the sorted list of values outside the 1.5·IQR fences, where Q1 and Q3 come from `statistics.quantiles(xs, n=4)` (default method). Then write `robust_z(xs)` returning a list of (x − median) / (1.4826 · MAD) using `statistics.median`.",
  "starterCode": "import statistics\n\ndef iqr_outliers(xs):\n    pass\n\ndef robust_z(xs):\n    pass\n\ndata = [10, 12, 11, 13, 12, 11, 40, 12, -5]\nprint(iqr_outliers(data), [round(z, 2) for z in robust_z(data)])",
  "tests": "import statistics\ndata = [10, 12, 11, 13, 12, 11, 40, 12, -5]\nassert iqr_outliers(data) == [-5, 40]\nassert iqr_outliers([1, 2, 3, 4, 5]) == []\nz = robust_z([1, 2, 3, 4, 100])\nassert abs(z[2]) < 1e-12\nassert abs(z[4] - 97 / 1.4826) < 1e-9",
  "solution": "import statistics\n\ndef iqr_outliers(xs):\n    q1, _, q3 = statistics.quantiles(xs, n=4)\n    iqr = q3 - q1\n    lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr\n    return sorted(x for x in xs if x < lo or x > hi)\n\ndef robust_z(xs):\n    med = statistics.median(xs)\n    mad = statistics.median(abs(x - med) for x in xs)\n    return [(x - med) / (1.4826 * mad) for x in xs]",
  "hints": ["statistics.quantiles(xs, n=4) returns [Q1, Q2, Q3].", "MAD is the median of absolute deviations from the median."]
}
```

> [!TIP] Interview tips
> - Start simple (robust z / IQR per metric), then mention Isolation Forest as the default multivariate method.
> - Spend time on evaluation: precision@k, expert review, alert fatigue.
> - Distinguish anomalies from problems: promotions and launches create legitimate spikes.
