---
id: ml-scaling-and-normalization
title: Scaling & normalization
estimatedMinutes: 10
difficulty: easy
tags: [ml, feature-engineering, preprocessing]
---

## Why it matters
Forgetting to scale (or scaling with leakage) silently breaks k-NN, SVMs, regularized models and neural nets. "Which models need scaling, and which scaler would you use?" is a quick screening question.

## Concept
Common transforms:
- **Standardization (z-score)**: $(x - \mu)/\sigma$. Mean 0, std 1. Default for linear models, SVMs, PCA, neural nets.
- **Min-max scaling**: $(x - \min)/(\max - \min)$ into [0, 1]. Useful for bounded inputs (pixel values); sensitive to outliers.
- **Robust scaling**: $(x - \text{median})/\text{IQR}$. Resistant to outliers.
- **Log / Box-Cox / Yeo-Johnson**: reduce right skew (revenue, counts). Use $\log(1 + x)$ with zeros.
- **Row normalization (L2 norm)**: scale each sample to unit length, e.g. TF-IDF vectors or embeddings before cosine similarity.

Who needs it:
- **Need**: distance-based (k-NN, k-means, SVM-RBF), gradient-descent-trained models (faster, better-conditioned convergence), regularized models (fair penalties), PCA.
- **Don't need**: tree-based models (splits are invariant to monotonic transforms), Naive Bayes.

Rule: **fit the scaler on training data only**, then apply the same parameters to validation, test and production. Store the parameters with the model.

## Worked example
Training incomes: mean \$60k, std \$20k. A test user with \$100k → z = 2.0. If you refit on test data (mean \$80k), the same user becomes z = 1.0, and the model sees a different input than it was trained on.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which model is least affected by feature scaling?",
  "options": ["k-NN", "Logistic regression with L2 penalty", "Gradient-boosted trees", "SVM with RBF kernel"],
  "answer": 2,
  "explanation": "Tree splits depend only on the order of values, which scaling preserves."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write a tiny scaler API. `fit_standard(xs)` returns `(mean, std)` using the population std; `transform_standard(xs, params)` applies it (if std is 0, return zeros). `fit_minmax(xs)` returns `(lo, hi)` and `transform_minmax(xs, params)` maps to [0, 1] using the **training** lo/hi (values outside can fall outside [0, 1]).",
  "starterCode": "def fit_standard(xs):\n    pass\n\ndef transform_standard(xs, params):\n    pass\n\ndef fit_minmax(xs):\n    pass\n\ndef transform_minmax(xs, params):\n    pass\n\np = fit_standard([40, 60, 80])\nprint(p, transform_standard([100], p))",
  "tests": "import math\np = fit_standard([40, 60, 80])\nassert p[0] == 60 and abs(p[1] - math.sqrt(800 / 3)) < 1e-12\nassert abs(transform_standard([60], p)[0]) < 1e-12\nassert transform_standard([5, 7], fit_standard([3, 3])) == [0.0, 0.0]\nq = fit_minmax([10, 20, 30])\nassert q == (10, 30)\nassert transform_minmax([10, 20, 40], q) == [0.0, 0.5, 1.5]",
  "solution": "import math\n\ndef fit_standard(xs):\n    m = sum(xs) / len(xs)\n    s = math.sqrt(sum((x - m) ** 2 for x in xs) / len(xs))\n    return m, s\n\ndef transform_standard(xs, params):\n    m, s = params\n    if s == 0:\n        return [0.0 for _ in xs]\n    return [(x - m) / s for x in xs]\n\ndef fit_minmax(xs):\n    return min(xs), max(xs)\n\ndef transform_minmax(xs, params):\n    lo, hi = params\n    return [(x - lo) / (hi - lo) for x in xs]",
  "hints": ["Fit returns parameters; transform only uses them.", "Guard against a zero standard deviation."]
}
```

> [!TIP] Interview tips
> - Name which models need scaling (distance, gradient, regularization) and which don't (trees).
> - Pick the scaler by data: standard by default, robust for outliers, log for skew.
> - Always say "fit on train only, inside the pipeline".
