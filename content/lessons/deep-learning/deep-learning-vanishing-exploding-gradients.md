---
id: deep-learning-vanishing-exploding-gradients
title: Vanishing / exploding gradients
estimatedMinutes: 10
difficulty: medium
tags: [deep-learning, gradients, clipping, residual-connections]
---

## Why it matters
Gradient pathologies explain why deep and recurrent networks were hard to train for decades, and why ReLU, residual connections, normalization, LSTMs and gradient clipping exist. Expect "what causes it, how do you detect it, how do you fix it".

## Concept
Backprop multiplies one Jacobian per layer. For a chain of $L$ layers:
$$\frac{\partial L}{\partial h_0} = \prod_{l=1}^{L} \big(\text{diag}(\phi'(z_l))\,W_l\big)^\top \frac{\partial L}{\partial h_L}$$
If the typical factor has magnitude $<1$ the product **vanishes** exponentially in depth; if $>1$ it **explodes**. Early layers (or early time steps in an RNN) get tiny or huge updates.

**Causes**: saturating activations ($\sigma' \le 0.25$, tanh' small when saturated), weights with spectral norm below or above 1, bad init, very long sequences (RNN: the same $W$ is multiplied $T$ times).

**Symptoms**: vanishing: early-layer gradient norms orders of magnitude below late layers, loss plateaus, tiny weight changes. Exploding: loss spikes or `NaN`/`inf`, huge gradient norms.

**Remedies**
- ReLU-family activations (gradient 1 when active).
- Proper init (He/Xavier) so per-layer gain is about 1.
- **Residual connections**: $h_{l+1} = h_l + F(h_l)$ gives gradient $I + \partial F/\partial h$, an identity path that bypasses the product.
- **Normalization** (BatchNorm/LayerNorm) keeps pre-activations in a healthy range.
- **Gated recurrent units** (LSTM/GRU): additive cell-state path.
- **Gradient clipping** for explosions: by value, or by global norm, $g \leftarrow g \cdot \min(1, c/\lVert g\rVert)$, which keeps the direction. Standard for RNNs and Transformers (e.g. $c=1.0$).
- Lower LR / warmup; truncated BPTT for RNNs.
- Clipping fixes exploding gradients only; vanishing needs architectural changes.

## Worked example
**Vanishing**: a 10-layer sigmoid net at its best case has $\sigma' = 0.25$ and weights near 1, so the gradient shrinks by $0.25^{10} = 9.5\times10^{-7}$ by the first layer. With ReLU (derivative 1) and gain 1 it stays at 1.

**Exploding**: per-layer gain 1.5 over 10 layers gives $1.5^{10} = 57.7$; over 50 layers $1.5^{50} \approx 6.4\times10^{8}$.

**Residual**: with $h_{l+1} = h_l + F(h_l)$, the layer Jacobian is $I + J_F$. Even if $J_F \approx 0$ the gradient passes through unchanged, so 100 layers do not shrink it to $0$.

**Clip by global norm**: gradients $g = [3, 4]$, $\lVert g\rVert = 5$, threshold $c = 1$: scale by $c/\lVert g\rVert = 0.2$, giving $[0.6, 0.8]$, norm 1, same direction. If $\lVert g\rVert \le c$ nothing changes.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A deep plain-sigmoid network trains very slowly in its first layers. What is the most likely cause?",
  "options": ["Learning rate too low in the last layer", "Vanishing gradients, since $\\sigma' \\le 0.25$ is multiplied across many layers", "Exploding gradients", "Batch size too large"],
  "answer": 1,
  "explanation": "The product of many factors at most 0.25 shrinks exponentially, so early layers get almost no signal."
}
```

```quiz
{
  "id": "q2",
  "question": "What does clipping by global norm do?",
  "options": ["Zeroes out small gradients", "Clips each component to [−c, c], changing the direction", "Rescales the whole gradient vector to norm at most $c$, preserving its direction", "Fixes vanishing gradients"],
  "answer": 2,
  "explanation": "Global-norm clipping multiplies all gradients by $\\min(1, c/\\lVert g\\rVert)$; per-value clipping can distort the direction. It does not help vanishing gradients."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `chain_gradient(ws, derivs)` returning the product of `w * d` over layers (scalar chain), `depth_to_vanish(factor, eps)` giving the smallest number of layers `L` with `factor ** L < eps` (0 < factor < 1), and `clip_by_global_norm(grads, max_norm)` that takes a list of floats and rescales the list only if its L2 norm exceeds `max_norm`.",
  "starterCode": "import math\n\ndef chain_gradient(ws, derivs):\n    pass\n\ndef depth_to_vanish(factor, eps):\n    pass\n\ndef clip_by_global_norm(grads, max_norm):\n    pass\n\nprint(chain_gradient([1.0] * 10, [0.25] * 10), depth_to_vanish(0.25, 1e-6), clip_by_global_norm([3.0, 4.0], 1.0))",
  "tests": "assert abs(chain_gradient([1.0] * 10, [0.25] * 10) - 0.25 ** 10) < 1e-15\nassert abs(chain_gradient([1.5] * 10, [1.0] * 10) - 1.5 ** 10) < 1e-9\nassert chain_gradient([], []) == 1.0\nassert depth_to_vanish(0.25, 1e-6) == 10\nassert depth_to_vanish(0.5, 0.1) == 4\nc = clip_by_global_norm([3.0, 4.0], 1.0)\nassert abs(c[0] - 0.6) < 1e-12 and abs(c[1] - 0.8) < 1e-12\nassert clip_by_global_norm([0.3, 0.4], 1.0) == [0.3, 0.4]",
  "solution": "import math\n\ndef chain_gradient(ws, derivs):\n    g = 1.0\n    for w, d in zip(ws, derivs):\n        g *= w * d\n    return g\n\ndef depth_to_vanish(factor, eps):\n    prod = 1.0\n    layers = 0\n    while prod >= eps:\n        prod *= factor\n        layers += 1\n    return layers\n\ndef clip_by_global_norm(grads, max_norm):\n    norm = math.sqrt(sum(g * g for g in grads))\n    scale = max_norm / norm if norm > max_norm else 1.0\n    return [g * scale for g in grads]",
  "hints": ["Loop: multiply by factor until the running product drops below eps and count the steps.", "scale = max_norm / norm if norm > max_norm else 1.0."]
}
```

> [!TIP] Interview tips
> - Start from "backprop is a product of Jacobians": magnitudes below 1 vanish, above 1 explode.
> - List fixes by cause: activation (ReLU), init, architecture (residual, LSTM, normalization), optimization (clipping, LR).
> - Be precise: clipping addresses exploding gradients, not vanishing ones.
