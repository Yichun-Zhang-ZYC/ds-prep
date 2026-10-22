---
id: deep-learning-regularization-weight-decay-and-augmentation
title: "Regularization: weight decay and data augmentation"
estimatedMinutes: 11
difficulty: medium
tags: [deep-learning, regularization, weight-decay, augmentation]
---

## Why it matters
Overparameterised networks can memorise the training set, so generalisation comes from regularisation. Interviewers like the subtle points: L2 vs weight decay under Adam, why augmentation is the strongest regulariser for images, and which tools to reach for first. (Dropout and early stopping have their own lessons; this one covers the rest.)

## Concept
**L2 regularisation** adds $\frac{\lambda}{2}\lVert w \rVert^2$ to the loss, so the gradient gains $\lambda w$. It is a Gaussian prior on weights (MAP view) and shrinks weights toward 0. L1 gives sparsity instead.

**Weight decay** is the update rule $w \leftarrow (1 - \eta\lambda) w - \eta g$.
- With **plain SGD** the two are identical: $w - \eta(g + \lambda w)$.
- With **Adam** they are not. L2 puts $\lambda w$ inside the gradient, which then gets divided by $\sqrt{\hat v}$, so weights with large gradient history are decayed less and the effective decay is entangled with the learning-rate scaling. **AdamW** decouples it: $w \leftarrow w - \eta\left(\frac{\hat m}{\sqrt{\hat v} + \epsilon} + \lambda w\right)$. Use AdamW for transformers (typical $\lambda$ 0.01 to 0.1) and do not decay biases or LayerNorm/BatchNorm scales.
- Weight decay also interacts with normalisation layers: with BatchNorm the weights are scale-invariant, so decay mainly raises the *effective* learning rate.

**Data augmentation** enlarges the dataset with label-preserving transforms, encoding invariances the model would otherwise have to learn from data.
- **Images**: flips, random crops, colour jitter, **Cutout** (erase a patch), **Mixup** ($\tilde x = \lambda x_i + (1-\lambda) x_j$, same mix for labels, $\lambda \sim \text{Beta}(\alpha,\alpha)$), **CutMix** (paste a patch, mix labels by area), RandAugment / AutoAugment (searched policies).
- **Text**: synonym replacement, back-translation, token masking. **Audio**: time stretch, SpecAugment. **Tabular**: noise, SMOTE-like interpolation (use carefully).
- Apply only to **training** data; keep validation and test untouched (**test-time augmentation** averages predictions over views as an exception).
- Transforms must preserve the label (flipping a "6" into a "9" does not).

**Other tools**: label smoothing (soft targets $1-\epsilon$ and $\epsilon/(K-1)$; also helps calibration), stochastic depth, noise injection, smaller models, more data, ensembling and early stopping.

**Practical order**: more data and augmentation first, then weight decay, then dropout/label smoothing; tune $\lambda$ on a log scale.

## Worked example
**SGD, equivalence.** $w = 2$, $\eta = 0.1$, $\lambda = 0.01$, loss gradient $g = 0.5$. L2 step: $2 - 0.1(0.5 + 0.02) = 1.948$. Weight-decay form: $(1 - 0.001) \cdot 2 - 0.1 \cdot 0.5 = 1.998 - 0.05 = 1.948$. Same.

**Adam, difference.** Take $w = 1$, a loss gradient of $g = 0$, $\eta = 0.01$, $\lambda = 0.1$, first step ($\hat m = g'$, $\hat v = g'^2$).
- *L2 inside Adam*: $g' = \lambda w = 0.1$, step $= \eta\, g'/(|g'| + \epsilon) \approx \eta = 0.01$, so $w \approx 0.99$. The step is $\approx \eta$ whatever $\lambda$ is: adaptive scaling erases the strength of the penalty.
- *AdamW*: $\hat m = 0$, so only the decoupled term acts: $w = 1 - 0.01 \cdot 0.1 \cdot 1 = 0.999$. Decay strength scales with $\lambda$ as intended.

**Mixup.** $x_i = (1, 0)$ with label 1, $x_j = (0, 1)$ with label 0, $\lambda = 0.7$: $\tilde x = (0.7, 0.3)$ and soft label $0.7$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why is AdamW preferred over Adam with an L2 penalty?",
  "options": [
    "AdamW uses a larger learning rate",
    "L2 penalties are not differentiable",
    "In Adam, an L2 term in the gradient is rescaled by the adaptive denominator, so decay strength is distorted; AdamW applies decay directly to the weights",
    "AdamW removes the need for a learning-rate schedule"
  ],
  "answer": 2,
  "explanation": "Adam divides the whole gradient (loss plus $\\lambda w$) by $\\sqrt{\\hat v}$, so the effective penalty differs per parameter. AdamW decouples the decay from the gradient-based step."
}
```

```quiz
{
  "id": "q2",
  "question": "Which is a correct use of data augmentation?",
  "options": [
    "Augment the validation set too, so metrics are more stable",
    "Augment only training batches, using transforms that preserve the label",
    "Augment before splitting so every split sees the same variants",
    "Use vertical flips for digit recognition"
  ],
  "answer": 1,
  "explanation": "Augmentation encodes invariances for training. Evaluating on augmented validation data changes the target distribution, augmenting before the split leaks near-duplicates across splits, and a flipped digit can change its label."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `adam_step(w, g, m, v, t, lr=0.01, b1=0.9, b2=0.999, eps=1e-8, wd=0.0, decoupled=True)` for numpy arrays (or floats), returning `(w_new, m_new, v_new)`. Use bias-corrected moments `m_hat = m/(1-b1**t)`, `v_hat = v/(1-b2**t)` and step `lr * m_hat / (sqrt(v_hat) + eps)`. If `decoupled` is False, add `wd * w` to the gradient first (classic L2); if True (AdamW), also subtract `lr * wd * w` from the weights, computed from the old `w`. Then write `mixup(x1, y1, x2, y2, lam)` returning `(lam*x1 + (1-lam)*x2, lam*y1 + (1-lam)*y2)`.",
  "setup": "import numpy as np",
  "packages": [
    "numpy"
  ],
  "starterCode": "import numpy as np\n\ndef adam_step(w, g, m, v, t, lr=0.01, b1=0.9, b2=0.999, eps=1e-8, wd=0.0, decoupled=True):\n    pass\n\ndef mixup(x1, y1, x2, y2, lam):\n    pass\n\nz = np.zeros(1)\nprint(adam_step(np.ones(1), z, z, z, 1, wd=0.1, decoupled=True)[0], adam_step(np.ones(1), z, z, z, 1, wd=0.1, decoupled=False)[0])",
  "tests": "z = np.zeros(1)\nw1, m1, v1 = adam_step(np.ones(1), z, z, z, 1, wd=0.1, decoupled=True)\nassert abs(w1[0] - 0.999) < 1e-12\nw2, m2, v2 = adam_step(np.ones(1), z, z, z, 1, wd=0.1, decoupled=False)\nassert abs(w2[0] - 0.99) < 1e-6\nassert abs(m2[0] - 0.01) < 1e-12 and abs(v2[0] - 0.001 * 0.01) < 1e-12\nw3, _, _ = adam_step(np.ones(1), z, z, z, 1, wd=0.01, decoupled=False)\nassert abs(w3[0] - 0.99) < 1e-6\nw4, _, _ = adam_step(np.array([2.0]), np.array([0.5]), z, z, 1, wd=0.0)\nassert abs(w4[0] - (2.0 - 0.01)) < 1e-6\nx, y = mixup(np.array([1.0, 0.0]), 1.0, np.array([0.0, 1.0]), 0.0, 0.7)\nassert np.allclose(x, [0.7, 0.3]) and abs(y - 0.7) < 1e-12",
  "solution": "import numpy as np\n\ndef adam_step(w, g, m, v, t, lr=0.01, b1=0.9, b2=0.999, eps=1e-8, wd=0.0, decoupled=True):\n    w_old = w\n    if not decoupled:\n        g = g + wd * w\n    m = b1 * m + (1 - b1) * g\n    v = b2 * v + (1 - b2) * g ** 2\n    m_hat = m / (1 - b1 ** t)\n    v_hat = v / (1 - b2 ** t)\n    w = w - lr * m_hat / (np.sqrt(v_hat) + eps)\n    if decoupled:\n        w = w - lr * wd * w_old\n    return w, m, v\n\ndef mixup(x1, y1, x2, y2, lam):\n    return lam * x1 + (1 - lam) * x2, lam * y1 + (1 - lam) * y2",
  "hints": [
    "First step with zero moments: `m = (1-b1) g`, `v = (1-b2) g^2`; bias correction gives `m_hat = g` and `v_hat = g^2`.",
    "With `g = 0` and decoupled decay, only the `lr * wd * w` term moves the weights.",
    "Coupled L2 with a tiny gradient produces a step of about `lr` regardless of `wd`: the adaptive denominator cancels the penalty's scale."
  ]
}
```

> [!TIP] Interview tips
> - Say: L2 equals weight decay for SGD but not for Adam; AdamW decouples decay from the adaptive step. Exclude biases and norm parameters.
> - Treat augmentation as encoding invariances and the cheapest 'extra data'; mention Mixup/CutMix for images and the rule that augmentation is train-only.
> - Give an ordering of remedies for overfitting: more data/augmentation, weight decay, dropout, smaller model, early stopping.
