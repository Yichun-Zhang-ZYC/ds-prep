---
id: ml-feature-selection
title: Feature selection
estimatedMinutes: 12
difficulty: medium
tags: [ml, feature-engineering, feature-selection, interpretability]
---

## Why it matters
Fewer, better features mean faster models, less overfitting, cheaper data pipelines and easier explanations. Interviewers ask about the three families of methods and the leakage trap of selecting features outside cross-validation.

## Concept
**Filter methods**: score each feature independently of the model.
- Correlation with the target (numeric), mutual information (any relationship), chi-square (categorical), ANOVA F-test.
- Remove near-constant features and one of each highly correlated pair.
- Fast, but ignore interactions and redundancy among selected features.

**Wrapper methods**: search over subsets using model performance.
- Forward selection, backward elimination, **recursive feature elimination (RFE)**.
- Captures interactions, but expensive and prone to overfitting the validation set.

**Embedded methods**: selection happens during training.
- **L1 (lasso)** zeroes out coefficients; tree-based importance; gradient-boosting gain.
- Good balance of cost and quality.

Better importance measures: **permutation importance** (drop in validation score when a feature is shuffled) and **SHAP** values. Impurity-based importance is biased toward high-cardinality and continuous features. With correlated features, importance gets split between them, so a useful feature can look weak.

Critical rule: do selection **inside** the cross-validation loop. Selecting features on the full dataset and then cross-validating leaks the labels and inflates scores, dramatically so when there are many features and few rows.

## Worked example
5,000 random noise features, 100 rows, random labels. Pick the 20 features most correlated with the label on all 100 rows, then run 5-fold CV: accuracy ≈ 0.8. Repeat with selection inside each training fold: accuracy ≈ 0.5, which is the truth.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why can feature selection before cross-validation give misleading results?",
  "options": ["It makes training slower", "The selection used validation labels, so CV scores are optimistically biased", "It removes too many features", "CV requires all features"],
  "answer": 1,
  "explanation": "Selection is part of the model-fitting procedure and must be repeated inside each training fold."
}
```

```quiz
{
  "id": "q2",
  "question": "Two features are nearly identical copies. What happens to their permutation importances?",
  "options": ["Both look very important", "Both may look unimportant, since shuffling one leaves the other to carry the signal", "One becomes negative", "Nothing changes"],
  "answer": 1,
  "explanation": "Correlated features substitute for each other, hiding their importance. Group them or drop duplicates first."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `pearson(xs, ys)`, then `select_top_k(features, y, k)` where `features` maps name → list of values: return the k names with the largest |correlation| with y (ties by name). Finally `drop_correlated(features, threshold)` returns the sorted list of names kept after scanning names in sorted order and dropping any feature whose |correlation| with an already kept feature exceeds the threshold.",
  "starterCode": "import math\n\ndef pearson(xs, ys):\n    pass\n\ndef select_top_k(features, y, k):\n    pass\n\ndef drop_correlated(features, threshold):\n    pass\n\nF = {'a': [1, 2, 3, 4], 'b': [2, 4, 6, 8.5], 'c': [4, 1, 3, 2]}\nprint(select_top_k(F, [1, 2, 3, 4], 2), drop_correlated(F, 0.95))",
  "tests": "F = {'a': [1, 2, 3, 4], 'b': [2, 4, 6, 8.5], 'c': [4, 1, 3, 2]}\nassert abs(pearson([1, 2, 3], [2, 4, 6]) - 1) < 1e-12\nassert abs(pearson([1, 2, 3], [3, 2, 1]) + 1) < 1e-12\nassert select_top_k(F, [1, 2, 3, 4], 2) == ['a', 'b']\nassert drop_correlated(F, 0.95) == ['a', 'c']\nassert drop_correlated(F, 0.9999) == ['a', 'b', 'c']",
  "solution": "import math\n\ndef pearson(xs, ys):\n    n = len(xs)\n    mx, my = sum(xs) / n, sum(ys) / n\n    sxy = sum((x - mx) * (y - my) for x, y in zip(xs, ys))\n    sxx = sum((x - mx) ** 2 for x in xs)\n    syy = sum((y - my) ** 2 for y in ys)\n    return sxy / math.sqrt(sxx * syy)\n\ndef select_top_k(features, y, k):\n    ranked = sorted(features, key=lambda f: (-abs(pearson(features[f], y)), f))\n    return ranked[:k]\n\ndef drop_correlated(features, threshold):\n    kept = []\n    for f in sorted(features):\n        if all(abs(pearson(features[f], features[g])) <= threshold for g in kept):\n            kept.append(f)\n    return kept",
  "hints": ["Sort by (−|r|, name) to break ties alphabetically.", "Greedy: keep a feature only if it isn't too correlated with any kept one."]
}
```

> [!TIP] Interview tips
> - Name the three families (filter, wrapper, embedded) with an example each.
> - Prefer permutation importance / SHAP over impurity importance, and mention the correlated-feature caveat.
> - Always: "selection happens inside the CV loop".
