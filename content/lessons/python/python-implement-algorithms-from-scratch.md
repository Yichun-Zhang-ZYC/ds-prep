---
id: python-implement-algorithms-from-scratch
title: Implement algorithms from scratch (k-means, linear regression, kNN)
estimatedMinutes: 20
difficulty: medium
tags: [python, coding-interview, numpy, ml]
---

## Why it matters
"Implement k-means / linear regression / kNN in NumPy" is a staple of DS and MLE coding rounds. It tests vectorization, shape discipline, and understanding of the algorithm, all within 20–30 minutes.

## Concept
A reliable approach in the interview:
1. **Clarify** inputs/outputs (shapes, dtypes), edge cases, and whether NumPy is allowed.
2. **State the algorithm** in 2–3 lines before coding.
3. **Write a clean, vectorized version**, naming shapes in comments.
4. **Test** on a tiny hand-checkable example; mention complexity.

Templates:

```python
# Linear regression via gradient descent        X: (n, d), y: (n,)
w, b = np.zeros(d), 0.0
for _ in range(epochs):
    err = X @ w + b - y                          # (n,)
    w -= lr * (X.T @ err) / n                    # (d,)
    b -= lr * err.mean()

# kNN classify                                   X_train: (n, d), X_test: (m, d)
d2 = ((X_test[:, None, :] - X_train[None, :, :]) ** 2).sum(-1)   # (m, n)
nn = np.argsort(d2, axis=1)[:, :k]                               # (m, k)
votes = y_train[nn]                                              # (m, k)

# k-means step                                   X: (n, d), C: (k, d)
labels = ((X[:, None, :] - C[None]) ** 2).sum(-1).argmin(1)      # (n,)
C = np.array([X[labels == j].mean(0) for j in range(k)])         # (k, d)
```

Complexity to quote: k-means O(n·k·d) per iteration; brute-force kNN O(m·n·d) per batch of queries; gradient descent O(n·d) per epoch (closed-form OLS O(n·d² + d³)).

Common follow-ups: handle empty clusters, k-means++ init, standardize features, add L2 regularization, use `np.linalg.lstsq` for the closed form, break kNN ties.

## Worked example
For linear regression with lr = 0.1 on standardized features, verify convergence by comparing against `np.linalg.lstsq` on the same data; coefficients should agree to ~1e-3. If the loss diverges, the learning rate is too large or features aren't scaled.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Your gradient-descent linear regression loss explodes to inf after a few epochs. Most likely cause?",
  "options": ["Too few epochs", "Learning rate too high and/or unscaled features", "Using NumPy", "Too much data"],
  "answer": 1,
  "explanation": "Large steps overshoot the minimum; standardize features and lower the learning rate."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement with NumPy: `linreg_gd(X, y, lr=0.1, epochs=2000)` returning `(w, b)` via batch gradient descent on MSE; `knn_predict(X_train, y_train, X_test, k)` returning majority-vote labels (ties → smallest label, e.g. via np.bincount(...).argmax() on integer labels); `kmeans(X, init_centroids, iters=20)` returning `(centroids, labels)` (keep a centroid unchanged if its cluster is empty).",
  "setup": "import numpy as np",
  "packages": ["numpy"],
  "starterCode": "import numpy as np\n\ndef linreg_gd(X, y, lr=0.1, epochs=2000):\n    pass\n\ndef knn_predict(X_train, y_train, X_test, k):\n    pass\n\ndef kmeans(X, init_centroids, iters=20):\n    pass\n",
  "tests": "rng = np.random.default_rng(0)\nX = rng.normal(size=(100, 2))\ny = 1.5 + X @ np.array([2.0, -1.0])\nw, b = linreg_gd(X, y)\nassert np.allclose(w, [2.0, -1.0], atol=1e-3) and abs(b - 1.5) < 1e-3\nXt = np.array([[0., 0.], [0., 1.], [5., 5.], [5., 6.]])\nyt = np.array([0, 0, 1, 1])\nassert list(knn_predict(Xt, yt, np.array([[0.2, 0.5], [5.5, 5.0]]), 3)) == [0, 1]\nassert list(knn_predict(Xt, yt, np.array([[2.5, 3.0]]), 4)) == [0]\nXk = np.array([[0., 0.], [0., 1.], [10., 10.], [10., 11.]])\nC, L = kmeans(Xk, np.array([[0., 0.], [1., 1.]]))\nassert np.allclose(C, [[0, 0.5], [10, 10.5]]) and list(L) == [0, 0, 1, 1]",
  "solution": "import numpy as np\n\ndef linreg_gd(X, y, lr=0.1, epochs=2000):\n    n, d = X.shape\n    w, b = np.zeros(d), 0.0\n    for _ in range(epochs):\n        err = X @ w + b - y\n        w -= lr * (X.T @ err) / n\n        b -= lr * err.mean()\n    return w, b\n\ndef knn_predict(X_train, y_train, X_test, k):\n    d2 = ((X_test[:, None, :] - X_train[None, :, :]) ** 2).sum(-1)\n    nn = np.argsort(d2, axis=1, kind='stable')[:, :k]\n    return np.array([np.bincount(y_train[row]).argmax() for row in nn])\n\ndef kmeans(X, init_centroids, iters=20):\n    C = init_centroids.astype(float).copy()\n    for _ in range(iters):\n        labels = ((X[:, None, :] - C[None]) ** 2).sum(-1).argmin(1)\n        for j in range(len(C)):\n            pts = X[labels == j]\n            if len(pts):\n                C[j] = pts.mean(0)\n    return C, labels",
  "hints": ["Gradient of MSE/2: X.T @ err / n for w, mean(err) for b.", "np.bincount(labels).argmax() returns the smallest label among ties."]
}
```

> [!TIP] Interview tips
> - Narrate shapes as you write: most bugs are shape bugs.
> - Start with a correct simple version, then vectorize; test on a 4-point example.
> - Mention complexity and follow-ups (k-means++, empty clusters, scaling, regularization, approximate NN).
