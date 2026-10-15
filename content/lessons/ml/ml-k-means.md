---
id: ml-k-means
title: k-Means
estimatedMinutes: 12
difficulty: easy
tags: [ml, unsupervised, clustering]
---

## Why it matters
k-means is the default clustering algorithm for customer segmentation and a common "implement it" question. Interviewers also check that you know its assumptions, how to choose k, and its failure modes.

## Concept
Partition $n$ points into $k$ clusters to minimize the **within-cluster sum of squares** (inertia):

$$
\sum_{j=1}^{k} \sum_{x \in C_j} \lVert x - \mu_j \rVert^2
$$

**Lloyd's algorithm**:
1. Initialize $k$ centroids (use **k-means++**: pick each next centroid with probability proportional to squared distance from the nearest existing one).
2. **Assign** each point to its nearest centroid.
3. **Update** each centroid to the mean of its points.
4. Repeat until assignments stop changing.

Each step can only lower inertia, so it converges, but to a **local** optimum: run several initializations and keep the best.

Choosing $k$: **elbow** in inertia vs $k$, **silhouette score** (how much closer points are to their own cluster than the next one; range −1 to 1), gap statistic, or business needs (how many segments can marketing act on?).

Assumptions and limits: clusters are roughly spherical, similar size and density; sensitive to **feature scaling** and outliers; must choose $k$; only numeric features (use k-modes / k-prototypes for categoricals). For odd shapes, consider DBSCAN, GMMs or spectral clustering.

## Worked example
1-D points [1, 2, 3, 10, 11, 12], $k = 2$, initial centroids 1 and 2. Assign: {1} → c1, {2, 3, 10, 11, 12} → c2. Update: c1 = 1, c2 = 7.6. Assign: {1, 2, 3} → c1 (3 is closer to 1 than to 7.6), {10, 11, 12} → c2. Update: c1 = 2, c2 = 11. Next assignment is unchanged → converged.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why run k-means several times with different initializations?",
  "options": ["To choose k", "It converges to a local optimum that depends on the starting centroids", "To scale the features", "Because each run uses different data"],
  "answer": 1,
  "explanation": "Different starts can end in different solutions; keep the one with the lowest inertia."
}
```

```quiz
{
  "id": "q2",
  "question": "Which data shape does k-means handle poorly?",
  "options": ["Well-separated round blobs", "Two interleaving crescent (moon) shapes", "Clusters of similar size", "Standardized numeric features"],
  "answer": 1,
  "explanation": "k-means draws linear (Voronoi) boundaries around centroids, so non-convex shapes get split incorrectly."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement Lloyd's algorithm for 1-D data. `kmeans_1d(xs, centroids, max_iter=100)` returns `(final_centroids, labels)` where `labels[i]` is the index of the nearest centroid (ties go to the lower index). Stop when labels don't change. If a cluster becomes empty, keep its centroid unchanged.",
  "starterCode": "def kmeans_1d(xs, centroids, max_iter=100):\n    pass\n\nprint(kmeans_1d([1, 2, 3, 10, 11, 12], [1, 2]))",
  "tests": "c, l = kmeans_1d([1, 2, 3, 10, 11, 12], [1, 2])\nassert c == [2.0, 11.0] and l == [0, 0, 0, 1, 1, 1]\nc, l = kmeans_1d([0, 0, 10], [0, 10, 100])\nassert c == [0.0, 10.0, 100] and l == [0, 0, 1]\nc, l = kmeans_1d([1, 3], [2, 5])\nassert l == [0, 0] and c == [2.0, 5]",
  "solution": "def kmeans_1d(xs, centroids, max_iter=100):\n    cs = list(centroids)\n    labels = None\n    for _ in range(max_iter):\n        new = [min(range(len(cs)), key=lambda j: (abs(x - cs[j]), j)) for x in xs]\n        if new == labels:\n            break\n        labels = new\n        for j in range(len(cs)):\n            pts = [x for x, l in zip(xs, labels) if l == j]\n            if pts:\n                cs[j] = sum(pts) / len(pts)\n    return cs, labels",
  "hints": ["Alternate assign and update until labels repeat.", "min over indices with key (distance, index) breaks ties toward the lower index."]
}
```

> [!TIP] Interview tips
> - Name the objective (inertia), Lloyd's two steps, k-means++, and multiple restarts.
> - Always say "scale the features first".
> - For choosing k, combine elbow / silhouette with business usefulness of the segments.
