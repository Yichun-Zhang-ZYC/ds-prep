---
id: computer-vision-vision-transformers
title: "Vision Transformers (ViT)"
estimatedMinutes: 12
difficulty: medium
tags: [computer-vision, transformers, vit, swin, self-supervised]
---

## Why it matters
ViT-style backbones now sit under most modern vision systems (CLIP, SAM, DINOv2, multimodal LLMs). Interviewers ask how an image becomes a token sequence, why ViTs need more data than CNNs, and how cost scales with resolution.

## Concept
**ViT recipe**
1. Split the image into non-overlapping $P \times P$ patches; flatten each to a vector of length $P^2 C$.
2. Linearly project each to dimension $D$ (equivalent to a conv with kernel and stride $P$).
3. Prepend a learnable **[CLS]** token and add **positional embeddings** (learned 1-D; patches have no inherent order).
4. Feed the sequence of $N + 1$ tokens, $N = (H/P)(W/P)$, through a standard Transformer encoder (self-attention + MLP, pre-LayerNorm, residuals).
5. Classify from the final [CLS] embedding (or average-pooled tokens) with a linear head.

**Inductive bias.** CNNs hardcode locality and translation equivariance; ViTs must learn them, so they underperform CNNs when trained from scratch on small data (ImageNet-1k) but **win with large-scale pretraining** (ImageNet-21k, JFT, LAION) or strong recipes. **DeiT** reaches good ImageNet accuracy with heavy augmentation and distillation.

**Cost.** Self-attention is $O(N^2 D)$ in the token count. Halving patch size quadruples $N$ and multiplies attention cost by about 16. Positional embeddings are interpolated for new resolutions when fine-tuning at higher resolution.

**Variants**
- **Swin**: attention inside local windows that shift between layers, with hierarchical (pyramid) feature maps, so cost is linear in image size and it drops into detection/segmentation as a backbone.
- **MAE**: self-supervised; mask ~75% of patches, encode only the visible ones, reconstruct the rest. Cheap and scalable pretraining.
- **DINO / DINOv2**: self-distillation giving strong general features without labels.
- Hybrid models use a conv stem; ConvNeXt shows modernized CNNs remain competitive.

## Worked example
ViT-B/16 on a $224 \times 224 \times 3$ image: $N = (224/16)^2 = 14^2 = 196$ patches, each of length $16 \cdot 16 \cdot 3 = 768$ (with $D = 768$ the projection is square). With [CLS], the sequence has 197 tokens, so each attention head forms a $197 \times 197 = 38{,}809$ matrix.

Using $P = 8$: $N = 28^2 = 784$ (785 tokens), and the attention matrix is $785^2 = 616{,}225$ entries, about 15.9x larger.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why does a ViT trained from scratch on a small dataset often lose to a CNN?",
  "options": [
    "ViTs have fewer parameters",
    "ViTs lack built-in locality and translation-equivariance biases and must learn them from data",
    "Patches cannot encode color",
    "Self-attention cannot be trained with SGD"
  ],
  "answer": 1,
  "explanation": "CNNs bake in locality and weight sharing, which helps with little data. ViTs are more flexible but need large-scale pretraining or strong augmentation/distillation."
}
```

```quiz
{
  "id": "q2",
  "question": "You change patch size from 16 to 8 at fixed image size. What happens to attention cost per layer?",
  "options": [
    "Unchanged",
    "About 2x",
    "About 16x",
    "About 4x"
  ],
  "answer": 2,
  "explanation": "Tokens go from N to 4N, and attention is quadratic in tokens, so cost grows about 16x."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `num_tokens(h, w, patch, cls=True)`, `patchify(img, patch)` which turns an `H x W x C` numpy array into an `(N, patch*patch*C)` array of flattened patches in row-major patch order (pixels inside a patch also row-major, channels last), and `attn_entries(h, w, patch)` = the size of one head's attention matrix (tokens squared, including [CLS]).",
  "setup": "import numpy as np",
  "packages": [
    "numpy"
  ],
  "starterCode": "def num_tokens(h, w, patch, cls=True):\n    pass\n\ndef patchify(img, patch):\n    pass\n\ndef attn_entries(h, w, patch):\n    pass\n",
  "tests": "assert num_tokens(224, 224, 16) == 197\nassert num_tokens(224, 224, 16, cls=False) == 196\nassert attn_entries(224, 224, 16) == 38809\nassert attn_entries(224, 224, 8) == 616225\nimg = np.arange(16).reshape(4, 4, 1)\np = patchify(img, 2)\nassert p.shape == (4, 4)\nassert p.tolist() == [[0, 1, 4, 5], [2, 3, 6, 7], [8, 9, 12, 13], [10, 11, 14, 15]]\nimg3 = np.random.RandomState(0).rand(224, 224, 3)\nassert patchify(img3, 16).shape == (196, 768)\nassert np.allclose(patchify(img3, 16)[1], img3[0:16, 16:32].reshape(-1))",
  "solution": "def num_tokens(h, w, patch, cls=True):\n    return (h // patch) * (w // patch) + (1 if cls else 0)\n\ndef patchify(img, patch):\n    h, w, c = img.shape\n    rows = []\n    for i in range(0, h - h % patch, patch):\n        for j in range(0, w - w % patch, patch):\n            rows.append(img[i:i + patch, j:j + patch].reshape(-1))\n    return np.stack(rows)\n\ndef attn_entries(h, w, patch):\n    return num_tokens(h, w, patch) ** 2\n",
  "hints": [
    "N = (H // P) * (W // P); add 1 for the [CLS] token.",
    "Slice img[i:i+P, j:j+P] for each patch origin and reshape(-1)."
  ]
}
```

> [!TIP] Interview tips
> - Say "patchify, linear projection, [CLS] + positional embeddings, Transformer encoder"; mention the conv-with-stride-$P$ equivalence.
> - Explain the data trade-off through inductive bias; recommend pretrained ViTs (or Swin/ConvNeXt) rather than training on a small dataset from scratch.
> - Know the quadratic attention cost and mitigations: larger patches, windowed attention (Swin), token pruning/merging, FlashAttention.
