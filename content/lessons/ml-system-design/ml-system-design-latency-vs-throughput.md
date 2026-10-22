---
id: ml-system-design-latency-vs-throughput
title: Latency vs throughput
estimatedMinutes: 10
difficulty: medium
tags: [ml-system-design, serving, latency, throughput]
---

## Why it matters
Serving questions hide a trade-off: tuning for throughput (GPU efficiency) hurts latency (user experience), and averages hide the tail. Interviewers expect percentiles, Little's law and batching reasoning.

## Concept
**Latency** is time per request, reported as percentiles (p50, p95, p99), never just the mean. **Throughput** is requests (or tokens) per second. They trade off: batching raises throughput but adds waiting time.

Key ideas:
- **Tail latency** matters: with fan-out to $n$ services (feature lookups, shards), the chance at least one is slow is $1 - p^n$. With 100 calls each under their p99 with probability 0.99, only $0.99^{100} \approx 37\%$ of requests avoid every slow call. Mitigate with hedged requests, timeouts and budgets per stage.
- **Little's law**: concurrency $L = \lambda \cdot W$ (arrival rate × mean latency). It sizes thread pools, connections and replicas.
- **Queueing**: as utilization $\rho \to 1$, wait time blows up (roughly $\propto 1/(1-\rho)$). Keep 50-70% utilization at peak and autoscale.
- **Dynamic batching** (GPU serving): wait up to a few ms to group requests, run one batched forward pass. Tune max batch size and max wait. For LLMs, **continuous batching** schedules per token; track **time-to-first-token** and **tokens/s**.
- **Levers**: smaller/quantized/distilled models, caching, precomputed features, async I/O, model warm-up, regional deployment, early exit and cascades (cheap model first).

Always state an SLO ("p99 < 100 ms at 1,000 QPS") then pick the cheapest design meeting it.

## Worked example
A GPU runs one image in 10 ms (100/s). A batch of 8 takes 30 ms: throughput $8/0.03 \approx 267$/s ($2.7\times$), but a request now waits up to the 5 ms collection window plus 30 ms compute $\approx 35$ ms instead of 10 ms. If the SLO is p99 = 50 ms, batch size 8 is fine; if 20 ms, it is not.
Little's law: 500 QPS at 40 ms mean latency means $500 \times 0.04 = 20$ requests in flight, so a pool of fewer than 20 workers queues.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why report p99 rather than the mean latency?",
  "options": [
    "The mean is harder to compute",
    "A small fraction of slow requests dominates user pain and fan-out amplifies tails, but the mean hides them",
    "p99 is always lower than the mean",
    "Percentiles are required by Kubernetes"
  ],
  "answer": 1,
  "explanation": "Tail requests are what users and downstream timeouts notice; fan-out makes rare slow calls common."
}
```

```quiz
{
  "id": "q2",
  "question": "Dynamic batching on a GPU typically...",
  "options": [
    "Lowers both latency and throughput",
    "Raises throughput while adding some per-request latency",
    "Lowers throughput but cuts latency",
    "Only helps training"
  ],
  "answer": 1,
  "explanation": "Larger batches use the GPU more efficiently, at the cost of queueing/collection delay for each request."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `percentile(values, q)` using the nearest-rank method (sorted, index = ceil(q/100 × n) − 1). Implement `littles_law(qps, latency_s)` returning concurrency, `batch_throughput(batch_size, batch_latency_s)` returning items per second, and `p_any_slow(p_fast, n_calls)` = probability at least one of `n_calls` independent calls is slow.",
  "starterCode": "import math\n\ndef percentile(values, q):\n    pass\n\ndef littles_law(qps, latency_s):\n    pass\n\ndef batch_throughput(batch_size, batch_latency_s):\n    pass\n\ndef p_any_slow(p_fast, n_calls):\n    pass\n",
  "tests": "assert percentile(list(range(1, 101)), 99) == 99\nassert percentile([50, 10, 40, 20, 30], 50) == 30\nassert percentile([7], 99) == 7\nassert percentile([1, 2, 3, 4], 100) == 4\nassert abs(littles_law(500, 0.04) - 20) < 1e-9\nassert abs(batch_throughput(8, 0.03) - 266.6667) < 1e-3\nassert abs(p_any_slow(0.99, 100) - (1 - 0.99 ** 100)) < 1e-12\nassert abs(p_any_slow(0.99, 1) - 0.01) < 1e-12",
  "solution": "import math\n\ndef percentile(values, q):\n    s = sorted(values)\n    k = max(math.ceil(q / 100 * len(s)), 1)\n    return s[k - 1]\n\ndef littles_law(qps, latency_s):\n    return qps * latency_s\n\ndef batch_throughput(batch_size, batch_latency_s):\n    return batch_size / batch_latency_s\n\ndef p_any_slow(p_fast, n_calls):\n    return 1 - p_fast ** n_calls",
  "hints": [
    "Sort first; nearest-rank uses the ceil(q/100 × n)-th smallest value.",
    "P(all fast) = p_fast^n for independent calls."
  ]
}
```

> [!TIP] Interview tips
> - Always give an SLO with a percentile and load, not just 'low latency'.
> - Explain the batching trade-off (throughput vs added wait) and tail amplification under fan-out.
> - Use Little's law and utilization headroom for capacity; mention caching and model compression as latency levers.
