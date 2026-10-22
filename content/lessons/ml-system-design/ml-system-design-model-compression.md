---
id: ml-system-design-model-compression
title: Model compression
estimatedMinutes: 10
difficulty: medium
tags: [ml-system-design, compression, quantization, distillation]
---

## Why it matters
Models that win offline often cannot ship: too slow for the latency SLO, too big for a phone or too costly per request. Compression is the standard toolbox for closing that gap, and interviewers expect the trade-offs of each technique.

## Concept
Main techniques:
- **Quantization**: store weights (and sometimes activations) in fewer bits. fp32 $\to$ fp16/bf16 $\to$ int8 $\to$ int4. Symmetric int8: $s = \max|x|/127$, $q = \text{round}(x/s)$, $\hat x = s q$; error per value $\le s/2$. **Post-training quantization (PTQ)** needs only calibration data; **quantization-aware training (QAT)** simulates rounding during training and recovers more accuracy. LLM variants: GPTQ, AWQ, int4 weight-only. Needs hardware/kernel support for real speedups; per-channel or per-group scales cut error.
- **Pruning**: remove weights (unstructured, high sparsity but little speedup on GPUs) or whole channels/heads/layers (structured, real speedup). Usually followed by fine-tuning. N:M sparsity (2:4) is hardware-supported.
- **Knowledge distillation**: train a small **student** to match a large **teacher**'s soft outputs: $\mathcal L = \alpha\,\text{CE}(y, p_s) + (1-\alpha)\,T^2\,\text{KL}(p_t^{T} \| p_s^{T})$ with temperature $T$. Often retains most quality at a fraction of the size (DistilBERT: 40% smaller, about 97% of BERT's performance, 60% faster).
- **Low-rank factorization** ($W \approx AB$), **weight sharing**, **efficient architectures** (MobileNet), **early exit/cascades**, and for LLMs **KV-cache** quantization and speculative decoding.

**Trade-offs and process**: measure the quality drop on the metric that matters (and by slice), the latency/memory gain on the **target hardware**, then iterate. Typically distill, then prune/quantize, and validate. Combine with caching and batching. Model size $= \text{params} \times \text{bits}/8$ bytes.

## Worked example
A 7B-parameter LLM: fp16 $= 7\text{B} \times 2 = 14$ GB; int8 $= 7$ GB; int4 $= 3.5$ GB (plus a little for scales), which fits on a consumer GPU. Since decoding is memory-bandwidth bound, smaller weights also mean faster tokens.
Quantizing $x = [0.5, -1.0, 0.25, 1.27]$: $s = 1.27/127 = 0.01$, so $q = [50, -100, 25, 127]$ and dequantization is exact here. A value like $0.504$ maps to $q = 50$ (error 0.004, below $s/2 = 0.005$).

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which technique trains a small model to mimic a large model's output probabilities?",
  "options": [
    "Pruning",
    "Quantization",
    "Knowledge distillation",
    "Weight sharing"
  ],
  "answer": 2,
  "explanation": "The student learns from the teacher's soft labels, which carry more information than hard labels."
}
```

```quiz
{
  "id": "q2",
  "question": "Why can unstructured pruning give little real speedup on GPUs?",
  "options": [
    "It increases accuracy",
    "Scattered zeros don't map to dense hardware kernels, so compute isn't reduced unless structure or sparse kernels are used",
    "It makes weights larger",
    "It only affects training"
  ],
  "answer": 1,
  "explanation": "Structured pruning (channels, heads, layers) or N:M sparsity is needed for hardware-friendly speedups."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `quantize_int8(values)` returning `(q_list, scale)` with scale = max|x| / 127 (use scale 1.0 if all zeros) and q = round(x / scale) as ints; `dequantize(q_list, scale)`; and `model_size_gb(params_billion, bits)` (1 GB = 1e9 B).",
  "starterCode": "def quantize_int8(values):\n    pass\n\ndef dequantize(q_list, scale):\n    pass\n\ndef model_size_gb(params_billion, bits):\n    pass\n",
  "tests": "q, s = quantize_int8([0.5, -1.0, 0.25, 1.27])\nassert abs(s - 0.01) < 1e-12\nassert q == [50, -100, 25, 127]\nd = dequantize(q, s)\nassert all(abs(a - b) < 1e-9 for a, b in zip(d, [0.5, -1.0, 0.25, 1.27]))\nx = [0.123, -0.777, 0.5, 0.31, -0.02]\nq, s = quantize_int8(x)\nassert max(abs(a) for a in q) == 127\nassert all(abs(a - b) <= s / 2 + 1e-12 for a, b in zip(dequantize(q, s), x))\nassert quantize_int8([0, 0]) == ([0, 0], 1.0)\nassert abs(model_size_gb(7, 16) - 14) < 1e-9\nassert abs(model_size_gb(7, 4) - 3.5) < 1e-9",
  "solution": "def quantize_int8(values):\n    m = max(abs(v) for v in values)\n    scale = m / 127 if m > 0 else 1.0\n    return [int(round(v / scale)) for v in values], scale\n\ndef dequantize(q_list, scale):\n    return [q * scale for q in q_list]\n\ndef model_size_gb(params_billion, bits):\n    return params_billion * bits / 8",
  "hints": [
    "The largest-magnitude value maps to +/-127.",
    "Bytes per parameter = bits / 8; 1B params at 8 bits = 1 GB."
  ]
}
```

> [!TIP] Interview tips
> - Name the techniques (quantization, pruning, distillation, low-rank) and when each fits the constraint (latency, memory, edge).
> - Compare PTQ vs QAT and structured vs unstructured pruning.
> - Always validate accuracy on the real metric and speed on the target hardware; compression gains are hardware-dependent.
