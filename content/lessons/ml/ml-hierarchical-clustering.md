---
id: ml-hierarchical-clustering
title: Hierarchical clustering
estimatedMinutes: 10
difficulty: medium
tags: [ml, unsupervised, clustering, dendrogram]
---

## Why it matters
Hierarchical clustering gives a full tree of nested clusters instead of one partition, which is useful when you don't know k or want a taxonomy (product categories, gene families). Interviewers ask about linkage choices and scalability.

## Concept
**Agglomerative** (bottom-up, the common one): start with every point as its own cluster; repeatedly merge the two closest clusters until one remains. **Divisive** (top-down) splits instead and is rarer.

How "closest clusters" is measured is the **linkage**:
- **Single**: minimum distance between any two points. Finds elongated shapes but suffers from **chaining** (a thin bridge of points joins clusters).
- **Complete**: maximum distance. Compact clusters; sensitive to outliers.
- **Average**: mean pairwise distance. A middle ground.
- **Ward**: merge that least increases total within-cluster variance. Tends to give k-means-like, similar-size clusters; a good default for numeric data.

The result is a **dendrogram**: merge heights show the distance at which clusters joined. Cut it at a height (or at a number of clusters) to get a flat clustering; a big vertical gap suggests a natural $k$.

Costs: naive algorithm is $O(n^3)$, optimized versions $O(n^2)$ time and $O(n^2)$ memory for the distance matrix, so it's practical up to tens of thousands of points. Merges are greedy and never undone. Works with any distance (including custom ones), and needs no $k$ upfront.

## Worked example
1-D points A=0, B=1, C=5, D=6, E=20 with single linkage. Merge A–B (1), then C–D (1), then {A,B}–{C,D} (distance 4, from B to C), then E joins at 14. Cutting the dendrogram between heights 4 and 14 gives two clusters: {A, B, C, D} and {E}.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which linkage is most prone to 'chaining', where clusters merge through a thin line of points?",
  "options": ["Single linkage", "Complete linkage", "Ward linkage", "Average linkage"],
  "answer": 0,
  "explanation": "Single linkage only needs one close pair to merge two clusters, so chains of nearby points connect distant groups."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement agglomerative clustering on 1-D points with **single linkage**. `agglomerate(xs, k)` merges clusters until `k` remain and returns them as a list of sorted lists, ordered by their smallest element. When two merges tie, merge the pair whose clusters appear first in that ordering.",
  "starterCode": "def agglomerate(xs, k):\n    pass\n\nprint(agglomerate([0, 1, 5, 6, 20], 2))",
  "tests": "assert agglomerate([0, 1, 5, 6, 20], 2) == [[0, 1, 5, 6], [20]]\nassert agglomerate([0, 1, 5, 6, 20], 3) == [[0, 1], [5, 6], [20]]\nassert agglomerate([3, 1, 2], 1) == [[1, 2, 3]]\nassert agglomerate([1, 2, 3], 3) == [[1], [2], [3]]",
  "solution": "def agglomerate(xs, k):\n    clusters = [[x] for x in sorted(xs)]\n    def link(a, b):\n        return min(abs(p - q) for p in a for q in b)\n    while len(clusters) > k:\n        best = None\n        for i in range(len(clusters)):\n            for j in range(i + 1, len(clusters)):\n                d = link(clusters[i], clusters[j])\n                if best is None or d < best[0]:\n                    best = (d, i, j)\n        _, i, j = best\n        merged = sorted(clusters[i] + clusters[j])\n        clusters = [c for t, c in enumerate(clusters) if t not in (i, j)] + [merged]\n        clusters.sort(key=lambda c: c[0])\n    return clusters",
  "hints": ["Single-linkage distance = min over all cross-cluster pairs.", "Keep clusters sorted by their first element after each merge."]
}
```

> [!TIP] Interview tips
> - Know the four linkages and one property of each (single → chaining, Ward → compact, similar sizes).
> - Mention the dendrogram for choosing k and the $O(n^2)$ memory limit.
> - Suggest it for small data, custom distances, or when a hierarchy is the product (taxonomies).
