---
id: recsys-matrix-factorization
title: "Matrix factorization"
estimatedMinutes: 12
difficulty: medium
tags: [recsys, matrix-factorization, sgd, als, embeddings]
---

## Why it matters

Matrix factorization (MF) won the Netflix Prize and is the ancestor of every embedding-based recommender. Interviewers ask for the objective, how SGD vs ALS train it, and how it handles missing data.

## Concept

Approximate the sparse rating matrix $R \approx P Q^\top$ with user factors $p_u \in \mathbb{R}^d$ and item factors $q_i \in \mathbb{R}^d$ (e.g. $d = 32$). The prediction is a dot product, optionally with biases:
$$\hat r_{ui} = \mu + b_u + b_i + p_u^\top q_i$$

**Objective**: minimize squared error over the **observed** entries only, plus L2 regularization:
$$\min \sum_{(u,i)\in \Omega} (r_{ui} - \hat r_{ui})^2 + \lambda(\|p_u\|^2 + \|q_i\|^2)$$
With $e_{ui} = r_{ui} - \hat r_{ui}$, an **SGD** step is $p_u \leftarrow p_u + \eta(e_{ui} q_i - \lambda p_u)$ and $q_i \leftarrow q_i + \eta(e_{ui} p_u - \lambda q_i)$ (use the old $p_u$ in the $q_i$ update).

**ALS** (alternating least squares): fix $Q$, and every $p_u$ has a closed-form ridge-regression solution; then fix $P$ and solve for $Q$. Each half-step is embarrassingly parallel, and ALS handles implicit feedback gracefully, which is why Spark MLlib uses it. SGD is simpler and better for streaming/online updates.

**Why it beats neighborhood CF**: it compresses the sparse matrix into dense low-rank factors, generalizes to pairs with no co-ratings, and scoring is a cheap dot product. **Pitfalls**: rank $d$ and $\lambda$ must be tuned on held-out data; never treat missing as zero in an explicit-feedback loss; new users/items have no factors (cold start).

## Worked example

One observed rating $r = 1$ with $p = [1, 0]$, $q = [0.5, 0.5]$. The prediction is $0.5$, so $e = 0.5$. With $\eta = 0.1$ and $\lambda = 0$: $p \leftarrow [1 + 0.1\cdot 0.5\cdot 0.5,\; 0 + 0.1\cdot 0.5\cdot 0.5] = [1.025, 0.025]$ and $q \leftarrow [0.5 + 0.1\cdot 0.5\cdot 1,\; 0.5 + 0] = [0.55, 0.5]$. The new prediction is $1.025\cdot 0.55 + 0.025\cdot 0.5 = 0.576$, closer to 1.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "In explicit-feedback MF, why is the loss computed only over observed ratings?",
  "options": [
    "Missing entries are all negative",
    "Treating missing as zeros would teach the model that unrated items are disliked",
    "It makes the matrix dense",
    "It removes the need for regularization"
  ],
  "answer": 1,
  "explanation": "Most cells are unobserved, not zero ratings. Fitting them as zeros biases everything toward 0; implicit-feedback models handle this with confidence weights or negative sampling instead."
}
```

```quiz
{
  "id": "q2",
  "question": "What is the main advantage of ALS over SGD for MF?",
  "options": [
    "It never needs regularization",
    "Each half-step is a closed-form ridge solve that parallelizes across users or items",
    "It works without any data",
    "It gives exact global optimum"
  ],
  "answer": 1,
  "explanation": "With one side fixed the problem is convex least squares per user/item, so updates are closed-form and parallel. The joint problem is still non-convex."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `sgd_epoch(ratings, P, Q, lr, reg)`. `ratings` is a list of `(u, i, r)`; `P` and `Q` are lists of lists (user and item factors) that you update **in place**. For each rating in order compute `e = r - dot(P[u], Q[i])`, then update both vectors with `p += lr*(e*q - reg*p)` and `q += lr*(e*p_old - reg*q)`. Return the mean squared error computed with the errors seen **before** each update.",
  "setup": "",
  "packages": [],
  "starterCode": "def sgd_epoch(ratings, P, Q, lr, reg):\n    pass\n\nP = [[1.0, 0.0]]\nQ = [[0.5, 0.5]]\nprint(sgd_epoch([(0, 0, 1.0)], P, Q, 0.1, 0.0), P, Q)",
  "tests": "P = [[1.0, 0.0]]\nQ = [[0.5, 0.5]]\nmse = sgd_epoch([(0, 0, 1.0)], P, Q, 0.1, 0.0)\nassert abs(mse - 0.25) < 1e-12\nassert all(abs(a - b) < 1e-12 for a, b in zip(P[0], [1.025, 0.025]))\nassert all(abs(a - b) < 1e-12 for a, b in zip(Q[0], [0.55, 0.5]))\nP = [[1.0, 0.0]]\nQ = [[0.5, 0.5]]\nsgd_epoch([(0, 0, 1.0)], P, Q, 0.1, 1.0)\nassert abs(P[0][0] - (1 + 0.1 * (0.5 * 0.5 - 1.0))) < 1e-12\nP = [[0.3, 0.1], [0.2, 0.4]]\nQ = [[0.1, 0.5], [0.4, 0.2]]\ndata = [(0, 0, 4.0), (0, 1, 2.0), (1, 0, 3.0), (1, 1, 5.0)]\nfirst = sgd_epoch(data, P, Q, 0.05, 0.0)\nfor _ in range(300):\n    last = sgd_epoch(data, P, Q, 0.05, 0.0)\nassert last < first * 0.01",
  "solution": "def sgd_epoch(ratings, P, Q, lr, reg):\n    total = 0.0\n    for u, i, r in ratings:\n        p, q = P[u], Q[i]\n        e = r - sum(a * b for a, b in zip(p, q))\n        total += e * e\n        p_old = p[:]\n        for f in range(len(p)):\n            p[f] += lr * (e * q[f] - reg * p[f])\n            q[f] += lr * (e * p_old[f] - reg * q[f])\n    return total / len(ratings)",
  "hints": [
    "Copy P[u] before updating it, so the q update uses the old user vector.",
    "Accumulate e*e before changing any parameters."
  ]
}
```

> [!TIP] Interview tips
> - Write the objective and the SGD update from memory, and mention that the loss uses observed entries only.
> - Compare ALS (closed form, parallel, good for implicit data) with SGD (simple, online, handles large sparse data).
> - Pitfall: tune $d$ and $\lambda$ on a time-split validation set; MF can't score new users/items without a fallback (cold start).
