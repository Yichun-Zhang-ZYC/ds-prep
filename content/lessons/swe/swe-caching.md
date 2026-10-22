---
id: swe-caching
title: Caching (Redis)
estimatedMinutes: 12
difficulty: medium
tags: [caching, redis, backend, latency, ttl]
---

## Why it matters
Caching is the cheapest way to cut latency and database load, and the first thing interviewers reach for when you say "the endpoint is slow". Expect questions on cache-aside, invalidation, eviction and stampedes, and in ML serving, caching features and predictions.

## Concept
A **cache** stores the result of expensive work (a DB query, a feature lookup, a model prediction) in fast memory so repeat requests skip it. **Redis** is an in-memory key-value store with TTLs, atomic operations and rich types (strings, hashes, sets, sorted sets). Typical read latency is sub-millisecond versus tens of milliseconds for a database.

**Cache-aside (lazy loading)** is the default pattern: the app checks the cache, on a miss reads the source of truth, then populates the cache.

```python
import json

def get_user(uid, r, db, ttl=300):
    key = f"user:{uid}"
    cached = r.get(key)
    if cached is not None:
        return json.loads(cached)
    user = db.fetch_user(uid)          # source of truth
    r.set(key, json.dumps(user), ex=ttl)
    return user
```

**Other write strategies**:
- **Write-through**: write to cache and DB together. Reads are always fresh, writes are slower.
- **Write-back (write-behind)**: write to cache, flush to DB asynchronously. Fast writes, risk of data loss.
- **Read-through**: the cache layer itself loads from the DB on a miss.

**Invalidation** is the hard part. Options: a **TTL** (simple, bounded staleness), **explicit delete** on write (`DEL user:42`), or versioned keys (`user:42:v7`). Prefer delete over update-in-place on writes to avoid racing writers.

**Eviction** when memory is full: **LRU** (least recently used) is the common default, LFU favors frequently used keys, `allkeys-lru` or `volatile-ttl` are Redis `maxmemory-policy` settings.

**Failure modes**:
- **Stampede (thundering herd)**: a hot key expires and thousands of requests hit the DB at once. Fix with request coalescing or a lock, a jittered TTL, or refreshing early.
- **Penetration**: requests for keys that don't exist always miss. Cache negative results briefly or use a Bloom filter.
- **Staleness and inconsistency**: cache and DB can disagree; decide what staleness the product tolerates.

Hit ratio drives benefit: $T_{avg} = h\,T_{cache} + (1-h)(T_{cache} + T_{db})$.

## Worked example
A recommendations endpoint reads user features from Postgres in 50 ms. Redis lookup costs 1 ms. With hit ratio $h = 0.9$, a miss costs $1 + 50 = 51$ ms, so $T_{avg} = 0.9 \cdot 1 + 0.1 \cdot 51 = 6.0$ ms, an 8x speedup. The DB now sees 10% of the traffic: 1,000 req/s becomes 100 req/s. Pushing $h$ to 0.99 gives $0.99 + 0.51 = 1.5$ ms and 10 req/s on the DB. Setting a TTL of 300 s with up to 30 s random jitter spreads expirations so keys don't all expire together.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "In cache-aside, what happens on a cache miss?",
  "options": ["The request fails", "The app reads the database, then stores the result in the cache", "The cache reads the database on its own and the app waits for a callback", "The app writes to the cache and the database together"],
  "answer": 1,
  "explanation": "Cache-aside is app-driven: check cache, on miss load from the source of truth and populate the cache. The other options describe read-through or write-through."
}
```

```quiz
{
  "id": "q2",
  "question": "A popular key expires and the database is flooded by thousands of simultaneous identical queries. What is this and a good fix?",
  "options": ["Cache penetration; use a bigger cache", "Cache stampede; add TTL jitter, a per-key lock or request coalescing", "Eviction; switch to LFU", "Write-back failure; use write-through"],
  "answer": 1,
  "explanation": "This is a stampede (thundering herd). Let one request rebuild the value while others wait or serve stale data, and randomize TTLs."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `TTLCache(capacity, ttl, clock)`, an LRU cache whose entries expire. `clock()` returns the current time. `put(key, value)` stores the value expiring at `clock() + ttl` and marks it most recently used; if size exceeds `capacity`, evict the least recently used entry. `get(key)` returns the value or `None` if missing or expired (an entry is expired when `clock() >= expires_at`; delete it). A successful `get` marks the key most recently used.",
  "setup": "from collections import OrderedDict",
  "starterCode": "class TTLCache:\n    def __init__(self, capacity, ttl, clock):\n        pass\n\n    def get(self, key):\n        pass\n\n    def put(self, key, value):\n        pass\n\nt = [0]\nc = TTLCache(2, 10, lambda: t[0])\nc.put('a', 1)\nprint(c.get('a'))",
  "tests": "t = [0]\nc = TTLCache(2, 10, lambda: t[0])\nc.put('a', 1)\nc.put('b', 2)\nassert c.get('a') == 1\nc.put('c', 3)\nassert c.get('b') is None\nassert c.get('a') == 1 and c.get('c') == 3\nt[0] = 9\nassert c.get('a') == 1\nt[0] = 10\nassert c.get('a') is None\nassert c.get('zzz') is None\nc.put('c', 30)\nassert c.get('c') == 30\nt[0] = 19\nassert c.get('c') == 30\nt[0] = 20\nassert c.get('c') is None",
  "solution": "class TTLCache:\n    def __init__(self, capacity, ttl, clock):\n        self.capacity = capacity\n        self.ttl = ttl\n        self.clock = clock\n        self.d = OrderedDict()\n\n    def get(self, key):\n        item = self.d.get(key)\n        if item is None:\n            return None\n        value, exp = item\n        if self.clock() >= exp:\n            del self.d[key]\n            return None\n        self.d.move_to_end(key)\n        return value\n\n    def put(self, key, value):\n        if key in self.d:\n            del self.d[key]\n        self.d[key] = (value, self.clock() + self.ttl)\n        if len(self.d) > self.capacity:\n            self.d.popitem(last=False)",
  "hints": ["OrderedDict keeps insertion order; move_to_end marks a key as most recent and popitem(last=False) removes the oldest.", "Store (value, expires_at) tuples and check expiry lazily inside get."]
}
```

> [!TIP] Interview tips
> - Default answer: cache-aside with a TTL, delete (not update) on write. Then volunteer stampede, penetration and staleness.
> - Say what you cache and why it is safe: read-heavy, tolerant of slight staleness, expensive to compute (features, predictions, aggregates).
> - Redis is single-threaded for commands, so individual ops are atomic; use `SET key val NX EX` for simple locks, and mention persistence (RDB/AOF) is optional for a pure cache.
