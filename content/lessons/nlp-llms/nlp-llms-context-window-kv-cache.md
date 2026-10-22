---
id: nlp-llms-context-window-kv-cache
title: Context window, KV cache
estimatedMinutes: 12
difficulty: medium
tags: [nlp, llm, kv-cache, inference, attention, memory]
---

## Why it matters
Serving cost and latency of LLMs are dominated by the KV cache, not the weights, once contexts get long. "How much memory does a 32k-token request need?" is a standard back-of-the-envelope question for ML and inference engineers.

## Concept
**Context window**: the maximum number of tokens (prompt + generated) the model can attend to. It is limited by training length, position encoding (e.g. RoPE extrapolation) and memory. Self-attention compute in the prefill phase grows as $O(n^2)$. A longer window does not guarantee the model *uses* it well ("lost in the middle").

**Why a KV cache**: generation is autoregressive. Token $t$ attends to keys and values of all earlier tokens, which never change. Caching them means each new step computes $q, k, v$ for **one** token only and reuses the stored $K, V$, instead of recomputing the whole prefix. The output is **identical**; it trades memory for compute.

**Two phases**:
- **Prefill**: process the whole prompt in parallel (compute-bound); determines time-to-first-token.
- **Decode**: one token per step, reading the full cache every step (**memory-bandwidth-bound**); determines inter-token latency.

**Cache size**:
$$\text{bytes} = 2 \times L \times H_{kv} \times d_{head} \times n_{seq} \times n_{batch} \times b$$
($2$ for K and V, $L$ layers, $H_{kv}$ KV heads, $b$ bytes per element). It grows **linearly** with sequence length and batch size, so it caps how many concurrent requests fit on a GPU.

**Ways to shrink it**:
- **MQA / GQA**: share K/V across groups of query heads (fewer $H_{kv}$).
- **Quantize** the cache (INT8 / FP8).
- **Sliding-window / local attention** (fixed-size cache for some layers).
- **PagedAttention** (vLLM) avoids fragmentation; **prefix caching** reuses the cache for shared prompts.

## Worked example
Llama-2-7B with full multi-head attention: $L = 32$, $H_{kv} = 32$, $d_{head} = 128$, fp16 ($b = 2$). Per token: $2 \cdot 32 \cdot 32 \cdot 128 \cdot 2 = 524{,}288$ B $= 0.5$ MiB. A 4,096-token sequence needs $2$ GiB; a batch of 16 needs 32 GiB, more than the ~13 GiB of fp16 weights.

Llama-3-8B uses GQA with $H_{kv} = 8$: per token $2 \cdot 32 \cdot 8 \cdot 128 \cdot 2 = 131{,}072$ B $= 128$ KiB, 4x smaller. An 8,192-token sequence needs 1 GiB.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Does enabling the KV cache change the tokens the model generates (greedy decoding)?",
  "options": [
    "Yes, it approximates attention to save memory",
    "No, it is exact; it only avoids recomputing keys and values for the prefix",
    "Yes, it truncates the context",
    "Only for sequences over 4k tokens"
  ],
  "answer": 1,
  "explanation": "The cached K and V are exactly what would be recomputed. The cache trades memory for compute without changing outputs (up to floating-point noise)."
}
```

```quiz
{
  "id": "q2",
  "question": "A model moves from 32 KV heads (MHA) to 8 KV heads (GQA), all else equal. What happens to KV cache memory per token?",
  "options": [
    "Unchanged",
    "Drops 4x",
    "Drops 32x",
    "Grows 4x"
  ],
  "answer": 1,
  "explanation": "Cache size is proportional to the number of KV heads: 8/32 = 1/4. Query heads (and attention quality) are mostly preserved."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `kv_cache_bytes(layers, kv_heads, head_dim, seq_len, batch=1, bytes_per_elem=2)` returning the KV cache size in bytes. Then write `max_concurrent_seqs(free_bytes, layers, kv_heads, head_dim, seq_len, bytes_per_elem=2)`, the number of full-length sequences that fit in the free memory.",
  "starterCode": "def kv_cache_bytes(layers, kv_heads, head_dim, seq_len, batch=1, bytes_per_elem=2):\n    pass\n\ndef max_concurrent_seqs(free_bytes, layers, kv_heads, head_dim, seq_len, bytes_per_elem=2):\n    \"\"\"How many full-length sequences fit in free_bytes of GPU memory?\"\"\"\n    pass\n\nprint(kv_cache_bytes(32, 32, 128, 4096))",
  "tests": "GiB = 1024 ** 3\nassert kv_cache_bytes(32, 32, 128, 1) == 524288\nassert kv_cache_bytes(32, 32, 128, 4096) == 2 * GiB\nassert kv_cache_bytes(32, 8, 128, 8192) == GiB\nassert kv_cache_bytes(32, 8, 128, 8192, batch=4, bytes_per_elem=1) == 2 * GiB\nassert max_concurrent_seqs(10 * GiB, 32, 32, 128, 4096) == 5\nassert max_concurrent_seqs(GiB, 32, 32, 128, 4096) == 0",
  "solution": "def kv_cache_bytes(layers, kv_heads, head_dim, seq_len, batch=1, bytes_per_elem=2):\n    return 2 * layers * kv_heads * head_dim * seq_len * batch * bytes_per_elem\n\ndef max_concurrent_seqs(free_bytes, layers, kv_heads, head_dim, seq_len, bytes_per_elem=2):\n    per_seq = kv_cache_bytes(layers, kv_heads, head_dim, seq_len, 1, bytes_per_elem)\n    return free_bytes // per_seq",
  "hints": [
    "The leading factor 2 is for storing both K and V.",
    "Use integer division for the number of sequences."
  ]
}
```

> [!TIP] Interview tips
> - Do the formula out loud: 2 (K,V) x layers x KV heads x head dim x tokens x batch x bytes.
> - Say the KV cache gives exact outputs, and that decode is memory-bandwidth-bound (hence GQA, quantization, batching).
> - Distinguish prefill (compute-bound, TTFT) from decode (bandwidth-bound, tokens/s).
