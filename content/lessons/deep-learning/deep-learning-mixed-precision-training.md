---
id: deep-learning-mixed-precision-training
title: Mixed precision training
estimatedMinutes: 10
difficulty: medium
tags: [deep-learning, training, performance]
---

## Why it matters
Mixed precision roughly halves memory and speeds up training on modern GPUs. Interviewers ask why fp16 needs loss scaling but bf16 doesn't, and which parts stay in fp32.

## Concept
Run most math in 16-bit floats, but keep numerically sensitive parts in 32-bit.

| Format | Bits (sign / exp / mantissa) | Max | Smallest normal | Notes |
|---|---|---|---|---|
| fp32 | 1 / 8 / 23 | $3.4\times10^{38}$ | $1.2\times10^{-38}$ | baseline |
| fp16 | 1 / 5 / 10 | 65,504 | $6.1\times10^{-5}$ (subnormals down to $6\times10^{-8}$) | precise, **narrow range** |
| bf16 | 1 / 8 / 7 | $\approx 3.4\times10^{38}$ | $\approx 1.2\times10^{-38}$ | fp32 range, **coarse precision** |

**Recipe (AMP)**:
- Keep **fp32 master weights** and optimizer state; cast to 16-bit for forward/backward. Small updates like $w \mathrel{+}= 10^{-4}$ would be lost in 16-bit weights.
- **Autocast**: matmuls and convolutions (tensor cores) run in 16-bit; softmax, layer norm, losses and large reductions stay in fp32.
- **Loss scaling (fp16 only)**: gradients are often below $6\times10^{-8}$ and **underflow to zero**. Multiply the loss by a scale $S$ (for example $2^{16}$) before backward, then divide the gradients by $S$ in fp32 before clipping and the optimizer step.
- **Dynamic loss scaling**: if any gradient is inf/NaN, **skip the step** and halve $S$; after e.g. 2,000 clean steps, double $S$.
- **bf16** has fp32's exponent range, so there is no underflow issue and no loss scaling is needed; the price is less mantissa precision (fine for training with fp32 accumulation). It is the default on A100/H100/TPU. fp8 training goes further with per-tensor scaling.

**Benefits**: about 2x less activation memory (larger batches or models) and 2x to 8x higher matmul throughput on tensor cores. **Risks**: overflow (inf) in attention logits or exploding activations, and loss of accuracy in reductions (accumulate in fp32).

## Worked example
A gradient entry is $g = 10^{-8}$. fp16's smallest subnormal is about $6\times10^{-8}$, so casting $g$ to fp16 gives **0**: the signal is gone.

With $S = 32768 = 2^{15}$: $S g = 3.28\times10^{-4}$, which fp16 represents (it is above the smallest normal, $6.1\times10^{-5}$) with about 3 significant digits. Unscale in fp32: $3.28\times10^{-4}/32768 \approx 10^{-8}$. Recovered.

Too much scale is also bad: for $g = 3$, $S g = 98{,}304 > 65{,}504$ overflows to **inf**. The scaler detects the inf, skips this optimizer step and halves $S$ to 16384 (giving $49{,}152$, which fits).

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why does fp16 training typically need loss scaling while bf16 does not?",
  "options": [
    "bf16 has more mantissa bits",
    "bf16 uses 32-bit weights",
    "bf16 has the same exponent range as fp32, so small gradients do not underflow",
    "bf16 is slower, so gradients are larger"
  ],
  "answer": 2,
  "explanation": "bf16 keeps fp32's 8 exponent bits (range), trading away mantissa precision. fp16's 5 exponent bits make tiny gradients underflow to zero."
}
```

```quiz
{
  "id": "q2",
  "question": "The dynamic loss scaler finds inf in the gradients. What does it do?",
  "options": [
    "Doubles the scale and applies the step",
    "Skips the optimizer step and reduces the scale",
    "Switches the whole model to fp32 permanently",
    "Clips the inf to 65,504 and continues"
  ],
  "answer": 1,
  "explanation": "An inf/NaN means the scale was too large. The step is skipped (weights untouched) and the scale is lowered, e.g. halved."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Use `np.float16` to simulate fp16. Write `fp16_roundtrip(g, scale)` that computes `g * scale`, casts it to fp16, then returns it divided by `scale` as a Python float (use `np.errstate(over='ignore')`, and overflow gives `inf`). Then write `update_loss_scale(scale, found_inf, good_steps, growth_interval=2000)` returning `(new_scale, new_good_steps, skip_step)`: on `found_inf` halve the scale, reset the streak and skip; otherwise increment the streak and, when it reaches `growth_interval`, double the scale and reset the streak.",
  "setup": "import numpy as np",
  "packages": [
    "numpy"
  ],
  "starterCode": "import numpy as np\n\ndef fp16_roundtrip(g, scale):\n    pass\n\ndef update_loss_scale(scale, found_inf, good_steps, growth_interval=2000):\n    pass\n\nprint(fp16_roundtrip(1e-8, 1), fp16_roundtrip(1e-8, 32768), fp16_roundtrip(3.0, 32768))\nprint(update_loss_scale(32768.0, True, 10), update_loss_scale(32768.0, False, 1999))",
  "tests": "import math\nassert fp16_roundtrip(1e-8, 1) == 0.0\nr = fp16_roundtrip(1e-8, 32768)\nassert abs(r - 1e-8) / 1e-8 < 0.01\nassert math.isinf(fp16_roundtrip(3.0, 32768))\nassert abs(fp16_roundtrip(0.5, 1) - 0.5) < 1e-12\nassert update_loss_scale(32768.0, True, 10) == (16384.0, 0, True)\nassert update_loss_scale(32768.0, False, 5) == (32768.0, 6, False)\nassert update_loss_scale(32768.0, False, 1999) == (65536.0, 0, False)\nassert update_loss_scale(8.0, False, 1, growth_interval=2) == (16.0, 0, False)",
  "solution": "import numpy as np\n\ndef fp16_roundtrip(g, scale):\n    with np.errstate(over='ignore'):\n        h = np.float16(g * scale)\n    return float(h) / scale\n\ndef update_loss_scale(scale, found_inf, good_steps, growth_interval=2000):\n    if found_inf:\n        return scale / 2, 0, True\n    good_steps += 1\n    if good_steps >= growth_interval:\n        return scale * 2, 0, False\n    return scale, good_steps, False",
  "hints": [
    "`float(np.float16(x))` converts back to a Python float.",
    "Compare using `found_inf` first; the growth check only happens on clean steps."
  ]
}
```

> [!TIP] Interview tips
> - Contrast fp16 (more mantissa, small range, needs loss scaling) with bf16 (fp32 range, less precision, no scaling).
> - Always mention fp32 master weights and fp32 for softmax/loss/reductions.
> - Know dynamic loss scaling: on inf/NaN skip the step and reduce the scale; grow it after a streak of good steps.
