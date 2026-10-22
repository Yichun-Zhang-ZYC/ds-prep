---
id: math-sgd-mini-batch
title: SGD, mini-batch
estimatedMinutes: 12
difficulty: medium
tags: [math, optimization, sgd, mini-batch, batch-size]
---

## Why it matters
Full-batch gradient descent is too expensive for large datasets, so everything in deep learning uses stochastic or mini-batch gradients. Interviewers ask why SGD works, how batch size trades noise for throughput, and how to adjust the learning rate when batch size changes.

## Concept
The loss is an average over data, $L(\theta) = \frac1n\sum_{i=1}^n \ell_i(\theta)$. Computing $\nabla L$ costs $O(n)$ per step. **SGD** instead uses the gradient of a random subset $B$ (a **mini-batch**) of size $b$:
$$g_B = \frac1b\sum_{i \in B}\nabla\ell_i(\theta), \qquad \theta \leftarrow \theta - \eta\,g_B$$

**Key properties**:
- **Unbiased**: $\mathbb E[g_B] = \nabla L$ when samples are drawn uniformly.
- **Variance scales as $\sigma^2/b$**, so noise falls with $\sqrt b$: quadrupling the batch only halves the noise. Cost per step grows linearly in $b$, so returns diminish.
- **Epoch**: one pass over the data = $\lceil n/b\rceil$ steps. Shuffle every epoch (sampling without replacement works better in practice than with replacement).

**Convergence**: with a constant $\eta$, SGD reaches a noise ball around the optimum whose radius scales with $\eta$ and gradient variance. Decaying $\eta$ (Robbins-Monro: $\sum\eta_t = \infty$, $\sum\eta_t^2 < \infty$) converges. For convex problems the rate is $O(1/\sqrt T)$, versus $O(1/T)$ for full GD, but each step is $n/b$ times cheaper.

**Batch-size trade-offs**:
- Small batch: noisy but frequent updates, implicit regularization, can help find wide minima, poor hardware utilization.
- Large batch: smoother gradients and better GPU parallelism, but fewer updates per epoch and often a generalization gap unless the learning rate is tuned.
- **Linear scaling rule**: when multiplying $b$ by $k$, multiply $\eta$ by $k$ (with warmup). Beyond a critical batch size, extra batch yields little benefit.

**Variants**: momentum (smooths noise), Adam and RMSProp (per-parameter scaling), gradient accumulation (simulates a large batch by summing micro-batches), gradient clipping.

**Practical**: shuffle data, normalize the loss by batch size so $\eta$ is comparable across batch sizes, and drop or weight a smaller last batch.

## Worked example
Dataset of $n = 1{,}000{,}000$ examples, batch $b = 256$: one epoch is $\lceil 10^6/256\rceil = 3{,}907$ steps, and each step touches $0.026\%$ of the data. That is roughly $3{,}900$ parameter updates for the cost of one full-batch gradient.

Noise: if per-example gradient standard deviation is $\sigma = 4$ (in one coordinate), then $\text{std}(g_B) = \sigma/\sqrt b$: $0.5$ for $b = 64$, $0.25$ for $b = 256$, $0.125$ for $b = 1024$. Going from 64 to 1024 (16$\times$ the compute per step) cuts noise only 4$\times$.

Scaling: a run with $b = 256$ and $\eta = 0.1$ moved to $b = 1024$ (4$\times$) would start at $\eta = 0.4$ with a few epochs of warmup. Unbiasedness check on a toy set: for $n = 4$ gradients $(1, 3, 5, 7)$, the full gradient is $4$. Splitting into batches $\{1, 3\}$ and $\{5, 7\}$ gives batch means $2$ and $6$, whose average is $4$, the full gradient.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You increase the batch size from 128 to 512 (4x). By what factor does the std of the mini-batch gradient estimate change?",
  "options": [
    "It is 4x smaller",
    "It is 2x smaller",
    "It is unchanged",
    "It is 16x smaller"
  ],
  "answer": 1,
  "explanation": "Std scales as $\\sigma/\\sqrt b$, so a $4\\times$ batch gives $\\sqrt 4 = 2\\times$ less noise."
}
```

```quiz
{
  "id": "q2",
  "question": "Why does constant-learning-rate SGD not converge exactly to the minimum, even on a convex problem?",
  "options": [
    "Mini-batch gradients are biased",
    "Gradient noise persists at the optimum, so iterates keep bouncing in a noise ball unless $\\eta$ decays",
    "The loss becomes non-convex",
    "Shuffling breaks convergence"
  ],
  "answer": 1,
  "explanation": "Per-batch gradients are unbiased but have nonzero variance even at $\\theta^*$ (the full gradient is 0 but each $g_B$ is not), so constant steps keep jittering. Decaying $\\eta$ or growing the batch shrinks the ball."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Using numpy, implement `minibatches(n, batch_size, rng)` returning a list of index arrays from one shuffled epoch (the last batch may be smaller), `mse_grad(w, X, y)` for $\\frac1n\\|Xw-y\\|^2$, and `sgd_linreg(X, y, lr, batch_size, epochs, seed)` that starts at `w = 0`, uses `np.random.default_rng(seed)` and `minibatches` each epoch, and returns `w`.",
  "setup": "import numpy as np",
  "packages": [
    "numpy"
  ],
  "starterCode": "def minibatches(n, batch_size, rng):\n    pass\n\ndef mse_grad(w, X, y):\n    pass\n\ndef sgd_linreg(X, y, lr, batch_size, epochs, seed):\n    pass\n",
  "tests": "rng = np.random.default_rng(0)\nbs = minibatches(10, 4, rng)\nassert [len(b) for b in bs] == [4, 4, 2]\nassert sorted(np.concatenate(bs).tolist()) == list(range(10))\nrng2 = np.random.default_rng(1)\nX = rng2.normal(size=(12, 3)); y = rng2.normal(size=12); w = rng2.normal(size=3)\nfull = mse_grad(w, X, y)\nparts = [mse_grad(w, X[b], y[b]) for b in minibatches(12, 4, np.random.default_rng(5))]\nassert np.allclose(np.mean(parts, axis=0), full)  # unbiased for equal-size batches\nXb = rng2.normal(size=(200, 3)); w_true = np.array([1.5, -2.0, 0.5])\nyb = Xb @ w_true\nw_hat = sgd_linreg(Xb, yb, 0.1, 20, 30, 0)\nassert np.allclose(w_hat, w_true, atol=1e-2)\nw_a = sgd_linreg(Xb, yb, 0.1, 20, 3, 7); w_b = sgd_linreg(Xb, yb, 0.1, 20, 3, 7)\nassert np.array_equal(w_a, w_b)",
  "solution": "def minibatches(n, batch_size, rng):\n    idx = rng.permutation(n)\n    return [idx[i:i + batch_size] for i in range(0, n, batch_size)]\n\ndef mse_grad(w, X, y):\n    return 2.0 / len(y) * X.T @ (X @ w - y)\n\ndef sgd_linreg(X, y, lr, batch_size, epochs, seed):\n    rng = np.random.default_rng(seed)\n    w = np.zeros(X.shape[1])\n    for _ in range(epochs):\n        for b in minibatches(len(y), batch_size, rng):\n            w = w - lr * mse_grad(w, X[b], y[b])\n    return w",
  "hints": [
    "rng.permutation(n) gives a shuffled index array; slice it in chunks of batch_size.",
    "Compute each batch gradient on X[b], y[b] only, so the 1/n factor becomes 1/len(b).",
    "Shuffle again at the start of every epoch."
  ]
}
```

> [!TIP] Interview tips
> - State the three facts: the mini-batch gradient is unbiased, its variance is $\sigma^2/b$, and cost per step is linear in $b$.
> - Explain the batch-size trade-off (noise and generalization vs throughput) and the linear scaling rule with warmup.
> - Mention why constant-$\eta$ SGD plateaus in a noise ball and how decay schedules, momentum or Adam address it.
