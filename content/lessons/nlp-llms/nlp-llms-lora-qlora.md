---
id: nlp-llms-lora-qlora
title: LoRA, QLoRA
estimatedMinutes: 12
difficulty: medium
tags: [nlp, llm, fine-tuning, lora, qlora, peft]
---

## Why it matters
LoRA is the default way to fine-tune LLMs on one GPU. Interviewers expect you to explain the low-rank update, why it is initialised the way it is, and how QLoRA squeezes a 65B model onto a single card.

## Concept
**LoRA** freezes the pretrained weight $W \in \mathbb{R}^{d \times k}$ and learns a low-rank update:

$$W' = W + \frac{\alpha}{r} B A, \quad B \in \mathbb{R}^{d \times r},\; A \in \mathbb{R}^{r \times k},\; r \ll \min(d, k)$$

The hypothesis is that task-specific weight changes have low intrinsic rank. Trainable parameters drop from $dk$ to $r(d + k)$.

**Details that get asked**:
- **Init**: $A$ is random Gaussian, $B$ is zero, so $\Delta W = 0$ at step 0 and training starts exactly at the pretrained model. (If both were zero, gradients would vanish.)
- **Scaling $\alpha / r$**: lets you change $r$ without retuning the learning rate much. Typical: $r \in [4, 64]$, $\alpha = r$ or $2r$.
- **Where**: originally only attention $W_q, W_v$; now usually all linear layers (attention + MLP), which closes most of the gap to full fine-tuning.
- **Inference**: merge $W + \frac{\alpha}{r}BA$ into $W$ for zero added latency, or keep adapters separate to serve many tasks on one base model (a few MB each).
- **Trade-off**: LoRA learns less and forgets less than full fine-tuning; it can lag on large domain shifts or heavy new-skill learning.

**QLoRA** makes the frozen base model tiny so LoRA fits on cheap hardware:
- Base weights stored in 4-bit **NormalFloat (NF4)**, a quantile-based data type suited to roughly normal weights.
- **Double quantization**: also quantize the per-block scaling constants.
- **Paged optimizers**: spill optimizer state to CPU memory during memory spikes.
- Weights are dequantized on the fly to bf16 for the matmul; only the bf16 LoRA adapters receive gradients and optimizer state.

## Worked example
For one $4096 \times 4096$ projection, full fine-tuning trains $4096^2 = 16{,}777{,}216$ parameters. LoRA with $r = 8$ trains $8 \cdot (4096 + 4096) = 65{,}536$, about 0.39%.

Memory for a 7B model: fp16 weights are $7\text{B} \times 2 = 14$ GB; NF4 weights are $7\text{B} \times 0.5 = 3.5$ GB. Full fine-tuning with Adam needs roughly 16 bytes per parameter (≈ 112 GB); QLoRA needs the 3.5 GB base plus small adapters, activations and optimizer state for the adapters only.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why is LoRA's B matrix initialised to zero while A is random?",
  "options": [
    "So ΔW = 0 at the start and training begins from the pretrained model, while A still gives non-zero gradients to B",
    "To make the adapter rank 0",
    "Random B would increase the parameter count",
    "Zero init is required for 4-bit quantization"
  ],
  "answer": 0,
  "explanation": "With B = 0 the adapter output is zero initially, so behaviour matches the base model. B still receives gradients through the random A, and A then gets gradients once B is non-zero."
}
```

```quiz
{
  "id": "q2",
  "question": "In QLoRA, which parameters are updated during training?",
  "options": [
    "All 4-bit base weights",
    "Only the bf16 LoRA adapter weights",
    "Only the quantization constants",
    "The embedding table and the adapters, in 4-bit"
  ],
  "answer": 1,
  "explanation": "The NF4 base is frozen. Gradients flow through the dequantized weights but only update the higher-precision adapters."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `lora_params(d, k, r)` (trainable parameters of one adapter), `lora_forward(W, A, B, x, alpha, r)` returning $Wx + \\frac{\\alpha}{r} B (A x)$, and `merge_lora(W, A, B, alpha, r)` returning the merged weight. Shapes: W is d×k, A is r×k, B is d×r (numpy arrays).",
  "setup": "import numpy as np",
  "starterCode": "import numpy as np\n\ndef lora_params(d, k, r):\n    pass\n\ndef lora_forward(W, A, B, x, alpha, r):\n    pass\n\ndef merge_lora(W, A, B, alpha, r):\n    pass\n\nprint(lora_params(4096, 4096, 8))",
  "tests": "W = np.eye(2)\nA = np.array([[1.0, 1.0]])\nB = np.array([[1.0], [2.0]])\nx = np.array([1.0, 2.0])\nassert lora_params(4096, 4096, 8) == 65536\nassert lora_params(4096, 11008, 16) == 16 * (4096 + 11008)\ny = lora_forward(W, A, B, x, 2.0, 1)\nassert np.allclose(y, [7.0, 14.0])\nassert np.allclose(lora_forward(W, A, np.zeros((2, 1)), x, 2.0, 1), W @ x)\nM = merge_lora(W, A, B, 2.0, 1)\nassert np.allclose(M @ x, y)\nassert np.allclose(M, [[3.0, 2.0], [4.0, 5.0]])",
  "solution": "import numpy as np\n\ndef lora_params(d, k, r):\n    return r * (d + k)\n\ndef lora_forward(W, A, B, x, alpha, r):\n    return W @ x + (alpha / r) * (B @ (A @ x))\n\ndef merge_lora(W, A, B, alpha, r):\n    return W + (alpha / r) * (B @ A)",
  "packages": [
    "numpy"
  ],
  "hints": [
    "Compute the low-rank path as B @ (A @ x): it never forms a d×k matrix.",
    "The merged weight is W + (alpha / r) * (B @ A); merged @ x must equal lora_forward."
  ]
}
```

> [!TIP] Interview tips
> - State the formula, the parameter count $r(d+k)$ and the zero-init of $B$ with the reason.
> - Say that merging adapters removes inference overhead, while separate adapters enable multi-tenant serving.
> - For QLoRA: the base is 4-bit and frozen, adapters and compute are bf16, gradients flow through dequantized weights.
