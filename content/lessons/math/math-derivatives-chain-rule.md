---
id: math-derivatives-chain-rule
title: Derivatives, chain rule
estimatedMinutes: 10
difficulty: easy
tags: [math, calculus, derivatives, backprop]
---

## Why it matters
Training a neural network is repeated differentiation. Backpropagation is nothing more than the chain rule applied to a computation graph. Interviewers ask you to derive the gradient of a sigmoid or logistic loss by hand, and to explain why gradients vanish in deep nets.

## Concept
The **derivative** $f'(x) = \lim_{h \to 0} \frac{f(x+h) - f(x)}{h}$ is the instantaneous rate of change: the slope of the tangent line, and the best linear approximation $f(x+h) \approx f(x) + f'(x)h$.

**Rules**: sum $(f+g)' = f' + g'$; product $(fg)' = f'g + fg'$; quotient $(f/g)' = (f'g - fg')/g^2$; power $(x^n)' = n x^{n-1}$.

**Chain rule**: for $y = f(g(x))$, $\dfrac{dy}{dx} = f'(g(x))\,g'(x)$. In a chain $x \to u \to v \to L$ the gradient is the product of local derivatives: $\frac{dL}{dx} = \frac{dL}{dv}\frac{dv}{du}\frac{du}{dx}$. Backprop evaluates this product from the output backward, reusing each partial result.

**Derivatives to know cold**:
- $(e^x)' = e^x$, $(\ln x)' = 1/x$
- $\sigma(z) = \frac{1}{1+e^{-z}}$ has $\sigma' = \sigma(1-\sigma) \le 0.25$
- $\tanh' = 1 - \tanh^2$, $\text{ReLU}'(x) = \mathbb 1[x > 0]$
- Logistic loss $L = -[y\ln \sigma(z) + (1-y)\ln(1-\sigma(z))]$ gives the clean result $\frac{dL}{dz} = \sigma(z) - y$.

**Vanishing / exploding gradients**: a deep chain multiplies many local derivatives. Sigmoid factors are at most 0.25, so 10 layers shrink the signal by $\le 0.25^{10} \approx 10^{-6}$. Factors persistently above 1 explode instead. ReLU, residual connections, normalization and gradient clipping are the standard remedies.

**Sanity check**: a central difference $\frac{f(x+h) - f(x-h)}{2h}$ has error $O(h^2)$ and is the standard gradient check.

## Worked example
Squared loss on one sigmoid unit: $L = (\sigma(wx + b) - y)^2$ with $w = 0.5,\ x = 2,\ b = 0.1,\ y = 1$.

Forward: $z = 1.1$, $a = \sigma(1.1) \approx 0.7503$. Backward, one local derivative per step:
- $\frac{dL}{da} = 2(a - y) = -0.4995$
- $\frac{da}{dz} = a(1-a) \approx 0.1874$
- $\frac{dL}{dz} = -0.4995 \times 0.1874 \approx -0.0936$
- $\frac{dL}{dw} = \frac{dL}{dz} \cdot x \approx -0.1872$ and $\frac{dL}{db} = \frac{dL}{dz} \approx -0.0936$

The negative sign says: increasing $w$ lowers the loss, since the unit under-predicts the label 1. Note how small the gradient is even at a bad prediction: $\sigma'$ is only 0.187, a mild saturation effect that cross-entropy loss avoids.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What is $\\frac{d}{dz}\\sigma(z)$ at $z = 0$, and why does it matter for deep sigmoid networks?",
  "options": [
    "1, so gradients are preserved",
    "0.25, the maximum, so stacking many sigmoid layers shrinks gradients at least geometrically",
    "0.5, so gradients halve once",
    "0, so the unit cannot learn"
  ],
  "answer": 1,
  "explanation": "$\\sigma'(0) = 0.5 \\times 0.5 = 0.25$ is the peak of $\\sigma'$. Each layer multiplies the backward signal by at most 0.25 (times weights), which drives vanishing gradients."
}
```

```quiz
{
  "id": "q2",
  "question": "For $L = \\ln(1 + e^{-wx})$ with respect to $w$, which expression is correct?",
  "options": [
    "$-x\\,\\sigma(-wx)$",
    "$x\\,\\sigma(wx)$",
    "$-x\\,e^{-wx}$",
    "$\\dfrac{1}{1 + e^{-wx}}$"
  ],
  "answer": 0,
  "explanation": "Chain rule: $\\frac{dL}{dw} = \\frac{1}{1+e^{-wx}} \\cdot e^{-wx} \\cdot (-x) = -x \\cdot \\frac{e^{-wx}}{1+e^{-wx}} = -x\\,\\sigma(-wx)$."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `num_deriv(f, x, h=1e-5)` (central difference), `sigmoid(z)`, and `loss_grad(w, b, x, y)` returning `(dL/dw, dL/db)` for $L = (\\sigma(wx+b) - y)^2$ using the chain rule (no numerical differentiation).",
  "setup": "import math",
  "starterCode": "def num_deriv(f, x, h=1e-5):\n    pass\n\ndef sigmoid(z):\n    pass\n\ndef loss_grad(w, b, x, y):\n    pass\n\nprint(loss_grad(0.5, 0.1, 2.0, 1.0))",
  "tests": "assert abs(num_deriv(lambda t: t ** 3, 2.0) - 12.0) < 1e-6\nassert abs(sigmoid(0.0) - 0.5) < 1e-12\nassert abs(num_deriv(sigmoid, 1.0) - 0.19661193) < 1e-6\ndw, db = loss_grad(0.5, 0.1, 2.0, 1.0)\nassert abs(dw - (-0.18717)) < 1e-4 and abs(db - (-0.09359)) < 1e-4\ndef L_w(w):\n    return (sigmoid(w * 2.0 + 0.1) - 1.0) ** 2\ndef L_b(b):\n    return (sigmoid(0.5 * 2.0 + b) - 1.0) ** 2\nassert abs(dw - num_deriv(L_w, 0.5)) < 1e-6\nassert abs(db - num_deriv(L_b, 0.1)) < 1e-6",
  "solution": "def num_deriv(f, x, h=1e-5):\n    return (f(x + h) - f(x - h)) / (2 * h)\n\ndef sigmoid(z):\n    return 1.0 / (1.0 + math.exp(-z))\n\ndef loss_grad(w, b, x, y):\n    a = sigmoid(w * x + b)\n    dz = 2 * (a - y) * a * (1 - a)\n    return dz * x, dz",
  "hints": [
    "Central difference: (f(x+h) - f(x-h)) / (2h).",
    "dL/dz = 2(a - y) * a(1 - a); then dL/dw = dL/dz * x and dL/db = dL/dz."
  ]
}
```

> [!TIP] Interview tips
> - Derive the logistic-loss gradient $\sigma(z) - y$ from scratch; it is a classic whiteboard ask.
> - Explain backprop as "chain rule + caching forward values", and link vanishing gradients to $\sigma' \le 0.25$.
> - Mention gradient checking with central differences ($O(h^2)$ error) as a debugging tool.
