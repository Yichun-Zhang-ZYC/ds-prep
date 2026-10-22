---
id: nlp-llms-positional-encodings-rope
title: "Positional encodings: sinusoidal, learned, RoPE, ALiBi"
estimatedMinutes: 13
difficulty: hard
tags: [nlp, llm, positional-encoding, rope, alibi, transformer]
---

## Why it matters
Self-attention is permutation-equivariant, so the model only knows word order through the position scheme you choose. That choice also decides how well a model extrapolates to longer contexts. Interviewers ask you to derive RoPE's relative-position property and to compare it with ALiBi and learned embeddings (see Self-attention and multi-head attention for the base mechanism).

## Concept
**Absolute schemes** add a position vector to the token embedding before layer 1.
- **Learned**: a trainable table $E_{pos}[0..L-1]$ (BERT, GPT-2). Simple, but positions beyond $L$ do not exist.
- **Sinusoidal** (original Transformer): $PE_{pos,2i} = \sin(pos/10000^{2i/d})$, $PE_{pos,2i+1} = \cos(pos/10000^{2i/d})$. Fixed, geometric wavelengths from $2\pi$ to $10000 \cdot 2\pi$; $PE_{pos+k}$ is a linear function of $PE_{pos}$, which in theory helps relative reasoning. In practice extrapolation beyond the training length is poor.

**Relative schemes** inject the offset $m-n$ directly into the attention score.
- **RoPE** (rotary; Llama, Qwen, Mistral, GPT-NeoX): rotate each 2-D pair of the query and key by an angle proportional to its position, $\theta_i = b^{-2i/d}$ with base $b = 10000$ by default. With rotation matrices $R_m$, $\langle R_m q, R_n k\rangle = q^\top R_{n-m} k$, so the score depends only on the **relative distance**, while the norm of $q$ and $k$ is unchanged. It is applied to $Q$ and $K$ at every layer (not to $V$), adds no parameters, and low-index pairs rotate fast (local detail) while high-index pairs rotate slowly (long range).
- **ALiBi** (BLOOM, MPT): no position vectors at all; add a head-specific linear penalty $-m_h\,(i-j)$ to the logits. Slopes are geometric, $m_h = 2^{-8h/H}$ for $h = 1..H$. Very good length extrapolation, but a hard recency bias and weaker on long-range retrieval than RoPE with scaling.
- **T5 relative bias**: a learned scalar per (bucketed) distance and head, added to logits.
- **NoPE**: causal decoders can infer position from the mask alone, but it is rarely used at scale.

**Why RoPE won**: relative behaviour, no extra parameters, compatible with KV caching (keys are rotated once at their own position), and its frequencies can be rescaled to extend context (see Long-context techniques).

**Pitfalls**: a model never trained at positions beyond $L$ sees out-of-distribution rotation angles at inference; the head dimension $d$ must be even; the rotation base is a hyperparameter you must keep consistent between training and serving.

## Worked example
RoPE with $d = 2$ (one pair) and $\theta = 1$ rad per position. Take $q = k = (1, 0)$. Rotating gives $R_m q = (\cos m, \sin m)$.

Query at position 3, key at position 1: $\langle R_3 q, R_1 k\rangle = \cos 3 \cos 1 + \sin 3 \sin 1 = \cos(3-1) = \cos 2 \approx -0.416$.

Move both by 10 (positions 13 and 11): $\cos 13 \cos 11 + \sin 13 \sin 11 = \cos 2$, the same score. Only the offset 2 matters.

Sinusoidal at $pos = 1$, $d = 4$: pair 0 has divisor $10000^0 = 1$ giving $(\sin 1, \cos 1) = (0.841, 0.540)$; pair 1 has divisor $10000^{0.5} = 100$ giving $(\sin 0.01, \cos 0.01) = (0.010, 1.000)$. Early dimensions oscillate quickly, later ones barely move, like the digits of a clock.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why does RoPE give attention scores that depend only on relative position?",
  "options": ["Both q and k are rotated by angles proportional to their positions, and rotations compose: $R_m^\\top R_n = R_{n-m}$", "It adds a learned bias per distance", "It sets the position of every token to zero", "It removes the softmax"],
  "answer": 0,
  "explanation": "Rotating q by $m\\theta$ and k by $n\\theta$ makes the dot product a function of $(n-m)\\theta$. No parameters are needed and norms are preserved."
}
```

```quiz
{
  "id": "q2",
  "question": "A model trained with context 4k and RoPE is run at 32k with no changes. What is the main failure mechanism?",
  "options": ["Rotation angles at positions beyond 4k were never seen in training, so attention scores become out-of-distribution", "The embedding table is too small", "RoPE cannot be used with causal masks", "The vocabulary changes"],
  "answer": 0,
  "explanation": "RoPE has no table limit, but the model only learned to interpret angles up to the trained range. Position interpolation, NTK scaling or YaRN rescale the frequencies to stay in range."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `sinusoidal_pe(pos, d)` (sin at even indices, cos at odd, divisor $10000^{2i/d}$ for pair $i$), `rope(x, pos, base=10000.0)` rotating each consecutive pair `(x[2i], x[2i+1])` by angle `pos * base**(-2i/d)`, and `alibi_slopes(h)` returning $2^{-8k/h}$ for $k = 1..h$.",
  "starterCode": "import math\n\ndef sinusoidal_pe(pos, d):\n    pass\n\ndef rope(x, pos, base=10000.0):\n    pass\n\ndef alibi_slopes(h):\n    pass\n\nprint(sinusoidal_pe(1, 4))",
  "tests": "import math\nassert sinusoidal_pe(0, 4) == [0.0, 1.0, 0.0, 1.0]\np = sinusoidal_pe(1, 4)\nassert len(p) == 4\nassert abs(p[0] - math.sin(1)) < 1e-12 and abs(p[1] - math.cos(1)) < 1e-12\nassert abs(p[2] - math.sin(0.01)) < 1e-12 and abs(p[3] - math.cos(0.01)) < 1e-12\nr = rope([1.0, 0.0], 3)\nassert abs(r[0] - math.cos(3)) < 1e-12 and abs(r[1] - math.sin(3)) < 1e-12\nq = [0.3, -1.2, 0.7, 0.5]\nk = [1.1, 0.4, -0.6, 0.9]\ndef dot(a, b):\n    return sum(x * y for x, y in zip(a, b))\ns1 = dot(rope(q, 5), rope(k, 3))\ns2 = dot(rope(q, 105), rope(k, 103))\nassert abs(s1 - s2) < 1e-9\nassert abs(dot(rope(q, 7), rope(q, 7)) - dot(q, q)) < 1e-9\nassert abs(dot(rope(q, 5), rope(k, 3)) - dot(rope(q, 3), rope(k, 5))) > 1e-6\na = alibi_slopes(8)\nassert len(a) == 8 and abs(a[0] - 0.5) < 1e-12 and abs(a[-1] - 1 / 256) < 1e-12",
  "solution": "import math\n\ndef sinusoidal_pe(pos, d):\n    out = []\n    for i in range(d // 2):\n        a = pos / (10000 ** (2 * i / d))\n        out += [math.sin(a), math.cos(a)]\n    return out\n\ndef rope(x, pos, base=10000.0):\n    d = len(x)\n    out = []\n    for i in range(d // 2):\n        th = pos * base ** (-2 * i / d)\n        c, s = math.cos(th), math.sin(th)\n        a, b = x[2 * i], x[2 * i + 1]\n        out += [a * c - b * s, a * s + b * c]\n    return out\n\ndef alibi_slopes(h):\n    return [2 ** (-8 * (k + 1) / h) for k in range(h)]",
  "hints": ["Pair i uses the angle pos / 10000**(2*i/d); output [sin, cos] for each pair.", "Rotation of (a, b) by theta: (a cos - b sin, a sin + b cos).", "The tests check that the dot product of rotated vectors is unchanged when both positions shift by the same amount."]
}
```

> [!TIP] Interview tips
> - Write the RoPE identity $\langle R_m q, R_n k\rangle = q^\top R_{n-m}k$ and say it applies to Q and K only, per layer.
> - Contrast: learned (hard limit), sinusoidal (poor extrapolation), ALiBi (good extrapolation, recency bias), RoPE (relative, scalable via frequency scaling).
> - Mention that changing the RoPE base or training length at serving time silently breaks the model.
