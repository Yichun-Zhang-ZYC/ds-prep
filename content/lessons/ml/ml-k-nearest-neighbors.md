---
id: ml-k-nearest-neighbors
title: k-Nearest Neighbors
estimatedMinutes: 10
difficulty: easy
tags: [ml, supervised, instance-based, distance]
---

## Why it matters
k-NN is the simplest non-parametric model and a common "code it in 10 minutes" question. It also shows up inside recommendation and retrieval systems as nearest-neighbor search over embeddings.

## Concept
To predict for a new point, find the $k$ closest training points and:
- **classify** by majority vote (optionally weighted by $1/\text{distance}$), or
- **regress** by averaging their targets.

There is no training step: the model is the stored data ("lazy learning"). Prediction costs $O(nd)$ per query with brute force; KD-trees / ball trees help in low dimensions, and **approximate nearest neighbor** indexes (HNSW, IVF, product quantization) handle large embedding collections.

Choices that matter:
- **k**: small k → low bias, high variance (noisy boundary); large k → smoother, more bias. Pick by cross-validation; use odd k for binary votes.
- **Distance metric**: Euclidean, Manhattan, cosine (common for text and embeddings).
- **Feature scaling** is essential: without it, the feature with the largest range dominates distances.
- Suffers from the **curse of dimensionality** and irrelevant features.

## Worked example
Training points (feature, label): (1, A), (2, A), (3, B), (6, B), (7, B). Query x = 2.6 with k = 3. Distances: 1.6, 0.6, 0.4, 3.4, 4.4. Nearest three: x=3 (B), x=2 (A), x=1 (A). Vote: A wins 2–1.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Features are income (0–200,000) and age (18–90). You run k-NN without scaling. What happens?",
  "options": ["Nothing; k-NN is scale-invariant", "Income dominates the distance, so age is effectively ignored", "Age dominates the distance", "k-NN can't run on mixed features"],
  "answer": 1,
  "explanation": "Distance is driven by the largest-range feature. Standardize or min-max scale first."
}
```

```quiz
{
  "id": "q2",
  "question": "What happens as k increases toward n?",
  "options": ["Variance increases", "The prediction approaches the majority class everywhere (high bias)", "Training time grows", "The model overfits more"],
  "answer": 1,
  "explanation": "With k = n every query sees all points, so it always predicts the overall majority."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `knn_predict(train, query, k)` where `train` is a list of `(features_tuple, label)`. Use Euclidean distance and majority vote. Break vote ties by choosing the label of the single nearest neighbor among the tied labels.",
  "starterCode": "import math\nfrom collections import Counter\n\ndef knn_predict(train, query, k):\n    pass\n\ntrain = [((1,), 'A'), ((2,), 'A'), ((3,), 'B'), ((6,), 'B'), ((7,), 'B')]\nprint(knn_predict(train, (2.6,), 3), knn_predict(train, (5,), 3))",
  "tests": "train = [((1,), 'A'), ((2,), 'A'), ((3,), 'B'), ((6,), 'B'), ((7,), 'B')]\nassert knn_predict(train, (2.6,), 3) == 'A'\nassert knn_predict(train, (5,), 3) == 'B'\nassert knn_predict(train, (2.6,), 1) == 'B'\nassert knn_predict(train, (2.4,), 2) == 'A'\nassert knn_predict(train, (2.6,), 2) == 'B'\nt2 = [((0, 0), 'x'), ((0, 1), 'x'), ((5, 5), 'y')]\nassert knn_predict(t2, (4, 4), 1) == 'y'",
  "solution": "import math\nfrom collections import Counter\n\ndef knn_predict(train, query, k):\n    nearest = sorted(train, key=lambda r: math.dist(r[0], query))[:k]\n    votes = Counter(label for _, label in nearest)\n    top = max(votes.values())\n    tied = {l for l, c in votes.items() if c == top}\n    for _, label in nearest:\n        if label in tied:\n            return label",
  "hints": ["Sort training rows by distance to the query and keep the first k.", "Walk the sorted neighbors and return the first label that's among the tied winners."]
}
```

> [!TIP] Interview tips
> - Always mention feature scaling and choosing k by cross-validation.
> - Discuss cost: no training but slow prediction; mention KD-trees and approximate nearest neighbor indexes for scale.
> - Connect to embeddings: vector search for recommendations and RAG is k-NN with cosine similarity.
