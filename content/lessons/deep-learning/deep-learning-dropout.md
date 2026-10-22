---
id: deep-learning-dropout
title: Dropout
estimatedMinutes: 8
difficulty: easy
tags: [deep-learning, regularization]
---

## Why it matters
Dropout is the standard neural-net regularizer, and interviewers like the details: why scale by $1/(1-p)$, what happens at inference, and how it differs from L2.

## Concept
During training, zero each activation independently with probability $p$ and **scale the survivors by $1/(1-p)$** (*inverted dropout*):
$$y_i = \frac{m_i}{1-p}\,x_i, \qquad m_i \sim \text{Bernoulli}(1-p)$$
Then $\mathbb{E}[y_i] = x_i$, so **at inference dropout is simply the identity**, with no rescaling needed.

- **Why it works**: a unit cannot rely on specific partners (*co-adaptation*), so features must be robust. It approximates averaging an exponential number of thinned sub-networks (an implicit ensemble).
- **Backward pass**: the gradient is multiplied by the same mask and scale: $\partial L/\partial x = (m/(1-p)) \odot \partial L/\partial y$. Dropped units get zero gradient.
- **Typical rates**: $p = 0.5$ on large fully-connected layers, $0.1$ to $0.3$ in transformers (embeddings, attention weights, FFN output), small or zero for conv layers.
- **Variants**: spatial dropout (drop whole channels, since neighbouring pixels are correlated), DropConnect (drop weights), stochastic depth / DropPath (drop whole residual blocks), **MC dropout** (keep dropout on at test time and average many passes to estimate uncertainty).
- **Caveats**: it slows convergence, so train longer. Combining with BatchNorm can shift variance between train and eval, so use it sparingly together. Large LLM pre-training often uses no dropout because data is huge and single-epoch.
- Compared with L2, dropout is an adaptive, data-dependent noise regularizer; the two are often combined.

## Worked example
Activations $x = (2, 4, 6, 8)$, $p = 0.5$, and uniform draws $u = (0.1, 0.7, 0.4, 0.9)$. Keep a unit when $u \ge p$: mask $= (0, 1, 0, 1)$. Scale $= 1/(1-0.5) = 2$.

Training output: $(0, 8, 0, 16)$. Its sum is 24 versus 20 for this one draw, but over many draws each element has expectation $x_i$ (e.g. element 2: $0.5 \cdot 8 = 4$). At inference the output is just $(2, 4, 6, 8)$.

Backward with upstream gradient $(1, 1, 1, 1)$: $(0, 2, 0, 2)$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "With inverted dropout at rate $p = 0.2$, by what factor are the kept activations scaled during training?",
  "options": [
    "0.2",
    "0.8",
    "1.25",
    "5"
  ],
  "answer": 2,
  "explanation": "Scale by $1/(1-p) = 1/0.8 = 1.25$ so the expected activation matches inference, where dropout is off."
}
```

```quiz
{
  "id": "q2",
  "question": "Which is NOT a reason dropout reduces overfitting?",
  "options": [
    "It reduces the number of parameters stored in the final model",
    "It prevents co-adaptation of units",
    "It approximates an ensemble of thinned networks",
    "It injects noise that forces redundant features"
  ],
  "answer": 0,
  "explanation": "Dropout does not shrink the model: all weights are kept and used at inference. The benefits come from noise, reduced co-adaptation and implicit ensembling."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `dropout_forward(x, p, u, train=True)` for numpy arrays: given pre-drawn uniform samples `u` (same shape as `x`), keep units where `u >= p` and scale by `1 / (1 - p)`. Return `(out, mask)` where `mask` is the scaled mask (0 or `1/(1-p)`). If `train` is False return `(x, np.ones_like(x))`. Also write `dropout_backward(dout, mask)`.",
  "setup": "import numpy as np",
  "packages": [
    "numpy"
  ],
  "starterCode": "import numpy as np\n\ndef dropout_forward(x, p, u, train=True):\n    pass\n\ndef dropout_backward(dout, mask):\n    pass\n\nx = np.array([2.0, 4.0, 6.0, 8.0])\nu = np.array([0.1, 0.7, 0.4, 0.9])\nout, mask = dropout_forward(x, 0.5, u)\nprint(out, dropout_backward(np.ones(4), mask))",
  "tests": "x = np.array([2.0, 4.0, 6.0, 8.0])\nu = np.array([0.1, 0.7, 0.4, 0.9])\nout, mask = dropout_forward(x, 0.5, u)\nassert np.allclose(out, [0, 8, 0, 16])\nassert np.allclose(dropout_backward(np.ones(4), mask), [0, 2, 0, 2])\nout2, m2 = dropout_forward(x, 0.5, u, train=False)\nassert np.allclose(out2, x) and np.allclose(m2, 1)\nrng = np.random.default_rng(0)\nu = rng.random(100000)\nout3, _ = dropout_forward(np.ones(100000), 0.3, u)\nassert abs(out3.mean() - 1.0) < 0.02\nassert abs((out3 == 0).mean() - 0.3) < 0.01",
  "solution": "import numpy as np\n\ndef dropout_forward(x, p, u, train=True):\n    if not train:\n        return x, np.ones_like(x)\n    mask = (u >= p) / (1.0 - p)\n    return x * mask, mask\n\ndef dropout_backward(dout, mask):\n    return dout * mask",
  "hints": [
    "mask = (u >= p) / (1 - p); out = x * mask.",
    "The backward pass multiplies by the same scaled mask."
  ]
}
```

> [!TIP] Interview tips
> - Explain inverted dropout: scale during training so inference needs no change.
> - Mention model.eval() disables dropout, and MC dropout as the exception for uncertainty.
> - Know that it is a regularizer: use it when overfitting, and expect underfitting if $p$ is too large.
