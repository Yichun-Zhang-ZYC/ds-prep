---
id: math-convex-vs-non-convex
title: Convex vs non-convex
estimatedMinutes: 10
difficulty: medium
tags: [math, optimization, convexity, loss-landscape]
---

## Why it matters
Convexity decides whether optimization has guarantees. Linear and logistic regression have one global optimum that gradient descent finds; neural networks do not, yet they train well in practice. Interviewers ask which losses are convex, why that matters, and how to reason about non-convex training.

## Concept
A function is **convex** if the chord lies above the graph: $f(\lambda x + (1-\lambda)y) \le \lambda f(x) + (1-\lambda) f(y)$ for $\lambda \in [0, 1]$.

**Equivalent tests**:
- First order: $f(y) \ge f(x) + \nabla f(x)^\top (y - x)$, i.e. the tangent lies below the graph.
- Second order: the Hessian is positive semi-definite everywhere ($f'' \ge 0$ in 1-D). Positive definite means strictly convex, with a unique minimizer.

**Why it matters**: for convex $f$, every local minimum is a global minimum, and $\nabla f = 0$ is sufficient for optimality. Gradient descent with a suitable step size converges to it from any start.

**Building blocks**: sums of convex functions, nonnegative scaling, the max of convex functions, and composition with an affine map ($f(Ax + b)$) stay convex.

**Convex in ML**: linear regression (MSE), ridge, lasso, logistic regression (log loss), SVM hinge loss, softmax cross-entropy in the *logits of a linear model*. **Non-convex**: neural networks, matrix factorization, $k$-means, Gaussian mixtures, anything with latent structure or products of parameters.

**Non-convex realities**:
- Many saddle points and plateaus; true bad local minima are rare in over-parameterized nets.
- Symmetries (permuting hidden units) create many equivalent minima.
- Results depend on initialization, learning rate and noise, so seeds matter.
- SGD noise, momentum, and over-parameterization help escape saddles and find wide minima that generalize.

**Convex relaxations** replace a hard objective with a convex surrogate: log or hinge loss for 0-1 loss, $L_1$ for $L_0$ sparsity.

**Jensen's inequality**: for convex $f$, $f(\mathbb E X) \le \mathbb E f(X)$. It underlies $\text{KL} \ge 0$ and the EM lower bound.

## Worked example
Take $f(x) = x^4 - 3x^2 + x$. Its second derivative $f'' = 12x^2 - 6$ is negative for $|x| < 0.707$, so $f$ is **not convex**. The gradient $f' = 4x^3 - 6x + 1$ has two minima:
- $x \approx 1.131$ with $f \approx -1.07$ (a local minimum)
- $x \approx -1.301$ with $f \approx -3.51$ (the global minimum)

Gradient descent with $\eta = 0.01$ from $x_0 = 2$ settles at $1.131$; from $x_0 = -2$ it settles at $-1.301$. The start decides the answer, and the first run is stuck in a worse minimum.

Contrast with logistic regression: $H = X^\top\text{diag}(p(1-p))X$ with $p(1-p) \ge 0$ means $H \succeq 0$ for any data, so every start reaches the same global optimum (unique if $X$ has full column rank and the data are not separable).

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which of these objectives is convex in its parameters?",
  "options": [
    "Two-layer ReLU network with MSE loss",
    "Logistic regression with log loss",
    "$k$-means inertia over centroids and assignments",
    "Matrix factorization $\\|R - UV^\\top\\|^2$ over $U, V$"
  ],
  "answer": 1,
  "explanation": "Logistic loss composed with an affine map of the parameters is convex (its Hessian is $X^\\top D X \\succeq 0$). The other three involve products or hidden structure and are non-convex."
}
```

```quiz
{
  "id": "q2",
  "question": "At a point where $\\nabla f = 0$ for a convex differentiable $f$, what can you conclude?",
  "options": [
    "It is a local minimum only",
    "It is a global minimum",
    "It might be a saddle point",
    "Nothing without the Hessian"
  ],
  "answer": 1,
  "explanation": "For convex differentiable functions, the first-order condition $f(y) \\ge f(x) + \\nabla f(x)^\\top(y-x) = f(x)$ holds for all $y$, so $x$ is a global minimum."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Using numpy, implement `is_psd(A, tol=1e-9)` (symmetric matrix is positive semi-definite if its smallest eigenvalue is at least `-tol`), `midpoint_violations(f, lo, hi, n=21)` counting pairs of grid points `a < b` (from `np.linspace(lo, hi, n)`) where `f((a+b)/2) > (f(a)+f(b))/2 + 1e-12` (zero for a convex function), and `descend(grad, x0, lr, steps)` returning the final scalar after repeated `x -= lr * grad(x)`.",
  "setup": "import numpy as np",
  "packages": [
    "numpy"
  ],
  "starterCode": "def is_psd(A, tol=1e-9):\n    pass\n\ndef midpoint_violations(f, lo, hi, n=21):\n    pass\n\ndef descend(grad, x0, lr, steps):\n    pass\n",
  "tests": "assert is_psd(np.array([[2.0, 0.0], [0.0, 1.0]]))\nassert not is_psd(np.array([[1.0, 2.0], [2.0, 1.0]]))\nassert is_psd(np.array([[1.0, 1.0], [1.0, 1.0]]))\nassert midpoint_violations(lambda x: x ** 2, -2, 2) == 0\nassert midpoint_violations(lambda x: abs(x - 0.3), -2, 2) == 0\nf = lambda x: x ** 4 - 3 * x ** 2 + x\ng = lambda x: 4 * x ** 3 - 6 * x + 1\nassert midpoint_violations(f, -2, 2) > 0\na = descend(g, 2.0, 0.01, 2000)\nb = descend(g, -2.0, 0.01, 2000)\nassert abs(a - 1.1309) < 1e-3 and abs(b + 1.3008) < 1e-3\nassert f(b) < f(a)\n# a convex function: both starts agree\nh = lambda x: 2 * (x - 1)\nassert abs(descend(h, 5.0, 0.1, 300) - descend(h, -5.0, 0.1, 300)) < 1e-6",
  "solution": "def is_psd(A, tol=1e-9):\n    A = np.asarray(A, dtype=float)\n    return bool(np.linalg.eigvalsh((A + A.T) / 2).min() >= -tol)\n\ndef midpoint_violations(f, lo, hi, n=21):\n    xs = np.linspace(lo, hi, n)\n    count = 0\n    for i in range(n):\n        for j in range(i + 1, n):\n            a, b = xs[i], xs[j]\n            if f((a + b) / 2) > (f(a) + f(b)) / 2 + 1e-12:\n                count += 1\n    return count\n\ndef descend(grad, x0, lr, steps):\n    x = x0\n    for _ in range(steps):\n        x = x - lr * grad(x)\n    return x",
  "hints": [
    "np.linalg.eigvalsh(A).min() >= -tol.",
    "Loop over i < j on the grid and compare the midpoint value with the chord average.",
    "On the non-convex quartic, the two starting points land in different minima."
  ]
}
```

> [!TIP] Interview tips
> - List convex losses (MSE, log loss, hinge) and say why: convex function of an affine map of parameters.
> - For non-convex deep nets, say "local minima are less of an issue than saddles and plateaus; initialization and SGD noise matter".
> - Quote the test: Hessian PSD everywhere, or the tangent lies below the graph; mention convexity gives a global optimum from any start.
