---
id: deep-learning-weight-initialization
title: Weight initialization
estimatedMinutes: 10
difficulty: medium
tags: [deep-learning, initialization, xavier, he]
---

## Why it matters
Bad initialization can make a deep network untrainable: signals and gradients shrink to zero or blow up before learning starts. Interviewers ask why not zeros, what Xavier/He do, and which to pair with which activation.

## Concept
**Zero (or constant) init breaks symmetry badly**: all units in a layer compute the same output and receive the same gradient, so they stay identical forever. Biases can be 0, weights need randomness.

**Goal**: keep the variance of activations (forward) and gradients (backward) roughly constant across layers. For $z = \sum_{i=1}^{n_{in}} w_i x_i$ with independent zero-mean terms:
$$\text{Var}(z) = n_{in}\,\text{Var}(w)\,\text{Var}(x)$$
so we want $n_{in}\text{Var}(w) \approx 1$.

- **Xavier/Glorot** (tanh, sigmoid, linear): $\text{Var}(w) = \dfrac{2}{n_{in}+n_{out}}$, a compromise between forward ($1/n_{in}$) and backward ($1/n_{out}$) variance. Uniform version: $U[-a, a]$ with $a = \sqrt{6/(n_{in}+n_{out})}$.
- **He/Kaiming** (ReLU family): $\text{Var}(w) = \dfrac{2}{n_{in}}$. ReLU zeroes half the pre-activations, halving the second moment, so the weights need a factor 2 to compensate.
- **LeCun**: $1/n_{in}$ (SELU, and the default for many linear layers).
- Uniform $U[-a,a]$ has variance $a^2/3$, so match variances, not ranges.

**Practical notes**
- Fixed small std (e.g. 0.01) works for shallow nets but vanishes in deep ones; large std explodes.
- Normalization layers (BatchNorm/LayerNorm) and residual connections make training much less sensitive to init.
- Transformers: small std (e.g. 0.02) and scaling residual-branch outputs by $1/\sqrt{2N}$ for $N$ layers; zero-init the last layer of a residual branch is a common trick.
- Pretrained weights are the best init for fine-tuning.

## Worked example
A layer with $n_{in}=512$, $n_{out}=256$:
- Xavier: $\text{Var} = 2/768 = 0.0026$, std $= 0.0510$; uniform limit $a = \sqrt{6/768} = 0.0884$.
- He: $\text{Var} = 2/512 = 0.0039$, std $= 0.0625$.

**Why it matters over depth.** Let $m_l = E[h_l^2]$. For a ReLU layer, $m_{l+1} = \tfrac12\, n_{in}\,\text{Var}(w)\, m_l$. With $n_{in}=512$:

| std | factor per layer | after 10 layers |
|---|---|---|
| 0.01 | $0.5 \cdot 512 \cdot 10^{-4} = 0.0256$ | $\approx 10^{-16}$ (vanished) |
| 0.0625 (He) | $0.5 \cdot 512 \cdot 0.0039 = 1$ | 1 (stable) |
| 0.1 | $0.5 \cdot 512 \cdot 0.01 = 2.56$ | $\approx 1.2\times10^{4}$ (exploded) |

Only He keeps the signal scale constant.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why can't all weights in a layer be initialized to the same value (e.g. zero)?",
  "options": ["The loss would be infinite", "Units would compute identical outputs and gradients, so symmetry is never broken", "Gradients would explode", "The network would be linear"],
  "answer": 1,
  "explanation": "Identical units receive identical updates and remain copies of each other, so the layer behaves like a single unit."
}
```

```quiz
{
  "id": "q2",
  "question": "Which initialization is designed for ReLU networks, and what is its weight variance?",
  "options": ["Xavier, $2/(n_{in}+n_{out})$", "LeCun, $1/n_{out}$", "He, $2/n_{in}$", "Xavier, $1/n_{in}$"],
  "answer": 2,
  "explanation": "ReLU halves the second moment of activations, so He init uses $2/n_{in}$ to keep variance constant."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `xavier_std(fan_in, fan_out)` (std of the normal Glorot init), `xavier_uniform_limit(fan_in, fan_out)`, `he_std(fan_in)`, and `second_moment(layers, fan_in, std, relu=True, m0=1.0)` that returns $E[h^2]$ after `layers` identical layers using $m \\leftarrow m \\cdot n_{in}\\,\\text{std}^2 \\cdot (0.5 \\text{ if relu else } 1)$.",
  "starterCode": "import math\n\ndef xavier_std(fan_in, fan_out):\n    pass\n\ndef xavier_uniform_limit(fan_in, fan_out):\n    pass\n\ndef he_std(fan_in):\n    pass\n\ndef second_moment(layers, fan_in, std, relu=True, m0=1.0):\n    pass\n\nprint(xavier_std(512, 256), he_std(512), second_moment(10, 512, 0.01))",
  "tests": "assert abs(xavier_std(512, 256) - math.sqrt(2 / 768)) < 1e-12\nassert abs(xavier_uniform_limit(512, 256) - 0.08838834764831845) < 1e-12\nassert abs(he_std(512) - 0.0625) < 1e-12\nassert abs(second_moment(10, 512, he_std(512)) - 1.0) < 1e-9\nassert abs(second_moment(10, 512, 0.01) / (0.0256 ** 10) - 1) < 1e-9\nassert second_moment(10, 512, 0.1) > 1e4\nassert abs(second_moment(1, 100, 0.1, relu=False) - 1.0) < 1e-12",
  "solution": "import math\n\ndef xavier_std(fan_in, fan_out):\n    return math.sqrt(2.0 / (fan_in + fan_out))\n\ndef xavier_uniform_limit(fan_in, fan_out):\n    return math.sqrt(6.0 / (fan_in + fan_out))\n\ndef he_std(fan_in):\n    return math.sqrt(2.0 / fan_in)\n\ndef second_moment(layers, fan_in, std, relu=True, m0=1.0):\n    factor = fan_in * std ** 2 * (0.5 if relu else 1.0)\n    return m0 * factor ** layers",
  "hints": ["Xavier var = 2/(fan_in + fan_out); uniform limit = sqrt(6/(fan_in + fan_out)).", "The second moment is multiplied by the same factor each layer, so it equals m0 * factor ** layers."]
}
```

> [!TIP] Interview tips
> - Derive $\text{Var}(z) = n_{in}\text{Var}(w)\text{Var}(x)$ and set it to 1; that gives Xavier/He in one line.
> - Pair Xavier with tanh/sigmoid, He with ReLU; explain the factor 2 as ReLU zeroing half the units.
> - Note that normalization and residual connections reduce init sensitivity, but init still matters in the first steps.
