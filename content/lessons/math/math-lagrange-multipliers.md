---
id: math-lagrange-multipliers
title: Lagrange multipliers
estimatedMinutes: 12
difficulty: hard
tags: [optimization, constrained, lagrange, kkt]
---

## Why it matters
Constrained optimization is everywhere: SVMs, maximum-entropy models, PCA (unit-norm constraint), portfolio weights that sum to 1, and regularization as a constraint. Lagrange multipliers turn a constrained problem into an unconstrained one and the multiplier has a useful meaning (a shadow price).

## Concept
To minimize $f(x)$ subject to $h(x) = 0$, form the **Lagrangian** $\mathcal L(x, \lambda) = f(x) + \lambda\, h(x)$ and solve $\nabla_x \mathcal L = 0$ and $h(x) = 0$.

**Geometric view**: at a constrained optimum the level curve of $f$ is tangent to the constraint, so $\nabla f = -\lambda \nabla h$: the gradients are parallel.

**Meaning of $\lambda$**: it measures how fast the optimal value changes if the constraint is relaxed, $\partial f^*/\partial c = -\lambda$ for the constraint $h(x) = c$ (sign depends on convention).

**Inequality constraints** $g(x) \le 0$ use multipliers $\mu \ge 0$ and the **KKT conditions**: stationarity $\nabla f + \mu \nabla g = 0$, primal and dual feasibility, and complementary slackness $\mu\, g(x) = 0$ (an inactive constraint has $\mu = 0$). For convex problems KKT is sufficient; it is the basis of SVM duality and support vectors (only active constraints have $\mu > 0$).

**Quadratic program with equality constraints** $\min \tfrac12 x^\top Q x + c^\top x$ s.t. $Ax = b$ reduces to one linear system:
$$\begin{bmatrix} Q & A^\top \\ A & 0 \end{bmatrix}\begin{bmatrix} x \\ \nu \end{bmatrix} = \begin{bmatrix} -c \\ b \end{bmatrix}$$
Classic uses: PCA (max $w^\top \Sigma w$ s.t. $\|w\| = 1$ gives $\Sigma w = \lambda w$) and max entropy under a sum-to-one constraint gives the uniform distribution.

## Worked example
Minimize $f(x, y) = x^2 + y^2$ subject to $x + y = 1$.

$\mathcal L = x^2 + y^2 + \lambda(x + y - 1)$. Setting derivatives to zero: $2x + \lambda = 0$, $2y + \lambda = 0$, $x + y = 1$. So $x = y = -\lambda/2$, and $-\lambda = 1$ gives $\lambda = -1$, $x = y = 0.5$, $f^* = 0.5$.

Check with substitution: $y = 1 - x$, $f = x^2 + (1-x)^2$, $f' = 4x - 2 = 0 \Rightarrow x = 0.5$. Geometrically, it is the point on the line closest to the origin. Changing the constraint to $x + y = c$ gives $f^* = c^2/2$, so $df^*/dc = c = 1 = -\lambda$, matching the shadow-price interpretation.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "At a constrained optimum of $\\min f(x)$ s.t. $h(x) = 0$, which statement holds?",
  "options": [
    "$\\nabla f = 0$",
    "$\\nabla f$ is parallel to $\\nabla h$",
    "$\\nabla f$ is orthogonal to $\\nabla h$",
    "$\\lambda = 0$"
  ],
  "answer": 1,
  "explanation": "The objective can't improve along the constraint surface, so $\\nabla f$ has no component tangent to it: $\\nabla f = -\\lambda \\nabla h$."
}
```

```quiz
{
  "id": "q2",
  "question": "In the KKT conditions, complementary slackness $\\mu\\, g(x) = 0$ means:",
  "options": [
    "Every constraint is active",
    "An inactive constraint ($g(x) < 0$) has multiplier zero",
    "The multiplier must be negative",
    "The objective is constant"
  ],
  "answer": 1,
  "explanation": "Either the constraint is tight ($g = 0$) or it doesn't influence the solution ($\\mu = 0$). In SVMs, points with $\\mu > 0$ are exactly the support vectors."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `eq_qp(Q, c, A, b)` that solves $\\min \\tfrac12 x^\\top Q x + c^\\top x$ s.t. $Ax = b$ by building the KKT matrix and calling `np.linalg.solve`. Return `(x, nu)` where `nu` holds the multipliers (the Lagrangian is $\\tfrac12 x^\\top Q x + c^\\top x + \\nu^\\top(Ax - b)$).",
  "setup": "import numpy as np",
  "starterCode": "def eq_qp(Q, c, A, b):\n    pass\n\nQ = 2 * np.eye(2)\nprint(eq_qp(Q, np.zeros(2), np.array([[1.0, 1.0]]), np.array([1.0])))",
  "tests": "x, nu = eq_qp(2 * np.eye(2), np.zeros(2), np.array([[1.0, 1.0]]), np.array([1.0]))\nassert np.allclose(x, [0.5, 0.5]) and np.allclose(nu, [-1.0])\nx, nu = eq_qp(np.diag([2.0, 4.0]), np.zeros(2), np.array([[1.0, 1.0]]), np.array([3.0]))\nassert np.allclose(x, [2.0, 1.0]) and np.allclose(nu, [-4.0])\n# two constraints pin down x completely\nA = np.array([[1.0, 0.0], [0.0, 1.0]])\nx, nu = eq_qp(np.eye(2), np.zeros(2), A, np.array([3.0, 4.0]))\nassert np.allclose(x, [3.0, 4.0]) and np.allclose(nu, [-3.0, -4.0])\n# with a linear term\nx, nu = eq_qp(2 * np.eye(2), np.array([-2.0, 0.0]), np.array([[1.0, 1.0]]), np.array([0.0]))\nassert np.allclose(x, [0.5, -0.5]) and np.allclose(nu, [1.0])",
  "solution": "def eq_qp(Q, c, A, b):\n    Q = np.asarray(Q, dtype=float)\n    A = np.asarray(A, dtype=float)\n    n, m = Q.shape[0], A.shape[0]\n    K = np.block([[Q, A.T], [A, np.zeros((m, m))]])\n    rhs = np.concatenate([-np.asarray(c, dtype=float), np.asarray(b, dtype=float)])\n    sol = np.linalg.solve(K, rhs)\n    return sol[:n], sol[n:]",
  "packages": [
    "numpy"
  ],
  "hints": [
    "Stationarity: $Qx + c + A^\\top\\nu = 0$. Feasibility: $Ax = b$. Stack them into one block system.",
    "`np.block([[Q, A.T], [A, zeros]])` builds the KKT matrix; split the solution at index n."
  ]
}
```

> [!TIP] Interview tips
> - Say the geometric picture (parallel gradients) and the shadow-price meaning of $\lambda$.
> - Know the standard examples: PCA gives an eigenvalue problem, max entropy gives the uniform (or softmax/exponential-family) solution, SVM dual comes from KKT.
> - Pitfall: Lagrange conditions are only necessary in general; check convexity or second-order conditions before claiming a minimum.
