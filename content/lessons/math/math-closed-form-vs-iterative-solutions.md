---
id: math-closed-form-vs-iterative-solutions
title: Closed-form vs iterative solutions
estimatedMinutes: 10
difficulty: medium
tags: [optimization, linear-regression, normal-equations, gradient-descent]
---

## Why it matters
"Would you solve linear regression with the normal equation or gradient descent?" is a classic question. The answer depends on data size, conditioning and whether the model even has a closed form.

## Concept
**Closed form**: for least squares $\min_w \|Xw - y\|^2$ the **normal equations** give $w = (X^\top X)^{-1} X^\top y$. Ridge: $w = (X^\top X + \lambda I)^{-1} X^\top y$, and the added $\lambda I$ also guarantees invertibility.

**Iterative**: gradient descent repeats $w \leftarrow w - \eta \nabla L(w)$, with $\nabla L = \tfrac{1}{n} X^\top (Xw - y)$ for the mean squared error. Convergence speed depends on the condition number $\kappa = \lambda_{\max}/\lambda_{\min}$ of $X^\top X$.

**Trade-offs** ($n$ samples, $p$ features):
- Normal equations: $O(np^2 + p^3)$. Great for $p$ up to a few thousand; no hyperparameters; exact. But forming $X^\top X$ squares the condition number, so prefer QR or SVD (`np.linalg.lstsq`) over explicit inversion. It fails if features are collinear ($X^\top X$ singular).
- Gradient descent: $O(np)$ per step, memory-light, works with streaming/mini-batches and huge $p$, and applies when there is **no closed form** (logistic regression, neural nets, GBMs). Needs a learning rate and feature scaling.
- Lasso also has no closed form (non-smooth); use coordinate descent or proximal methods.

**Rule of thumb**: small/medium dense problems with a closed form: solve directly (via a stable factorization). Huge, sparse, or non-linear: iterate. Many solvers sit in between (conjugate gradient, L-BFGS).

## Worked example
Fit $y = w_0 + w_1 x$ on points $x = [0,1,2,3]$, $y = [1,3,5,7]$. With $X = [\mathbf 1, x]$: $X^\top X = \begin{bmatrix}4 & 6\\6 & 14\end{bmatrix}$ and $X^\top y = [\sum y, \sum xy]^\top = [16, 34]^\top$. The determinant is $56 - 36 = 20$, so $w_0 = (14 \cdot 16 - 6 \cdot 34)/20 = 20/20 = 1$ and $w_1 = (4 \cdot 34 - 6 \cdot 16)/20 = 40/20 = 2$. One linear solve gives $w = [1, 2]$ exactly.

Gradient descent on the same problem with $\eta = 0.1$ must reach the same $[1, 2]$, but needs hundreds of steps: the Hessian $\tfrac1n X^\top X$ has eigenvalues about 4.2 and 0.30 (condition number about 14), so the slow direction shrinks only by a factor $1 - 0.1 \cdot 0.30 \approx 0.97$ per step.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why is `np.linalg.lstsq` (QR/SVD) preferred over computing $(X^\\top X)^{-1} X^\\top y$ explicitly?",
  "options": [
    "It is always faster",
    "Forming $X^\\top X$ squares the condition number, losing numerical precision",
    "The normal equations are wrong for non-square $X$",
    "It works for non-linear models"
  ],
  "answer": 1,
  "explanation": "$\\kappa(X^\\top X) = \\kappa(X)^2$. Factorizing $X$ directly avoids that loss, and an explicit inverse is rarely needed anyway."
}
```

```quiz
{
  "id": "q2",
  "question": "Which model has no closed-form solution and must be fit iteratively?",
  "options": [
    "Ordinary least squares",
    "Ridge regression",
    "Logistic regression",
    "Linear regression with an intercept"
  ],
  "answer": 2,
  "explanation": "The logistic loss gives a non-linear gradient equation. It is solved with Newton/IRLS, L-BFGS or gradient methods."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `ols_closed(X, y)` (solve the normal equations with `np.linalg.solve`), `ridge_closed(X, y, lam)` and `gd_ols(X, y, lr, steps)` which runs gradient descent on the mean squared error $\\tfrac{1}{2n}\\|Xw - y\\|^2$ starting from zeros, using gradient $\\tfrac1n X^\\top (Xw - y)$.",
  "setup": "import numpy as np",
  "starterCode": "def ols_closed(X, y):\n    pass\n\ndef ridge_closed(X, y, lam):\n    pass\n\ndef gd_ols(X, y, lr, steps):\n    pass\n\nX = np.column_stack([np.ones(4), np.arange(4.0)])\ny = np.array([1.0, 3.0, 5.0, 7.0])\nprint(ols_closed(X, y), gd_ols(X, y, 0.1, 1000))",
  "tests": "X = np.column_stack([np.ones(4), np.arange(4.0)])\ny = np.array([1.0, 3.0, 5.0, 7.0])\nassert np.allclose(ols_closed(X, y), [1.0, 2.0])\nassert np.allclose(gd_ols(X, y, 0.1, 1000), [1.0, 2.0], atol=1e-6)\nassert np.allclose(ridge_closed(X, y, 0.0), ols_closed(X, y))\nX1 = np.array([[1.0], [2.0]])\ny1 = np.array([1.0, 2.0])\nassert np.allclose(ridge_closed(X1, y1, 1.0), [5.0 / 6.0])\nassert np.allclose(gd_ols(X1, y1, 0.1, 0), [0.0])",
  "solution": "def ols_closed(X, y):\n    return np.linalg.solve(X.T @ X, X.T @ y)\n\ndef ridge_closed(X, y, lam):\n    p = X.shape[1]\n    return np.linalg.solve(X.T @ X + lam * np.eye(p), X.T @ y)\n\ndef gd_ols(X, y, lr, steps):\n    n, p = X.shape\n    w = np.zeros(p)\n    for _ in range(steps):\n        w = w - lr * (X.T @ (X @ w - y)) / n\n    return w",
  "packages": [
    "numpy"
  ],
  "hints": [
    "Normal equations: solve `(X.T @ X) w = X.T @ y`.",
    "Ridge just adds `lam * I` to `X.T @ X`; gradient descent starts at `np.zeros(p)`."
  ]
}
```

> [!TIP] Interview tips
> - Give the decision rule: closed form when $p$ is small and the problem is linear and well-conditioned; iterative for huge $n$ or $p$, streaming data, or no closed form.
> - Mention numerical stability (QR/SVD, not an explicit inverse) and that ridge fixes singular $X^\top X$.
> - Follow-up: "What if $X^\top X$ is singular?" Collinear or $p > n$: use ridge, the pseudo-inverse, or drop features.
