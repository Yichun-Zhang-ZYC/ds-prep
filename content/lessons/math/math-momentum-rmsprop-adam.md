---
id: math-momentum-rmsprop-adam
title: Momentum, RMSProp, Adam
estimatedMinutes: 12
difficulty: medium
tags: [optimization, adam, momentum, rmsprop]
---

## Why it matters
Plain SGD struggles with ravines (steep in one direction, flat in another) and with parameters whose gradients differ wildly in scale. Adam is the default optimizer in deep learning, so interviewers expect you to write its update from memory and explain each piece.

## Concept
**Momentum** keeps an exponentially decaying sum of past gradients, so consistent directions accelerate and oscillating ones cancel:
$$v_t = \beta v_{t-1} + g_t, \qquad \theta_t = \theta_{t-1} - \eta\, v_t \quad (\beta \approx 0.9)$$

**RMSProp** divides each coordinate by a running RMS of its gradients, giving every parameter its own effective step size:
$$s_t = \rho s_{t-1} + (1-\rho) g_t^2, \qquad \theta_t = \theta_{t-1} - \eta \frac{g_t}{\sqrt{s_t} + \epsilon}$$

**Adam** combines both: a first-moment average $m_t$ (direction) and a second-moment average $v_t$ (scale), with bias correction because both start at 0:
$$m_t = \beta_1 m_{t-1} + (1-\beta_1) g_t, \quad v_t = \beta_2 v_{t-1} + (1-\beta_2) g_t^2$$
$$\hat m_t = \frac{m_t}{1-\beta_1^t}, \quad \hat v_t = \frac{v_t}{1-\beta_2^t}, \quad \theta_t = \theta_{t-1} - \eta \frac{\hat m_t}{\sqrt{\hat v_t} + \epsilon}$$

Defaults: $\beta_1 = 0.9$, $\beta_2 = 0.999$, $\epsilon = 10^{-8}$. **AdamW** decouples weight decay from the adaptive step (decay is applied directly to $\theta$, not added to the gradient), which is why it generalizes better than Adam with L2. Adaptive methods are less sensitive to the learning rate; SGD with momentum often generalizes slightly better on vision tasks but needs more tuning.

## Worked example
Minimize $f(x) = x^2$ (gradient $2x$) from $x_0 = 1$ with $\eta = 0.1$.

- Momentum ($\beta = 0.9$): step 1: $g = 2$, $v = 2$, $x = 1 - 0.2 = 0.8$. Step 2: $g = 1.6$, $v = 0.9 \cdot 2 + 1.6 = 3.4$, $x = 0.8 - 0.34 = 0.46$. The velocity builds up, so the second step is larger than the first.
- Adam, step 1: $g = 2$, $m = 0.2$, $v = 0.004$, $\hat m = 0.2/0.1 = 2$, $\hat v = 0.004/0.001 = 4$, so the step is $0.1 \cdot 2/2 = 0.1$ and $x = 0.9$. On step 1 the Adam step is about $\eta \cdot \text{sign}(g)$ regardless of gradient scale. That scale invariance is what makes it robust.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why does Adam apply bias correction to $m_t$ and $v_t$?",
  "options": [
    "To reduce variance of the gradient",
    "Both averages are initialized at 0, so early estimates are biased toward 0",
    "To guarantee convergence on non-convex losses",
    "To make the update independent of the learning rate"
  ],
  "answer": 1,
  "explanation": "With $m_0 = v_0 = 0$ and decay rates near 1, the first few averages are far too small. Dividing by $1-\\beta^t$ rescales them to unbiased estimates; the effect vanishes as $t$ grows."
}
```

```quiz
{
  "id": "q2",
  "question": "Two parameters have gradients of constant magnitude 100 and 0.01. How does Adam's update size compare for them (ignoring $\\epsilon$)?",
  "options": [
    "The first moves about 10,000 times farther",
    "Both move about $\\eta$ per step",
    "The second moves farther",
    "Neither moves"
  ],
  "answer": 1,
  "explanation": "Adam divides by the RMS of the gradient, so $\\hat m/\\sqrt{\\hat v} \\approx \\pm 1$ for a consistent gradient of any scale. SGD would move the first parameter 10,000 times farther."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement three 1-D optimizers that run `steps` updates from `x0` on a function with gradient `grad(x)` and return the final `x`: `momentum(grad, x0, lr, beta, steps)` ($v = \\beta v + g$, $x \\mathrel{-}= lr \\cdot v$), `rmsprop(grad, x0, lr, rho, steps, eps=1e-8)` and `adam(grad, x0, lr, steps, b1=0.9, b2=0.999, eps=1e-8)` with bias correction (use $t$ starting at 1).",
  "starterCode": "def momentum(grad, x0, lr, beta, steps):\n    pass\n\ndef rmsprop(grad, x0, lr, rho, steps, eps=1e-8):\n    pass\n\ndef adam(grad, x0, lr, steps, b1=0.9, b2=0.999, eps=1e-8):\n    pass\n\ng = lambda x: 2 * x\nprint(momentum(g, 1.0, 0.1, 0.9, 2), rmsprop(g, 1.0, 0.1, 0.9, 1), adam(g, 1.0, 0.1, 1))",
  "tests": "g = lambda x: 2 * x\nassert abs(momentum(g, 1.0, 0.1, 0.9, 1) - 0.8) < 1e-12\nassert abs(momentum(g, 1.0, 0.1, 0.9, 2) - 0.46) < 1e-12\nassert abs(rmsprop(g, 1.0, 0.1, 0.9, 1) - (1 - 0.2 / 0.4 ** 0.5)) < 1e-6\nassert abs(adam(g, 1.0, 0.1, 1) - 0.9) < 1e-6\nassert abs(adam(lambda x: 1000 * x, 1.0, 0.1, 1) - 0.9) < 1e-6\nassert abs(adam(g, 1.0, 0.1, 300)) < 0.1\nassert abs(momentum(g, 1.0, 0.05, 0.9, 300)) < 1e-3",
  "solution": "def momentum(grad, x0, lr, beta, steps):\n    x, v = x0, 0.0\n    for _ in range(steps):\n        v = beta * v + grad(x)\n        x = x - lr * v\n    return x\n\ndef rmsprop(grad, x0, lr, rho, steps, eps=1e-8):\n    x, s = x0, 0.0\n    for _ in range(steps):\n        g = grad(x)\n        s = rho * s + (1 - rho) * g * g\n        x = x - lr * g / (s ** 0.5 + eps)\n    return x\n\ndef adam(grad, x0, lr, steps, b1=0.9, b2=0.999, eps=1e-8):\n    x, m, v = x0, 0.0, 0.0\n    for t in range(1, steps + 1):\n        g = grad(x)\n        m = b1 * m + (1 - b1) * g\n        v = b2 * v + (1 - b2) * g * g\n        m_hat = m / (1 - b1 ** t)\n        v_hat = v / (1 - b2 ** t)\n        x = x - lr * m_hat / (v_hat ** 0.5 + eps)\n    return x",
  "hints": [
    "Keep the state (velocity, running square, m, v) in local variables and update them before the parameter.",
    "In Adam, compute the gradient once per step, then use $1 - \\beta^t$ with $t$ starting at 1."
  ]
}
```

> [!TIP] Interview tips
> - Be able to write Adam's update and say what each moment does: $m$ is the direction (momentum), $v$ is per-parameter scale (RMSProp-style).
> - Know AdamW (decoupled weight decay) and that Adam often needs warmup plus a learning-rate schedule for transformers.
> - Pitfall: skipping bias correction makes the first steps wrongly tiny (Adam) or huge (RMSProp with small $\rho$ and $\epsilon$).
