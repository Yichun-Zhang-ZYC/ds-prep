---
id: nlp-llms-long-context-techniques
title: Long-context techniques
estimatedMinutes: 13
difficulty: hard
tags: [nlp, llm, long-context, rope, yarn, attention-sinks, kv-cache]
---

## Why it matters
Million-token contexts are marketed everywhere, but a model that accepts 128k tokens is not the same as one that uses them well. Interviewers probe how context is extended (RoPE scaling), what it costs, and why retrieval quality degrades (see Positional encodings, FlashAttention and Context window, KV cache).

## Concept
**Three separate problems**: (1) the model must represent positions it never trained on, (2) compute and memory must fit, (3) the model must actually *use* distant information.

**1. Extending positions (RoPE-based models)**
- **Position interpolation (PI)**: scale positions by $L_{train}/L_{target}$ so all angles stay inside the trained range. Simple, needs a short fine-tune, but squeezes nearby tokens together and blurs local detail.
- **NTK-aware scaling**: raise the RoPE base, $b' = b \cdot s^{d/(d-2)}$ for scale $s$. High-frequency dimensions (local detail) are almost unchanged while low-frequency ones are interpolated.
- **YaRN**: interpolate per-frequency (leave high frequencies alone, interpolate low ones, ramp in between) plus an attention-temperature correction. Reaches large extensions with little fine-tuning.
- **Continued pre-training on long documents** (and a long-context SFT mix) is what actually makes it work; scaling only gives a good initialisation. Always keep some short data to avoid regressions.

**2. Compute and memory**
- Attention is $O(n^2)$ FLOPs; FlashAttention fixes memory, not FLOPs. The **KV cache** grows linearly: $2 \cdot L \cdot H_{kv} \cdot d_h \cdot b$ bytes per token (see Context window, KV cache). GQA/MLA, KV quantization and eviction help.
- **Sliding-window attention** keeps a fixed cache per layer; information still propagates across layers (effective receptive field $\approx$ layers $\times$ window).
- **Attention sinks** (StreamingLLM): the first few tokens absorb surplus attention mass; evicting them breaks the model. Keep sinks plus a recent window to stream indefinitely, but this *forgets* the middle.
- **Context parallelism / Ring attention**: shard the sequence across GPUs and circulate K/V blocks, so one request can exceed a single GPU's memory.
- **Prefix caching** and **prompt compression** cut repeated cost.

**3. Using the context**
- **Lost in the middle**: accuracy is often highest for facts at the start and end of the prompt and lowest in the middle.
- Evaluate with more than single-needle retrieval: multi-needle, aggregation and multi-hop tasks (RULER, LongBench, HELMET). The **effective** context length is often much shorter than the **claimed** one.
- **RAG vs long context**: long context is simpler and allows cross-document reasoning; RAG is cheaper per query, scales past any window and gives citations. Many systems combine them.

**Pitfalls**: quoting max context without latency (prefill grows quadratically), assuming scaling alone is enough, and forgetting that cost is per-token on every turn unless prefixes are cached.

## Worked example
Extend a model trained at 4k to 32k: scale $s = 8$.

**Position interpolation**: position 20,000 becomes $20000/8 = 2500$, inside the trained range. The cost: adjacent tokens now differ by $1/8$ of a position step, so fine local distinctions shrink.

**NTK-aware** with $d = 128$: $b' = 10000 \cdot 8^{128/126} \approx 82{,}685$. The fastest pair ($\theta_0 = 1$) is unchanged, while the slowest wavelength grows by about $8.3\times$, so long ranges fit but the local resolution is kept.

**Sliding window + 1 sink**, window 3, sequence length 6: token 5 (0-indexed) attends to $\{0, 3, 4, 5\}$: the sink 0 plus the last 3 tokens. Token 1 attends to $\{0, 1\}$.

KV cost: a Llama-3-8B-style model (32 layers, 8 KV heads, head dim 128, fp16) needs 128 KiB per token, so a 128k prompt holds 16 GiB of KV cache for a single request.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why does a model advertised with a 128k context not necessarily use 128k well?",
  "options": ["Accepting long input only means positions and memory work; retrieval and reasoning often degrade with distance (lost in the middle)", "Because 128k exceeds the vocabulary size", "Because RoPE cannot be used above 4k", "Because the KV cache is disabled for long contexts"],
  "answer": 0,
  "explanation": "Max context is a technical limit. Multi-needle, multi-hop and aggregation tasks (RULER etc.) often show an effective length far below the claimed one."
}
```

```quiz
{
  "id": "q2",
  "question": "Why keep a few initial \"sink\" tokens when using sliding-window attention?",
  "options": ["Initial tokens absorb surplus attention mass; evicting them makes attention distributions abnormal and breaks generation", "They store the full meaning of the system prompt", "They double the KV cache size", "They are used to compute the interpolation scale"],
  "answer": 0,
  "explanation": "StreamingLLM found early tokens receive heavy attention regardless of content; keeping them plus a recent window gives stable streaming, at the cost of forgetting the middle."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `pi_position(pos, train_len, target_len)` (position interpolation), `ntk_base(base, scale, d)` returning $b \\cdot s^{d/(d-2)}$, `window_sink_mask(n, window, sinks)` returning an $n \\times n$ list of 0/1 where token $i$ may attend to $j \\le i$ if $j <$ sinks or $i - j <$ window, and `kv_cache_gib(layers, kv_heads, head_dim, tokens, bytes_per=2)`.",
  "starterCode": "def pi_position(pos, train_len, target_len):\n    pass\n\ndef ntk_base(base, scale, d):\n    pass\n\ndef window_sink_mask(n, window, sinks):\n    pass\n\ndef kv_cache_gib(layers, kv_heads, head_dim, tokens, bytes_per=2):\n    pass\n\nprint(pi_position(20000, 4096, 32768))",
  "tests": "assert abs(pi_position(20000, 4096, 32768) - 2500.0) < 1e-9\nassert abs(ntk_base(10000, 8, 128) - 10000 * 8 ** (128 / 126)) < 1e-6\nassert abs(ntk_base(10000, 1, 128) - 10000) < 1e-9\nm = window_sink_mask(6, 3, 1)\nassert len(m) == 6 and all(len(r) == 6 for r in m)\nassert [j for j in range(6) if m[5][j]] == [0, 3, 4, 5]\nassert [j for j in range(6) if m[1][j]] == [0, 1]\nassert [j for j in range(6) if m[3][j]] == [0, 1, 2, 3]\nm2 = window_sink_mask(4, 2, 0)\nassert m2 == [[1, 0, 0, 0], [1, 1, 0, 0], [0, 1, 1, 0], [0, 0, 1, 1]]\nassert abs(kv_cache_gib(32, 8, 128, 1) * 2 ** 30 - 131072) < 1e-6\nassert abs(kv_cache_gib(32, 8, 128, 131072) - 16.0) < 1e-9",
  "solution": "def pi_position(pos, train_len, target_len):\n    return pos * train_len / target_len\n\ndef ntk_base(base, scale, d):\n    return base * scale ** (d / (d - 2))\n\ndef window_sink_mask(n, window, sinks):\n    return [[1 if (j <= i and (j < sinks or i - j < window)) else 0 for j in range(n)] for i in range(n)]\n\ndef kv_cache_gib(layers, kv_heads, head_dim, tokens, bytes_per=2):\n    return 2 * layers * kv_heads * head_dim * bytes_per * tokens / 2 ** 30",
  "hints": ["pi_position = pos * train_len / target_len.", "mask[i][j] = 1 iff j <= i and (j < sinks or i - j < window).", "Bytes per token = 2 * layers * kv_heads * head_dim * bytes_per; multiply by tokens and divide by 2**30."]
}
```

> [!TIP] Interview tips
> - Split the problem into three: position extrapolation (PI, NTK, YaRN), compute and memory (KV cache, FlashAttention, sliding window, ring attention), and usability (lost in the middle, effective length).
> - Say scaling only initialises; continued training on long data is what makes it work.
> - Give the RAG vs long-context trade-off: cost, latency, cross-document reasoning, citations and freshness.
