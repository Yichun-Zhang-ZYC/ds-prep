---
id: deep-learning-batch-normalization-layer-normalization
title: Batch normalization, layer normalization
estimatedMinutes: 12
difficulty: medium
tags: [deep-learning, normalization, training]
---

## Why it matters
Normalization layers make deep nets train faster and tolerate larger learning rates. Interviewers ask what BatchNorm computes, why train and eval differ, and why transformers use LayerNorm instead.

## Concept
**BatchNorm (BN)** normalizes each feature (each channel in a CNN) across the mini-batch:
$$\hat x = \frac{x - \mu_B}{\sqrt{\sigma_B^2 + \epsilon}}, \qquad y = \gamma \hat x + \beta$$
$\gamma, \beta$ are learned, so the layer can undo the normalization if that is best.

- **Train vs eval**: training uses the current batch's $\mu_B, \sigma_B^2$ and updates running averages ($\text{run} \leftarrow (1-m)\,\text{run} + m\,\text{batch}$, $m \approx 0.1$). Inference uses the frozen running statistics. Forgetting `model.eval()` is a classic bug.
- **Weakness**: statistics are noisy for small batches (below ~16), and each example's output depends on the other examples in its batch. It is awkward for RNNs and variable-length sequences.
- **Why it helps**: smoother loss surface and better-conditioned gradients, so higher learning rates work; the batch noise also acts as mild regularization. (The "internal covariate shift" story is disputed.)

**LayerNorm (LN)** normalizes each example across its own features, so there is no batch dependence and train equals eval. It is the default in transformers (usually pre-LN: normalize before attention/FFN, which trains more stably). **RMSNorm** drops the mean subtraction and divides by the root mean square only (used in LLaMA-style models).

| | BatchNorm | LayerNorm |
|---|---|---|
| Normalizes over | batch (and spatial) dims, per channel | feature dims, per example |
| Needs running stats | yes | no |
| Typical home | CNNs | transformers, RNNs |

Also: **GroupNorm** (groups of channels, per example) and **InstanceNorm** suit small-batch vision tasks. A bias before BN is redundant because $\beta$ replaces it.

## Worked example
One feature across a batch of four examples: $x = (1, 2, 3, 6)$. Mean $\mu = 3$, variance $\sigma^2 = (4 + 1 + 0 + 9)/4 = 3.5$, so $\sigma = 1.871$ (ignore $\epsilon$).

$\hat x = (-2, -1, 0, 3)/1.871 = (-1.069, -0.535, 0, 1.604)$, which has mean 0 and variance 1. With $\gamma = 2, \beta = 1$: $y = (-1.138, -0.069, 1, 4.207)$.

LayerNorm does the same arithmetic but along the other axis: one example with four features $(1, 2, 3, 6)$ gives the identical $\hat x$. The difference is only which numbers share a mean and variance.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A model with BatchNorm gives different predictions for the same input depending on which other examples are in the batch. What is the most likely cause?",
  "options": [
    "Dropout is disabled",
    "The model is still in training mode, so BN uses batch statistics",
    "LayerNorm is in use",
    "The learning rate is too high"
  ],
  "answer": 1,
  "explanation": "In training mode BN normalizes with the current batch's mean and variance, so outputs depend on batch composition. In eval mode it uses the fixed running statistics."
}
```

```quiz
{
  "id": "q2",
  "question": "Why do transformers prefer LayerNorm over BatchNorm?",
  "options": [
    "LN has more parameters",
    "LN is cheaper to compute on GPUs",
    "LN does not depend on batch size or sequence padding and behaves identically at train and inference time",
    "LN removes the need for residual connections"
  ],
  "answer": 2,
  "explanation": "LN normalizes over each token's features, so it works with batch size 1 and variable-length sequences, with no running statistics."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "With numpy, write `batch_norm(X, gamma, beta, eps=1e-5)` that normalizes each column of the (N, D) array over the batch (axis 0, biased variance) and applies `gamma * x_hat + beta`. Write `layer_norm(X, gamma, beta, eps=1e-5)` that normalizes each row over its features. Finally write `update_running(running, batch_stat, momentum=0.1)` = `(1 - momentum) * running + momentum * batch_stat`.",
  "setup": "import numpy as np",
  "packages": [
    "numpy"
  ],
  "starterCode": "import numpy as np\n\ndef batch_norm(X, gamma, beta, eps=1e-5):\n    pass\n\ndef layer_norm(X, gamma, beta, eps=1e-5):\n    pass\n\ndef update_running(running, batch_stat, momentum=0.1):\n    pass\n\nX = np.array([[1.0], [2.0], [3.0], [6.0]])\nprint(batch_norm(X, np.array([2.0]), np.array([1.0]), eps=0.0).ravel())\nprint(layer_norm(X.T, np.ones(4), np.zeros(4), eps=0.0))",
  "tests": "X = np.array([[1.0], [2.0], [3.0], [6.0]])\nout = batch_norm(X, np.array([2.0]), np.array([1.0]), eps=0.0)\nassert np.allclose(out.ravel(), [-1.138, -0.069, 1.0, 4.207], atol=1e-3)\nln = layer_norm(X.T, np.ones(4), np.zeros(4), eps=0.0)\nassert np.allclose(ln.ravel(), (X.ravel() - 3) / np.sqrt(3.5))\nrng = np.random.default_rng(0)\nA = rng.normal(5, 3, size=(32, 4))\nB = batch_norm(A, np.ones(4), np.zeros(4))\nassert np.allclose(B.mean(axis=0), 0, atol=1e-8) and np.allclose(B.var(axis=0), 1, atol=1e-3)\nC = layer_norm(A, np.ones(4), np.zeros(4))\nassert np.allclose(C.mean(axis=1), 0, atol=1e-8) and np.allclose(C.var(axis=1), 1, atol=1e-3)\nassert np.allclose(update_running(np.array([1.0, 2.0]), np.array([3.0, 4.0])), [1.2, 2.2])",
  "solution": "import numpy as np\n\ndef batch_norm(X, gamma, beta, eps=1e-5):\n    mu = X.mean(axis=0)\n    var = X.var(axis=0)\n    return gamma * (X - mu) / np.sqrt(var + eps) + beta\n\ndef layer_norm(X, gamma, beta, eps=1e-5):\n    mu = X.mean(axis=1, keepdims=True)\n    var = X.var(axis=1, keepdims=True)\n    return gamma * (X - mu) / np.sqrt(var + eps) + beta\n\ndef update_running(running, batch_stat, momentum=0.1):\n    return (1 - momentum) * running + momentum * batch_stat",
  "hints": [
    "Use `X.mean(axis=0)` and `X.var(axis=0)` for BN; `axis=1, keepdims=True` for LN.",
    "np.var uses the biased estimator (divide by N) by default, which is what BN uses."
  ]
}
```

> [!TIP] Interview tips
> - State the axis: BN averages over the batch (per feature), LN over features (per example).
> - Always mention train vs eval behaviour of BN (running statistics) and the small-batch failure mode.
> - Say why transformers use LN: variable-length sequences, no batch dependence, identical train and inference behaviour.
