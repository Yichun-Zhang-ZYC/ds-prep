---
id: ml-encoding-categorical-variables
title: Encoding categorical variables (one-hot, target encoding)
estimatedMinutes: 12
difficulty: medium
tags: [ml, feature-engineering, categorical, leakage]
---

## Why it matters
Most real datasets have categorical columns (country, device, product). How you encode them affects accuracy, memory and leakage risk, and interviewers ask about the tradeoffs, especially for target encoding.

## Concept
- **One-hot encoding**: one binary column per category. No false ordering; works for linear models. Blows up with many categories; drop one column (or regularize) to avoid perfect collinearity with an intercept. Reserve an "unknown" bucket for unseen categories.
- **Ordinal / label encoding**: map categories to integers. Fine for truly ordered values (small < medium < large) and for **tree models** (which can split on integers), but misleading for linear models, which treat the codes as distances.
- **Target (mean) encoding**: replace each category with the mean target for that category. Compact and powerful for high cardinality, but **leaks** the target if computed on the same rows you train on. Fixes:
  - compute it **out-of-fold** (K-fold target encoding);
  - **smooth** toward the global mean: $\text{enc}(c) = \dfrac{n_c \bar y_c + m \bar y}{n_c + m}$, so rare categories aren't trusted;
  - optionally add noise.
- **Frequency / count encoding**: replace with how often the category appears.
- **Hashing trick**: hash categories into a fixed number of buckets; no vocabulary to store, some collisions.
- **Embeddings**: learned dense vectors in neural nets, for very high cardinality (user IDs, products).

## Worked example
City "Springfield" has 3 rows with conversions [1, 1, 1]; global conversion is 0.10. Raw target encoding = 1.0, an overconfident value from 3 rows. With smoothing $m = 20$: $(3 \cdot 1.0 + 20 \cdot 0.10)/(3 + 20) = 5/23 \approx 0.22$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You target-encode a high-cardinality feature on the full training set, then train. Validation is much worse than training. Why?",
  "options": ["Target encoding can't be used with trees", "The encoding leaked each row's own label into its feature, so the model overfit to it", "Too few categories", "The global mean was wrong"],
  "answer": 1,
  "explanation": "Each row's encoding includes its own target. Use out-of-fold encoding with smoothing."
}
```

```quiz
{
  "id": "q2",
  "question": "Encoding colors as red=1, green=2, blue=3 is most problematic for which model?",
  "options": ["Random forest", "Linear regression", "Gradient boosting", "Decision tree"],
  "answer": 1,
  "explanation": "A linear model treats blue as 'three times red'; trees just split on thresholds and can cope."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `one_hot(values, categories)` returning a list of 0/1 lists (unknown values become all zeros). Then write `smoothed_target_encoding(cats, ys, m)` returning a dict category → (n_c · mean_c + m · global_mean) / (n_c + m).",
  "starterCode": "def one_hot(values, categories):\n    pass\n\ndef smoothed_target_encoding(cats, ys, m):\n    pass\n\nprint(one_hot(['b', 'z'], ['a', 'b', 'c']))\nprint(smoothed_target_encoding(['x', 'x', 'y', 'y', 'y', 'y'], [1, 1, 0, 0, 0, 1], 2))",
  "tests": "assert one_hot(['b', 'z'], ['a', 'b', 'c']) == [[0, 1, 0], [0, 0, 0]]\nenc = smoothed_target_encoding(['x', 'x', 'y', 'y', 'y', 'y'], [1, 1, 0, 0, 0, 1], 2)\ng = 3 / 6\nassert abs(enc['x'] - (2 * 1 + 2 * g) / 4) < 1e-12\nassert abs(enc['y'] - (4 * 0.25 + 2 * g) / 6) < 1e-12\nenc0 = smoothed_target_encoding(['a', 'b'], [1, 0], 0)\nassert enc0 == {'a': 1.0, 'b': 0.0}",
  "solution": "def one_hot(values, categories):\n    return [[1 if v == c else 0 for c in categories] for v in values]\n\ndef smoothed_target_encoding(cats, ys, m):\n    g = sum(ys) / len(ys)\n    sums, counts = {}, {}\n    for c, y in zip(cats, ys):\n        sums[c] = sums.get(c, 0) + y\n        counts[c] = counts.get(c, 0) + 1\n    return {c: (sums[c] + m * g) / (counts[c] + m) for c in counts}",
  "hints": ["n_c · mean_c is just the sum of y in that category.", "With m = 0 you get the raw category means."]
}
```

> [!TIP] Interview tips
> - Choose by cardinality and model: one-hot for low cardinality, target/frequency/hashing for high, embeddings for huge.
> - Whenever you say "target encoding", immediately add "out-of-fold with smoothing".
> - Mention handling unseen categories in production.
