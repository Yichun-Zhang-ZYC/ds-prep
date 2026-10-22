---
id: deep-learning-cnn
title: CNN (convolution, pooling, ResNet)
estimatedMinutes: 14
difficulty: medium
tags: [deep-learning, cnn, computer-vision]
---

## Why it matters
CNNs are the default for images and a common source of shape and parameter-count questions. Interviewers also ask why convolutions beat dense layers on images and why residual connections let networks go deep.

## Concept
A **convolution layer** slides small learned filters over the input. Two inductive biases: **local connectivity** (each output looks at a small patch) and **weight sharing** (the same filter at every location), which gives **translation equivariance** with far fewer parameters.

- **Output size** per spatial dim: $\left\lfloor \dfrac{W - K + 2P}{S} \right\rfloor + 1$ for input $W$, kernel $K$, padding $P$, stride $S$. "Same" padding at stride 1 is $P = (K-1)/2$.
- **Parameters**: $(K \cdot K \cdot C_{in} + 1)\, C_{out}$, independent of image size. FLOPs scale with output area.
- **Receptive field** grows with depth: stacking $n$ 3x3 convs (stride 1) sees $(2n+1)\times(2n+1)$. Two 3x3 layers cover a 5x5 with fewer parameters ($18C^2$ vs $25C^2$) and an extra non-linearity.
- **Pooling** downsamples: max pooling (keeps the strongest activation, small translation invariance), average pooling, and **global average pooling** (replaces large FC heads). Strided convs can replace pooling.
- **1x1 convs** mix channels and change depth cheaply (bottlenecks). **Depthwise-separable** convs (MobileNet) split spatial and channel mixing to cut cost about 8 to 9x.
- Typical block: conv, BatchNorm, ReLU. Resolution falls while channels grow.

**ResNet**: very deep plain nets had *higher training error* (a degradation/optimization problem, not overfitting). A **residual block** computes $y = x + F(x)$ with an identity shortcut. Then $\partial y / \partial x = I + \partial F/\partial x$, so gradients always have a direct path, and the block only needs to learn a residual (easy to make $F \approx 0$). When shapes change, use a 1x1 strided projection on the shortcut. Bottleneck blocks (1x1, 3x3, 1x1) keep ResNet-50+ affordable. The same skip idea is in transformers.

## Worked example
**Shapes and parameters**: input $32\times32\times3$, 16 filters of 3x3, padding 1, stride 1. Output size $= (32 - 3 + 2)/1 + 1 = 32$, so $32\times32\times16$. Parameters $= (3\cdot3\cdot3 + 1)\cdot 16 = 448$. A dense layer between the same input and output sizes would need $3072 \times 16384 \approx 50$ million weights. A following 2x2 max pool with stride 2 gives $16\times16\times16$.

**A tiny convolution** (cross-correlation, as in deep-learning libraries): input $\begin{pmatrix}1&2&3\\4&5&6\\7&8&9\end{pmatrix}$, kernel $\begin{pmatrix}1&0\\0&-1\end{pmatrix}$, no padding. Output size $(3-2)/1+1 = 2$. Top-left: $1\cdot1 + 5\cdot(-1) = -4$. Each output is $x_{i,j} - x_{i+1,j+1} = -4$, so the output is $\begin{pmatrix}-4&-4\\-4&-4\end{pmatrix}$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A 5x5 input is convolved with a 3x3 kernel, stride 2, padding 0. What is the output size?",
  "options": [
    "1x1",
    "2x2",
    "3x3",
    "4x4"
  ],
  "answer": 1,
  "explanation": "$\\lfloor (5 - 3 + 0)/2 \\rfloor + 1 = 2$."
}
```

```quiz
{
  "id": "q2",
  "question": "What problem do residual connections primarily address?",
  "options": [
    "Overfitting of very deep networks",
    "Too many parameters in the conv layers",
    "Inability to process variable image sizes",
    "Optimization difficulty in deep networks: gradients and degradation"
  ],
  "answer": 3,
  "explanation": "Plain deep nets showed higher training error. The identity shortcut gives gradients a direct path ($I + \\partial F/\\partial x$) and makes identity easy to learn."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "With numpy, write `conv_out_size(w, k, p=0, s=1)`, `conv2d(x, k, stride=1, padding=0)` for a single-channel 2D input and kernel (cross-correlation, zero padding with `np.pad`), and `max_pool2d(x, size=2)` with stride equal to `size` (assume the dimensions divide evenly).",
  "setup": "import numpy as np",
  "packages": [
    "numpy"
  ],
  "starterCode": "import numpy as np\n\ndef conv_out_size(w, k, p=0, s=1):\n    pass\n\ndef conv2d(x, k, stride=1, padding=0):\n    pass\n\ndef max_pool2d(x, size=2):\n    pass\n\nx = np.arange(1, 10, dtype=float).reshape(3, 3)\nk = np.array([[1.0, 0.0], [0.0, -1.0]])\nprint(conv2d(x, k), conv_out_size(32, 3, 1, 1))\nprint(max_pool2d(np.arange(16.0).reshape(4, 4)))",
  "tests": "x = np.arange(1, 10, dtype=float).reshape(3, 3)\nk = np.array([[1.0, 0.0], [0.0, -1.0]])\nassert np.allclose(conv2d(x, k), -4 * np.ones((2, 2)))\nassert conv2d(x, k, padding=1).shape == (4, 4)\nassert conv_out_size(32, 3, 1, 1) == 32 and conv_out_size(5, 3, 0, 2) == 2\nx5 = np.arange(25, dtype=float).reshape(5, 5)\nassert conv2d(x5, np.ones((3, 3)), stride=2).shape == (2, 2)\nassert abs(conv2d(x5, np.ones((3, 3)), stride=2)[0, 0] - x5[:3, :3].sum()) < 1e-9\nassert np.allclose(conv2d(x, np.array([[1.0]]), padding=0), x)\nassert np.allclose(max_pool2d(np.arange(16.0).reshape(4, 4)), [[5, 7], [13, 15]])",
  "solution": "import numpy as np\n\ndef conv_out_size(w, k, p=0, s=1):\n    return (w - k + 2 * p) // s + 1\n\ndef conv2d(x, k, stride=1, padding=0):\n    xp = np.pad(x, padding)\n    kh, kw = k.shape\n    oh = conv_out_size(x.shape[0], kh, padding, stride)\n    ow = conv_out_size(x.shape[1], kw, padding, stride)\n    out = np.zeros((oh, ow))\n    for i in range(oh):\n        for j in range(ow):\n            patch = xp[i * stride:i * stride + kh, j * stride:j * stride + kw]\n            out[i, j] = (patch * k).sum()\n    return out\n\ndef max_pool2d(x, size=2):\n    h, w = x.shape\n    return x.reshape(h // size, size, w // size, size).max(axis=(1, 3))",
  "hints": [
    "Pad first, then loop over output positions: `xp[i*s:i*s+kh, j*s:j*s+kw]`, multiply by the kernel and sum.",
    "For pooling, reshape to `(H//size, size, W//size, size)` and take the max over axes 1 and 3."
  ]
}
```

> [!TIP] Interview tips
> - Memorize the output-size formula and the parameter-count formula; practice them with padding and stride.
> - Explain weight sharing and locality as the reasons CNNs generalize on images.
> - For ResNet say $y = x + F(x)$ and that the identity path keeps gradients flowing; it solves optimization, not overfitting.
