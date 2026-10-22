---
id: math-taylor-expansion
title: Taylor expansion
estimatedMinutes: 10
difficulty: medium
tags: [math, calculus, taylor, approximation, optimization]
---

## Why it matters
Taylor expansion is the lens behind most of optimization: gradient descent uses a first-order model of the loss, Newton's method a second-order one. It also justifies approximations such as $\log(1+x) \approx x$ and $e^x \approx 1 + x$, which show up in probability, numerical stability and loss analysis.

## Concept
For a smooth function near a point $a$:
$$f(x) = \sum_{k=0}^{n} \frac{f^{(k)}(a)}{k!}(x - a)^k + R_n(x)$$
The remainder is $R_n = O\big((x-a)^{n+1}\big)$, so the approximation is accurate close to $a$ and degrades far away. At $a = 0$ it is called a Maclaurin series.

**Series to remember (around 0)**:
- $e^x = 1 + x + \frac{x^2}{2!} + \frac{x^3}{3!} + \cdots$
- $\ln(1+x) = x - \frac{x^2}{2} + \frac{x^3}{3} - \cdots$ for $|x| < 1$
- $\frac{1}{1-x} = 1 + x + x^2 + \cdots$ for $|x| < 1$
- $\sin x = x - \frac{x^3}{3!} + \cdots$, $\ \cos x = 1 - \frac{x^2}{2!} + \cdots$
- $\sigma(x) \approx \frac12 + \frac x4$ near 0

**Multivariate**: $f(x + \delta) \approx f(x) + \nabla f^\top \delta + \tfrac12 \delta^\top H \delta$.

**Where it appears in ML**:
- **Gradient descent** minimizes the first-order model plus a proximity penalty $\frac{1}{2\eta}\|\delta\|^2$, giving $\delta = -\eta\nabla f$. The descent lemma: with $L$-smooth $f$ (Hessian $\preceq L I$) and $\eta \le 1/L$, each step decreases the loss.
- **Newton's method** minimizes the second-order model: $\delta = -H^{-1}\nabla f$.
- **Small-quantity approximations**: $\log(1 + x) \approx x$ (log-returns, `log1p` for stability), $(1+x)^n \approx 1 + nx$, and the delta method for the variance of $g(X)$: $\text{Var}\,g(X) \approx g'(\mu)^2\,\sigma^2$.
- **Loss surface analysis**: curvature near a minimum explains sensitivity to learning rate and to perturbations (flat vs sharp minima).

## Worked example
Approximate $\ln(1.1)$ with $x = 0.1$ (true value $0.095310$):
- 1st order: $x = 0.1$, error $4.7 \times 10^{-3}$
- 2nd order: $x - x^2/2 = 0.095$, error $3.1 \times 10^{-4}$
- 3rd order: $0.095 + x^3/3 = 0.095333$, error $2.3 \times 10^{-5}$

Each extra term cuts the error by roughly a factor of $x \approx 0.1$ here.

Quadratic loss model: $f(x, y) = x^2 + 3y^2$ at $(1, 1)$ has $\nabla f = (2, 6)$, $H = \text{diag}(2, 6)$. For the step $\delta = (-0.1, -0.1)$: predicted change $= \nabla f^\top\delta + \tfrac12\delta^\top H\delta = -0.8 + \tfrac12(0.02 + 0.06) = -0.76$. The true change is $f(0.9, 0.9) - f(1, 1) = 3.24 - 4 = -0.76$, exact because $f$ is quadratic. The first-order model alone predicts $-0.8$, overestimating the decrease because it ignores curvature.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which gradient-descent step comes from minimizing the first-order Taylor model plus $\\frac{1}{2\\eta}\\|\\delta\\|^2$?",
  "options": [
    "$\\delta = -H^{-1}\\nabla f$",
    "$\\delta = -\\eta\\nabla f$",
    "$\\delta = -\\eta\\,\\text{sign}(H)$",
    "$\\delta = -\\eta f$"
  ],
  "answer": 1,
  "explanation": "Minimizing $\\nabla f^\\top\\delta + \\frac{1}{2\\eta}\\|\\delta\\|^2$ gives $\\nabla f + \\delta/\\eta = 0$, so $\\delta = -\\eta\\nabla f$. Dropping the penalty and using the second-order model gives Newton's step instead."
}
```

```quiz
{
  "id": "q2",
  "question": "For small $x$, what is the second-order approximation of $\\ln(1+x)$?",
  "options": [
    "$x + x^2/2$",
    "$x - x^2/2$",
    "$x - x^2$",
    "$1 + x$"
  ],
  "answer": 1,
  "explanation": "$f(0) = 0$, $f'(0) = 1$, $f''(0) = -1$, so $f(x) \\approx x - x^2/2$."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `taylor_poly(derivs, a, x)` returning $\\sum_k \\text{derivs}[k]\\,(x-a)^k / k!$ (`derivs[k]` is the $k$-th derivative at `a`), `quad_change(g, H, delta)` returning the second-order predicted change $g\\cdot\\delta + \\tfrac12\\delta^\\top H\\delta$, and `newton_1d(df, d2f, x0, steps)` applying `x -= df(x)/d2f(x)` repeatedly and returning the final `x`.",
  "setup": "import numpy as np",
  "packages": [
    "numpy"
  ],
  "starterCode": "import math\n\ndef taylor_poly(derivs, a, x):\n    pass\n\ndef quad_change(g, H, delta):\n    pass\n\ndef newton_1d(df, d2f, x0, steps):\n    pass\n\nprint(taylor_poly([1] * 8, 0.0, 1.0))",
  "tests": "import math\nassert abs(taylor_poly([1] * 11, 0.0, 1.0) - math.e) < 1e-6\n# ln(1+x) at 0: derivatives 0, 1, -1, 2, -6\nassert abs(taylor_poly([0, 1, -1], 0.0, 0.1) - 0.095) < 1e-12\nassert abs(taylor_poly([0, 1, -1, 2], 0.0, 0.1) - 0.0953333333) < 1e-9\n# sin at 0 with derivs 0, 1, 0, -1, 0, 1\nassert abs(taylor_poly([0, 1, 0, -1, 0, 1], 0.0, 0.5) - math.sin(0.5)) < 1e-5\n# expansion around a != 0: e^x around 1\nassert abs(taylor_poly([math.e] * 12, 1.0, 1.5) - math.exp(1.5)) < 1e-6\ng = np.array([2.0, 6.0]); H = np.diag([2.0, 6.0])\nassert abs(quad_change(g, H, np.array([-0.1, -0.1])) - (-0.76)) < 1e-12\nf = lambda v: v[0] ** 2 + 3 * v[1] ** 2\nassert abs(f(np.array([0.9, 0.9])) - f(np.array([1.0, 1.0])) - (-0.76)) < 1e-12\nx = newton_1d(lambda t: 1 - 1 / t, lambda t: 1 / t ** 2, 0.5, 6)\nassert abs(x - 1.0) < 1e-6",
  "solution": "import math\n\ndef taylor_poly(derivs, a, x):\n    return sum(d * (x - a) ** k / math.factorial(k) for k, d in enumerate(derivs))\n\ndef quad_change(g, H, delta):\n    g = np.asarray(g, dtype=float)\n    H = np.asarray(H, dtype=float)\n    delta = np.asarray(delta, dtype=float)\n    return float(g @ delta + 0.5 * delta @ H @ delta)\n\ndef newton_1d(df, d2f, x0, steps):\n    x = x0\n    for _ in range(steps):\n        x = x - df(x) / d2f(x)\n    return x",
  "hints": [
    "Each term is derivs[k] * (x - a)**k / k!. math.factorial helps.",
    "In numpy: g @ delta + 0.5 * delta @ H @ delta.",
    "For f(x) = x - ln x, Newton gives x_{t+1} = 2x_t - x_t^2, which converges to 1 from 0.5."
  ]
}
```

> [!TIP] Interview tips
> - Say "gradient descent = first-order Taylor model, Newton = second-order" to connect Taylor to optimization.
> - Know $\ln(1+x) \approx x$ and $e^x \approx 1 + x$ for small $x$, and mention `log1p` / `expm1` for numerical stability.
> - State that the approximation is only local: the step size must stay small enough for the remainder term to be negligible.
