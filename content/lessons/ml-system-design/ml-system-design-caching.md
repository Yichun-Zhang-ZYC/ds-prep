---
id: ml-system-design-caching
title: Caching
estimatedMinutes: 10
difficulty: medium
tags: [ml-system-design, caching, serving, latency]
---

## Why it matters
Caching is the cheapest way to cut latency and GPU cost, and it appears in every serving design: feature lookups, embeddings, predictions, and now LLM responses. Interviewers want to hear what to cache, hit-rate math and invalidation.

## Concept
**What to cache** (from cheapest to most reuse-limited):
- **Features / embeddings** per entity (user, item): slow-changing, shared across many requests.
- **Model outputs** keyed by input (or a hash): for popular queries, items, or precomputed top-N lists.
- **Retrieval results** (ANN candidates, search result pages), **LLM prompt prefixes** (provider prompt caching reuses the KV cache of a shared prefix) and **semantic caches** (embed the query, return a stored answer if similarity exceeds a threshold).

**Layers**: client/CDN $\to$ in-process (local LRU, microseconds) $\to$ distributed (Redis/Memcached, ~1 ms) $\to$ model.

**Core math**: with hit rate $h$, hit latency $t_h$ and miss latency $t_m$: expected latency $= h\,t_h + (1-h)\,t_m$, and model load falls by a factor $(1-h)$. Hit rate depends on key skew (Zipf traffic caches well) and cache size.

**Policies**: **TTL** (bounded staleness), **LRU/LFU** eviction, write-through or cache-aside, **negative caching** for missing keys.

**Pitfalls**:
- **Staleness / invalidation**: include a **model version** and feature version in the key; invalidate on deploy; choose TTLs from how fast the data changes.
- **Cache stampede**: a hot key expires and thousands of requests hit the model at once. Use request coalescing, jittered TTLs, and refresh-ahead.
- **Personalization kills hit rate**: cache the shared, expensive part (candidates, embeddings), not the final per-user page.
- **Privacy**: never serve one user's cached result to another; semantic caches need a scope key (tenant/user) and a conservative threshold.

## Worked example
A ranking model costs 50 ms; a Redis hit costs 2 ms. With hit rate $h = 0.8$, expected latency $= 0.8 \times 2 + 0.2 \times 50 = 11.6$ ms (vs 50 ms), and the model sees only 20% of traffic: 1,000 QPS becomes 200 QPS, cutting GPUs by about 5x.
If a deploy changes the model but keys lack a version, you serve old-model scores until TTL expiry. Keying with `model_v7` makes the cutover clean, at the price of a cold cache (hit rate near 0, so pre-warm or ramp traffic).

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why include the model version in a prediction-cache key?",
  "options": [
    "To shorten keys",
    "So a new model never serves stale outputs computed by the old model",
    "To raise the hit rate",
    "It is required by Redis"
  ],
  "answer": 1,
  "explanation": "Without versioning, deploys leave stale predictions in the cache until they expire."
}
```

```quiz
{
  "id": "q2",
  "question": "A hot key expires and thousands of requests simultaneously recompute it. This is called...",
  "options": [
    "Cache warming",
    "A cache stampede (thundering herd)",
    "Negative caching",
    "Write-through"
  ],
  "answer": 1,
  "explanation": "Mitigate with request coalescing, jittered TTLs, locks, or refresh-ahead."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `expected_latency(hit_rate, hit_ms, miss_ms)` and `model_qps(total_qps, hit_rate)` (load that reaches the model). Then implement class `LRUCache(capacity)` with `get(key)` (returns the value or `None`, and marks the key most recently used) and `put(key, value)` (inserts/updates, evicting the least recently used key when over capacity).",
  "starterCode": "from collections import OrderedDict\n\ndef expected_latency(hit_rate, hit_ms, miss_ms):\n    pass\n\ndef model_qps(total_qps, hit_rate):\n    pass\n\nclass LRUCache:\n    def __init__(self, capacity):\n        pass\n\n    def get(self, key):\n        pass\n\n    def put(self, key, value):\n        pass\n",
  "tests": "assert abs(expected_latency(0.8, 2, 50) - 11.6) < 1e-9\nassert expected_latency(1.0, 2, 50) == 2\nassert abs(model_qps(1000, 0.8) - 200) < 1e-9\nc = LRUCache(2)\nc.put('a', 1)\nc.put('b', 2)\nassert c.get('a') == 1\nc.put('c', 3)\nassert c.get('b') is None\nassert c.get('a') == 1 and c.get('c') == 3\nc.put('a', 10)\nc.put('d', 4)\nassert c.get('c') is None\nassert c.get('a') == 10 and c.get('d') == 4",
  "solution": "from collections import OrderedDict\n\ndef expected_latency(hit_rate, hit_ms, miss_ms):\n    return hit_rate * hit_ms + (1 - hit_rate) * miss_ms\n\ndef model_qps(total_qps, hit_rate):\n    return total_qps * (1 - hit_rate)\n\nclass LRUCache:\n    def __init__(self, capacity):\n        self.capacity = capacity\n        self.data = OrderedDict()\n\n    def get(self, key):\n        if key not in self.data:\n            return None\n        self.data.move_to_end(key)\n        return self.data[key]\n\n    def put(self, key, value):\n        if key in self.data:\n            self.data.move_to_end(key)\n        self.data[key] = value\n        if len(self.data) > self.capacity:\n            self.data.popitem(last=False)",
  "hints": [
    "OrderedDict.move_to_end marks a key most recent; popitem(last=False) removes the oldest.",
    "A put on an existing key also counts as a use."
  ]
}
```

> [!TIP] Interview tips
> - State what you cache (embeddings, features, predictions, retrieval results) and the key, including model version.
> - Quantify with hit-rate math: expected latency and load reduction.
> - Cover invalidation/TTL, stampedes, and the privacy/personalization limits of caching.
