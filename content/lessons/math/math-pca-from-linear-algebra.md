---
id: math-pca-from-linear-algebra
title: PCA from first principles
estimatedMinutes: 14
difficulty: medium
tags: [math, pca, linear-algebra, svd, dimensionality-reduction]
---

## Why it matters

"Derive PCA" is a classic: it tests linear algebra, optimization and practical judgement in one question. This lesson builds it from first principles and ties it to eigendecomposition and SVD (see those lessons).

## Concept

**Setup**: center the data ($X_c = X - \bar x$), so the sample covariance is $S = X_c^\top X_c/(n-1)$. The variance of the data projected on a unit vector $w$ is $w^\top S w$.

**Derivation**: maximize $w^\top S w$ s.t. $w^\top w = 1$. The Lagrangian $w^\top S w - \lambda(w^\top w - 1)$ gives $Sw = \lambda w$, so $w$ is an eigenvector and the variance is $\lambda$. Take the top eigenvector as PC1; PC2 maximizes variance among vectors orthogonal to PC1, and so on. Because $S$ is symmetric PSD, eigenvectors are orthogonal and eigenvalues are $\ge 0$. Equivalent view: the top-$k$ subspace minimizes the squared reconstruction error.

**Via SVD** (what libraries do): $X_c = U\Sigma V^\top$. Columns of $V$ are the PCs, variances are $\sigma_j^2/(n-1)$, scores are $X_c V = U\Sigma$, and the rank-$k$ reconstruction is $U_k\Sigma_k V_k^\top$. By Eckart-Young it is the best rank-$k$ approximation: error $\lVert X_c - \hat X_k\rVert_F^2 = \sum_{j>k}\sigma_j^2$. SVD avoids forming $X^\top X$, which squares the condition number.

**Choosing $k$**: explained variance ratio $\lambda_j/\sum\lambda$; keep enough for 90-95% cumulative, or look for an elbow in the scree plot, or pick $k$ by the downstream task's validation score. **Whitening** divides scores by $\sqrt{\lambda_j}$ to get identity covariance.

**Pitfalls**: (1) always center; (2) scale matters: PCA on raw features is dominated by large-unit variables, so standardize (correlation matrix) unless units are comparable; (3) variance is not relevance: a low-variance direction can be the predictive one (PCA is unsupervised); (4) only linear structure and outliers distort it; (5) signs of components are arbitrary; (6) with $n < d$ at most $n - 1$ components have nonzero variance.

## Worked example

Four points $(-2,-2), (0,0), (0,2), (2,0)$. The mean is $(0, 0)$, $X_c^\top X_c = \begin{pmatrix}8&4\\4&8\end{pmatrix}$, so $S = \tfrac13\begin{pmatrix}8&4\\4&8\end{pmatrix}$.

Eigenvalues of $\begin{pmatrix}8&4\\4&8\end{pmatrix}$ are $12$ and $4$ (eigenvectors $(1,1)/\sqrt2$ and $(1,-1)/\sqrt2$), so the PC variances are $12/3 = 4$ and $4/3$. Explained variance ratio of PC1: $4/(4 + 4/3) = 0.75$.

Scores on PC1: $(x + y)/\sqrt2 = (-2\sqrt2, 0, \sqrt2, \sqrt2)$; squares sum to $8 + 0 + 2 + 2 = 12$, matching. Keeping only PC1 leaves reconstruction error $\sigma_2^2 = 4$ (the sum of squared PC2 scores: $0 + 0 + 2 + 2$), which is 25% of the total sum of squares 16.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "PCA directions are the eigenvectors of the covariance matrix. Why the ones with the largest eigenvalues?",
  "options": [
    "They are the shortest vectors",
    "For a unit vector $w$, $w^\\top S w$ is the variance of the projection; it is maximized by the top eigenvector and equals its eigenvalue",
    "They minimize the number of features",
    "They are orthogonal to the data"
  ],
  "answer": 1,
  "explanation": "Maximizing $w^\\top S w$ s.t. $\\lVert w\\rVert = 1$ gives $Sw = \\lambda w$ (Lagrange), and the objective equals $\\lambda$. Later components maximize variance subject to being orthogonal to the earlier ones."
}
```

```quiz
{
  "id": "q2",
  "question": "The centered data matrix $X_c$ ($n \\times d$) has singular values $\\sigma_j$. What is the variance captured by PC $j$?",
  "options": [
    "$\\sigma_j$",
    "$\\sigma_j^2$",
    "$\\sigma_j^2/(n-1)$",
    "$\\sigma_j/(n-1)$"
  ],
  "answer": 2,
  "explanation": "$X_c^\\top X_c = V\\Sigma^2 V^\\top$, so the covariance $X_c^\\top X_c/(n-1)$ has eigenvalues $\\sigma_j^2/(n-1)$."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Using numpy, implement `pca_eig(X, k)`: center the columns, form the covariance $S = X_c^\\top X_c/(n-1)$, take its eigendecomposition (`np.linalg.eigh`) and return `(components, variances, scores)` for the top `k` directions in descending order. `components` has shape `(k, d)` (one unit vector per row), `variances` has shape `(k,)` and `scores = X_c @ components.T`.",
  "setup": "import numpy as np",
  "starterCode": "def pca_eig(X, k):\n    pass\n",
  "tests": "X = np.array([[-2.0, -2.0], [0.0, 0.0], [0.0, 2.0], [2.0, 0.0]])\ncomps, var, scores = pca_eig(X, 2)\nassert comps.shape == (2, 2) and var.shape == (2,) and scores.shape == (4, 2)\nassert np.allclose(var, [4.0, 4.0 / 3], atol=1e-9)\nassert np.allclose(np.abs(comps[0]), [2 ** -0.5, 2 ** -0.5])\nassert np.allclose(np.abs(scores[:, 0]), np.abs([-2 * 2 ** 0.5, 0, 2 ** 0.5, 2 ** 0.5]))\nassert np.allclose(scores.var(axis=0, ddof=1), var)\nassert abs(comps[0] @ comps[1]) < 1e-12\nc1, v1, s1 = pca_eig(X, 1)\nassert c1.shape == (1, 2) and s1.shape == (4, 1) and abs(v1[0] - 4.0) < 1e-9",
  "solution": "def pca_eig(X, k):\n    Xc = X - X.mean(axis=0)\n    n = X.shape[0]\n    S = Xc.T @ Xc / (n - 1)\n    vals, vecs = np.linalg.eigh(S)\n    order = np.argsort(vals)[::-1][:k]\n    comps = vecs[:, order].T\n    return comps, vals[order], Xc @ comps.T",
  "packages": [
    "numpy"
  ],
  "hints": [
    "`np.linalg.eigh` returns eigenvalues in ascending order; sort descending.",
    "Eigenvectors are the columns of the returned matrix; transpose to get one per row."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Using numpy, implement `pca_svd(X, k)` returning `(components, variances, scores)` from the SVD of the centered data ($\\text{variance}_j = \\sigma_j^2/(n-1)$, components are rows of $V^\\top$, scores $= U\\Sigma$ truncated). Also implement `recon_error(X, k)`: the squared Frobenius error $\\lVert X_c - X_c V_k V_k^\\top\\rVert_F^2$ of projecting onto the top `k` components and back.",
  "setup": "import numpy as np",
  "starterCode": "def pca_svd(X, k):\n    pass\n\ndef recon_error(X, k):\n    pass\n",
  "tests": "X = np.array([[-2.0, -2.0], [0.0, 0.0], [0.0, 2.0], [2.0, 0.0]])\ncomps, var, scores = pca_svd(X, 2)\nassert np.allclose(var, [4.0, 4.0 / 3], atol=1e-9)\nassert np.allclose(np.abs(comps[0]), [2 ** -0.5, 2 ** -0.5])\nXc = X - X.mean(axis=0)\nassert np.allclose(np.abs(scores), np.abs(Xc @ comps.T))\nassert abs(recon_error(X, 1) - 4.0) < 1e-9\nassert abs(recon_error(X, 2)) < 1e-9\nrng = np.random.default_rng(3)\nY = rng.normal(size=(30, 5)) @ rng.normal(size=(5, 5))\nsv = np.linalg.svd(Y - Y.mean(0), compute_uv=False)\nfor k in range(1, 5):\n    assert abs(recon_error(Y, k) - (sv[k:] ** 2).sum()) < 1e-8",
  "solution": "def pca_svd(X, k):\n    Xc = X - X.mean(axis=0)\n    n = X.shape[0]\n    U, s, Vt = np.linalg.svd(Xc, full_matrices=False)\n    return Vt[:k], s[:k] ** 2 / (n - 1), U[:, :k] * s[:k]\n\ndef recon_error(X, k):\n    Xc = X - X.mean(axis=0)\n    U, s, Vt = np.linalg.svd(Xc, full_matrices=False)\n    V = Vt[:k].T\n    R = Xc - Xc @ V @ V.T\n    return float((R ** 2).sum())",
  "packages": [
    "numpy"
  ],
  "hints": [
    "`np.linalg.svd(Xc, full_matrices=False)` returns `U, s, Vt`; the rows of `Vt` are the principal directions.",
    "The error equals the sum of the squared dropped singular values (Eckart-Young), which is a nice self-check."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Using numpy, implement `choose_k(variances, target)` returning the smallest `k` whose cumulative explained-variance ratio is at least `target`, and `whiten(X)` returning PCA-whitened data $Z = X_c V \\Lambda^{-1/2}$ (all components) so that `Z` has identity covariance (use `ddof=1`).",
  "setup": "import numpy as np",
  "starterCode": "def choose_k(variances, target):\n    pass\n\ndef whiten(X):\n    pass\n",
  "tests": "assert choose_k([4.0, 4.0 / 3], 0.75) == 1\nassert choose_k([4.0, 4.0 / 3], 0.76) == 2\nassert choose_k([5, 3, 1, 1], 0.9) == 3\nassert choose_k([5, 3, 1, 1], 1.0) == 4\nrng = np.random.default_rng(5)\nY = rng.normal(size=(200, 3)) @ np.array([[2.0, 0.5, 0.0], [0.0, 1.0, 0.3], [0.0, 0.0, 0.2]]) + 7\nZ = whiten(Y)\nassert np.allclose(Z.mean(axis=0), 0, atol=1e-9)\nassert np.allclose(np.cov(Z, rowvar=False), np.eye(3), atol=1e-8)",
  "solution": "def choose_k(variances, target):\n    total = float(sum(variances))\n    cum = 0.0\n    for i, v in enumerate(variances, start=1):\n        cum += v\n        if cum / total >= target - 1e-12:\n            return i\n    return len(variances)\n\ndef whiten(X):\n    Xc = X - X.mean(axis=0)\n    S = Xc.T @ Xc / (X.shape[0] - 1)\n    vals, vecs = np.linalg.eigh(S)\n    return Xc @ vecs / np.sqrt(vals)",
  "packages": [
    "numpy"
  ],
  "hints": [
    "Variances are sorted descending; accumulate until the ratio reaches the target (allow a tiny float tolerance).",
    "Projecting onto eigenvectors decorrelates; dividing each score by $\\sqrt{\\lambda_j}$ equalizes the variances."
  ]
}
```

> [!TIP] Interview tips
> - Give the derivation in two sentences: maximize $w^\top S w$ on the unit sphere, so $Sw = \lambda w$. Then say "in practice via SVD of the centered matrix".
> - Be ready for: scaling/standardizing, how to pick $k$, PCA vs. regression (PCA minimizes perpendicular distance, regression vertical), PCA vs. SVD, and why PCA before a linear model can drop predictive low-variance signal.
> - Pitfall: forgetting to center, or fitting PCA on the full dataset before the train/test split (leakage). Fit on train, transform test.
