---
id: ml-t-sne-umap
title: t-SNE, UMAP
estimatedMinutes: 10
difficulty: medium
tags: [ml, unsupervised, dimensionality-reduction, visualization, embeddings]
---

## Why it matters
t-SNE and UMAP are how people visualize embeddings, single-cell data, and learned representations. Interviewers check that you know what the plots do and don't show; over-reading cluster sizes and distances is a classic mistake.

## Concept
Both are **non-linear** methods that preserve **local neighborhoods**: points that are close in high-dimensional space should stay close in 2-D.

**t-SNE**
- Converts high-dimensional distances into neighbor probabilities with Gaussian kernels; the bandwidth per point is set by **perplexity** (≈ effective number of neighbors, typically 5–50).
- In 2-D, uses a heavy-tailed **Student-t** kernel, which lets dissimilar points spread far apart and avoids crowding.
- Minimizes the KL divergence between the two neighbor distributions with gradient descent.

**UMAP**
- Builds a weighted k-nearest-neighbor graph (`n_neighbors`) and optimizes a 2-D layout with a similar fuzzy graph (`min_dist` controls how tightly points pack).
- Faster than t-SNE, scales to millions of points, keeps somewhat more **global** structure, and can `transform` new points.

How to read the plots (and how not to):
- Clusters that appear are usually real neighborhoods, but **cluster sizes and distances between clusters are not meaningful** (especially in t-SNE).
- Results depend on hyperparameters and the random seed; check several settings.
- Use them for **visualization and exploration**, not as features for downstream models or as proof of clusters. For modeling, prefer PCA or the original embeddings.
- Common practice: run PCA to ~50 dimensions first, then t-SNE/UMAP.

## Worked example
Product embeddings (256-D) plotted with UMAP show five islands matching product categories, plus a small island of "gift cards" far from everything. The islands are worth investigating, but the large gap to gift cards doesn't mean they're "more different" than the other categories are from each other; inter-cluster distances aren't reliable.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "In a t-SNE plot, cluster A looks twice as large as cluster B. What can you conclude?",
  "options": ["A has twice as many points", "A has more spread in the original space", "Not much; t-SNE doesn't preserve cluster sizes or densities", "A is more important"],
  "answer": 2,
  "explanation": "t-SNE adapts to local density, so visual size and spacing are unreliable."
}
```

```quiz
{
  "id": "q2",
  "question": "Which is an advantage of UMAP over t-SNE?",
  "options": ["It's linear and interpretable", "It's faster, scales better, and can embed new points with transform", "It guarantees exact distances", "It doesn't have hyperparameters"],
  "answer": 1,
  "explanation": "UMAP is typically much faster and supports transforming new data; it still has hyperparameters (n_neighbors, min_dist)."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "A quick way to check whether a 2-D embedding preserves local structure is **neighbor overlap**. Write `knn_sets(points, k)` returning, for each point, the set of indices of its k nearest neighbors (Euclidean, excluding itself; ties by lower index). Then `neighbor_overlap(high, low, k)` returns the average fraction of each point's k high-D neighbors that are also its k low-D neighbors.",
  "starterCode": "import math\n\ndef knn_sets(points, k):\n    pass\n\ndef neighbor_overlap(high, low, k):\n    pass\n\nhigh = [(0, 0, 0), (0, 0, 1), (5, 5, 5), (5, 5, 6)]\nlow = [(0, 0), (0, 1), (9, 9), (9, 8)]\nprint(neighbor_overlap(high, low, 1))",
  "tests": "high = [(0, 0, 0), (0, 0, 1), (5, 5, 5), (5, 5, 6)]\nlow = [(0, 0), (0, 1), (9, 9), (9, 8)]\nassert knn_sets(high, 1) == [{1}, {0}, {3}, {2}]\nassert neighbor_overlap(high, low, 1) == 1.0\nbad = [(0, 0), (9, 9), (0, 1), (9, 8)]\nassert neighbor_overlap(high, bad, 1) == 0.0\nassert neighbor_overlap(high, bad, 3) == 1.0",
  "solution": "import math\n\ndef knn_sets(points, k):\n    out = []\n    for i, p in enumerate(points):\n        others = sorted((math.dist(p, q), j) for j, q in enumerate(points) if j != i)\n        out.append({j for _, j in others[:k]})\n    return out\n\ndef neighbor_overlap(high, low, k):\n    H, L = knn_sets(high, k), knn_sets(low, k)\n    return sum(len(h & l) / k for h, l in zip(H, L)) / len(high)",
  "hints": ["Sort (distance, index) pairs to break ties by index.", "Overlap per point = |high ∩ low| / k."]
}
```

> [!TIP] Interview tips
> - Say what they preserve (local neighborhoods) and what they don't (global distances, cluster sizes).
> - Mention perplexity / n_neighbors and seed sensitivity; check multiple runs.
> - Recommend them for visualization only; use PCA or raw embeddings as model inputs.
