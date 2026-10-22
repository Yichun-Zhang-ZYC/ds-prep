---
id: computer-vision-image-classification
title: "Image classification"
estimatedMinutes: 12
difficulty: medium
tags: [computer-vision, cnn, resnet, transfer-learning]
---

## Why it matters
Classification is the base task that detection, segmentation and retrieval build on. Interviewers expect you to compute conv output sizes and parameter counts, explain why ResNets train, and describe a sensible transfer-learning recipe.

## Concept
A **convolution** slides a learned $k \times k \times C_{in}$ filter over the image, sharing weights across positions (translation equivariance, few parameters). For input size $n$, kernel $k$, padding $p$, stride $s$:

$$n_{out} = \left\lfloor \frac{n + 2p - k}{s} \right\rfloor + 1, \qquad \text{params} = k^2 C_{in} C_{out} + C_{out}$$

Pooling or strided convs shrink resolution while channels grow, so each layer sees a larger **receptive field**. A final global average pool plus a linear layer produces logits; softmax cross-entropy is the loss.

**Architecture lineage**
- **AlexNet / VGG**: deep stacks of ReLU convs; VGG favors 3x3 kernels (two 3x3 = one 5x5 receptive field with fewer parameters).
- **ResNet**: residual blocks $y = x + F(x)$. The identity path lets gradients flow, so 50 to 150+ layers train. Batch norm after each conv stabilizes optimization.
- **Inception / MobileNet / EfficientNet**: efficiency via multi-scale branches, depthwise-separable convs, and compound scaling of depth, width and resolution.
- **ConvNeXt / ViT**: modernized convnets and transformers (see the ViT lesson); with enough data and pretraining they match or beat classic CNNs.

**Transfer learning** is the default: start from ImageNet (or larger) pretrained weights, replace the head, train the head first (backbone frozen), then fine-tune the whole network with a small learning rate (e.g. 10x lower for the backbone). Use the pretrained normalization and input size.

**Training/eval essentials**: augmentation, label smoothing, weight decay, cosine LR schedule; report **top-1 / top-5 accuracy**; for imbalanced classes also per-class precision/recall and a confusion matrix. Overfitting is the usual failure with small datasets.

## Worked example
First layer of ResNet-50: input $224 \times 224 \times 3$, conv $7 \times 7$, stride 2, padding 3, 64 filters.
- Output size: $\lfloor (224 + 6 - 7)/2 \rfloor + 1 = 111 + 1 = 112$, so $112 \times 112 \times 64$.
- Parameters: $7 \cdot 7 \cdot 3 \cdot 64 + 64 = 9{,}472$.
- Next, $3 \times 3$ max pool, stride 2, padding 1: $\lfloor (112 + 2 - 3)/2 \rfloor + 1 = 56$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A conv layer has 128 input channels, 256 output channels and a 3x3 kernel (with bias). How many parameters?",
  "options": [
    "294,912",
    "295,168",
    "32,768",
    "590,080"
  ],
  "answer": 1,
  "explanation": "3*3*128*256 = 294,912 weights plus 256 biases = 295,168."
}
```

```quiz
{
  "id": "q2",
  "question": "Why do residual connections make very deep networks easier to train?",
  "options": [
    "They reduce the number of parameters",
    "The identity shortcut gives gradients a direct path, and layers only need to learn a residual",
    "They replace batch norm",
    "They increase the receptive field to the full image"
  ],
  "answer": 1,
  "explanation": "With y = x + F(x), the gradient includes an identity term, mitigating vanishing gradients; a block can default to identity if F is not useful."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `conv_out_size(n, k, s, p)`, `conv_params(k, c_in, c_out)` (with bias) and `conv2d(x, w, stride=1, pad=0)`: a single-channel 2D convolution (cross-correlation, as in deep learning) of a 2D numpy array `x` with kernel `w`, zero padding `pad` on all sides.",
  "setup": "import numpy as np",
  "packages": [
    "numpy"
  ],
  "starterCode": "def conv_out_size(n, k, s, p):\n    pass\n\ndef conv_params(k, c_in, c_out):\n    pass\n\ndef conv2d(x, w, stride=1, pad=0):\n    pass\n",
  "tests": "assert conv_out_size(224, 7, 2, 3) == 112\nassert conv_out_size(112, 3, 2, 1) == 56\nassert conv_params(7, 3, 64) == 9472\nassert conv_params(3, 128, 256) == 295168\nx = np.arange(16, dtype=float).reshape(4, 4)\nw = np.ones((2, 2))\nassert np.allclose(conv2d(x, w), [[10, 14, 18], [26, 30, 34], [42, 46, 50]])\nassert np.allclose(conv2d(x, w, stride=2), [[10, 18], [42, 50]])\no = conv2d(x, w, pad=1)\nassert o.shape == (5, 5) and o[0, 1] == 1 and o[4, 4] == 15\nk = np.array([[1, 0], [0, -1]], dtype=float)\nassert np.allclose(conv2d(x, k), np.full((3, 3), -5.0))",
  "solution": "def conv_out_size(n, k, s, p):\n    return (n + 2 * p - k) // s + 1\n\ndef conv_params(k, c_in, c_out):\n    return k * k * c_in * c_out + c_out\n\ndef conv2d(x, w, stride=1, pad=0):\n    xp = np.pad(x, pad)\n    kh, kw = w.shape\n    oh = conv_out_size(x.shape[0], kh, stride, pad)\n    ow = conv_out_size(x.shape[1], kw, stride, pad)\n    out = np.zeros((oh, ow))\n    for i in range(oh):\n        for j in range(ow):\n            patch = xp[i * stride:i * stride + kh, j * stride:j * stride + kw]\n            out[i, j] = (patch * w).sum()\n    return out\n",
  "hints": [
    "Pad with np.pad(x, pad), then slide a window with step `stride`.",
    "Each output pixel is the sum of the elementwise product of the patch and the kernel (no kernel flip)."
  ]
}
```

> [!TIP] Interview tips
> - Know the output-size formula cold, and that a 1x1 conv is a per-pixel linear map across channels (used to change channel count cheaply).
> - Explain ResNet as learning a residual $F(x)$ with an identity shortcut, which eases optimization and gradient flow.
> - For a small dataset: pretrained backbone, freeze then fine-tune with a low LR, strong augmentation. Training from scratch is rarely the right answer.
