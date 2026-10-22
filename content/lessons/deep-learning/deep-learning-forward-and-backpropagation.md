---
id: deep-learning-forward-and-backpropagation
title: Forward & backpropagation
estimatedMinutes: 15
difficulty: medium
tags: [deep-learning, backpropagation, chain-rule, gradients]
---

## Why it matters
Backpropagation is how every neural network is trained, and "derive the gradients for a 2-layer net" is a classic whiteboard question. It is just the chain rule organized so each intermediate result is reused.

## Concept
**Forward pass**: compute and *cache* each layer's pre-activation and activation: $z^{(l)} = W^{(l)} h^{(l-1)} + b^{(l)}$, $h^{(l)} = \phi(z^{(l)})$, then the loss $L$.

**Backward pass** (reverse order), with $\delta^{(l)} = \partial L / \partial z^{(l)}$:
- Output layer: $\delta^{(L)} = \partial L/\partial \hat y \odot \phi'(z^{(L)})$ (for softmax + cross-entropy or sigmoid + BCE this simplifies to $\hat y - y$).
- Hidden layers: $\delta^{(l)} = \big(W^{(l+1)\top}\delta^{(l+1)}\big) \odot \phi'(z^{(l)})$.
- Parameter gradients: $\partial L/\partial W^{(l)} = \delta^{(l)} h^{(l-1)\top}$, $\ \partial L/\partial b^{(l)} = \delta^{(l)}$ (summed over the batch).

Why it matters in practice:
- **Cost**: the backward pass costs about 2x the forward pass; total training FLOPs is roughly 3x forward. It is far cheaper than numerical differentiation, which needs one forward pass per parameter.
- **Memory**: activations must be stored for the backward pass, which is why activation memory grows with batch size and depth. **Gradient checkpointing** trades compute for memory by recomputing activations.
- **Autodiff** frameworks (PyTorch, JAX) build a computation graph and apply reverse-mode differentiation: one backward pass gives the gradient of a scalar loss w.r.t. all parameters.
- The factor $\phi'(z)$ and $W^\top$ repeated through layers is the source of vanishing/exploding gradients.
- **Gradient check**: compare to $(L(\theta+\epsilon) - L(\theta-\epsilon))/2\epsilon$ to debug a hand-written backward pass.

## Worked example
Tiny net, scalar everything: $z_1 = w_1 x + b_1$, $h = \text{relu}(z_1)$, $\hat y = w_2 h + b_2$, loss $L = \tfrac12(\hat y - y)^2$.

Take $x=2,\ w_1=0.5,\ b_1=0,\ w_2=3,\ b_2=1,\ y=5$.

**Forward**: $z_1 = 1$, $h = 1$, $\hat y = 3\cdot1 + 1 = 4$, $L = \tfrac12(4-5)^2 = 0.5$.

**Backward**:
- $\partial L/\partial \hat y = \hat y - y = -1$
- $\partial L/\partial w_2 = -1 \cdot h = -1$, $\ \partial L/\partial b_2 = -1$
- $\partial L/\partial h = -1 \cdot w_2 = -3$
- $\partial L/\partial z_1 = -3 \cdot \mathbb 1[z_1>0] = -3$
- $\partial L/\partial w_1 = -3 \cdot x = -6$, $\ \partial L/\partial b_1 = -3$

One SGD step with $\eta = 0.1$: $w_1 = 0.5 + 0.6 = 1.1$, $w_2 = 3.1$, $b_1 = 0.3$, $b_2 = 1.1$. New forward: $z_1 = 2.2 + 0.3 = 2.5$, $\hat y = 3.1 \cdot 2.5 + 1.1 = 8.85$ — overshoot (loss 7.4)! The step was too large; that is why learning rate matters.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why does backprop compute gradients far more cheaply than finite differences?",
  "options": ["It uses a better optimizer", "It ignores small weights", "It reuses intermediate results via the chain rule, giving all gradients in about one backward pass", "It only computes gradients for the last layer"],
  "answer": 2,
  "explanation": "Reverse-mode autodiff gets the gradient of a scalar loss w.r.t. all parameters in a pass costing about 2x forward; finite differences need one forward pass per parameter."
}
```

```quiz
{
  "id": "q2",
  "question": "For hidden layer $l$, which expression gives $\\delta^{(l)} = \\partial L/\\partial z^{(l)}$?",
  "options": ["$W^{(l)}\\delta^{(l+1)}$", "$(W^{(l+1)\\top}\\delta^{(l+1)}) \\odot \\phi'(z^{(l)})$", "$\\delta^{(l+1)} \\odot h^{(l-1)}$", "$\\phi(z^{(l)})\\,\\delta^{(l+1)}$"],
  "answer": 1,
  "explanation": "Propagate the next layer's error back through the transposed weights, then multiply elementwise by the local activation derivative."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `forward_backward(X, y, W1, b1, W2, b2)` for a one-hidden-layer net: `H = tanh(X @ W1 + b1)`, `yhat = H @ W2 + b2` (`W2` has shape `(h,)`, `b2` is a scalar), loss `0.5 * mean((yhat - y)**2)`. Return `(loss, grads)` where `grads` is a dict with keys `'W1', 'b1', 'W2', 'b2'` of the same shapes as the parameters.",
  "setup": "import numpy as np",
  "packages": ["numpy"],
  "starterCode": "import numpy as np\n\ndef forward_backward(X, y, W1, b1, W2, b2):\n    pass\n\nrng = np.random.default_rng(0)\nX = rng.normal(size=(5, 3))\ny = rng.normal(size=5)\nloss, g = forward_backward(X, y, rng.normal(size=(3, 4)), np.zeros(4), rng.normal(size=4), 0.0)\nprint(loss, {k: v.shape for k, v in g.items()})",
  "tests": "rng = np.random.default_rng(1)\nX = rng.normal(size=(6, 3))\ny = rng.normal(size=6)\nW1 = rng.normal(size=(3, 4)) * 0.5\nb1 = rng.normal(size=4) * 0.1\nW2 = rng.normal(size=4)\nb2 = 0.3\nloss, g = forward_backward(X, y, W1, b1, W2, b2)\nH = np.tanh(X @ W1 + b1)\nassert abs(loss - 0.5 * np.mean((H @ W2 + b2 - y) ** 2)) < 1e-12\nassert g['W1'].shape == W1.shape and g['b1'].shape == b1.shape and g['W2'].shape == W2.shape\ndef f(W1, b1, W2, b2):\n    return forward_backward(X, y, W1, b1, W2, b2)[0]\neps = 1e-6\nfor i in range(3):\n    for j in range(4):\n        P = W1.copy(); P[i, j] += eps\n        M = W1.copy(); M[i, j] -= eps\n        num = (f(P, b1, W2, b2) - f(M, b1, W2, b2)) / (2 * eps)\n        assert abs(num - g['W1'][i, j]) < 1e-6\nfor j in range(4):\n    P = W2.copy(); P[j] += eps\n    M = W2.copy(); M[j] -= eps\n    assert abs((f(W1, b1, P, b2) - f(W1, b1, M, b2)) / (2 * eps) - g['W2'][j]) < 1e-6\n    P = b1.copy(); P[j] += eps\n    M = b1.copy(); M[j] -= eps\n    assert abs((f(W1, P, W2, b2) - f(W1, M, W2, b2)) / (2 * eps) - g['b1'][j]) < 1e-6\nassert abs((f(W1, b1, W2, b2 + eps) - f(W1, b1, W2, b2 - eps)) / (2 * eps) - g['b2']) < 1e-6",
  "solution": "import numpy as np\n\ndef forward_backward(X, y, W1, b1, W2, b2):\n    n = len(y)\n    H = np.tanh(X @ W1 + b1)\n    yhat = H @ W2 + b2\n    err = yhat - y\n    loss = 0.5 * np.mean(err ** 2)\n    dy = err / n\n    dW2 = H.T @ dy\n    db2 = dy.sum()\n    dH = np.outer(dy, W2)\n    dZ1 = dH * (1 - H ** 2)\n    dW1 = X.T @ dZ1\n    db1 = dZ1.sum(axis=0)\n    return loss, {'W1': dW1, 'b1': db1, 'W2': dW2, 'b2': db2}",
  "hints": ["dL/dyhat = (yhat - y) / n. Then dW2 = H.T @ dy, db2 = dy.sum(), dH = outer(dy, W2).", "tanh'(z) = 1 - H**2, so dZ1 = dH * (1 - H**2); dW1 = X.T @ dZ1, db1 = dZ1.sum(axis=0)."]
}
```

> [!TIP] Interview tips
> - Be able to derive the 2-layer case from scratch: delta at the output, transpose-weights times delta, elementwise activation derivative.
> - Mention caching activations, memory cost and gradient checkpointing.
> - Know gradient checking (finite differences) as the standard way to debug a custom backward pass.
