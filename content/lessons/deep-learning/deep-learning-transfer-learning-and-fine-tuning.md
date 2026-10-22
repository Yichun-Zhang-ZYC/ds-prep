---
id: deep-learning-transfer-learning-and-fine-tuning
title: "Transfer Learning & Fine-tuning"
estimatedMinutes: 10
difficulty: medium
tags: [deep-learning, transfer-learning, fine-tuning, lora]
---

## Why it matters
Almost no one trains large models from scratch. Interviews ask when to freeze vs unfreeze layers, how to avoid catastrophic forgetting, and how parameter-efficient methods like LoRA work and why they save memory.

## Concept
**Idea**: reuse a model pretrained on a large source task (ImageNet, web text) for a small target task. Early layers learn general features (edges, syntax); later layers are task-specific.

**Strategies**, from cheapest to most flexible:
1. **Feature extraction / linear probe**: freeze the backbone, train only a new head. Best with very little data.
2. **Partial fine-tuning**: unfreeze the top layers (or progressively, top-down) plus the head.
3. **Full fine-tuning**: update everything with a small learning rate. Best with more data and a domain shift, but risks overfitting and **catastrophic forgetting**.

**Practical recipe**:
- New head randomly initialized; train it first (a few epochs) with the backbone frozen, then unfreeze.
- Learning rate 10-100x smaller than from-scratch training (e.g. $10^{-5}$ to $5\cdot10^{-5}$ for Transformers), with warm-up.
- **Discriminative / layer-wise LR decay**: layer $i$ of $L$ gets $\text{lr}\cdot\gamma^{L-1-i}$, so lower layers change less.
- Keep BatchNorm layers in eval mode (or use a small batch-safe norm) when fine-tuning on tiny batches; match the pretraining preprocessing and tokenizer.
- Use data augmentation, early stopping and weight decay; monitor target and, if it matters, source performance.

**Parameter-efficient fine-tuning (PEFT)**: freeze $W \in \mathbb R^{d_{out}\times d_{in}}$ and learn a low-rank update:

$$W' = W + \tfrac{\alpha}{r} B A,\quad B \in \mathbb R^{d_{out}\times r},\ A \in \mathbb R^{r \times d_{in}},\ r \ll d$$

**LoRA** trains $r(d_{in} + d_{out})$ parameters per matrix, initializes $B = 0$ so training starts at the pretrained model, and can be merged into $W$ for zero inference overhead. **QLoRA** adds a 4-bit quantized frozen base. Others: adapters (small bottleneck modules), prefix/prompt tuning, BitFit. Memory drops mainly because optimizer states and gradients exist only for the few trainable parameters.

**Domain shift**: when source and target differ a lot, fine-tune deeper; for similar domains with small data, freeze more.

## Worked example
Layer-wise LR decay with base $10^{-3}$, $\gamma = 0.5$ and 4 layers (bottom to top): $[1.25\cdot10^{-4},\ 2.5\cdot10^{-4},\ 5\cdot10^{-4},\ 10^{-3}]$.

LoRA on one $4096 \times 4096$ projection with $r = 8$:
- Full matrix: $4096^2 = 16{,}777{,}216$ parameters.
- LoRA: $8 \cdot (4096 + 4096) = 65{,}536$, which is $0.39\%$ of the matrix.

With Adam (two states per parameter), that is a roughly 256x reduction in optimizer memory for this matrix.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You have 500 labeled images in a domain close to ImageNet. Which is the best first approach?",
  "options": ["Train a large CNN from scratch", "Freeze the pretrained backbone and train a new classification head", "Full fine-tune with a high learning rate of 0.1", "Use only data augmentation, no pretraining"],
  "answer": 1,
  "explanation": "With little data and a similar domain, feature extraction is cheap and low-variance. Unfreeze top layers later if needed."
}
```

```quiz
{
  "id": "q2",
  "question": "Why is LoRA initialized with B = 0?",
  "options": ["To make A irrelevant", "So the adapted model equals the pretrained model at step 0", "To save memory", "To force a rank of zero"],
  "answer": 1,
  "explanation": "The update BA starts at zero, so training begins exactly from the pretrained behavior and moves away smoothly."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `layerwise_lrs(base_lr, decay, n_layers)` returning a list (bottom layer first) where the top layer gets base_lr and each layer below is multiplied by `decay`; `lora_params(d_in, d_out, r)`; and `trainable_params(layer_sizes, n_frozen)` summing the sizes of all layers except the first `n_frozen`.",
  "starterCode": "def layerwise_lrs(base_lr, decay, n_layers):\n    pass\n\ndef lora_params(d_in, d_out, r):\n    pass\n\ndef trainable_params(layer_sizes, n_frozen):\n    pass\n\nprint(layerwise_lrs(1e-3, 0.5, 4), lora_params(4096, 4096, 8))",
  "tests": "got = layerwise_lrs(1e-3, 0.5, 4)\nassert all(abs(a - b) < 1e-12 for a, b in zip(got, [1.25e-4, 2.5e-4, 5e-4, 1e-3])) and len(got) == 4\nassert layerwise_lrs(0.1, 0.9, 1) == [0.1]\nassert lora_params(4096, 4096, 8) == 65536\nassert abs(lora_params(4096, 4096, 8) / 4096 ** 2 - 0.00390625) < 1e-12\nassert trainable_params([100, 200, 300, 50], 2) == 350\nassert trainable_params([100, 200], 0) == 300\nassert trainable_params([100, 200], 2) == 0",
  "solution": "def layerwise_lrs(base_lr, decay, n_layers):\n    return [base_lr * decay ** (n_layers - 1 - i) for i in range(n_layers)]\n\ndef lora_params(d_in, d_out, r):\n    return r * (d_in + d_out)\n\ndef trainable_params(layer_sizes, n_frozen):\n    return sum(layer_sizes[n_frozen:])",
  "hints": ["Layer i (0 = bottom) gets base_lr * decay ** (n_layers - 1 - i).", "LoRA learns A (r x d_in) and B (d_out x r)."]
}
```

> [!TIP] Interview tips
> - Frame the choice by data size and domain similarity: probe, partial fine-tune, full fine-tune.
> - Name catastrophic forgetting and mitigations: low LR, layer-wise decay, freezing, PEFT.
> - Explain LoRA with the rank-$r$ formula and the parameter count; mention that it merges at inference.
