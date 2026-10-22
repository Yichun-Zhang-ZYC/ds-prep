---
id: deep-learning-learning-rate-schedules
title: Learning rate schedules
estimatedMinutes: 10
difficulty: medium
tags: [deep-learning, learning-rate, warmup, cosine]
---

## Why it matters
The learning rate is the most important hyperparameter, and a fixed LR is rarely optimal. Large-model training always uses warmup plus decay. Interviewers ask why warmup helps and which schedule you would choose.

## Concept
Why schedule? Early on you want large steps to make progress; late in training you want small steps to settle into a minimum instead of bouncing around it (SGD noise scales with LR).

**Common schedules**
- **Step decay**: $\eta_t = \eta_0\,\gamma^{\lfloor t/s\rfloor}$ (e.g. $\times 0.1$ every 30 epochs; classic ResNet recipe).
- **Exponential / polynomial / linear decay**: smooth versions; linear-to-zero is common for fine-tuning.
- **Cosine annealing**: $\eta_t = \eta_{min} + \tfrac12(\eta_{max}-\eta_{min})\big(1 + \cos(\pi t/T)\big)$. Smooth, no extra hyperparameters except $T$; the LLM default. **Warm restarts** (SGDR) reset it periodically.
- **Inverse square root**: $\eta_t \propto 1/\sqrt t$ after warmup (original Transformer).
- **One-cycle**: ramp up then down, often with momentum varied inversely; allows very high peak LR.
- **ReduceLROnPlateau**: cut LR when validation loss stalls (reactive, needs no total step count).
- **Constant with warmup / WSD** (warmup-stable-decay): lets you extend training without a fixed horizon.

**Warmup**: ramp the LR linearly from ~0 over the first few hundred to thousand steps. Why: at init, gradients are large and noisy, Adam's second-moment estimate is unreliable, and activations/norm statistics are unsettled, so a full LR can diverge. Essential for Transformers and large batches.

**Choosing the LR**: LR range test (increase LR exponentially, pick just below where the loss blows up); the **linear scaling rule**: batch size $\times k$ means LR $\times k$ (with warmup), for SGD; Adam often uses $\sqrt k$. Larger models usually want a smaller peak LR. The decayed end LR is often 10% of peak (or 0).

## Worked example
Cosine with linear warmup: peak $\eta_{max} = 10^{-3}$, warmup 100 steps, total 1000 steps, $\eta_{min}=0$.
- Warmup (step $t<100$): $\eta_t = 10^{-3}\,t/100$, so $t=50$ gives $5\times10^{-4}$.
- Step 100: progress $=(100-100)/900 = 0$, $\cos 0 = 1$, so $\eta = 10^{-3}$.
- Step 550: progress $= 450/900 = 0.5$, $\cos(\pi/2) = 0$, so $\eta = \tfrac12\cdot10^{-3}\cdot 1 = 5\times10^{-4}$.
- Step 1000: progress 1, $\cos\pi = -1$, so $\eta = 0$.

Step decay with $\eta_0 = 0.1$, $\gamma = 0.1$, every 30 epochs: epochs 0-29: 0.1; 30-59: 0.01; 60-89: 0.001.

Inverse sqrt after warmup of 100: at step 400, $\eta = \eta_{max}\sqrt{100/400} = 0.5\,\eta_{max}$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What is the main purpose of learning-rate warmup?",
  "options": ["To make training converge to a sharper minimum", "To avoid instability early in training when gradients are noisy and optimizer statistics (e.g. Adam's $v$) are unreliable", "To reduce the number of epochs", "To replace weight decay"],
  "answer": 1,
  "explanation": "A full-size LR at initialization can diverge; ramping up gives activations, norm statistics and Adam moments time to settle."
}
```

```quiz
{
  "id": "q2",
  "question": "You increase the batch size from 256 to 1024 for SGD training. What does the linear scaling rule suggest?",
  "options": ["Keep the LR the same", "Divide the LR by 4", "Multiply the LR by 4 (with warmup)", "Multiply the LR by 2"],
  "answer": 2,
  "explanation": "Four times fewer, less noisy steps per epoch are compensated by a four times larger LR; warmup guards against early instability."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `step_decay(step, base, gamma, every)`, `warmup_cosine(step, base, warmup, total, min_lr=0.0)` (linear warmup `base*step/warmup` for `step < warmup`, then cosine from `base` to `min_lr` by `total`; return `min_lr` for `step >= total`), and `inverse_sqrt(step, base, warmup)` (linear warmup, then `base*sqrt(warmup/step)`).",
  "starterCode": "import math\n\ndef step_decay(step, base, gamma, every):\n    pass\n\ndef warmup_cosine(step, base, warmup, total, min_lr=0.0):\n    pass\n\ndef inverse_sqrt(step, base, warmup):\n    pass\n\nprint(step_decay(30, 0.1, 0.1, 30), warmup_cosine(550, 1e-3, 100, 1000), inverse_sqrt(400, 1e-3, 100))",
  "tests": "assert abs(step_decay(0, 0.1, 0.1, 30) - 0.1) < 1e-12\nassert abs(step_decay(29, 0.1, 0.1, 30) - 0.1) < 1e-12\nassert abs(step_decay(30, 0.1, 0.1, 30) - 0.01) < 1e-12\nassert abs(step_decay(75, 0.1, 0.1, 30) - 0.001) < 1e-12\nassert abs(warmup_cosine(50, 1e-3, 100, 1000) - 5e-4) < 1e-12\nassert abs(warmup_cosine(0, 1e-3, 100, 1000)) < 1e-12\nassert abs(warmup_cosine(100, 1e-3, 100, 1000) - 1e-3) < 1e-12\nassert abs(warmup_cosine(550, 1e-3, 100, 1000) - 5e-4) < 1e-12\nassert abs(warmup_cosine(1000, 1e-3, 100, 1000)) < 1e-12\nassert abs(warmup_cosine(1000, 1e-3, 100, 1000, min_lr=1e-4) - 1e-4) < 1e-12\nassert abs(warmup_cosine(5000, 1e-3, 100, 1000, min_lr=1e-4) - 1e-4) < 1e-12\nassert abs(inverse_sqrt(50, 1e-3, 100) - 5e-4) < 1e-12\nassert abs(inverse_sqrt(400, 1e-3, 100) - 5e-4) < 1e-12\nassert abs(inverse_sqrt(100, 1e-3, 100) - 1e-3) < 1e-12",
  "solution": "import math\n\ndef step_decay(step, base, gamma, every):\n    return base * gamma ** (step // every)\n\ndef warmup_cosine(step, base, warmup, total, min_lr=0.0):\n    if step < warmup:\n        return base * step / warmup\n    if step >= total:\n        return min_lr\n    progress = (step - warmup) / (total - warmup)\n    return min_lr + 0.5 * (base - min_lr) * (1 + math.cos(math.pi * progress))\n\ndef inverse_sqrt(step, base, warmup):\n    if step < warmup:\n        return base * step / warmup\n    return base * math.sqrt(warmup / step)",
  "hints": ["Cosine progress = (step - warmup) / (total - warmup); lr = min_lr + 0.5*(base - min_lr)*(1 + cos(pi*progress)).", "step_decay uses integer division: gamma ** (step // every)."]
}
```

> [!TIP] Interview tips
> - Name warmup + cosine decay as the modern default and explain why warmup is needed.
> - Mention the LR range test and the linear scaling rule when asked how to pick the LR for a larger batch.
> - Know the reactive option (ReduceLROnPlateau) versus fixed-horizon schedules (cosine, one-cycle).
