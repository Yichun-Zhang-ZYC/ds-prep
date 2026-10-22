---
id: nlp-llms-inference-serving
title: Inference serving (vLLM, batching)
estimatedMinutes: 12
difficulty: hard
tags: [nlp, llm, inference, serving, vllm, batching]
---

## Why it matters
Serving cost often dwarfs training cost. Interviewers probe whether you know why decoding is memory-bound, how continuous batching and PagedAttention raise throughput, and the latency vs throughput trade-off.

## Concept
**Two phases per request**:
- **Prefill**: process the whole prompt in parallel and build the KV cache. Compute-bound. Determines **TTFT** (time to first token).
- **Decode**: generate one token per step, reading all weights and the KV cache each time. **Memory-bandwidth-bound**. Determines **TPOT / ITL** (time per output token).

**Metrics**: TTFT, TPOT, end-to-end latency (p50/p99), throughput (tokens/s per GPU), cost per million tokens. Larger batches raise throughput because weights are read once per step for all sequences, but queueing and per-step time raise latency.

**Batching**:
- **Static batching**: wait for a batch, run until the *longest* sequence finishes; finished slots idle.
- **Continuous (in-flight, iteration-level) batching**: after every decode step, evict finished sequences and admit new ones. Much higher GPU utilisation under variable output lengths.
- **Chunked prefill**: split long prompts into chunks mixed with decode steps so they do not stall running requests.

**Memory management**:
- Naive servers reserve contiguous KV space for the maximum length, wasting 60-80% to fragmentation and over-reservation.
- **PagedAttention (vLLM)**: store KV in fixed-size blocks (e.g. 16 tokens) addressed by a per-sequence block table, like OS virtual memory. Waste falls to a few percent, so more concurrent sequences fit. Blocks can be shared for **prefix caching** (common system prompts) and copy-on-write for parallel sampling or beam search.

**Other levers**: FlashAttention kernels, quantization (weights and KV), **speculative decoding** (a small draft model proposes tokens, the big model verifies several at once, output distribution unchanged), tensor/pipeline parallelism for models that exceed one GPU, and request routing or autoscaling. Engines: vLLM, TensorRT-LLM, SGLang, TGI.

## Worked example
A 7B fp16 model has 14 GB of weights. On a GPU with 2 TB/s memory bandwidth, one decode step must read at least 14 GB: $14 / 2000 = 7$ ms, so about 143 tokens/s for one sequence.

With 30 sequences in a batch the weights are still read once per step (KV reads add a little), so throughput is roughly $30 / 0.007 \approx 4{,}300$ tokens/s, about 30x, while each user still sees about 7 ms per token. Batch size is capped by KV memory: with 0.5 MB per token, a 4k-token sequence uses 2 GB, so an 80 GB card with 14 GB of weights holds about $(80 - 14)/2 \approx 33$ sequences, and PagedAttention is what lets you actually reach that bound.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why does increasing batch size raise decode throughput with little increase in per-step time (at moderate sizes)?",
  "options": [
    "Decode is memory-bound: weights are read once per step regardless of how many sequences share the step",
    "Larger batches use fewer parameters",
    "Attention becomes O(1)",
    "Prefill is skipped"
  ],
  "answer": 0,
  "explanation": "Each step's cost is dominated by streaming the weights from memory. Sharing that read across more sequences multiplies tokens per second until compute or KV memory becomes the limit."
}
```

```quiz
{
  "id": "q2",
  "question": "What problem does PagedAttention solve?",
  "options": [
    "Slow tokenization",
    "KV-cache fragmentation and over-reservation, which limit how many sequences fit in memory",
    "Exploding gradients",
    "Inaccurate softmax"
  ],
  "answer": 1,
  "explanation": "Storing KV in fixed-size blocks looked up through a block table avoids reserving contiguous max-length buffers, so more sequences run concurrently and prefixes can be shared."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Each request needs `lengths[i]` decode steps. Implement `static_batch_steps(lengths, batch_size)`: requests are grouped in order into batches of `batch_size` and each batch runs until its longest request finishes. Implement `continuous_batch_steps(lengths, batch_size)`: there are `batch_size` slots and a finished request's slot is immediately refilled with the next waiting request. Both return the total number of decode steps until everything finishes.",
  "starterCode": "import heapq\n\ndef static_batch_steps(lengths, batch_size):\n    pass\n\ndef continuous_batch_steps(lengths, batch_size):\n    pass\n\nprint(static_batch_steps([2, 8, 3, 3], 2), continuous_batch_steps([2, 8, 3, 3], 2))",
  "tests": "L = [2, 8, 3, 3]\nassert static_batch_steps(L, 2) == 11\nassert continuous_batch_steps(L, 2) == 8\nassert static_batch_steps([], 4) == 0\nassert continuous_batch_steps([], 4) == 0\nassert continuous_batch_steps([5], 4) == 5\nassert static_batch_steps([1, 1, 1, 1], 4) == 1\nassert continuous_batch_steps([10, 1, 1, 1, 1], 2) == 10\nassert static_batch_steps([10, 1, 1, 1, 1], 2) == 12\nimport random\nrng = random.Random(0)\nfor _ in range(20):\n    ls = [rng.randint(1, 20) for _ in range(rng.randint(1, 15))]\n    b = rng.randint(1, 5)\n    assert continuous_batch_steps(ls, b) <= static_batch_steps(ls, b)\n    assert continuous_batch_steps(ls, b) >= max(max(ls), -(-sum(ls) // b))",
  "solution": "import heapq\n\ndef static_batch_steps(lengths, batch_size):\n    total = 0\n    for i in range(0, len(lengths), batch_size):\n        total += max(lengths[i:i + batch_size])\n    return total\n\ndef continuous_batch_steps(lengths, batch_size):\n    free_at = [0] * min(batch_size, len(lengths))\n    heapq.heapify(free_at)\n    end = 0\n    for n in lengths:\n        start = heapq.heappop(free_at)\n        finish = start + n\n        end = max(end, finish)\n        heapq.heappush(free_at, finish)\n    return end",
  "hints": [
    "Static: sum of max(group) over consecutive groups.",
    "Continuous: keep a min-heap of slot free times; each request starts at the earliest free slot; the answer is the latest finish time."
  ]
}
```

> [!TIP] Interview tips
> - Split prefill (compute-bound, TTFT) from decode (memory-bound, TPOT) and tie batching to the latter.
> - Explain continuous batching and PagedAttention in one sentence each, with the problem they solve.
> - Always mention the latency vs throughput trade-off and name TTFT and p99 as the user-facing metrics.
