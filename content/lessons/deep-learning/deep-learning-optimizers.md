---
id: deep-learning-optimizers
title: "Optimizers (SGD, Adam, AdamW)"
estimatedMinutes: 14
difficulty: medium
tags: [deep-learning, optimizers, adam, adamw, sgd]
---

## Why it matters
The optimizer decides how gradients become weight updates. "How does Adam work?" and "Adam vs AdamW?" are near-certain questions in any deep learning interview, and LLM training depends on AdamW details.

## Concept
**SGD**: $\theta \leftarrow \theta - \eta\, g$ with $g$ a mini-batch gradient (noisy but cheap; noise helps escape sharp minima).

**Momentum** (PyTorch form): $v \leftarrow \mu v + g$, $\theta \leftarrow \theta - \eta v$, with $\mu \approx 0.9$. Smooths noise and speeds travel along consistent directions; helps in ravines. **Nesterov** evaluates the gradient at the look-ahead point.

**Adaptive methods** scale each parameter's step by its gradient history:
- **RMSProp**: $v \leftarrow \beta_2 v + (1-\beta_2) g^2$, step $\eta\, g/(\sqrt v + \epsilon)$.
- **Adam** = momentum + RMSProp + bias correction:
  - $m_t = \beta_1 m_{t-1} + (1-\beta_1) g_t$, $\ v_t = \beta_2 v_{t-1} + (1-\beta_2) g_t^2$
  - $\hat m_t = m_t/(1-\beta_1^t)$, $\ \hat v_t = v_t/(1-\beta_2^t)$ (corrects the zero-init bias early on)
  - $\theta \leftarrow \theta - \eta\, \hat m_t / (\sqrt{\hat v_t} + \epsilon)$
  - Defaults: $\eta = 10^{-3}$, $\beta_1 = 0.9$, $\beta_2 = 0.999$, $\epsilon = 10^{-8}$. LLMs often use $\beta_2 = 0.95$.
- **Adam with L2** adds $\lambda\theta$ to the gradient, so the decay is divided by $\sqrt{\hat v}$ and shrinks weights unevenly (weakly for params with large gradients).
- **AdamW** *decouples* weight decay: $\theta \leftarrow \theta - \eta\,(\hat m/(\sqrt{\hat v}+\epsilon) + \lambda\theta)$. Decay is a clean shrink independent of gradient scale; it is the default for Transformers. Usually exclude biases and norm parameters from decay.

**Trade-offs**: Adam converges fast with little tuning and handles sparse gradients/Transformers well; SGD+momentum often generalizes slightly better on vision (ResNets) with careful LR tuning. Adam stores 2 extra tensors per parameter (about 3x parameter memory in optimizer + weights; ~16 bytes/param with fp32 master weights in mixed precision). Related: Adafactor, Lion (less memory), LAMB/LARS (large batch).

## Worked example
Adam, first step, with $g_1 = 0.5$, defaults:
- $m_1 = 0.1 \cdot 0.5 = 0.05$, $\ v_1 = 0.001 \cdot 0.25 = 0.00025$
- $\hat m_1 = 0.05/0.1 = 0.5$, $\ \hat v_1 = 0.00025/0.001 = 0.25$, so $\sqrt{\hat v_1} = 0.5$
- update $= \eta \cdot 0.5/0.5 = \eta$.

The first step has size $\eta$ regardless of the gradient's scale (try $g_1 = 50$: also $\eta$). Without bias correction the step would be $\eta \cdot 0.05/\sqrt{0.00025} = 3.16\,\eta$, too big.

**Momentum**: $\mu=0.9$, constant $g=1$: $v = 1, 1.9, 2.71, \dots \to 10$. The effective step grows toward $10\eta$.

**L2 vs decoupled decay** at $\theta=1$, $g=0.5$, $\eta=0.1$, $\lambda=0.1$ (first step):
- Adam+L2: $g' = 0.5 + 0.1 = 0.6$; normalized step is again $\eta$, so $\theta = 0.9$. The decay had no visible effect.
- AdamW: $\theta = 1 - 0.1\,(1 + 0.1\cdot 1) = 0.89$. Decay contributes $\eta\lambda\theta = 0.01$ as intended.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "In Adam, why is bias correction ($\\hat m = m/(1-\\beta_1^t)$) applied?",
  "options": ["To reduce variance of the gradient", "To prevent exploding gradients", "Because $m$ and $v$ are initialized at zero and are biased toward zero early in training", "To make Adam equivalent to SGD"],
  "answer": 2,
  "explanation": "With $m_0=v_0=0$ and $\\beta$ close to 1, the early moving averages underestimate the true moments; dividing by $1-\\beta^t$ fixes that."
}
```

```quiz
{
  "id": "q2",
  "question": "What is the difference between Adam with L2 regularization and AdamW?",
  "options": ["AdamW uses a bigger learning rate", "AdamW applies weight decay directly to the weights instead of through the gradient, so it is not rescaled by $\\sqrt{\\hat v}$", "AdamW has no momentum", "They are mathematically identical"],
  "answer": 1,
  "explanation": "With L2 the penalty gradient passes through the adaptive normalization; AdamW decouples it so the decay strength does not depend on gradient history."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement (scalar, pure Python) `sgd_momentum_step(theta, g, v, lr, mu)` returning `(theta, v)` using `v = mu*v + g; theta -= lr*v`, and `adam_step(theta, g, m, v, t, lr=1e-3, b1=0.9, b2=0.999, eps=1e-8, wd=0.0, decoupled=False)` returning `(theta, m, v)` where `t` is the 1-based step. If `wd > 0` and not `decoupled`, add `wd*theta` to the gradient (L2); if `decoupled`, do AdamW: subtract `lr*wd*theta` using the pre-update theta.",
  "starterCode": "import math\n\ndef sgd_momentum_step(theta, g, v, lr, mu):\n    pass\n\ndef adam_step(theta, g, m, v, t, lr=1e-3, b1=0.9, b2=0.999, eps=1e-8, wd=0.0, decoupled=False):\n    pass\n\nprint(sgd_momentum_step(1.0, 1.0, 0.0, 0.1, 0.9), adam_step(1.0, 0.5, 0.0, 0.0, 1, lr=0.1))",
  "tests": "th, v = sgd_momentum_step(1.0, 1.0, 0.0, 0.1, 0.9)\nassert abs(th - 0.9) < 1e-12 and abs(v - 1.0) < 1e-12\nth, v = sgd_momentum_step(th, 1.0, v, 0.1, 0.9)\nassert abs(v - 1.9) < 1e-12 and abs(th - 0.71) < 1e-12\nth, m, v = adam_step(1.0, 0.5, 0.0, 0.0, 1, lr=0.1)\nassert abs(m - 0.05) < 1e-12 and abs(v - 0.00025) < 1e-12\nassert abs(th - 0.9) < 1e-6\nth, _, _ = adam_step(1.0, 50.0, 0.0, 0.0, 1, lr=0.1)\nassert abs(th - 0.9) < 1e-6\nth, _, _ = adam_step(1.0, 0.5, 0.0, 0.0, 1, lr=0.1, wd=0.1, decoupled=False)\nassert abs(th - 0.9) < 1e-6\nth, _, _ = adam_step(1.0, 0.5, 0.0, 0.0, 1, lr=0.1, wd=0.1, decoupled=True)\nassert abs(th - 0.89) < 1e-6\nth, m, v = adam_step(0.9, 0.5, 0.05, 0.00025, 2, lr=0.1)\nassert abs(m - 0.095) < 1e-12 and abs(v - (0.999 * 0.00025 + 0.001 * 0.25)) < 1e-12",
  "solution": "import math\n\ndef sgd_momentum_step(theta, g, v, lr, mu):\n    v = mu * v + g\n    return theta - lr * v, v\n\ndef adam_step(theta, g, m, v, t, lr=1e-3, b1=0.9, b2=0.999, eps=1e-8, wd=0.0, decoupled=False):\n    if wd and not decoupled:\n        g = g + wd * theta\n    m = b1 * m + (1 - b1) * g\n    v = b2 * v + (1 - b2) * g * g\n    m_hat = m / (1 - b1 ** t)\n    v_hat = v / (1 - b2 ** t)\n    new = theta - lr * m_hat / (math.sqrt(v_hat) + eps)\n    if wd and decoupled:\n        new -= lr * wd * theta\n    return new, m, v",
  "hints": ["Update m and v with the (possibly L2-modified) gradient, then compute m_hat = m/(1-b1**t) and v_hat = v/(1-b2**t).", "AdamW: theta_new = theta - lr * (m_hat/(sqrt(v_hat)+eps) + wd*theta)."]
}
```

> [!TIP] Interview tips
> - Write Adam's update from memory, including bias correction, and give the default hyperparameters.
> - Explain AdamW as decoupled weight decay and why L2 inside Adam is mis-scaled.
> - Know the trade-off: Adam for speed/Transformers, SGD+momentum sometimes better generalization; mention optimizer-state memory.
