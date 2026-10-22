---
id: ml-practice-from-scratch-implementations
title: "Practice: Algorithms from scratch (k-means, logistic regression, decision stump)"
estimatedMinutes: 14
difficulty: hard
tags: [ml, practice, implementation, numpy]
---

## Why it matters
"Implement k-means / logistic regression / a decision stump without sklearn" is a common coding-round ask for ML roles. Interviewers check that you know the algorithm, handle edge cases (empty clusters, numerical overflow, ties) and can vectorize with numpy. See K-means, Logistic regression and Decision trees for the theory; this lesson is the implementation checklist.

## Concept
General approach: state the objective, write the update rule, code the smallest correct loop, then vectorize and test on a toy case you can verify by hand.

**Decision stump** (depth-1 tree): for each feature, sort unique values, take **midpoints** between consecutive values as candidate thresholds, and score each split by weighted impurity. Gini for a node with positive fraction $p$ is $2p(1-p)$ for binary labels, and the split score is $\frac{n_L}{n}G_L + \frac{n_R}{n}G_R$. Predict the majority label on each side. Define tie-breaking explicitly. This is also the weak learner in AdaBoost (with sample weights).

**K-means (Lloyd's algorithm)**: repeat (1) assign each point to its nearest center, (2) set each center to the mean of its points, until assignments stop changing. Each step cannot increase inertia $\sum \lVert x_i - \mu_{c_i}\rVert^2$, so it converges, but only to a local optimum: use several initializations or k-means++. Edge cases: **empty clusters** (keep the old center or re-seed), and scaling features first.

**Logistic regression**: minimize mean log loss plus optional L2 penalty $\frac{\lambda}{2}\lVert w\rVert^2$ (bias not penalized). Gradients: $\nabla_w = \frac1n X^\top(p-y) + \lambda w$, $\nabla_b = \overline{p - y}$, with $p = \sigma(Xw+b)$. Numerics: clip $z$ before `exp` (or use a stable sigmoid), clip probabilities away from 0 and 1 inside `log`, scale features, and monitor the loss (it must decrease for a small enough learning rate).

Vectorization habits: avoid Python loops over rows; use broadcasting for distances, `np.argmin(axis=1)`, boolean masks, and `X.T @ r`. Check shapes out loud.

## Worked example
Stump on one feature: $x = [1,2,3,4,5,6]$, $y = [0,0,1,0,1,1]$. Candidate thresholds are $1.5, 2.5, \dots, 5.5$. Weighted Gini:

| threshold | left labels | right labels | score |
|---|---|---|---|
| 1.5 | 0 | 0,1,0,1,1 | $\tfrac56 \cdot 0.48 = 0.40$ |
| 2.5 | 0,0 | 1,0,1,1 | $\tfrac46 \cdot 0.375 = 0.25$ |
| 3.5 | 0,0,1 | 0,1,1 | $\tfrac36\cdot\tfrac49 + \tfrac36\cdot\tfrac49 = 0.444$ |
| 4.5 | 0,0,1,0 | 1,1 | $\tfrac46 \cdot 0.375 = 0.25$ |
| 5.5 | 0,0,1,0,1 | 1 | $\tfrac56 \cdot 0.48 = 0.40$ |

Thresholds 2.5 and 4.5 tie at 0.25; choosing the lowest gives "x <= 2.5 -> 0, else 1", which misclassifies 1 of 6 points ($x=4$). Mention the tie and your rule: interviewers like that you noticed.

K-means by hand: points $(0,0),(0,1),(1,0),(10,10),(10,11),(11,10)$ with initial centers $(0,0)$ and $(10,10)$ converge in one update to $(\tfrac13,\tfrac13)$ and $(\tfrac{31}{3},\tfrac{31}{3})$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which quantity does each step of Lloyd's k-means (assignment, then centroid update) never increase?",
  "options": [
    "Silhouette score",
    "Within-cluster sum of squared distances (inertia)",
    "The number of clusters",
    "Between-cluster distance"
  ],
  "answer": 1,
  "explanation": "Assignment minimizes distance to fixed centers; the mean minimizes squared distance for fixed assignments. So inertia is non-increasing, which guarantees convergence to a local optimum."
}
```

```quiz
{
  "id": "q2",
  "question": "Your from-scratch logistic regression hits NaN loss after a few epochs with unscaled features and learning rate 1.0. What is the most likely fix?",
  "options": [
    "Use more epochs",
    "Scale the features, reduce the learning rate, and guard exp/log numerically",
    "Switch to MSE loss",
    "Add a second bias term"
  ],
  "answer": 1,
  "explanation": "Large unscaled features make gradient steps huge, so z overflows exp or p saturates to exactly 0/1 and log(0) gives NaN. Standardize inputs, lower the step, clip z and probabilities."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `fit_stump(X, y)` where `X` is a list of rows (lists of numbers) and `y` is 0/1 labels. Try every feature and every midpoint between consecutive unique values; score splits by weighted Gini `n_L/n*G_L + n_R/n*G_R` with `G = 2p(1-p)`. Return `(feature, threshold, left_label, right_label)` (left means `x[feature] <= threshold`; a side's label is 1 if its fraction of ones is greater than 0.5 else 0). Break ties by lower feature index, then lower threshold. Also write `predict_stump(stump, X)`.",
  "starterCode": "def fit_stump(X, y):\n    pass\n\ndef predict_stump(stump, X):\n    pass\n\nX = [[1], [2], [3], [4], [5], [6]]\ny = [0, 0, 1, 0, 1, 1]\ns = fit_stump(X, y)\nprint(s, predict_stump(s, X))",
  "tests": "X = [[1], [2], [3], [4], [5], [6]]\ny = [0, 0, 1, 0, 1, 1]\ns = fit_stump(X, y)\nassert s == (0, 2.5, 0, 1)\nassert predict_stump(s, X) == [0, 0, 1, 1, 1, 1]\nX2 = [[1, 0], [3, 0], [2, 1], [4, 1]]\ns2 = fit_stump(X2, [0, 0, 1, 1])\nassert s2 == (1, 0.5, 0, 1)\nassert predict_stump(s2, X2) == [0, 0, 1, 1]",
  "solution": "def _gini(labels):\n    if not labels:\n        return 0.0\n    p = sum(labels) / len(labels)\n    return 2 * p * (1 - p)\n\ndef fit_stump(X, y):\n    n = len(y)\n    best = None\n    for j in range(len(X[0])):\n        vals = sorted(set(row[j] for row in X))\n        for a, b in zip(vals, vals[1:]):\n            t = (a + b) / 2\n            left = [yi for row, yi in zip(X, y) if row[j] <= t]\n            right = [yi for row, yi in zip(X, y) if row[j] > t]\n            score = len(left) / n * _gini(left) + len(right) / n * _gini(right)\n            if best is None or score < best[0] - 1e-12:\n                lab_l = 1 if sum(left) / len(left) > 0.5 else 0\n                lab_r = 1 if sum(right) / len(right) > 0.5 else 0\n                best = (score, (j, t, lab_l, lab_r))\n    return best[1]\n\ndef predict_stump(stump, X):\n    j, t, ll, lr = stump\n    return [ll if row[j] <= t else lr for row in X]",
  "hints": [
    "Candidate thresholds are midpoints of consecutive sorted unique values, so both sides are non-empty.",
    "Update the best only when the score is strictly lower (by a small tolerance); scanning features and thresholds in increasing order then implements the tie rule."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `kmeans(X, centers, n_iter=100)` with numpy (Lloyd's algorithm). Starting from the given `centers` array, repeat: assign each row to its nearest center (squared Euclidean, first index on ties), then move each center to the mean of its assigned rows; a cluster with no points keeps its old center. Stop when assignments no longer change or after `n_iter`. Return `(centers, labels)`.",
  "setup": "import numpy as np",
  "packages": [
    "numpy"
  ],
  "starterCode": "import numpy as np\n\ndef kmeans(X, centers, n_iter=100):\n    pass\n\nX = np.array([[0, 0], [0, 1], [1, 0], [10, 10], [10, 11], [11, 10]], dtype=float)\nprint(kmeans(X, np.array([[0.0, 0.0], [10.0, 10.0]])))",
  "tests": "X = np.array([[0, 0], [0, 1], [1, 0], [10, 10], [10, 11], [11, 10]], dtype=float)\nc, lab = kmeans(X, np.array([[0.0, 0.0], [10.0, 10.0]]))\nassert list(lab) == [0, 0, 0, 1, 1, 1]\nassert np.allclose(c, [[1 / 3, 1 / 3], [31 / 3, 31 / 3]])\nc, lab = kmeans(X, np.array([[0.0, 0.0], [10.0, 10.0], [1000.0, 1000.0]]))\nassert np.allclose(c[2], [1000.0, 1000.0])\nassert sorted(set(lab.tolist())) == [0, 1]\nc, lab = kmeans(X, np.array([[5.0, 5.0]]))\nassert np.allclose(c[0], X.mean(axis=0))\ninit = np.array([[0.0, 0.0], [10.0, 10.0]])\nkmeans(X, init)\nassert np.allclose(init, [[0.0, 0.0], [10.0, 10.0]])",
  "solution": "import numpy as np\n\ndef kmeans(X, centers, n_iter=100):\n    X = np.asarray(X, dtype=float)\n    centers = np.array(centers, dtype=float)\n    labels = None\n    for _ in range(n_iter):\n        d = ((X[:, None, :] - centers[None, :, :]) ** 2).sum(axis=2)\n        new = d.argmin(axis=1)\n        if labels is not None and np.array_equal(new, labels):\n            break\n        labels = new\n        for k in range(len(centers)):\n            mask = labels == k\n            if mask.any():\n                centers[k] = X[mask].mean(axis=0)\n    return centers, labels",
  "hints": [
    "Distances via broadcasting: `X[:, None, :] - centers[None, :, :]` has shape (n, k, d); sum squares over the last axis.",
    "Copy `centers` before mutating, and skip clusters whose mask is empty."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Write `fit_logreg(X, y, lr=0.1, epochs=3000, l2=0.0)` with numpy: batch gradient descent from zeros on mean log loss plus `(l2/2) * ||w||^2` (bias not penalized); return `(w, b)`. Use a numerically stable sigmoid (clip `z` to [-30, 30]). Also write `predict(X, w, b, threshold=0.5)` returning 0/1 labels.",
  "setup": "import numpy as np",
  "packages": [
    "numpy"
  ],
  "starterCode": "import numpy as np\n\ndef sigmoid(z):\n    return 1 / (1 + np.exp(-np.clip(z, -30, 30)))\n\ndef fit_logreg(X, y, lr=0.1, epochs=3000, l2=0.0):\n    pass\n\ndef predict(X, w, b, threshold=0.5):\n    pass\n\nX = np.array([[0.0], [1.0], [2.0], [3.0], [4.0], [5.0]])\ny = np.array([0, 0, 1, 0, 1, 1])\nprint(fit_logreg(X, y))",
  "tests": "X = np.array([[0.0], [1.0], [2.0], [3.0], [4.0], [5.0]])\ny = np.array([0, 0, 1, 0, 1, 1])\nw0, b0 = fit_logreg(X, y)\np = sigmoid(X @ w0 + b0)\nassert np.abs(X.T @ (p - y) / 6).max() < 0.02 and abs(np.mean(p - y)) < 0.02\nw1, b1 = fit_logreg(X, y, l2=0.1, epochs=6000)\np1 = sigmoid(X @ w1 + b1)\ng = X.T @ (p1 - y) / 6 + 0.1 * w1\nassert np.abs(g).max() < 0.01\nassert abs(w1[0]) < abs(w0[0])\npred = predict(X, w0, b0)\nassert pred[0] == 0 and pred[-1] == 1\nbig = np.array([[1000.0], [-1000.0]])\nassert np.all(np.isfinite(sigmoid(big @ np.array([5.0]) + 0)))",
  "solution": "import numpy as np\n\ndef sigmoid(z):\n    return 1 / (1 + np.exp(-np.clip(z, -30, 30)))\n\ndef fit_logreg(X, y, lr=0.1, epochs=3000, l2=0.0):\n    n, d = X.shape\n    w = np.zeros(d)\n    b = 0.0\n    for _ in range(epochs):\n        p = sigmoid(X @ w + b)\n        w -= lr * (X.T @ (p - y) / n + l2 * w)\n        b -= lr * np.mean(p - y)\n    return w, b\n\ndef predict(X, w, b, threshold=0.5):\n    return (sigmoid(X @ w + b) >= threshold).astype(int)",
  "hints": [
    "Gradient of the penalized loss: X.T @ (p - y) / n + l2 * w; the bias gradient is mean(p - y).",
    "L2 shrinks the weights, so the penalized solution has a smaller |w| than the unpenalized one."
  ]
}
```

> [!TIP] Interview tips
> - Write the objective and update rule before coding; test on a toy input you can verify by hand.
> - Call out edge cases proactively: empty clusters, ties, overflow in exp, log(0), feature scaling.
> - Know complexity: k-means $O(nkd)$ per iteration; a stump $O(d\,n\log n)$ with sorting (or $O(dn)$ after one sort and a running scan).
