---
id: nlp-llms-flash-attention-and-efficient-attention
title: FlashAttention and efficient attention
estimatedMinutes: 13
difficulty: hard
tags: [nlp, llm, flashattention, attention, gpu, efficiency]
---

## Why it matters
Attention is the part of the Transformer that scales badly with sequence length, and "why is FlashAttention fast if it does the same FLOPs?" is a favourite senior-level question. It tests whether you understand GPU memory hierarchy rather than just asymptotics (see Self-attention and multi-head attention and Context window, KV cache for the basics).

## Concept
**The bottleneck is memory traffic, not FLOPs.** Standard attention materialises $S = QK^\top / \sqrt{d}$ and $P = \text{softmax}(S)$, each $n \times n$, in GPU high-bandwidth memory (HBM), reading and writing them several times. HBM is large but slow; on-chip SRAM is tiny (about 20 MB across an A100) but roughly an order of magnitude faster. Attention is **memory-bound**.

**FlashAttention** (Dao et al.) is an exact, IO-aware kernel:
- **Tiling**: load a block of $Q$ and loop over blocks of $K, V$ in SRAM, never writing the $n \times n$ matrix to HBM.
- **Online softmax**: keep per-row running max $m$, normaliser $\ell$ and output accumulator $o$. For a new block with scores $s$: $m' = \max(m, \max s)$, $\ell' = \ell\,e^{m-m'} + \sum e^{s-m'}$, $o' = o\,e^{m-m'} + \sum e^{s-m'} v$; at the end $o/\ell$. This is numerically stable and exact.
- **Recomputation in backward**: store only the output and log-sum-exp (size $O(n)$), recompute attention tiles instead of saving $P$.
- Result: memory $O(n)$ instead of $O(n^2)$; HBM reads/writes drop from $\Theta(n^2)$ to $\Theta(n^2 d^2 / M)$ for SRAM size $M$; FLOPs unchanged at $O(n^2 d)$; typically 2-4x wall-clock speedup, enabling long contexts.
- **FlashAttention-2** improved work partitioning and parallelism over sequence length; **FlashAttention-3** targets Hopper (async, FP8). **FlashDecoding** parallelises over the KV length for batch-1 decoding. PyTorch's `scaled_dot_product_attention` dispatches to these kernels.

**Reducing the work itself** (usually approximate or architectural):
- **MQA / GQA / MLA**: share or compress K/V across heads to shrink the KV cache and decode bandwidth.
- **Sparse / sliding-window** attention (Longformer, Mistral): each token attends to a local window (plus global tokens): $O(nw)$.
- **Linear attention / state-space models** (Mamba): replace softmax with a recurrence, $O(n)$ time and constant state; weaker at exact recall, so often hybridised.
- **PagedAttention** (vLLM) fixes KV cache fragmentation; it is a memory manager, not a different attention formula.

**Pitfalls**: FlashAttention does not reduce the quadratic FLOPs, so very long contexts still cost compute; it needs supported dtypes, head sizes and hardware; and arbitrary custom masks or biases may fall back to slower kernels.

## Worked example
Memory of the attention score matrix for one head with $n = 32{,}768$ and fp16 (2 bytes): $32768^2 \times 2 = 2^{31}$ B $= 2$ GiB. With 32 heads, $64$ GiB for one layer, far beyond a GPU, so standard attention must chunk or run out of memory. FlashAttention never stores it; only $O(n)$ statistics per head remain.

Online softmax check with scores $[1, 3, 2]$ and values $[10, 20, 30]$, block size 2.
- Block 1 $(1, 3)$: $m = 3$, $\ell = e^{-2} + 1 = 1.1353$, $o = 10 e^{-2} + 20 = 21.353$.
- Block 2 $(2)$: $m' = 3$ (unchanged), $\ell = 1.1353 + e^{-1} = 1.5032$, $o = 21.353 + 30 e^{-1} = 32.390$.
- Result $o/\ell = 21.547$.

The direct softmax gives weights $(0.090, 0.665, 0.245)$ and $0.9 + 13.30 + 7.34 = 21.547$. Identical, with no full row ever held in memory.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why is FlashAttention faster even though it performs the same FLOPs as standard attention?",
  "options": ["It cuts reads and writes to HBM by tiling so the $n \\times n$ score matrix stays in SRAM", "It approximates attention with a linear-time kernel", "It drops low-scoring tokens", "It uses a lower-precision softmax to avoid exponentials"],
  "answer": 0,
  "explanation": "Attention is memory-bandwidth-bound. FlashAttention is exact, FLOPs remain $O(n^2 d)$; the savings are HBM traffic and the $O(n^2)$ intermediate storage."
}
```

```quiz
{
  "id": "q2",
  "question": "When the online softmax sees a new block, why multiply the old accumulators by $e^{m-m'}$?",
  "options": ["The running max changed from $m$ to $m'$, so earlier exponentials must be rebased to the new max", "To discard the old block", "To add dropout", "To turn softmax into a sigmoid"],
  "answer": 0,
  "explanation": "Old terms were stored as $e^{s-m}$; the new reference is $m'$, so multiplying by $e^{m-m'}$ gives $e^{s-m'}$. This keeps the computation both stable and exact."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `softmax_avg(scores, values)` (direct softmax-weighted average, subtracting the max for stability), `online_softmax_avg(scores, values, block)` that processes `block` elements at a time keeping only the running max `m`, normaliser `l` and accumulator `o`, and `attn_matrix_gib(n, heads, bytes_per=2)` returning the size in GiB of the $n \\times n$ score matrices.",
  "starterCode": "import math\n\ndef softmax_avg(scores, values):\n    pass\n\ndef online_softmax_avg(scores, values, block):\n    pass\n\ndef attn_matrix_gib(n, heads, bytes_per=2):\n    pass\n\nprint(softmax_avg([1, 3, 2], [10, 20, 30]))",
  "tests": "import math\ns = [1.0, 3.0, 2.0]\nv = [10.0, 20.0, 30.0]\nref = softmax_avg(s, v)\nassert abs(ref - 21.5469789788) < 1e-6\nfor b in (1, 2, 3, 5):\n    assert abs(online_softmax_avg(s, v, b) - ref) < 1e-9\nbig = [1000.0, 1001.0, 999.0, 1002.0]\nvv = [1.0, 2.0, 3.0, 4.0]\nassert abs(online_softmax_avg(big, vv, 2) - softmax_avg(big, vv)) < 1e-9\ninc = [0.0, 5.0, 10.0, 15.0, 20.0]\nvi = [1.0, 2.0, 3.0, 4.0, 5.0]\nassert abs(online_softmax_avg(inc, vi, 2) - softmax_avg(inc, vi)) < 1e-9\nassert abs(attn_matrix_gib(32768, 1) - 2.0) < 1e-12\nassert abs(attn_matrix_gib(32768, 32) - 64.0) < 1e-9",
  "solution": "import math\n\ndef softmax_avg(scores, values):\n    m = max(scores)\n    w = [math.exp(x - m) for x in scores]\n    z = sum(w)\n    return sum(a * b for a, b in zip(w, values)) / z\n\ndef online_softmax_avg(scores, values, block):\n    m = -math.inf\n    l = 0.0\n    o = 0.0\n    for start in range(0, len(scores), block):\n        sb = scores[start:start + block]\n        vb = values[start:start + block]\n        m_new = max(m, max(sb))\n        scale = math.exp(m - m_new) if m != -math.inf else 0.0\n        l *= scale\n        o *= scale\n        for x, val in zip(sb, vb):\n            w = math.exp(x - m_new)\n            l += w\n            o += w * val\n        m = m_new\n    return o / l\n\ndef attn_matrix_gib(n, heads, bytes_per=2):\n    return n * n * heads * bytes_per / 2 ** 30",
  "hints": ["Start with m = -inf, l = 0, o = 0. For each block: m_new = max(m, max(block)); multiply l and o by exp(m - m_new) (use 0 when m is -inf).", "Then for each element add w = exp(x - m_new) to l and w * v to o. Return o / l.", "GiB = n * n * heads * bytes_per / 2**30."]
}
```

> [!TIP] Interview tips
> - Open with: attention is memory-bound; FlashAttention is exact and IO-aware, same FLOPs, memory $O(n)$ instead of $O(n^2)$.
> - Be able to write the online-softmax update $(m, \ell, o)$ and say the backward pass recomputes tiles to save memory.
> - Separate the ideas: FlashAttention (exact kernel), GQA/MLA (smaller KV cache), sliding window / linear attention (change the algorithm, approximate), PagedAttention (memory management).
