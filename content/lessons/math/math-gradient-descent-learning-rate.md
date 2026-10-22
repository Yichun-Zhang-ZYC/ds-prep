---
id: math-gradient-descent-learning-rate
title: Gradient descent, learning rate
estimatedMinutes: 12
difficulty: medium
tags: [math, optimization, gradient-descent, learning-rate]
---

## Why it matters
Gradient descent is the engine of almost all ML training, and the learning rate is the most important hyperparameter. Interviewers ask why training diverges, what the stable step size is, why feature scaling helps, and how schedules, momentum and Adam change things.

## Concept
**Update rule**: $\theta_{t+1} = \theta_t - \eta\,\nabla L(\theta_t)$, with learning rate (step size) $\eta$. Each step moves along the steepest descent direction.

**Quadratic analysis** (the model for everything near a minimum): for $L = \frac12\theta^\top H\theta$, each eigen-direction with curvature $\lambda$ evolves as $\theta \leftarrow (1 - \eta\lambda)\theta$. So:
- Converges iff $|1 - \eta\lambda| < 1$ for every $\lambda$, i.e. $\eta < 2/\lambda_{\max}$.
- The best fixed rate is $\eta = 2/(\lambda_{\max} + \lambda_{\min})$; the slowest direction contracts at rate about $\frac{\kappa - 1}{\kappa + 1}$, with **condition number** $\kappa = \lambda_{\max}/\lambda_{\min}$.
- Steps needed scale like $\kappa \log(1/\epsilon)$. Ill-conditioned problems zig-zag across the steep direction while crawling along the shallow one.

**Learning-rate regimes**: too small gives slow progress; too large oscillates or diverges (loss goes up or NaN); just under $2/\lambda_{\max}$ is fast but unstable. Practical default: pick the largest rate that trains stably.

**Fixes for ill-conditioning**: standardize features (makes $\kappa$ closer to 1), momentum, adaptive optimizers (Adam, RMSProp), preconditioning, second-order methods.

**Schedules**: step decay, cosine decay, warmup (important for Transformers and Adam, since early gradient statistics are noisy), and reduce-on-plateau. Decaying $\eta$ lets SGD settle in a minimum.

**Convergence guarantees**: for $L$-smooth convex $f$, $\eta = 1/L$ gives $f(\theta_T) - f^* = O(1/T)$; strong convexity gives linear (geometric) convergence.

**Diagnostics**: plot the loss curve on a log scale; test a learning-rate sweep (LR range test); compare to a gradient check when something looks off.

## Worked example
**1-D quadratic** $f(x) = 5x^2$ ($\lambda = 10$, so the stability limit is $\eta < 0.2$). Start at $x_0 = 1$; each step multiplies $x$ by $1 - 10\eta$:
- $\eta = 0.05$: factor $0.5$, so $x_{10} \approx 0.001$. Smooth convergence.
- $\eta = 0.1$: factor $0$, convergence in one step (the ideal rate $1/\lambda$).
- $\eta = 0.15$: factor $-0.5$, oscillating convergence.
- $\eta = 0.25$: factor $-1.5$, so $|x_{10}| = 1.5^{10} \approx 57.7$. Diverges.

**Ill-conditioned** $f = \tfrac12(x^2 + 100y^2)$ has $\kappa = 100$ and the limit $\eta < 2/100 = 0.02$. Take $\eta = 0.019$ from $(1, 1)$: the $y$-factor is $|1 - 1.9| = 0.9$ (oscillating, but shrinking), while the $x$-factor is $0.981$. Reaching $\|(x, y)\| < 10^{-3}$ takes $\approx 361$ steps, all spent waiting on the flat $x$ direction. Rescaling $y$ to make $\kappa = 1$ would fix this in a single step with $\eta = 1$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "For $f(\\theta) = \\frac12\\theta^\\top H\\theta$ with $\\lambda_{\\max}(H) = 50$, which fixed learning rate makes gradient descent diverge?",
  "options": [
    "0.01",
    "0.03",
    "0.039",
    "0.05"
  ],
  "answer": 3,
  "explanation": "Stability requires $\\eta < 2/\\lambda_{\\max} = 0.04$. At $\\eta = 0.05$ the factor on the steepest direction is $1 - 50 \\times 0.05 = -1.5$, which grows in magnitude."
}
```

```quiz
{
  "id": "q2",
  "question": "Why does standardizing features usually speed up gradient descent on linear regression?",
  "options": [
    "It makes the loss non-convex",
    "It reduces the Hessian's condition number so one learning rate suits all directions",
    "It removes the need for a learning rate",
    "It reduces the number of parameters"
  ],
  "answer": 1,
  "explanation": "The Hessian is $X^\\top X/n$. Features on very different scales give widely spread eigenvalues (large $\\kappa$), forcing a small $\\eta$ that crawls along flat directions. Standardizing brings $\\kappa$ down."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Using numpy, implement `gd_quadratic(h, x0, lr, steps)` for $f(x) = \\tfrac12\\sum_i h_i x_i^2$ (gradient is `h * x`; return the final array), `max_stable_lr(h)` returning $2/\\max h$, `steps_to_tol(h, x0, lr, tol, max_steps=100000)` returning how many steps until `||x|| < tol` (or `max_steps`), and `linreg_gd(X, y, lr, steps)` that runs full-batch gradient descent on MSE $\\frac1n\\|Xw-y\\|^2$ from `w = 0` and returns `w`.",
  "setup": "import numpy as np",
  "packages": [
    "numpy"
  ],
  "starterCode": "def gd_quadratic(h, x0, lr, steps):\n    pass\n\ndef max_stable_lr(h):\n    pass\n\ndef steps_to_tol(h, x0, lr, tol, max_steps=100000):\n    pass\n\ndef linreg_gd(X, y, lr, steps):\n    pass\n",
  "tests": "assert np.allclose(gd_quadratic([10.0], [1.0], 0.05, 1), [0.5])\nassert np.allclose(gd_quadratic([10.0], [1.0], 0.1, 1), [0.0])\nassert abs(gd_quadratic([10.0], [1.0], 0.25, 10)[0]) > 50\nassert abs(gd_quadratic([10.0], [1.0], 0.05, 10)[0]) < 1e-2\nassert abs(max_stable_lr([1.0, 100.0]) - 0.02) < 1e-12\nk = steps_to_tol([1.0, 100.0], [1.0, 1.0], 0.019, 1e-3)\nassert 350 <= k <= 370\nassert steps_to_tol([1.0, 100.0], [1.0, 1.0], 0.5, 1e-3, max_steps=50) == 50\nrng = np.random.default_rng(0)\nX = rng.normal(size=(100, 3)); w_true = np.array([2.0, -1.0, 0.5])\ny = X @ w_true\nw = linreg_gd(X, y, 0.1, 500)\nassert np.allclose(w, w_true, atol=1e-3)",
  "solution": "def gd_quadratic(h, x0, lr, steps):\n    h = np.asarray(h, dtype=float)\n    x = np.asarray(x0, dtype=float).copy()\n    for _ in range(steps):\n        x = x - lr * h * x\n    return x\n\ndef max_stable_lr(h):\n    return 2.0 / float(np.max(h))\n\ndef steps_to_tol(h, x0, lr, tol, max_steps=100000):\n    h = np.asarray(h, dtype=float)\n    x = np.asarray(x0, dtype=float).copy()\n    k = 0\n    while np.linalg.norm(x) >= tol and k < max_steps:\n        x = x - lr * h * x\n        k += 1\n    return k\n\ndef linreg_gd(X, y, lr, steps):\n    w = np.zeros(X.shape[1])\n    for _ in range(steps):\n        w = w - lr * (2.0 / len(y)) * X.T @ (X @ w - y)\n    return w",
  "hints": [
    "Each quadratic step is x = x - lr * h * x, i.e. multiply by (1 - lr * h).",
    "Stability bound: lr < 2 / max(h).",
    "Count loop iterations while the norm is still above tol; stop at max_steps."
  ]
}
```

> [!TIP] Interview tips
> - Derive $\eta < 2/\lambda_{\max}$ from the quadratic $\theta \leftarrow (1 - \eta\lambda)\theta$; it explains divergence concretely.
> - Tie slow training to condition number and name the fixes: feature scaling, momentum, Adam, preconditioning.
> - Mention learning-rate schedules and warmup, and how to tune: LR range test, then the largest stable rate.
