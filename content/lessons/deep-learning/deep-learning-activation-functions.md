---
id: deep-learning-activation-functions
title: "Activation functions (ReLU, sigmoid, tanh, GELU)"
estimatedMinutes: 10
difficulty: easy
tags: [deep-learning, activations, relu, gelu]
---

## Why it matters
Activation functions supply the non-linearity that makes depth useful, and their derivatives determine whether gradients flow. "Why ReLU over sigmoid?" and "what is GELU?" are standard screening questions.

## Concept
| Function | Formula | Range | Notes |
|---|---|---|---|
| Sigmoid | $\sigma(x) = \frac{1}{1+e^{-x}}$ | (0, 1) | $\sigma' = \sigma(1-\sigma) \le 0.25$; saturates; not zero-centered. Use for binary outputs and gates. |
| Tanh | $\tanh x = 2\sigma(2x) - 1$ | (−1, 1) | $\tanh' = 1 - \tanh^2 \le 1$; zero-centered but still saturates. |
| ReLU | $\max(0, x)$ | [0, ∞) | Cheap, no saturation for $x>0$, sparse; "dying ReLU" when a unit's input is always negative (gradient 0). |
| Leaky ReLU | $\max(\alpha x, x)$ | ℝ | Small slope $\alpha$ (e.g. 0.01) for $x<0$ keeps the gradient alive. |
| GELU | $x\,\Phi(x)$ | ≈ [−0.17, ∞) | Smooth, non-monotonic near 0; default in BERT/GPT-style Transformers. Approximation: $0.5x(1+\tanh[\sqrt{2/\pi}(x+0.044715x^3)])$. |
| Softmax | $\frac{e^{z_i}}{\sum_j e^{z_j}}$ | simplex | Multiclass output layer. Subtract $\max z$ for numerical stability. |

Takeaways:
- Saturating activations (sigmoid/tanh) have gradients near 0 for large $|x|$, causing **vanishing gradients** in deep nets.
- ReLU's gradient is exactly 1 on the active side, which is why it enabled deep training; its cost is dead units.
- GELU/SiLU (Swish) are smooth ReLU relatives: $x\,\Phi(x)$ weights the input by the probability a standard normal falls below it. Modern Transformers also use gated variants (SwiGLU).
- The hidden-layer choice does not change the output-layer choice: sigmoid/softmax/linear match the task.

## Worked example
Evaluate at $x = -2, 0, 2$ (4 d.p.):

| $x$ | sigmoid | tanh | ReLU | GELU |
|---|---|---|---|---|
| −2 | 0.1192 | −0.9640 | 0 | −0.0455 |
| 0 | 0.5000 | 0 | 0 | 0 |
| 2 | 0.8808 | 0.9640 | 2 | 1.9545 |

GELU(2) $= 2\,\Phi(2) = 2 \times 0.9772 = 1.9545$; GELU(−2) $= -2 \times 0.0228 = -0.0455$, a small negative value rather than ReLU's hard 0.

Gradients at $x = 2$: $\sigma' = 0.8808 \times 0.1192 = 0.105$, $\tanh' = 1 - 0.964^2 = 0.071$, ReLU' $= 1$. At $x=0$, $\sigma'=0.25$ is its maximum.

Softmax of $[2, 1, 0]$: $[0.6652, 0.2447, 0.0900]$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which is the main reason ReLU largely replaced sigmoid in hidden layers of deep networks?",
  "options": ["ReLU outputs are probabilities", "ReLU has gradient 1 for positive inputs, avoiding saturation and vanishing gradients", "ReLU is differentiable everywhere", "ReLU is zero-centered"],
  "answer": 1,
  "explanation": "Sigmoid's derivative is at most 0.25 and near 0 when saturated; ReLU passes gradient unchanged when active. ReLU is not differentiable at 0 and is not zero-centered."
}
```

```quiz
{
  "id": "q2",
  "question": "A ReLU unit receives negative pre-activations for every training example. What happens to it?",
  "options": ["Its weights grow without bound", "It outputs 1 for every input", "It gets zero gradient and stops learning (dead ReLU)", "It switches to a linear function"],
  "answer": 2,
  "explanation": "With zero output and zero gradient, the weights feeding the unit never update. Leaky ReLU/GELU mitigate this."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `sigmoid(x)` (numerically stable for large negative x), `relu(x)`, `leaky_relu(x, alpha=0.01)`, `gelu(x)` (exact, using `math.erf`), `sigmoid_grad(x)`, and `softmax(zs)` (a list; subtract the max for stability).",
  "starterCode": "import math\n\ndef sigmoid(x):\n    pass\n\ndef relu(x):\n    pass\n\ndef leaky_relu(x, alpha=0.01):\n    pass\n\ndef gelu(x):\n    pass\n\ndef sigmoid_grad(x):\n    pass\n\ndef softmax(zs):\n    pass\n\nprint(sigmoid(2), gelu(2), softmax([2, 1, 0]))",
  "tests": "assert abs(sigmoid(0) - 0.5) < 1e-12\nassert abs(sigmoid(2) - 0.8807970779778823) < 1e-9\nassert sigmoid(-1000) == 0.0 and sigmoid(1000) == 1.0\nassert relu(-3) == 0 and relu(2.5) == 2.5\nassert abs(leaky_relu(-2, 0.1) + 0.2) < 1e-12 and leaky_relu(3) == 3\nassert abs(gelu(2) - 1.9544997) < 1e-6\nassert abs(gelu(-2) + 0.0455003) < 1e-6\nassert abs(sigmoid_grad(0) - 0.25) < 1e-12\nassert abs(sigmoid_grad(2) - 0.8807970779778823 * (1 - 0.8807970779778823)) < 1e-9\ns = softmax([2, 1, 0])\nassert abs(sum(s) - 1) < 1e-12 and abs(s[0] - 0.6652409557748219) < 1e-9\ns2 = softmax([1002, 1001, 1000])\nassert all(abs(a - b) < 1e-9 for a, b in zip(s, s2))",
  "solution": "import math\n\ndef sigmoid(x):\n    if x >= 0:\n        return 1 / (1 + math.exp(-x))\n    e = math.exp(x)\n    return e / (1 + e)\n\ndef relu(x):\n    return max(0, x)\n\ndef leaky_relu(x, alpha=0.01):\n    return x if x > 0 else alpha * x\n\ndef gelu(x):\n    return 0.5 * x * (1 + math.erf(x / math.sqrt(2)))\n\ndef sigmoid_grad(x):\n    s = sigmoid(x)\n    return s * (1 - s)\n\ndef softmax(zs):\n    m = max(zs)\n    es = [math.exp(z - m) for z in zs]\n    t = sum(es)\n    return [e / t for e in es]",
  "hints": ["Stable sigmoid: for x >= 0 use 1/(1+exp(-x)); otherwise use exp(x)/(1+exp(x)).", "Exact GELU: 0.5 * x * (1 + erf(x / sqrt(2)))."]
}
```

> [!TIP] Interview tips
> - Tie each activation to its gradient: saturation leads to vanishing gradients; dead units are ReLU's weakness.
> - Explain why softmax needs the max-subtraction trick (overflow in exp).
> - For Transformers, know GELU (and SwiGLU in modern LLMs) as the standard FFN activation.
