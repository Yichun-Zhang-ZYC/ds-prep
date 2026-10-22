---
id: deep-learning-gradient-clipping
title: Gradient clipping
estimatedMinutes: 8
difficulty: easy
tags: [deep-learning, optimization, training]
---

## Why it matters
Exploding gradients cause loss spikes and NaNs, especially in RNNs and transformers. Clipping is the standard guard, and interviewers ask the difference between clipping by value and by norm.

## Concept
**Clip by global norm** (the standard): compute the L2 norm of *all* gradients concatenated, $\|g\| = \sqrt{\sum_k \|g_k\|^2}$, and if it exceeds a threshold $c$, rescale every gradient:
$$g \leftarrow g \cdot \min\!\left(1, \frac{c}{\|g\|}\right)$$
The **direction is preserved**; only the step length is capped. In PyTorch: `torch.nn.utils.clip_grad_norm_(params, max_norm=1.0)`, which also returns the pre-clip norm.

**Clip by value**: clamp each component to $[-c, c]$. Simple, but it changes the direction of the gradient.

- **When to use**: RNNs/LSTMs (the original motivation, Pascanu et al. 2013), transformers (typically `max_norm = 1.0`), RL, and any run with occasional loss spikes (e.g. a bad batch).
- **Where in the loop**: `loss.backward()` then **clip** then `optimizer.step()`. With mixed-precision loss scaling, **unscale first**, otherwise you clip scaled gradients.
- **Log the pre-clip global norm**. If it is clipped on most steps, the threshold is too low or the learning rate is too high; a spike in the norm often precedes divergence.
- **It does not fix vanishing gradients**, and it doesn't replace a sensible LR, warmup, or good initialization.
- With Adam the update size is roughly scale-invariant, but clipping still helps because it limits how much a single spike pollutes the moment estimates.
- Clip per-sample gradients (plus noise) in differentially private SGD.

## Worked example
Two parameter tensors with gradients $g_1 = (3, 0)$ and $g_2 = (0, 4)$. Global norm $= \sqrt{9 + 16} = 5$. Threshold $c = 1$.

**By norm**: scale $= 1/5 = 0.2$, giving $g_1 = (0.6, 0)$ and $g_2 = (0, 0.8)$; new norm $= 1$, and the ratio between components is unchanged.

**By value** with $c = 1$: $g_1 = (1, 0)$, $g_2 = (0, 1)$. The step is now equally weighted between tensors, a different direction from the true gradient (where $g_2$ was 4/3 as large as $g_1$).

If the norm were 0.5 (below $c$), nothing changes.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What is the key advantage of clipping by global norm over clipping each gradient value?",
  "options": [
    "It makes training faster",
    "It preserves the gradient direction",
    "It also fixes vanishing gradients",
    "It removes the need for a learning rate"
  ],
  "answer": 1,
  "explanation": "Rescaling all gradients by one common factor keeps their relative proportions; per-element clamping distorts the direction."
}
```

```quiz
{
  "id": "q2",
  "question": "When training with fp16 loss scaling, where should gradient clipping happen?",
  "options": [
    "After unscaling the gradients, before the optimizer step",
    "Before backward()",
    "On the scaled gradients, directly after backward()",
    "After optimizer.step()"
  ],
  "answer": 0,
  "explanation": "Scaled gradients are inflated by the loss scale, so the threshold would be meaningless; unscale first, then clip, then step."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `clip_by_global_norm(grads, max_norm)` where `grads` is a list of numpy arrays. Compute the global L2 norm over all arrays. If it exceeds `max_norm`, scale every array by `max_norm / norm`; otherwise leave them unchanged. Return `(clipped_list, total_norm)` where `total_norm` is the pre-clip norm. Also write `clip_by_value(grads, c)`.",
  "setup": "import numpy as np",
  "packages": [
    "numpy"
  ],
  "starterCode": "import numpy as np\n\ndef clip_by_global_norm(grads, max_norm):\n    pass\n\ndef clip_by_value(grads, c):\n    pass\n\ng = [np.array([3.0, 0.0]), np.array([0.0, 4.0])]\nprint(clip_by_global_norm(g, 1.0), clip_by_value(g, 1.0))",
  "tests": "g = [np.array([3.0, 0.0]), np.array([0.0, 4.0])]\nout, n = clip_by_global_norm(g, 1.0)\nassert abs(n - 5.0) < 1e-12\nassert np.allclose(out[0], [0.6, 0.0]) and np.allclose(out[1], [0.0, 0.8])\nassert abs(np.sqrt(sum((a ** 2).sum() for a in out)) - 1.0) < 1e-9\nout2, n2 = clip_by_global_norm(g, 10.0)\nassert np.allclose(out2[0], g[0]) and np.allclose(out2[1], g[1]) and abs(n2 - 5.0) < 1e-12\nv = clip_by_value(g, 1.0)\nassert np.allclose(v[0], [1.0, 0.0]) and np.allclose(v[1], [0.0, 1.0])\nassert np.allclose(g[0], [3.0, 0.0])",
  "solution": "import numpy as np\n\ndef clip_by_global_norm(grads, max_norm):\n    total = float(np.sqrt(sum((g ** 2).sum() for g in grads)))\n    if total > max_norm:\n        scale = max_norm / total\n        return [g * scale for g in grads], total\n    return [g.copy() for g in grads], total\n\ndef clip_by_value(grads, c):\n    return [np.clip(g, -c, c) for g in grads]",
  "hints": [
    "total_norm = sqrt(sum of (g**2).sum() over arrays).",
    "Use `np.clip(g, -c, c)` for clipping by value."
  ]
}
```

> [!TIP] Interview tips
> - Default answer: clip by global norm around 1.0, applied between backward() and step().
> - Explain that norm clipping preserves direction while value clipping does not.
> - Mention it targets exploding (not vanishing) gradients, and monitoring the grad norm is the diagnostic.
