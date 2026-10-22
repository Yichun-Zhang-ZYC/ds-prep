---
id: recsys-collaborative-filtering
title: "Collaborative filtering (user-based, item-based)"
estimatedMinutes: 12
difficulty: medium
tags: [recsys, collaborative-filtering, similarity, neighborhood]
---

## Why it matters

"People like you liked this" is the oldest idea in recommenders and still the first baseline interviewers expect. You should be able to define user-based vs item-based CF, compute a prediction by hand, and explain why industry prefers item-based.

## Concept

Collaborative filtering (CF) uses only the **user-item interaction matrix** $R$ (no item or user features). Similar users, or similar items, have correlated tastes.

**User-based CF**: find the $k$ users most similar to $u$ who rated item $i$, then predict a weighted average:
$$\hat r_{ui} = \frac{\sum_{v \in N_k(u,i)} s_{uv}\, r_{vi}}{\sum_{v \in N_k(u,i)} |s_{uv}|}$$
**Item-based CF** is the transpose: predict $r_{ui}$ from the user's own ratings of items similar to $i$.

**Similarity**: cosine $\frac{a\cdot b}{\|a\|\|b\|}$, Pearson correlation (mean-centers each user, fixing harsh vs generous raters), or Jaccard for binary data. Mean-center ratings (add back $\bar r_u$) for better accuracy.

**Why item-based wins in practice**: items are far fewer than users, item-item similarities change slowly (precompute offline), and a user's neighbors are more stable. **Weaknesses**: sparsity (few co-rated entries make similarities noisy; shrink by $\frac{n}{n+\lambda}$), cold start, popularity bias, and $O(n^2)$ similarity cost (use approximate nearest neighbors).

## Worked example

Five users rate four items (0 = unrated). User 1 is $[4,0,0,1]$ and we predict item 1. Cosine similarities of user 1 to the raters of item 1: user 0 ($[5,3,0,1]$) 0.861, user 2 ($[1,1,0,5]$) 0.420, user 4 ($[0,1,5,4]$) 0.150. With $k=2$ neighbors (users 0 and 2, ratings 3 and 1): $\hat r = (0.861\cdot 3 + 0.420\cdot 1)/(0.861+0.420) \approx 2.34$. Use $k=1$ and the prediction is just 3, a noisier estimate.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why do large production systems often prefer item-based over user-based CF?",
  "options": [
    "It is more accurate on every dataset",
    "Items are fewer and their similarities are more stable, so they can be precomputed offline",
    "It does not need interaction data",
    "It solves the cold-start problem"
  ],
  "answer": 1,
  "explanation": "Item-item similarity tables are smaller and change slowly, so they can be precomputed and served cheaply; user neighborhoods shift constantly."
}
```

```quiz
{
  "id": "q2",
  "question": "Why is Pearson correlation (or mean-centering) often better than raw cosine on star ratings?",
  "options": [
    "It runs faster",
    "It removes each user's rating scale bias (harsh vs generous raters)",
    "It handles missing values automatically",
    "It always gives positive similarities"
  ],
  "answer": 1,
  "explanation": "Subtracting each user's mean means a 4 from a generous rater and a 3 from a harsh rater can both express 'above average'."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `cosine(a, b)` (return 0.0 if either vector is all zeros) and `predict(R, u, i, k)` for user-based CF. `R` is a list of rows with 0 meaning unrated. Consider users `v != u` with `R[v][i] > 0`, keep the `k` with highest positive cosine similarity to user `u` (break ties by lower index), and return the similarity-weighted average of their ratings of item `i`. Return 0.0 if there are no neighbors.",
  "setup": "",
  "packages": [],
  "starterCode": "import math\n\ndef cosine(a, b):\n    pass\n\ndef predict(R, u, i, k):\n    pass\n\nR = [[5, 3, 0, 1], [4, 0, 0, 1], [1, 1, 0, 5], [1, 0, 0, 4], [0, 1, 5, 4]]\nprint(predict(R, 1, 1, 2))",
  "tests": "R = [[5, 3, 0, 1], [4, 0, 0, 1], [1, 1, 0, 5], [1, 0, 0, 4], [0, 1, 5, 4]]\nassert abs(cosine([1, 0], [1, 0]) - 1) < 1e-12\nassert abs(cosine([1, 0], [0, 1])) < 1e-12\nassert cosine([0, 0], [1, 2]) == 0.0\nassert abs(cosine(R[1], R[0]) - 0.8609160647753271) < 1e-9\nassert abs(predict(R, 1, 1, 2) - 2.3441311542550505) < 1e-9\nassert abs(predict(R, 1, 1, 1) - 3.0) < 1e-12\nassert predict(R, 1, 2, 1) == 5.0\nassert predict([[1, 0], [0, 0]], 0, 1, 3) == 0.0",
  "solution": "import math\n\ndef cosine(a, b):\n    na = math.sqrt(sum(x * x for x in a))\n    nb = math.sqrt(sum(y * y for y in b))\n    if na == 0 or nb == 0:\n        return 0.0\n    return sum(x * y for x, y in zip(a, b)) / (na * nb)\n\ndef predict(R, u, i, k):\n    cands = []\n    for v in range(len(R)):\n        if v != u and R[v][i] > 0:\n            s = cosine(R[u], R[v])\n            if s > 0:\n                cands.append((-s, v))\n    cands.sort()\n    top = cands[:k]\n    if not top:\n        return 0.0\n    num = sum(-s * R[v][i] for s, v in top)\n    den = sum(-s for s, v in top)\n    return num / den",
  "hints": [
    "Sort candidates by (-similarity, index) and slice the first k.",
    "Only users who actually rated item i can contribute to the prediction."
  ]
}
```

> [!TIP] Interview tips
> - Say which side you take: user-based (similar users) vs item-based (similar items), and why item-based scales (precomputed item-item table).
> - Pitfall: raw cosine over zero-filled vectors treats 'unrated' as 'dislike'. Use co-rated items or mean-centering, and shrink similarities with few co-ratings.
> - Follow-up: CF can't handle new users or items and amplifies popularity bias, which is why matrix factorization and hybrids exist.
