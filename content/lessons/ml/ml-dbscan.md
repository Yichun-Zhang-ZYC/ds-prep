---
id: ml-dbscan
title: DBSCAN
estimatedMinutes: 10
difficulty: medium
tags: [ml, unsupervised, clustering, density]
---

## Why it matters
DBSCAN finds arbitrarily shaped clusters and labels outliers as noise, without choosing k. It's the usual answer to "what if k-means fails on this shape?" and is used for geospatial and anomaly problems.

## Concept
Two parameters: radius $\varepsilon$ and `min_samples`.
- **Core point**: has at least `min_samples` points (including itself) within $\varepsilon$.
- **Border point**: within $\varepsilon$ of a core point but not core itself.
- **Noise**: neither.

A cluster is a maximal set of points **density-connected** through chains of core points: start at an unvisited core point, add all its neighbors, and keep expanding from any neighbor that is also core.

Strengths: arbitrary shapes, robust to outliers (labels them `-1`), no $k$. Weaknesses:
- One global density: struggles when clusters have **different densities** (HDBSCAN fixes this by considering all $\varepsilon$ values).
- Sensitive to $\varepsilon$; choose it from the **k-distance plot** (sort each point's distance to its `min_samples`-th neighbor and look for the elbow).
- Distances degrade in high dimensions; scale features first.
- Border points reachable from two clusters are assigned by visit order.

## Worked example
1-D points [1, 2, 3, 8, 9, 10, 25], $\varepsilon = 1.5$, `min_samples = 2`. Points 1, 2, 3 are core (each has a neighbor within 1.5), forming cluster 0; 8, 9, 10 form cluster 1. Point 25 has no neighbors → noise.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "When does DBSCAN struggle most?",
  "options": ["Non-spherical clusters", "Data with outliers", "Clusters with very different densities", "When k is unknown"],
  "answer": 2,
  "explanation": "A single ε can't fit both dense and sparse clusters. HDBSCAN or OPTICS handle varying density."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement DBSCAN for 1-D points. `dbscan_1d(xs, eps, min_samples)` returns a label list: cluster ids 0, 1, 2… in order of discovery (scan points in input order), and -1 for noise. A point's neighborhood includes itself; distance ≤ eps counts.",
  "starterCode": "def dbscan_1d(xs, eps, min_samples):\n    pass\n\nprint(dbscan_1d([1, 2, 3, 8, 9, 10, 25], 1.5, 2))",
  "tests": "assert dbscan_1d([1, 2, 3, 8, 9, 10, 25], 1.5, 2) == [0, 0, 0, 1, 1, 1, -1]\nassert dbscan_1d([1, 2, 3, 8, 9, 10, 25], 1.5, 3) == [0, 0, 0, 1, 1, 1, -1]\nassert dbscan_1d([1, 2, 3, 8, 9, 10, 25], 1.5, 4) == [-1] * 7\nassert dbscan_1d([0, 1, 2, 3, 4], 1, 3) == [0, 0, 0, 0, 0]\nassert dbscan_1d([10, 0, 11], 1, 2) == [0, -1, 0]",
  "solution": "def dbscan_1d(xs, eps, min_samples):\n    n = len(xs)\n    nbrs = [[j for j in range(n) if abs(xs[i] - xs[j]) <= eps] for i in range(n)]\n    core = [len(nb) >= min_samples for nb in nbrs]\n    labels = [None] * n\n    cid = 0\n    for i in range(n):\n        if labels[i] is not None or not core[i]:\n            continue\n        labels[i] = cid\n        stack = [i]\n        while stack:\n            p = stack.pop()\n            for q in nbrs[p]:\n                if labels[q] is None:\n                    labels[q] = cid\n                    if core[q]:\n                        stack.append(q)\n        cid += 1\n    return [-1 if l is None else l for l in labels]",
  "hints": ["Precompute neighbors and which points are core.", "Expand clusters only from core points; border points join but don't expand."]
}
```

> [!TIP] Interview tips
> - Define core, border and noise points; that's the heart of the algorithm.
> - Contrast with k-means: no k, arbitrary shapes, explicit noise; but one density.
> - Mention the k-distance plot for ε and HDBSCAN for varying density.
