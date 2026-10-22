---
id: math-norms-and-regularization-geometry
title: Norms and the geometry of regularization
estimatedMinutes: 13
difficulty: medium
tags: [math, norms, regularization, lasso, ridge]
---

## Why it matters

"Why does L1 give sparsity?" is one of the most asked ML theory questions, and a picture plus one formula is the strong answer. This lesson goes deeper than the basic regularization lesson: norms as geometry, soft-thresholding, projections and the Bayesian view.

## Concept

**Norms**: $\lVert x\rVert_p = (\sum_i |x_i|^p)^{1/p}$. The unit ball is a diamond for $p = 1$, a disk for $p = 2$, a square for $p = \infty$. For $p < 1$ it is non-convex (a star), and the "L0 norm" (count of nonzeros) is not a norm at all. Matrix analogues: Frobenius $\lVert A\rVert_F^2 = \sum A_{ij}^2$ (L2 on entries), nuclear norm $=\sum \sigma_i$ (L1 on singular values, promotes low rank), spectral norm $= \sigma_{\max}$.

**Penalty vs constraint**: $\min L(w) + \lambda\lVert w\rVert$ is equivalent to $\min L(w)$ s.t. $\lVert w\rVert \le t$ for some $t(\lambda)$ (Lagrange multipliers, see that lesson). The solution sits where a loss contour first touches the ball. A diamond meets a smooth contour at a corner with high probability, and corners have zero coordinates. A disk has no corners, so weights shrink but stay nonzero.

**Closed forms** with an orthonormal design ($X^\top X = I$, $z = X^\top y$ is the OLS solution): ridge gives $\hat w_j = z_j/(1 + \lambda)$, a uniform shrink; lasso gives $\hat w_j = \operatorname{sign}(z_j)\max(|z_j| - \lambda, 0)$, **soft-thresholding**: kill small, subtract $\lambda$ from large. In general ridge shrinks the SVD component $j$ by $\sigma_j^2/(\sigma_j^2 + \lambda)$, so low-variance directions are damped most.

**Bayesian view**: Gaussian prior $\Rightarrow$ L2; Laplace prior (sharp peak at 0) $\Rightarrow$ L1. **Elastic net** $\alpha\lVert w\rVert_1 + (1-\alpha)\lVert w\rVert_2^2$ keeps sparsity but spreads weight across correlated features, where lasso picks one arbitrarily. Lasso selects at most $n$ features when $p > n$.

**Practical notes**: standardize features before penalizing; don't penalize the intercept; with Adam, L2 added to the loss is not the same as decoupled weight decay (AdamW), because the adaptive denominator rescales the L2 gradient. Lasso is solved by coordinate descent or proximal gradient ($w \leftarrow S(w - \eta\nabla L, \eta\lambda)$).

## Worked example

Minimize $\lVert w - c\rVert^2$ for $c = (3, 1)$ subject to a norm budget of 2.

L2 ball ($\lVert w\rVert_2 \le 2$): rescale $c$ to length 2. $\lVert c\rVert = \sqrt{10} \approx 3.162$, so $w = 2c/\sqrt{10} \approx (1.897, 0.632)$. Both coordinates shrink proportionally and stay nonzero.

L1 ball ($\lVert w\rVert_1 \le 2$): soft-threshold $c$ by $\theta$ with $(3 - \theta) + \max(1 - \theta, 0) = 2$. Trying $\theta = 1$ gives $2 + 0 = 2$. So $w = (2, 0)$: the second coordinate is exactly 0. The small coordinate is eliminated, which is feature selection in miniature.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why does an L1 penalty tend to produce exactly-zero coefficients while L2 does not?",
  "options": [
    "L1 is differentiable at 0, which pulls weights there",
    "The L1 ball has corners on the axes, and the loss contours usually first touch the constraint set at a corner; the L1 penalty also has a constant pull toward 0 that beats a small gradient",
    "L2 ignores small weights",
    "L1 has a smaller norm value"
  ],
  "answer": 1,
  "explanation": "Geometrically the diamond has vertices on the axes. Analytically the L1 subgradient at 0 is the interval $[-\\lambda, \\lambda]$, so any weight whose loss gradient is smaller than $\\lambda$ stays at exactly 0; the L2 pull $2\\lambda w$ vanishes as $w \\to 0$."
}
```

```quiz
{
  "id": "q2",
  "question": "Ridge regression is the MAP estimate under which prior on the weights (with Gaussian noise)?",
  "options": [
    "Laplace prior",
    "Gaussian prior centered at 0",
    "Uniform prior",
    "Cauchy prior"
  ],
  "answer": 1,
  "explanation": "A $N(0, \\tau^2)$ prior gives $-\\log p(w) = \\lVert w\\rVert^2 / 2\\tau^2 + \\text{const}$, an L2 penalty with $\\lambda = \\sigma^2/\\tau^2$. A Laplace prior gives the L1 penalty (lasso)."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Pure Python. For the orthonormal-design problem, the per-coordinate solutions are closed-form. Implement `soft_threshold(z, lam)` (lasso: $\\operatorname{sign}(z)\\max(|z| - \\lambda, 0)$), `ridge_shrink(z, lam)` ($z/(1+\\lambda)$) and `lp_norm(v, p)` for $p \\ge 1$ (also accept `p=float('inf')`).",
  "starterCode": "def soft_threshold(z, lam):\n    pass\n\ndef ridge_shrink(z, lam):\n    pass\n\ndef lp_norm(v, p):\n    pass\n",
  "tests": "assert soft_threshold(3, 1) == 2\nassert soft_threshold(-3, 1) == -2\nassert soft_threshold(0.8, 1) == 0\nassert soft_threshold(-0.5, 1) == 0\nassert abs(ridge_shrink(3, 1) - 1.5) < 1e-12\nassert abs(lp_norm([3, 4], 2) - 5) < 1e-12\nassert abs(lp_norm([3, -4], 1) - 7) < 1e-12\nassert lp_norm([3, -4, 2], float('inf')) == 4\nassert abs(lp_norm([1, 1, 1], 3) - 3 ** (1 / 3)) < 1e-12",
  "solution": "def soft_threshold(z, lam):\n    if z > lam:\n        return z - lam\n    if z < -lam:\n        return z + lam\n    return 0.0\n\ndef ridge_shrink(z, lam):\n    return z / (1.0 + lam)\n\ndef lp_norm(v, p):\n    if p == float('inf'):\n        return max(abs(x) for x in v)\n    return sum(abs(x) ** p for x in v) ** (1.0 / p)",
  "hints": [
    "Soft-thresholding returns 0 whenever $|z| \\le \\lambda$ and otherwise moves $z$ toward 0 by $\\lambda$.",
    "The $p = \\infty$ norm is the maximum absolute entry."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Pure Python. Implement the Euclidean projections `project_l2(v, r)` and `project_l1(v, r)` onto the balls $\\lVert x\\rVert_2 \\le r$ and $\\lVert x\\rVert_1 \\le r$. For L1: if $\\lVert v\\rVert_1 \\le r$ return `v`; otherwise sort $|v|$ descending as $u$, find the largest $k$ (1-indexed) with $u_k - (\\sum_{i\\le k} u_i - r)/k > 0$, set $\\theta = (\\sum_{i \\le k} u_i - r)/k$, and soft-threshold every entry by $\\theta$.",
  "starterCode": "def project_l2(v, r):\n    pass\n\ndef project_l1(v, r):\n    pass\n",
  "tests": "a = project_l2([3.0, 1.0], 2.0)\nn = (10 ** 0.5)\nassert abs(a[0] - 6 / n) < 1e-12 and abs(a[1] - 2 / n) < 1e-12\nassert project_l2([0.3, 0.4], 2.0) == [0.3, 0.4]\nb = project_l1([3.0, 1.0], 2.0)\nassert abs(b[0] - 2) < 1e-12 and abs(b[1]) < 1e-12\nc = project_l1([3.0, -2.0, 0.5], 3.0)\nassert abs(sum(abs(x) for x in c) - 3) < 1e-12\nassert abs(c[0] - 2) < 1e-12 and abs(c[1] + 1) < 1e-12 and abs(c[2]) < 1e-12\nassert project_l1([0.5, -0.5], 2.0) == [0.5, -0.5]",
  "solution": "def project_l2(v, r):\n    n = sum(x * x for x in v) ** 0.5\n    if n <= r:\n        return list(v)\n    return [x * r / n for x in v]\n\ndef project_l1(v, r):\n    if sum(abs(x) for x in v) <= r:\n        return list(v)\n    u = sorted((abs(x) for x in v), reverse=True)\n    css = 0.0\n    theta = 0.0\n    for k, uk in enumerate(u, start=1):\n        css += uk\n        t = (css - r) / k\n        if uk - t > 0:\n            theta = t\n    return [(1 if x > 0 else -1) * max(abs(x) - theta, 0.0) for x in v]",
  "hints": [
    "The L2 projection just rescales a point outside the ball onto the sphere.",
    "Track the $\\theta$ of the last $k$ for which the condition holds (it holds for a prefix of $k$ values)."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Using numpy, implement `lasso_cd(X, y, lam, sweeps=500)` for $\\tfrac12\\lVert y - Xw\\rVert^2 + \\lambda\\lVert w\\rVert_1$ by cyclic coordinate descent: for each $j$, with partial residual $r = y - Xw + X_j w_j$, set $w_j = S(X_j^\\top r, \\lambda) / (X_j^\\top X_j)$ where $S$ is soft-thresholding. Return `w`.",
  "setup": "import numpy as np",
  "starterCode": "def lasso_cd(X, y, lam, sweeps=500):\n    pass\n",
  "tests": "rng = np.random.default_rng(0)\nQ, _ = np.linalg.qr(rng.normal(size=(20, 3)))\ny = rng.normal(size=20)\nz = Q.T @ y\nw = lasso_cd(Q, y, 0.1)\nexp = np.sign(z) * np.maximum(np.abs(z) - 0.1, 0)\nassert np.allclose(w, exp, atol=1e-8)\nX = rng.normal(size=(30, 4))\nw_true = np.array([2.0, 0.0, -1.0, 0.0])\ny = X @ w_true + 0.1 * rng.normal(size=30)\nlam = 5.0\nw = lasso_cd(X, y, lam, sweeps=2000)\ng = X.T @ (y - X @ w)\nfor j in range(4):\n    if abs(w[j]) > 1e-10:\n        assert abs(g[j] - lam * np.sign(w[j])) < 1e-6\n    else:\n        assert abs(g[j]) <= lam + 1e-6\nassert np.all(lasso_cd(X, y, np.abs(X.T @ y).max() + 1e-9) == 0)",
  "solution": "def lasso_cd(X, y, lam, sweeps=500):\n    n, d = X.shape\n    w = np.zeros(d)\n    sq = (X ** 2).sum(axis=0)\n    for _ in range(sweeps):\n        for j in range(d):\n            r = y - X @ w + X[:, j] * w[j]\n            rho = X[:, j] @ r\n            w[j] = np.sign(rho) * max(abs(rho) - lam, 0.0) / sq[j]\n    return w",
  "packages": [
    "numpy"
  ],
  "hints": [
    "Recompute the partial residual for each coordinate (small problems, so cost is fine).",
    "At the optimum, $X_j^\\top(y - Xw) = \\lambda\\,\\text{sign}(w_j)$ for nonzero $w_j$ and $|X_j^\\top(y - Xw)| \\le \\lambda$ for zeros (the KKT conditions)."
  ]
}
```

> [!TIP] Interview tips
> - Give the answer in three layers: geometry (corners), calculus (subgradient at 0 is an interval), Bayes (Laplace prior). Draw the diamond and disk.
> - Know soft-thresholding and the ridge shrink factor $\sigma^2/(\sigma^2+\lambda)$; they show you understand the estimators, not just the slogans.
> - Pitfalls: not standardizing before regularizing, regularizing the bias, and claiming lasso is stable with correlated features (it isn't; use elastic net). Mention AdamW for deep nets.
