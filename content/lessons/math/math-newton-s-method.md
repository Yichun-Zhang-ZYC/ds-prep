---
id: math-newton-s-method
title: Newton's method
estimatedMinutes: 12
difficulty: medium
tags: [optimization, newton, hessian, second-order]
---

## Why it matters
Newton's method is the standard second-order optimizer and root finder. It explains why logistic regression is fit with IRLS, why quasi-Newton methods (L-BFGS) exist, and why first-order methods dominate deep learning. Interviewers ask when it beats gradient descent and what it costs.

## Concept
**Root finding** (1-D): to solve $f(x) = 0$, follow the tangent line to the axis: $x_{k+1} = x_k - f(x_k)/f'(x_k)$.

**Optimization**: apply root finding to $\nabla f = 0$. Fit a local quadratic (second-order Taylor) and jump to its minimum:
$$x_{k+1} = x_k - H(x_k)^{-1} \nabla f(x_k)$$
In practice solve $H\,d = -\nabla f$ for the step $d$ rather than inverting $H$.

**Properties**:
- **Quadratic convergence** near a minimum with $H \succ 0$: the number of correct digits roughly doubles per step. Exact in one step on a quadratic.
- **No learning rate to tune**; the Hessian rescales the step by curvature in each direction.
- **Cost**: forming $H$ is $O(d^2)$ memory and solving is $O(d^3)$, impractical for millions of parameters.
- **Failure modes**: far from the optimum the step can overshoot (use line search or damping); if $H$ is not positive definite the step may head toward a saddle or maximum (add $\lambda I$, as in Levenberg-Marquardt or trust regions); needs $f'' \neq 0$.

**Alternatives**: quasi-Newton (BFGS, L-BFGS) builds a Hessian approximation from gradient differences. For logistic regression, Newton's method equals IRLS (iteratively reweighted least squares) and converges in about 5 to 10 iterations.

## Worked example
Compute $\sqrt{2}$ as the root of $f(x) = x^2 - 2$ with $x_0 = 1$: $x_{k+1} = x_k - (x_k^2 - 2)/(2x_k)$.

- $x_1 = 1 - (-1)/2 = 1.5$
- $x_2 = 1.5 - 0.25/3 = 1.41667$
- $x_3 = 1.41667 - 0.006944/2.8333 = 1.414216$ (true value 1.414214)

The error goes $0.086 \to 0.0025 \to 2 \times 10^{-6}$: it is squared at each step. For minimizing $f(x) = (x-3)^2$, $f' = 2(x-3)$, $f'' = 2$, so from any $x_0$: $x_1 = x_0 - (x_0 - 3) = 3$ in a single step.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Newton's method applied to a strictly convex quadratic $f(x) = \\tfrac12 x^\\top A x - b^\\top x$ converges in how many steps?",
  "options": [
    "1",
    "$d$ (the dimension)",
    "$O(\\log 1/\\epsilon)$",
    "It depends on the learning rate"
  ],
  "answer": 0,
  "explanation": "The second-order Taylor model is exact for a quadratic, so one step $x - A^{-1}(Ax - b) = A^{-1}b$ lands on the minimizer."
}
```

```quiz
{
  "id": "q2",
  "question": "Why isn't Newton's method used to train large neural networks?",
  "options": [
    "It needs a learning rate",
    "The Hessian is $O(d^2)$ to store and $O(d^3)$ to solve, and may be indefinite",
    "It converges more slowly than SGD near a minimum",
    "It cannot handle non-convex functions at all"
  ],
  "answer": 1,
  "explanation": "With millions of parameters the Hessian is infeasible, and non-convex losses give indefinite Hessians (saddles). Practitioners use first-order methods or L-BFGS/Hessian-free approximations."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `newton_root(f, fp, x0, steps)` returning the iterate after `steps` Newton updates for $f(x) = 0$, and `newton_min(grad, hess, x0, steps)` using numpy: each step solves `hess(x) @ d = -grad(x)` (use `np.linalg.solve`) and sets `x = x + d`. Return a numpy array from `newton_min`.",
  "setup": "import numpy as np",
  "starterCode": "def newton_root(f, fp, x0, steps):\n    pass\n\ndef newton_min(grad, hess, x0, steps):\n    pass\n\nprint(newton_root(lambda x: x * x - 2, lambda x: 2 * x, 1.0, 3))",
  "tests": "r = newton_root(lambda x: x * x - 2, lambda x: 2 * x, 1.0, 3)\nassert abs(r - 1.4142156862745099) < 1e-9\nassert abs(newton_root(lambda x: x * x - 2, lambda x: 2 * x, 1.0, 6) - 2 ** 0.5) < 1e-12\nA = np.array([[3.0, 1.0], [1.0, 2.0]])\nb = np.array([1.0, 2.0])\nx = newton_min(lambda x: A @ x - b, lambda x: A, np.array([10.0, -7.0]), 1)\nassert np.allclose(x, np.linalg.solve(A, b))\n# non-quadratic: f(x, y) = x^4 + y^2, minimum at the origin\ng = lambda v: np.array([4 * v[0] ** 3, 2 * v[1]])\nh = lambda v: np.array([[12 * v[0] ** 2, 0.0], [0.0, 2.0]])\nx = newton_min(g, h, np.array([1.0, 1.0]), 30)\nassert abs(x[1]) < 1e-9 and abs(x[0]) < 1e-4",
  "solution": "def newton_root(f, fp, x0, steps):\n    x = x0\n    for _ in range(steps):\n        x = x - f(x) / fp(x)\n    return x\n\ndef newton_min(grad, hess, x0, steps):\n    x = np.array(x0, dtype=float)\n    for _ in range(steps):\n        d = np.linalg.solve(hess(x), -grad(x))\n        x = x + d\n    return x",
  "packages": [
    "numpy"
  ],
  "hints": [
    "For the root finder, the update is `x - f(x) / fp(x)`.",
    "Never form the inverse: solve the linear system `H d = -g`."
  ]
}
```

> [!TIP] Interview tips
> - State the update $x - H^{-1}\nabla f$, the quadratic-convergence claim, and the $O(d^3)$ cost in one breath.
> - Link it to practice: IRLS for GLMs, L-BFGS for medium-size problems, damping or trust regions when $H$ is not positive definite.
> - Pitfall: Newton finds stationary points, not minima. With an indefinite Hessian it happily converges to a saddle.
