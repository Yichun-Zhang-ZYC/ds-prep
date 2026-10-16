---
id: data-engineering-sharding-and-replication
title: Sharding & replication
estimatedMinutes: 12
difficulty: medium
tags: [data-engineering, databases, scaling, distributed-systems]
---

## Why it matters
"Your database can't keep up; how do you scale it?" Replication and sharding are the two answers, with different purposes. Interviewers expect you to explain both, choose shard keys, and discuss consistent hashing and replica lag.

## Concept
**Replication**: keep copies of the same data on multiple nodes.
- Goals: **high availability** (failover), **read scaling** (read replicas), geographic locality, durability.
- **Leader-follower (primary-replica)**: writes go to the leader; followers replay its log. **Synchronous** replication = no data loss on failover but higher write latency; **asynchronous** = fast, but followers lag and may serve **stale reads** (read-your-own-writes issues; route such reads to the leader).
- **Multi-leader** / **leaderless** (Dynamo, Cassandra): writes accepted at several nodes; needs conflict resolution and quorums.

**Sharding (horizontal partitioning)**: split data across nodes so each holds a subset of rows. Goal: scale **writes and storage** beyond one machine.
- **Range sharding** (by key ranges, e.g. user_id 1–1M): efficient range scans; risk of hotspots (all new IDs or recent timestamps hit one shard).
- **Hash sharding** (`hash(key) % N`): even spread, but range queries hit all shards, and changing N reshuffles almost everything.
- **Consistent hashing**: place nodes (with virtual nodes) on a hash ring; each key goes to the next node clockwise. Adding/removing a node moves only ~1/N of the keys.
- **Directory-based**: a lookup service maps keys to shards (flexible, extra hop).
- Shard key choice: high cardinality, even distribution, matches main access pattern (queries mostly hit one shard). Cross-shard joins/transactions are expensive; avoid them in the design.
- Problems: hot keys (celebrity users), rebalancing, global secondary indexes.

Sharding and replication are combined: each shard is replicated.

## Worked example
A users table with 2B rows: hash-shard by `user_id` across 16 shards, each a leader + 2 replicas. Profile reads go to replicas (stale by < 1 s is acceptable), writes to shard leaders. Moving from 16 to 20 shards with modulo hashing would move ~80% of the keys; with consistent hashing only ~20%.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What problem does replication solve that sharding doesn't?",
  "options": ["Storing more data than one machine can hold", "High availability and read scaling via copies of the same data", "Reducing write load per node", "Eliminating hot keys"],
  "answer": 1,
  "explanation": "Replication copies data; sharding splits it."
}
```

```quiz
{
  "id": "q2",
  "question": "Why use consistent hashing instead of hash(key) % N?",
  "options": ["It's more secure", "Adding or removing a node only remaps a small fraction of keys", "It supports SQL joins", "It removes the need for replication"],
  "answer": 1,
  "explanation": "With modulo, changing N remaps most keys; consistent hashing moves ~1/N."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `mod_shard(key, n)` = crc32(key) % n. Write a `HashRing(nodes, vnodes=50)` class: each node gets `vnodes` points at `crc32(f'{node}#{i}')`; `get(key)` returns the node owning the first point ≥ crc32(key), wrapping around (use `bisect`). Then write `moved_fraction(keys, before, after)` returning the fraction of keys whose assignment changed between two functions.",
  "starterCode": "import bisect, zlib\n\ndef h(s):\n    return zlib.crc32(s.encode())\n\ndef mod_shard(key, n):\n    pass\n\nclass HashRing:\n    def __init__(self, nodes, vnodes=50):\n        pass\n\n    def get(self, key):\n        pass\n\ndef moved_fraction(keys, before, after):\n    pass\n",
  "tests": "keys = [f'user{i}' for i in range(5000)]\nm = moved_fraction(keys, lambda k: mod_shard(k, 4), lambda k: mod_shard(k, 5))\nassert m > 0.7\nr4 = HashRing(['a', 'b', 'c', 'd'])\nr5 = HashRing(['a', 'b', 'c', 'd', 'e'])\nc = moved_fraction(keys, r4.get, r5.get)\nassert c < 0.35\nassert all(r4.get(k) in {'a', 'b', 'c', 'd'} for k in keys[:100])\nassert r4.get('user1') == r4.get('user1')\nmoved_to = {r5.get(k) for k in keys if r4.get(k) != r5.get(k)}\nassert moved_to == {'e'}",
  "solution": "import bisect, zlib\n\ndef h(s):\n    return zlib.crc32(s.encode())\n\ndef mod_shard(key, n):\n    return h(key) % n\n\nclass HashRing:\n    def __init__(self, nodes, vnodes=50):\n        self.points = sorted((h(f'{n}#{i}'), n) for n in nodes for i in range(vnodes))\n        self.hashes = [p for p, _ in self.points]\n\n    def get(self, key):\n        i = bisect.bisect_left(self.hashes, h(key)) % len(self.points)\n        return self.points[i][1]\n\ndef moved_fraction(keys, before, after):\n    return sum(1 for k in keys if before(k) != after(k)) / len(keys)",
  "hints": ["Sort ring points; bisect_left finds the first point ≥ the key hash.", "With a ring, only keys that now fall to the new node's points move."]
}
```

> [!TIP] Interview tips
> - Separate replication (availability, read scaling) from sharding (write/storage scaling), then combine them.
> - Discuss sync vs async replication, replica lag and read-your-writes.
> - Choose shard keys deliberately; explain range vs hash sharding, consistent hashing and hot keys.
