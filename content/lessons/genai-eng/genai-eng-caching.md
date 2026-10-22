---
id: genai-eng-caching
title: Caching
estimatedMinutes: 11
difficulty: medium
tags: [genai, caching, latency, cost, semantic-cache]
---

## Why it matters

Caching is the cheapest way to cut LLM cost and latency, and also an easy way to serve stale or wrong answers. Interviewers ask which layers you would cache, what the key is, and what can go wrong.


## Concept

Four layers, from the provider outward:

1. **Prompt (prefix) caching** (provider-side): the provider reuses the computed KV state for an identical **prefix** of the prompt. Cached input tokens are billed at a steep discount (roughly 10% of the normal input price on Anthropic; OpenAI applies automatic discounts on prompts of 1,024+ tokens), and time to first token drops. Anthropic charges a premium to *write* the cache (about 1.25x) and entries expire after a short TTL (about 5 minutes, refreshed on use). Check current provider docs for exact numbers. **Design for it**: put stable content first (system prompt, tool definitions, few-shot examples, long documents) and variable content last; any change early in the prefix invalidates everything after it.
2. **Exact-match response cache**: key = hash of (model, prompt version, normalized prompt, parameters). Only valid when output is deterministic enough to reuse (temperature 0 or a "good enough" answer) and not personalized. Cheap and safe.
3. **Semantic cache**: embed the query, return a stored answer if cosine similarity exceeds a threshold. Higher hit rate for paraphrases, but risks wrong hits ("cancel my order" vs "cancel my subscription"). Tune the threshold on labeled pairs, scope by tenant and context, and consider a verification step.
4. **Component caches**: embeddings per text hash, retrieval results, tool/API responses, and parsed documents. Often the biggest win in RAG pipelines.

**Invalidation**: TTL by content volatility; version in the key (prompt version, model, index version) so deploys automatically miss; explicit purge on source-data change; never cache across users when the answer depends on private data (include user or ACL scope in the key).

**Measure**: hit rate, latency saved, cost saved, and the **staleness/wrong-hit rate** from sampled hits judged for correctness. Also watch **cache stampedes** (many identical misses at once; use request coalescing/locks) and unbounded memory (LRU with a size cap).


## Worked example

An assistant has a 10,000-token system prompt and document context, and uses an illustrative input price of \$3 per million tokens. One call's input costs 10,000 × \$3 / 1,000,000 = \$0.03.

With prompt caching (write 1.25x, read 0.1x), over 100 calls within the TTL window:
- No caching: 100 × \$0.03 = \$3.00.
- First call writes the cache: 1.25 × \$0.03 = \$0.0375. The other 99 read it: 99 × 0.1 × \$0.03 = \$0.297. Total = \$0.3345.
- Savings: $1 - 0.3345/3.00 \approx 88.9\%$ of input cost (output tokens are unaffected).

Break-even: a write costs an extra 0.25 × \$0.03 and each read saves 0.9 × \$0.03, so the cache pays for itself after a single reuse within the TTL. If traffic is so sparse that entries expire between calls, you only pay the write premium.


## Check your understanding

```quiz
{
  "id": "q1",
  "question": "How should a prompt be laid out to benefit from provider prefix caching?",
  "options": [
    "User question first, then the system prompt",
    "Stable content first (system prompt, tools, examples, documents), variable user content last",
    "Randomize the order each call",
    "Put a timestamp at the top"
  ],
  "answer": 1,
  "explanation": "Only an identical prefix is reused. A changing token early in the prompt (like a timestamp) invalidates the cache for everything after it."
}
```

```quiz
{
  "id": "q2",
  "question": "What is the main risk of a semantic cache with a low similarity threshold?",
  "options": [
    "Higher embedding cost",
    "Returning a stored answer to a similar-looking but different question",
    "Lower hit rate",
    "Larger context window needed"
  ],
  "answer": 1,
  "explanation": "Near-duplicate wording can hide different intent, producing confident wrong answers. Tune the threshold on labeled pairs and scope the cache."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `cache_key(model, prompt, temperature)` returning a tuple with the prompt whitespace-normalized (`' '.join(prompt.split())`). Then implement `TTLCache(capacity, ttl, clock)` with `get`, `put` and `hit_rate`: an entry is valid while `clock() < expires`; expired entries count as misses and are removed; a hit marks the key most recently used; when size exceeds `capacity`, evict the least recently used. `hit_rate` is hits / (hits + misses), 0.0 if there were no lookups.",
  "starterCode": "from collections import OrderedDict\n\ndef cache_key(model, prompt, temperature):\n    # normalize whitespace so 'a  b' and 'a b' share a key\n    pass\n\nclass TTLCache:\n    def __init__(self, capacity, ttl, clock):\n        # clock() returns the current time (injected so tests are deterministic)\n        pass\n\n    def get(self, key):\n        # None on miss or expiry (entry valid while clock() < expires); a hit refreshes LRU order\n        pass\n\n    def put(self, key, value):\n        # expires = clock() + ttl; evict the least recently used when over capacity\n        pass\n\n    def hit_rate(self):\n        pass\n\nnow = [0]\nc = TTLCache(2, 10, lambda: now[0])\nc.put(\"a\", 1)\nprint(c.get(\"a\"), c.get(\"b\"), c.hit_rate())",
  "tests": "assert cache_key('m', 'hello   world\\n', 0) == cache_key('m', 'hello world', 0)\nassert cache_key('m', 'hello world', 0) != cache_key('m', 'hello world', 0.7)\nassert cache_key('m1', 'x', 0) != cache_key('m2', 'x', 0)\nt = [0]\nc = TTLCache(2, 10, lambda: t[0])\nassert c.hit_rate() == 0.0\nc.put('a', 1); c.put('b', 2)\nassert c.get('a') == 1\nc.put('c', 3)\nassert c.get('b') is None\nt[0] = 5\nassert c.get('c') == 3\nt[0] = 10\nassert c.get('a') is None\nassert c.get('c') is None\nassert c.hits == 2 and c.misses == 3\nassert abs(c.hit_rate() - 0.4) < 1e-12",
  "solution": "from collections import OrderedDict\n\ndef cache_key(model, prompt, temperature):\n    return (model, \" \".join(prompt.split()), temperature)\n\nclass TTLCache:\n    def __init__(self, capacity, ttl, clock):\n        self.capacity = capacity\n        self.ttl = ttl\n        self.clock = clock\n        self.data = OrderedDict()\n        self.hits = 0\n        self.misses = 0\n\n    def get(self, key):\n        item = self.data.get(key)\n        if item is not None:\n            value, expires = item\n            if self.clock() < expires:\n                self.data.move_to_end(key)\n                self.hits += 1\n                return value\n            del self.data[key]\n        self.misses += 1\n        return None\n\n    def put(self, key, value):\n        self.data[key] = (value, self.clock() + self.ttl)\n        self.data.move_to_end(key)\n        while len(self.data) > self.capacity:\n            self.data.popitem(last=False)\n\n    def hit_rate(self):\n        total = self.hits + self.misses\n        return self.hits / total if total else 0.0",
  "hints": [
    "`OrderedDict.move_to_end` and `popitem(last=False)` give you LRU in a few lines.",
    "Store `(value, expires)` and delete the entry when it is found expired, counting a miss."
  ]
}
```

> [!TIP] Interview tips
> - Walk the layers: provider prefix cache, exact response cache, semantic cache, component caches (embeddings, retrieval, tools).
> - For prefix caching, say 'static first, dynamic last' and show the savings arithmetic (read about 0.1x, write about 1.25x, short TTL).
> - Pitfall: cache keys must include model, prompt version and user/tenant scope; otherwise you serve stale or another user's answer. Mention measuring wrong-hit rate.
