---
id: data-engineering-cap-theorem
title: CAP theorem
estimatedMinutes: 10
difficulty: medium
tags: [data-engineering, databases, distributed-systems]
---

## Why it matters
CAP is the standard vocabulary for distributed database tradeoffs. Interviewers check that you state it precisely (it's about behavior **during network partitions**) rather than "pick any two".

## Concept
For a distributed data store replicated across nodes:
- **C — Consistency** (linearizability): every read sees the most recent write, as if there were one copy.
- **A — Availability**: every request to a non-failed node gets a (non-error) response.
- **P — Partition tolerance**: the system keeps working despite network partitions (lost messages between nodes).

**CAP theorem**: when a **network partition** happens, a system must choose between **consistency** and **availability**. Partitions are unavoidable in real networks, so P isn't optional; the real choice is **CP vs AP during a partition**.
- **CP**: refuse or block requests that can't be served consistently (e.g. minority side rejects writes). Examples: systems built on consensus (ZooKeeper, etcd), HBase, Spanner, MongoDB with majority writes/reads.
- **AP**: keep serving on both sides, accept divergence, reconcile later (last-write-wins, vector clocks, CRDTs). Examples: Cassandra / DynamoDB-style systems with low consistency levels, DNS, shopping carts.

**PACELC** extends it: if Partition → choose A or C; Else (normal operation) → choose **Latency** or **Consistency**. Strong consistency costs latency even without failures (waiting for replicas or quorum).

**Quorums** (Dynamo-style): with N replicas, writes acknowledged by W and reads querying R. If **R + W > N**, every read overlaps the latest write's replicas (strongly consistent reads, barring edge cases). Lower R/W → faster and more available, but possibly stale.

## Worked example
Cassandra with N = 3: `QUORUM` writes (W = 2) and `QUORUM` reads (R = 2) give R + W = 4 > 3 → reads see the latest write; if 2 nodes are unreachable, requests fail (choosing C). With `ONE`/`ONE` (R + W = 2), the cluster stays available with one node, but reads may return stale data (choosing A).

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What does CAP actually say?",
  "options": ["Every system can have at most two of C, A, P at all times", "During a network partition, a distributed system must sacrifice either consistency or availability", "Partition tolerance is optional for most systems", "Consistency always means ACID"],
  "answer": 1,
  "explanation": "The tradeoff applies when a partition occurs; otherwise systems can be both consistent and available (PACELC covers latency then)."
}
```

```quiz
{
  "id": "q2",
  "question": "With N = 5 replicas, which (R, W) guarantees reads see the latest write?",
  "options": ["R=1, W=1", "R=2, W=2", "R=3, W=3", "R=1, W=3"],
  "answer": 2,
  "explanation": "R + W = 6 > 5, so read and write sets always overlap."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `is_strongly_consistent(n, r, w)` returning True if r + w > n. Write `available(n, r, w, alive)` returning a tuple `(can_read, can_write)` given the number of reachable replicas. Then simulate a quorum read: `quorum_read(replicas, r)` where replicas is a list of `(version, value)` from the first r responding replicas (use the first r items); return the value with the highest version.",
  "starterCode": "def is_strongly_consistent(n, r, w):\n    pass\n\ndef available(n, r, w, alive):\n    pass\n\ndef quorum_read(replicas, r):\n    pass\n",
  "tests": "assert is_strongly_consistent(3, 2, 2) is True\nassert is_strongly_consistent(3, 1, 1) is False\nassert available(3, 2, 2, 1) == (False, False)\nassert available(3, 1, 1, 1) == (True, True)\nassert available(5, 3, 3, 3) == (True, True)\nreps = [(4, 'old'), (5, 'new'), (4, 'old')]\nassert quorum_read(reps, 2) == 'new'\nassert quorum_read(reps, 1) == 'old'",
  "solution": "def is_strongly_consistent(n, r, w):\n    return r + w > n\n\ndef available(n, r, w, alive):\n    return (alive >= r, alive >= w)\n\ndef quorum_read(replicas, r):\n    return max(replicas[:r], key=lambda vv: vv[0])[1]",
  "hints": ["A read needs r live replicas; a write needs w.", "With r = 1 you might hit a stale replica."]
}
```

> [!TIP] Interview tips
> - State CAP precisely: during a partition, choose consistency or availability; P is not optional.
> - Give CP and AP examples and when each fits (payments vs carts/likes).
> - Mention PACELC (latency vs consistency in normal operation) and quorum math R + W > N.
