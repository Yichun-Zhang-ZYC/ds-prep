---
id: deep-learning-hyperparameter-tuning-and-debugging-training
title: Tuning and debugging neural network training
estimatedMinutes: 12
difficulty: medium
tags: [deep-learning, hyperparameters, debugging, training]
---

## Why it matters
Most neural-net failures are silent: the code runs, the loss moves, and the model is simply bad. Interviewers ask how you would debug a net that will not learn, how you would choose learning rate and batch size, and how you tune on a budget. See *Hyperparameter tuning* (ML) for grid, random and Bayesian search; this lesson is the deep-learning-specific playbook.

## Concept
**Debug before you tune.** Work from simple to complex:
1. **Sanity-check the data**: look at actual batches and labels, check shuffling, normalisation, train/val split and label alignment.
2. **Check the initial loss**: for $C$ classes with a sensible init it should be near $\ln C$ (10 classes: 2.30). Much higher means a bug or bad init scale; much lower means leakage.
3. **Overfit a tiny batch** (8 to 32 examples) to near-zero loss. If it cannot, there is a bug (wrong loss, frozen params, detached graph, bad labels) or too little capacity.
4. **Gradient check** custom layers: compare analytic gradients with central differences $\frac{f(x+\epsilon) - f(x-\epsilon)}{2\epsilon}$; relative error below about $10^{-6}$ is good (double precision, smooth ops).
5. **Monitor**: loss curves for train and val, gradient norms, update-to-weight ratio ($\approx 10^{-3}$ is healthy), activation statistics, dead-ReLU fraction, learning rate.

**Reading the curves**
- Loss goes to NaN/inf: learning rate too high, log of zero, fp16 overflow. Fix with lower LR, warm-up, gradient clipping, a stable softmax or loss scaling.
- Train loss flat: LR too low or too high, dead units, bug, or labels disconnected from inputs.
- Train falls, val rises: **overfitting**. Train and val both high: **underfitting** (bigger model, longer training, higher LR).
- Val noisier than train or spikes: small val set, or LR too high late in training; see *Learning-rate schedules*.
- Train and val metrics identical to the bit: leakage.

**Tuning priority (rough)**: learning rate $\gg$ batch size / schedule / warm-up $>$ weight decay and dropout $>$ architecture width, depth $>$ init and betas.
- Search **LR on a log scale**; use an **LR range test** (increase LR exponentially each step, take about one tenth of the LR at minimum loss).
- **Random search beats grid** when only a few hyperparameters matter; use successive halving / Hyperband / Bayesian optimisation for budget.
- **Batch size**: scale LR with it (linear rule up to a limit, or square-root scaling for Adam); small batches regularise, large ones are faster per epoch but can generalise worse without tuning.
- Tune on a **validation** set, report on an untouched test set; fix seeds and run several seeds before claiming a difference.
- Start from known recipes (AdamW, cosine schedule with warm-up) and change one thing at a time.

## Worked example
**Case.** A 10-class image classifier prints loss $4.6$ at step 0 and then plateaus at $2.30$.
- Expected initial loss is $\ln 10 = 2.303$. Seeing $4.6 \approx 2\ln 10$ suggests large logits at init (bad scale) or a double softmax; plateau at exactly $2.30$ means predictions are uniform: the model learned nothing.
- Overfit 16 examples: loss stays at $2.30$, so it is a bug, not regularisation. The label tensor was being shuffled independently of the images; fixing it drops the tiny-batch loss to $\approx 0$ within 100 steps.

**Gradient check.** $f(x) = x_0^2 + 3x_1$ at $x = (1, 2)$. Analytic gradient $(2, 3)$. Central differences with $\epsilon = 10^{-5}$ give $(2.0000, 3.0000)$ to about $10^{-10}$, so the relative error is tiny. A bug that returned $(2, 2)$ would give a relative error of $0.2$ on the second coordinate.

**LR range test.** LRs $10^{-5}, 10^{-4}, 10^{-3}, 10^{-2}, 10^{-1}$ gave losses $2.3, 2.2, 1.5, 0.9, 5.0$. Minimum at $10^{-2}$, so start near $10^{-3}$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A 100-class classifier shows initial loss about 4.6 with a sensible init. What does that tell you?",
  "options": [
    "There is a bug, since it should be 0",
    "The learning rate is too high",
    "It matches $\\ln 100 \\approx 4.6$, the expected loss for uniform predictions, so the setup is plausible",
    "The model has overfit"
  ],
  "answer": 2,
  "explanation": "Uniform predictions give cross-entropy $\\ln C = \\ln 100 \\approx 4.6$. That is exactly what a correctly wired classifier should show at step 0."
}
```

```quiz
{
  "id": "q2",
  "question": "Your model cannot reach near-zero loss on a single batch of 16 examples. What is the best next step?",
  "options": [
    "Look for a bug (loss, labels, frozen params, detached graph) before tuning anything",
    "Add more dropout",
    "Train on the full dataset for longer",
    "Increase batch size"
  ],
  "answer": 0,
  "explanation": "A healthy network can memorise 16 examples. Failure points to a bug or a severe optimisation problem, so fix that before regularising or scaling up."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write debugging helpers. `numerical_grad(f, x, eps=1e-5)`: central-difference gradient of scalar function `f` at numpy vector `x`. `max_rel_error(a, b)`: max over entries of `|a-b| / max(|a|, |b|, 1e-8)`. `expected_initial_loss(C)` = `ln C`. `lr_from_range_test(lrs, losses)`: the learning rate at the minimum loss divided by 10. `diagnose(train, val)` for lists of losses returns the first matching label: `'diverged'` if any value is not finite; `'not_learning'` if `train[-1] > 0.9*train[0]`; `'overfitting'` if `val[-1] > 1.1*min(val)`; `'underfitting'` if `train[-1] > 0.5*train[0]`; else `'ok'`.",
  "setup": "import numpy as np",
  "packages": [
    "numpy"
  ],
  "starterCode": "import math\nimport numpy as np\n\ndef numerical_grad(f, x, eps=1e-5):\n    pass\n\ndef max_rel_error(a, b):\n    pass\n\ndef expected_initial_loss(C):\n    pass\n\ndef lr_from_range_test(lrs, losses):\n    pass\n\ndef diagnose(train, val):\n    pass\n\nf = lambda x: x[0] ** 2 + 3 * x[1]\nprint(numerical_grad(f, np.array([1.0, 2.0])))",
  "tests": "f = lambda x: x[0] ** 2 + 3 * x[1]\nx = np.array([1.0, 2.0])\ng = numerical_grad(f, x)\nassert np.allclose(g, [2.0, 3.0], atol=1e-8)\nassert max_rel_error(g, np.array([2.0, 3.0])) < 1e-6\nassert abs(max_rel_error(np.array([2.0, 3.0]), np.array([2.0, 2.0])) - 1 / 3) < 1e-12\nassert abs(expected_initial_loss(10) - 2.302585) < 1e-5\nassert abs(lr_from_range_test([1e-5, 1e-4, 1e-3, 1e-2, 1e-1], [2.3, 2.2, 1.5, 0.9, 5.0]) - 1e-3) < 1e-15\nassert diagnose([2.0, float('nan')], [2.0, 2.0]) == 'diverged'\nassert diagnose([2.3, 2.3, 2.29, 2.3], [2.3, 2.3, 2.3, 2.3]) == 'not_learning'\nassert diagnose([2.0, 1.0, 0.5, 0.1], [2.0, 1.2, 1.4, 1.8]) == 'overfitting'\nassert diagnose([2.3, 1.8, 1.5, 1.4], [2.3, 1.9, 1.6, 1.5]) == 'underfitting'\nassert diagnose([2.3, 1.0, 0.5, 0.2], [2.3, 1.1, 0.6, 0.3]) == 'ok'",
  "solution": "import math\nimport numpy as np\n\ndef numerical_grad(f, x, eps=1e-5):\n    x = np.asarray(x, dtype=float)\n    g = np.zeros_like(x)\n    for i in range(x.size):\n        d = np.zeros_like(x)\n        d[i] = eps\n        g[i] = (f(x + d) - f(x - d)) / (2 * eps)\n    return g\n\ndef max_rel_error(a, b):\n    a = np.asarray(a, dtype=float)\n    b = np.asarray(b, dtype=float)\n    den = np.maximum(np.maximum(np.abs(a), np.abs(b)), 1e-8)\n    return float(np.max(np.abs(a - b) / den))\n\ndef expected_initial_loss(C):\n    return math.log(C)\n\ndef lr_from_range_test(lrs, losses):\n    i = min(range(len(losses)), key=lambda k: losses[k])\n    return lrs[i] / 10\n\ndef diagnose(train, val):\n    if not all(math.isfinite(v) for v in list(train) + list(val)):\n        return 'diverged'\n    if train[-1] > 0.9 * train[0]:\n        return 'not_learning'\n    if val[-1] > 1.1 * min(val):\n        return 'overfitting'\n    if train[-1] > 0.5 * train[0]:\n        return 'underfitting'\n    return 'ok'",
  "hints": [
    "Perturb one coordinate at a time with a unit vector scaled by `eps`.",
    "Check divergence first: `math.isfinite` on every value of both curves.",
    "The order of the rules in `diagnose` matters; return the first match."
  ]
}
```

> [!TIP] Interview tips
> - Open with the debugging ladder: inspect data, check initial loss $\approx \ln C$, overfit one batch, gradient check, then tune.
> - Name concrete symptoms with causes: NaN means LR or numerical issue; flat loss means dead network or label bug; val diverging from train means overfitting.
> - On tuning, say log-scale LR first, random over grid, early stopping of bad trials, multiple seeds, and change one thing at a time.
