---
id: ml-curse-of-dimensionality
title: Curse of dimensionality
estimatedMinutes: 10
difficulty: medium
tags: [ml, fundamentals, high-dimensional, distance]
---

## Why it matters
Why does k-NN break down with many features? Why do we need dimensionality reduction or regularization? Interviewers use the curse of dimensionality to test intuition about high-dimensional data.

## Concept
As the number of dimensions $d$ grows:

- **Data becomes sparse.** To cover a fraction $r$ of the unit hypercube's volume with a sub-cube, its side must be $r^{1/d}$. To capture 10% of the data in 10 dimensions you need a side of $0.1^{1/10} \approx 0.79$, i.e. 79% of each feature's range. "Local" neighborhoods aren't local anymore.
- **Distances concentrate.** For random points, the ratio between the farthest and nearest neighbor distances approaches 1. Nearest-neighbor methods and distance-based clustering lose their meaning.
- **Data needed grows exponentially.** Keeping the same density of samples requires roughly $n^d$ points.
- **Overfitting gets easier.** With more features than samples, a linear model can fit the training data perfectly.

Remedies: feature selection, dimensionality reduction (PCA, embeddings), regularization, models that exploit structure (trees, which split on one feature at a time; CNNs), and domain knowledge. Real data often lies near a lower-dimensional manifold, which is why ML works at all.

## Worked example
Uniform points in $[0,1]^d$. The expected squared distance between two random points is $d/6$, while its standard deviation grows only like $\sqrt{d}$. At $d = 2$ distances vary a lot relative to their mean; at $d = 1000$ almost all pairs are about $\sqrt{1000/6} \approx 12.9$ apart, give or take a few percent.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why does k-nearest neighbors perform poorly with hundreds of irrelevant features?",
  "options": ["It becomes too slow only", "Distances are dominated by irrelevant dimensions and become nearly equal, so 'nearest' neighbors aren't truly similar", "k must be larger than the number of features", "k-NN can't handle numeric features"],
  "answer": 1,
  "explanation": "In high dimensions, distance concentration makes all points look similarly far apart; irrelevant features add noise to every distance."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `side_for_fraction(r, d)`, the side length of a sub-cube that covers fraction `r` of the unit hypercube's volume in `d` dimensions. Then write `distance_contrast(points)`: for the **first** point, compute Euclidean distances to all others and return (max − min) / min.",
  "starterCode": "import math\n\ndef side_for_fraction(r, d):\n    pass\n\ndef distance_contrast(points):\n    pass\n\nprint(side_for_fraction(0.1, 10))\nprint(distance_contrast([(0, 0), (1, 0), (0, 3)]))",
  "tests": "import random\nassert abs(side_for_fraction(0.1, 1) - 0.1) < 1e-12\nassert abs(side_for_fraction(0.1, 10) - 0.1 ** 0.1) < 1e-12\nassert abs(distance_contrast([(0, 0), (1, 0), (0, 3)]) - 2.0) < 1e-12\nrandom.seed(1)\nlow = [tuple(random.random() for _ in range(2)) for _ in range(200)]\nhigh = [tuple(random.random() for _ in range(500)) for _ in range(200)]\nassert distance_contrast(high) < distance_contrast(low)",
  "solution": "import math\n\ndef side_for_fraction(r, d):\n    return r ** (1 / d)\n\ndef distance_contrast(points):\n    p0 = points[0]\n    ds = [math.dist(p0, p) for p in points[1:]]\n    return (max(ds) - min(ds)) / min(ds)",
  "hints": ["Volume of a cube with side s in d dimensions is s^d.", "math.dist computes Euclidean distance between two tuples."]
}
```

> [!TIP] Interview tips
> - Give one concrete number (e.g. 79% of each range to capture 10% of data in 10-D); it makes the idea stick.
> - Link it to practice: k-NN and clustering degrade, overfitting rises, and you need regularization or dimensionality reduction.
> - Mention the manifold hypothesis as the reason high-dimensional learning still works.
