---
id: math-jacobian-hessian
title: Jacobian, Hessian
estimatedMinutes: 12
difficulty: medium
tags: [math, calculus, jacobian, hessian, optimization]
---

## Why it matters
The Jacobian is the derivative of vector-valued functions (layers, softmax, transformations). The Hessian describes curvature, which governs how fast gradient descent converges, whether a critical point is a minimum or a saddle, and what second-order methods like Newton's method do.

## Concept
**Jacobian**: for $f: \mathbb R^n \to \mathbb R^m$, $J_{ij} = \frac{\partial f_i}{\partial x_j}$ is an $m \times n$ matrix, the best linear approximation $f(x + \delta) \approx f(x) + J\delta$. The chain rule becomes a matrix product: $J_{f \circ g} = J_f(g(x))\,J_g(x)$. For scalar $f$ ($m = 1$) the Jacobian is the gradient written as a row. Backprop never forms big Jacobians; it multiplies a row vector $\frac{\partial L}{\partial v}$ by Jacobians (a vector-Jacobian product).

**Softmax Jacobian**: for $s = \text{softmax}(z)$, $\frac{\partial s_i}{\partial z_j} = s_i(\delta_{ij} - s_j)$, i.e. $\text{diag}(s) - ss^\top$. Its rows sum to 0 because the outputs always sum to 1.

**Hessian**: for scalar $f: \mathbb R^n \to \mathbb R$, $H_{ij} = \frac{\partial^2 f}{\partial x_i \partial x_j}$ is the Jacobian of the gradient. It is symmetric when second derivatives are continuous. It has $n^2$ entries, which is why it is rarely formed for large networks.

**What the Hessian tells you** (at a critical point $\nabla f = 0$, by eigenvalues):
- All $> 0$ (positive definite): local minimum.
- All $< 0$: local maximum.
- Mixed signs: **saddle point**. In high dimensions saddles are far more common than local minima.
- Condition number $\lambda_{\max}/\lambda_{\min}$ measures how elongated the valley is; large values make gradient descent slow and zig-zag.

**Newton's method**: minimize the local quadratic model to get the step $\Delta x = -H^{-1}\nabla f$. It converges in one step on a quadratic, but costs $O(n^3)$ to solve and needs $H$ to be positive definite. Quasi-Newton methods (L-BFGS) approximate $H^{-1}$ cheaply.

**Hessian of common losses**: for logistic regression $H = X^\top \text{diag}(p(1-p)) X$, which is positive semi-definite, so the loss is convex.

## Worked example
Let $f(x, y) = x^2 y$. Gradient: $\nabla f = (2xy,\ x^2)$. Hessian: $H = \begin{pmatrix} 2y & 2x \\ 2x & 0 \end{pmatrix}$.

At $(1, 2)$: $H = \begin{pmatrix} 4 & 2 \\ 2 & 0 \end{pmatrix}$, trace 4, determinant $-4$. Eigenvalues solve $\lambda^2 - 4\lambda - 4 = 0$, so $\lambda = 2 \pm 2\sqrt2 \approx 4.83,\ -0.83$. Mixed signs: the surface curves up along one direction and down along another, a saddle shape. (Here $\nabla f = (4, 1) \neq 0$, so this is not a critical point; the eigenvalues describe local curvature only.)

Jacobian of a vector map $F(x, y) = (x^2 y,\ 5x + \sin y)$:
$J = \begin{pmatrix} 2xy & x^2 \\ 5 & \cos y \end{pmatrix}$, which at $(1, 0)$ is $\begin{pmatrix} 0 & 1 \\ 5 & 1 \end{pmatrix}$.

Newton on the quadratic $f(x) = \tfrac12 x^\top A x - b^\top x$: $\nabla f = Ax - b$, $H = A$, so from any $x_0$ the step $-A^{-1}(Ax_0 - b)$ lands exactly on $x^* = A^{-1}b$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A critical point has a Hessian with eigenvalues $(3, 1, -0.5)$. What is it?",
  "options": [
    "Local minimum",
    "Local maximum",
    "Saddle point",
    "Cannot tell without the gradient"
  ],
  "answer": 2,
  "explanation": "Mixed-sign eigenvalues mean the function curves up along two directions and down along one: a saddle point."
}
```

```quiz
{
  "id": "q2",
  "question": "What is the shape of the Jacobian of a layer $f: \\mathbb R^{512} \\to \\mathbb R^{128}$?",
  "options": [
    "$512 \\times 128$",
    "$128 \\times 512$",
    "$512 \\times 512$",
    "$128 \\times 128$"
  ],
  "answer": 1,
  "explanation": "$J_{ij} = \\partial f_i / \\partial x_j$ has one row per output and one column per input: $m \\times n = 128 \\times 512$."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Using numpy, implement `numeric_jacobian(f, x, h=1e-6)` (central differences; `f` maps an array to a 1-D array; returns shape `(m, n)`), `softmax_jacobian(z)` returning `diag(s) - s s^T`, and `classify_hessian(H)` returning `'min'`, `'max'` or `'saddle'` from the eigenvalues of a symmetric `H` (eigenvalues with absolute value below 1e-9 count as zero, so a positive-semidefinite `H` is `'min'` and a negative-semidefinite one is `'max'`). Also implement `newton_step(grad, H)` returning `-H^{-1} grad`.",
  "setup": "import numpy as np",
  "packages": [
    "numpy"
  ],
  "starterCode": "def numeric_jacobian(f, x, h=1e-6):\n    pass\n\ndef softmax_jacobian(z):\n    pass\n\ndef classify_hessian(H):\n    pass\n\ndef newton_step(grad, H):\n    pass\n",
  "tests": "F = lambda v: np.array([v[0] ** 2 * v[1], 5 * v[0] + np.sin(v[1])])\nJ = numeric_jacobian(F, np.array([1.0, 0.0]))\nassert J.shape == (2, 2) and np.allclose(J, [[0, 1], [5, 1]], atol=1e-5)\nz = np.array([1.0, 2.0, 0.5])\nS = softmax_jacobian(z)\nassert np.allclose(S.sum(axis=1), 0, atol=1e-12) and np.allclose(S, S.T)\nsm = lambda v: np.exp(v) / np.exp(v).sum()\nassert np.allclose(S, numeric_jacobian(sm, z), atol=1e-6)\nassert classify_hessian(np.array([[4.0, 2.0], [2.0, 0.0]])) == 'saddle'\nassert classify_hessian(np.eye(3)) == 'min'\nassert classify_hessian(-np.eye(2)) == 'max'\nA = np.array([[3.0, 1.0], [1.0, 2.0]]); b = np.array([1.0, 1.0])\nx0 = np.array([5.0, -4.0])\nx1 = x0 + newton_step(A @ x0 - b, A)\nassert np.allclose(x1, np.linalg.solve(A, b))",
  "solution": "def numeric_jacobian(f, x, h=1e-6):\n    x = np.asarray(x, dtype=float)\n    cols = []\n    for j in range(x.size):\n        e = np.zeros_like(x)\n        e[j] = h\n        cols.append((np.asarray(f(x + e)) - np.asarray(f(x - e))) / (2 * h))\n    return np.stack(cols, axis=1)\n\ndef softmax_jacobian(z):\n    z = np.asarray(z, dtype=float)\n    s = np.exp(z - z.max())\n    s = s / s.sum()\n    return np.diag(s) - np.outer(s, s)\n\ndef classify_hessian(H):\n    ev = np.linalg.eigvalsh(H)\n    if ev.min() >= -1e-9:\n        return 'min'\n    if ev.max() <= 1e-9:\n        return 'max'\n    return 'saddle'\n\ndef newton_step(grad, H):\n    return -np.linalg.solve(H, grad)",
  "hints": [
    "Each column j of the Jacobian is the central difference of f along coordinate j.",
    "np.linalg.eigvalsh is the right tool for symmetric matrices.",
    "Use np.linalg.solve(H, grad) instead of forming the inverse."
  ]
}
```

> [!TIP] Interview tips
> - Give shapes: Jacobian is outputs $\times$ inputs; Hessian is the Jacobian of the gradient and is symmetric.
> - Know the softmax Jacobian $\text{diag}(s) - ss^\top$ and that backprop uses vector-Jacobian products rather than full matrices.
> - Explain why deep learning avoids Newton's method ($n^2$ memory, $n^3$ solve) and what L-BFGS or Adam approximate instead.
