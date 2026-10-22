---
id: math-matrix-calculus-for-ml
title: Matrix calculus for ML
estimatedMinutes: 14
difficulty: hard
tags: [math, matrix-calculus, backprop, gradients]
---

## Why it matters

Every deep learning framework is a machine for matrix calculus, and interviewers ask you to derive gradients of least squares, ridge, softmax cross-entropy or a linear layer by hand. The skill is doing it without index soup, and catching mistakes by checking shapes.

## Concept

**Convention**: for a scalar $L$, the gradient $\nabla_X L$ has the same shape as $X$. This makes gradient descent $X \leftarrow X - \eta \nabla_X L$ type-check. See the Jacobian and Hessian lesson for the general vector-valued case.

**Core identities** ($a$ constant):

| $f$ | $\nabla_x f$ |
|---|---|
| $a^\top x$ | $a$ |
| $x^\top A x$ | $(A + A^\top)x$ ($2Ax$ if symmetric) |
| $\lVert x\rVert^2$ | $2x$ |
| $\lVert Ax - b\rVert^2$ | $2A^\top(Ax - b)$ |
| $\operatorname{tr}(A^\top X)$ | $A$ |
| $\log\det X$ | $X^{-\top}$ |

**Differential method** (fastest, least error-prone): write $dL$ as a function of $dX$, then rewrite it as $\operatorname{tr}(G^\top dX)$; then $\nabla_X L = G$. Use $d(AB) = dA\,B + A\,dB$ and the trace rules $\operatorname{tr}(AB) = \operatorname{tr}(BA)$ and $\operatorname{tr}(a) = a$ for scalars.

**Shape-matching check**: the gradient must have the shape of the variable. For $Y = XW$ ($n\times d$ times $d \times k$) with upstream $dY$ ($n \times k$): $dW = X^\top dY$ ($d \times k$) and $dX = dY\,W^\top$ ($n \times d$). With a bias, $db = \sum_{\text{rows}} dY$ because $b$ was broadcast.

**Classics**: ridge $L = \lVert Xw - y\rVert^2 + \lambda\lVert w\rVert^2$ gives $\nabla = 2X^\top(Xw - y) + 2\lambda w$ and the closed form $w = (X^\top X + \lambda I)^{-1}X^\top y$. Softmax cross-entropy with logits $z$ and one-hot $y$ gives $\nabla_z L = p - y$ (this is why logits are the natural place to start backprop).

**Always verify** with a finite-difference gradient check: $\frac{f(w + \epsilon e_j) - f(w - \epsilon e_j)}{2\epsilon}$ should match your formula to about $10^{-6}$.

## Worked example

Find the least-squares solution for $X = \begin{pmatrix}1&0\\0&1\\1&1\end{pmatrix}$, $y = (1, 2, 2)^\top$ with $L = \tfrac12\lVert Xw - y\rVert^2$.

Gradient: $\nabla L = X^\top(Xw - y)$. At $w = 0$ it is $-X^\top y = -(3, 4)^\top$. Setting it to zero gives the normal equations $X^\top X w = X^\top y$ with $X^\top X = \begin{pmatrix}2&1\\1&2\end{pmatrix}$, whose inverse is $\tfrac13\begin{pmatrix}2&-1\\-1&2\end{pmatrix}$. So $w = \tfrac13(2\cdot 3 - 4,\ -3 + 2\cdot 4) = (2/3, 5/3)$.

Check: residual $y - Xw = (1/3, 1/3, -1/3)$, and $X^\top$ times it is $(1/3 - 1/3,\ 1/3 - 1/3) = 0$. The residual is orthogonal to the columns of $X$, as the projection picture predicts.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "For $f(x) = x^\\top A x$ with a non-symmetric square $A$, what is $\\nabla f$?",
  "options": [
    "$2Ax$",
    "$(A + A^\\top)x$",
    "$A^\\top x$",
    "$2A^\\top A x$"
  ],
  "answer": 1,
  "explanation": "Expanding $\\sum_{ij} A_{ij}x_i x_j$ and differentiating gives $(A + A^\\top)x$. It reduces to $2Ax$ only when $A$ is symmetric."
}
```

```quiz
{
  "id": "q2",
  "question": "Backprop through $Y = XW$ with $X \\in \\mathbb R^{n \\times d}$, $W \\in \\mathbb R^{d \\times k}$. Which is the gradient w.r.t. $W$?",
  "options": [
    "$dY\\, X^\\top$",
    "$X^\\top dY$",
    "$dY\\, X$",
    "$X\\, dY^\\top$"
  ],
  "answer": 1,
  "explanation": "$dW = X^\\top dY$ has shape $d \\times k$. The shape-matching trick finds it: it is the only way to combine $X^\\top$ ($d\\times n$) and $dY$ ($n \\times k$) into $d \\times k$."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Pure Python, matrices as lists of lists. Implement `matvec(A, v)`, `lstsq_grad(X, y, w)` returning the gradient of $L = \\tfrac12\\lVert Xw - y\\rVert^2$ (that is $X^\\top(Xw - y)$), and `num_grad(f, w, eps=1e-6)`, a central-difference gradient of a scalar function `f` of a list `w`.",
  "starterCode": "def matvec(A, v):\n    pass\n\ndef lstsq_grad(X, y, w):\n    pass\n\ndef num_grad(f, w, eps=1e-6):\n    pass\n",
  "tests": "X = [[1, 0], [0, 1], [1, 1]]\ny = [1, 2, 2]\ng = lstsq_grad(X, y, [0.0, 0.0])\nassert abs(g[0] + 3) < 1e-9 and abs(g[1] + 4) < 1e-9\nw = [2 / 3, 5 / 3]\ng = lstsq_grad(X, y, w)\nassert all(abs(a) < 1e-9 for a in g)\ndef loss(w):\n    r = [a - b for a, b in zip(matvec(X, w), y)]\n    return 0.5 * sum(t * t for t in r)\nw = [0.3, -0.7]\nga = lstsq_grad(X, y, w)\ngn = num_grad(loss, w)\nassert all(abs(a - b) < 1e-5 for a, b in zip(ga, gn))\nassert matvec([[1, 2], [3, 4]], [1, 1]) == [3, 7]",
  "solution": "def matvec(A, v):\n    return [sum(a * b for a, b in zip(row, v)) for row in A]\n\ndef lstsq_grad(X, y, w):\n    r = [a - b for a, b in zip(matvec(X, w), y)]\n    return [sum(X[i][j] * r[i] for i in range(len(X))) for j in range(len(w))]\n\ndef num_grad(f, w, eps=1e-6):\n    g = []\n    for j in range(len(w)):\n        up = list(w); dn = list(w)\n        up[j] += eps; dn[j] -= eps\n        g.append((f(up) - f(dn)) / (2 * eps))\n    return g",
  "hints": [
    "Residual $r = Xw - y$, then entry $j$ of the gradient is $\\sum_i X_{ij} r_i$.",
    "Central difference: $(f(w + \\epsilon e_j) - f(w - \\epsilon e_j)) / 2\\epsilon$."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Using numpy, implement `softmax_ce(W, X, y)` for a linear classifier with logits $Z = XW$ ($X$ is $n \\times d$, $W$ is $d \\times k$, `y` holds integer labels). Return `(loss, dW)` where loss is the mean cross-entropy and $dW = X^\\top (P - Y)/n$ with $P$ the row-wise softmax and $Y$ the one-hot labels. Use a numerically stable softmax.",
  "setup": "import numpy as np",
  "starterCode": "def softmax_ce(W, X, y):\n    pass\n",
  "tests": "rng = np.random.default_rng(0)\nX = rng.normal(size=(5, 3)); W = rng.normal(size=(3, 4)); y = np.array([0, 3, 1, 1, 2])\nloss, dW = softmax_ce(W, X, y)\nassert dW.shape == (3, 4)\nZ = X @ W\nlp = Z - np.log(np.exp(Z).sum(1, keepdims=True))\nassert abs(loss + lp[np.arange(5), y].mean()) < 1e-9\nnum = np.zeros_like(W)\nfor i in range(3):\n    for j in range(4):\n        Wp = W.copy(); Wp[i, j] += 1e-6\n        Wm = W.copy(); Wm[i, j] -= 1e-6\n        num[i, j] = (softmax_ce(Wp, X, y)[0] - softmax_ce(Wm, X, y)[0]) / 2e-6\nassert np.allclose(dW, num, atol=1e-6)\nl, g = softmax_ce(np.array([[1000.0, 0.0]]), np.array([[1.0]]), np.array([0]))\nassert np.isfinite(l) and abs(l) < 1e-9",
  "solution": "def softmax_ce(W, X, y):\n    n = X.shape[0]\n    Z = X @ W\n    Z = Z - Z.max(axis=1, keepdims=True)\n    E = np.exp(Z)\n    P = E / E.sum(axis=1, keepdims=True)\n    loss = -np.log(P[np.arange(n), y]).mean()\n    Y = np.zeros_like(P)\n    Y[np.arange(n), y] = 1\n    dW = X.T @ (P - Y) / n\n    return loss, dW",
  "packages": [
    "numpy"
  ],
  "hints": [
    "Subtract the row max from the logits before exponentiating.",
    "Gradient w.r.t. the logits is $P - Y$; then $dW = X^\\top dZ / n$."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Using numpy, implement `linear_backward(X, W, b, dY)` for $Y = XW + b$ (broadcast $b$ over rows). Given the upstream gradient `dY` ($= \\partial L/\\partial Y$), return `(dX, dW, db)`. The shapes must match the shapes of `X`, `W` and `b`.",
  "setup": "import numpy as np",
  "starterCode": "def linear_backward(X, W, b, dY):\n    pass\n",
  "tests": "rng = np.random.default_rng(1)\nX = rng.normal(size=(4, 3)); W = rng.normal(size=(3, 2)); b = rng.normal(size=2)\ndef L(X, W, b):\n    return 0.5 * ((X @ W + b) ** 2).sum()\ndY = X @ W + b\ndX, dW, db = linear_backward(X, W, b, dY)\nassert dX.shape == X.shape and dW.shape == W.shape and db.shape == b.shape\ndef num(f, A):\n    g = np.zeros_like(A)\n    for idx in np.ndindex(*A.shape):\n        Ap = A.copy(); Ap[idx] += 1e-6\n        Am = A.copy(); Am[idx] -= 1e-6\n        g[idx] = (f(Ap) - f(Am)) / 2e-6\n    return g\nassert np.allclose(dX, num(lambda A: L(A, W, b), X), atol=1e-5)\nassert np.allclose(dW, num(lambda A: L(X, A, b), W), atol=1e-5)\nassert np.allclose(db, num(lambda A: L(X, W, A), b), atol=1e-5)",
  "solution": "def linear_backward(X, W, b, dY):\n    dX = dY @ W.T\n    dW = X.T @ dY\n    db = dY.sum(axis=0)\n    return dX, dW, db",
  "packages": [
    "numpy"
  ],
  "hints": [
    "Match shapes: $dX$ is $n \\times d$, so it must be $dY\\,W^\\top$.",
    "The bias was broadcast over $n$ rows, so its gradient sums over the batch axis."
  ]
}
```

> [!TIP] Interview tips
> - State the shape convention up front, then derive with differentials or shape matching; interviewers like seeing the sanity check more than the algebra.
> - Know by heart: $\nabla_w \lVert Xw-y\rVert^2 = 2X^\top(Xw-y)$, the softmax-CE gradient $p - y$, and the three linear-layer gradients.
> - Pitfall: forgetting the transpose when $A$ is not symmetric, or forgetting that bias gradients sum over the batch. Mention gradient checking as how you would debug a custom layer.
