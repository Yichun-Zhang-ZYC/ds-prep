---
id: math-partial-derivatives-gradient
title: Partial derivatives, gradient
estimatedMinutes: 10
difficulty: easy
tags: [math, calculus, gradient, optimization]
---

## Why it matters
Models have many parameters, so loss is a function of a vector. The gradient collects all partial derivatives and points where the loss rises fastest, which is the entire basis of gradient-based learning. Expect questions on gradient direction, the linear regression gradient, and gradient checking.

## Concept
A **partial derivative** $\frac{\partial f}{\partial x_i}$ differentiates with respect to one variable while holding the others fixed.

The **gradient** stacks them: $\nabla f(x) = \left(\frac{\partial f}{\partial x_1}, \dots, \frac{\partial f}{\partial x_d}\right)$, same shape as $x$. First-order approximation: $f(x + \delta) \approx f(x) + \nabla f(x)^\top \delta$.

**Key properties**:
- The **directional derivative** along a unit vector $u$ is $\nabla f \cdot u$.
- It is maximal when $u = \nabla f / \|\nabla f\|$, so the gradient is the direction of steepest ascent and $-\nabla f$ of steepest descent. Its length $\|\nabla f\|$ is the steepest slope.
- The gradient is perpendicular to level sets (contour lines) of $f$.
- $\nabla f = 0$ marks a critical point (minimum, maximum or saddle).

**Gradients you should know**:
- $f = a^\top x \Rightarrow \nabla f = a$
- $f = \tfrac12 x^\top A x$ with symmetric $A$ $\Rightarrow \nabla f = Ax$
- $f = \|x\|^2 \Rightarrow \nabla f = 2x$
- Linear regression MSE $J(w) = \frac1n \|Xw - y\|^2 \Rightarrow \nabla J = \frac2n X^\top (Xw - y)$. Setting it to zero gives the normal equations $X^\top X w = X^\top y$.

**Shape rule**: the gradient of a scalar loss with respect to a tensor always has that tensor's shape. When a matrix derivation looks wrong, check shapes first.

**Gradient check**: perturb each coordinate, $\frac{J(w + \epsilon e_i) - J(w - \epsilon e_i)}{2\epsilon}$, and compare to the analytic gradient (relative error around $10^{-6}$ is healthy).

## Worked example
Let $f(x, y) = x^2 y + 3y$. Partial derivatives: $\frac{\partial f}{\partial x} = 2xy$ and $\frac{\partial f}{\partial y} = x^2 + 3$.

At $(1, 2)$: $\nabla f = (4, 4)$ and $f = 8$.
- Steepest ascent direction: $(1, 1)/\sqrt 2$, with slope $\|\nabla f\| = 4\sqrt2 \approx 5.657$.
- Directional derivative along $u = (1, 0)$ (move only in $x$): $4$.
- Along $u = (1, -1)/\sqrt2$: $(4 - 4)/\sqrt2 = 0$. This is tangent to the level set $f = 8$.
- One descent step with learning rate 0.1: $(1, 2) - 0.1\,(4, 4) = (0.6, 1.6)$, giving $f = 0.36 \cdot 1.6 + 4.8 = 5.376$, a drop from 8.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "At a point where $\\nabla f = (3, 4)$, what is the largest possible directional derivative?",
  "options": [
    "7",
    "5",
    "3",
    "4"
  ],
  "answer": 1,
  "explanation": "The maximum over unit directions equals the gradient norm: $\\sqrt{3^2 + 4^2} = 5$, attained along $(3, 4)/5$."
}
```

```quiz
{
  "id": "q2",
  "question": "For $J(w) = \\frac1n\\|Xw - y\\|^2$ with $X \\in \\mathbb R^{n \\times d}$, what is the shape of $\\nabla_w J$?",
  "options": [
    "$n \\times d$",
    "$n$",
    "$d$",
    "Scalar"
  ],
  "answer": 2,
  "explanation": "The gradient has the shape of the variable it differentiates with respect to: $w \\in \\mathbb R^d$. In $\\frac2n X^\\top(Xw - y)$, $X^\\top$ is $d \\times n$ and the residual is $n \\times 1$."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Using numpy, implement `numeric_grad(f, x, h=1e-6)` (central differences, one coordinate at a time, returns a float array shaped like `x`), `mse_grad(w, X, y)` for $J = \\frac1n\\|Xw - y\\|^2$, and `descent_dir(g)` returning the unit steepest-descent direction `-g/||g||`.",
  "setup": "import numpy as np",
  "packages": [
    "numpy"
  ],
  "starterCode": "def numeric_grad(f, x, h=1e-6):\n    pass\n\ndef mse_grad(w, X, y):\n    pass\n\ndef descent_dir(g):\n    pass\n\nprint(numeric_grad(lambda v: v[0] ** 2 * v[1] + 3 * v[1], np.array([1.0, 2.0])))",
  "tests": "g = numeric_grad(lambda v: v[0] ** 2 * v[1] + 3 * v[1], np.array([1.0, 2.0]))\nassert g.shape == (2,) and np.allclose(g, [4.0, 4.0], atol=1e-5)\nrng = np.random.default_rng(0)\nX = rng.normal(size=(20, 3)); y = rng.normal(size=20); w = rng.normal(size=3)\nJ = lambda v: np.mean((X @ v - y) ** 2)\nassert np.allclose(mse_grad(w, X, y), numeric_grad(J, w), atol=1e-5)\nassert np.allclose(descent_dir(np.array([3.0, 4.0])), [-0.6, -0.8])\nw_star = np.linalg.lstsq(X, y, rcond=None)[0]\nassert np.allclose(mse_grad(w_star, X, y), 0, atol=1e-9)",
  "solution": "def numeric_grad(f, x, h=1e-6):\n    x = np.asarray(x, dtype=float)\n    g = np.zeros_like(x)\n    for i in range(x.size):\n        e = np.zeros_like(x)\n        e[i] = h\n        g[i] = (f(x + e) - f(x - e)) / (2 * h)\n    return g\n\ndef mse_grad(w, X, y):\n    return 2.0 / len(y) * X.T @ (X @ w - y)\n\ndef descent_dir(g):\n    return -g / np.linalg.norm(g)",
  "hints": [
    "Build a basis vector e with e[i] = h and evaluate f(x + e) and f(x - e).",
    "The gradient is (2/n) * X.T @ (X @ w - y).",
    "Divide by the Euclidean norm to get a unit vector."
  ]
}
```

> [!TIP] Interview tips
> - Say "the gradient points in the direction of steepest ascent and is perpendicular to level sets", then prove it with the directional derivative $\nabla f \cdot u$.
> - Memorize $\nabla_w \frac1n\|Xw - y\|^2 = \frac2n X^\top(Xw - y)$ and use shape checks to catch transposition errors.
> - Mention that a zero gradient does not imply a minimum: it can be a saddle point.
