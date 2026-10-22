---
id: nlp-llms-quantization
title: Quantization
estimatedMinutes: 12
difficulty: medium
tags: [nlp, llm, efficiency, quantization, inference]
---

## Why it matters
Quantization is the cheapest way to serve a big model: smaller memory, less bandwidth, often faster decoding. Interviewers want the basic math, the PTQ vs QAT split, and why outliers make LLMs hard to quantize.

## Concept
**Quantization** stores weights (and sometimes activations or the KV cache) in fewer bits. Memory is $\text{params} \times \text{bits}/8$ bytes.

**Affine / symmetric scheme** for $b$ bits:
- Symmetric absmax: $s = \max|w| / (2^{b-1} - 1)$, $q = \text{round}(w / s)$, $\hat w = s\,q$.
- Asymmetric adds a **zero-point** $z$: $q = \text{round}(w/s) + z$, useful for skewed ranges such as post-ReLU activations.
- **Granularity**: per-tensor (coarse), per-channel, or **per-group** (e.g. 128 weights share a scale). Finer groups mean lower error but more scale storage.

**When**:
- **PTQ** (post-training): quantize a trained model using a small calibration set; no retraining. Standard for LLMs.
- **QAT** (quantization-aware training): simulate rounding in the forward pass (straight-through estimator for gradients). Better at very low bits, but costs training compute.

**LLM-specific methods**:
- **LLM.int8()**: activations have a few huge outlier channels; keep those in fp16, the rest in int8.
- **SmoothQuant**: migrate activation outliers into the weights with a per-channel rescale so W8A8 works.
- **GPTQ**: layer-wise PTQ that updates remaining weights to compensate each rounding error (second-order information).
- **AWQ**: protects the ~1% of salient weights, found from activation magnitudes, by scaling before quantizing.

**Weight-only vs weight+activation**: W4A16 saves memory and speeds up memory-bound decoding; W8A8 also uses int8 tensor cores, which helps compute-bound prefill and large batches. Quantizing the KV cache extends context or batch size. Evaluate with perplexity and downstream tasks; 8-bit is nearly lossless, 4-bit has a small drop, below 4 needs care.

## Worked example
Weights $[0.50, -1.28, 0.013, 2.54]$ at 8 bits: $s = 2.54/127 = 0.02$, codes $[25, -64, 1, 127]$, dequantized $[0.50, -1.28, 0.02, 2.54]$. The small weight 0.013 became 0.02 (error 0.007) while the others are exact.

Now add one outlier 12.7: $s = 0.1$, so $0.50 \to 5$ and $-1.28 \to -13$ (dequantized $-1.3$), but $0.013 \to 0$ entirely. One outlier wastes the range for everyone, which is why per-group scales help.

Memory for 7B parameters: fp16 14 GB, int8 7 GB, int4 3.5 GB.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why does a single large outlier hurt per-tensor int8 quantization?",
  "options": [
    "It makes the scale large, so most small weights round to few distinct levels or zero",
    "It changes the number of bits",
    "It makes the model non-linear",
    "It forces asymmetric quantization"
  ],
  "answer": 0,
  "explanation": "The scale is set by the maximum magnitude. A big outlier stretches the step size, so ordinary values lose precision. Per-group or per-channel scales and outlier handling mitigate this."
}
```

```quiz
{
  "id": "q2",
  "question": "Why can 4-bit weight-only quantization speed up LLM decoding even if weights are dequantized to fp16 for the matmul?",
  "options": [
    "Decoding is memory-bandwidth bound, so reading 4x fewer weight bytes dominates",
    "4-bit matmuls are always exact",
    "It removes the attention layers",
    "It shrinks the vocabulary"
  ],
  "answer": 0,
  "explanation": "At small batch size each token needs all weights read from memory once; fewer bytes means less time, and the dequantize cost is small by comparison."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `quantize_absmax(w, bits)` returning `(q, scale)` with integer codes in $[-(2^{b-1}-1), 2^{b-1}-1]$, `dequantize(q, scale)`, `quantize_grouped(w, bits, group)` returning the dequantized weights with one scale per consecutive group, and `model_gb(params_billion, bits)` returning memory in GB.",
  "starterCode": "def quantize_absmax(w, bits):\n    # return (q, scale) with integer codes q\n    pass\n\ndef dequantize(q, scale):\n    pass\n\ndef quantize_grouped(w, bits, group):\n    # return the dequantized weights, using one scale per group\n    pass\n\ndef model_gb(params_billion, bits):\n    pass\n\nprint(quantize_absmax([0.5, -1.28, 0.013, 2.54], 8))",
  "tests": "q, s = quantize_absmax([0.5, -1.28, 0.013, 2.54], 8)\nassert q == [25, -64, 1, 127]\nassert abs(s - 0.02) < 1e-9\nd = dequantize(q, s)\nassert all(abs(a - b) < 1e-9 for a, b in zip(d, [0.5, -1.28, 0.02, 2.54]))\nq4, s4 = quantize_absmax([1.0, -0.5, 0.0, 0.25], 4)\nassert max(abs(v) for v in q4) <= 7 and q4[0] == 7\nw = [0.1, -0.2, 0.15, 0.05, 12.7, -3.0, 0.3, 0.2]\ndef mae(a, b):\n    return sum(abs(x - y) for x, y in zip(a, b)) / len(a)\nq8, s8 = quantize_absmax(w, 8)\nper_tensor = dequantize(q8, s8)\ngrouped = quantize_grouped(w, 8, 4)\nassert len(grouped) == len(w)\nassert mae(w, grouped) < mae(w, per_tensor)\nassert abs(model_gb(7, 16) - 14) < 1e-9\nassert abs(model_gb(7, 4) - 3.5) < 1e-9\nassert abs(model_gb(70, 8) - 70) < 1e-9",
  "solution": "def quantize_absmax(w, bits):\n    qmax = 2 ** (bits - 1) - 1\n    m = max(abs(v) for v in w)\n    scale = m / qmax if m > 0 else 1.0\n    q = [max(-qmax, min(qmax, round(v / scale))) for v in w]\n    return q, scale\n\ndef dequantize(q, scale):\n    return [v * scale for v in q]\n\ndef quantize_grouped(w, bits, group):\n    out = []\n    for i in range(0, len(w), group):\n        q, s = quantize_absmax(w[i:i + group], bits)\n        out.extend(dequantize(q, s))\n    return out\n\ndef model_gb(params_billion, bits):\n    return params_billion * bits / 8",
  "hints": [
    "scale = max|w| / (2**(bits-1) - 1); q = round(w / scale).",
    "For grouped quantization, call quantize_absmax on each slice w[i:i+group] and concatenate the dequantized pieces."
  ]
}
```

> [!TIP] Interview tips
> - Write the absmax formula, then explain zero-point, and per-channel or per-group scales.
> - Explain outliers as the core difficulty and name one fix (LLM.int8, SmoothQuant, GPTQ or AWQ).
> - Link to hardware: decoding is memory-bound, so weight-only 4-bit speeds it up even if the matmul is dequantized.
