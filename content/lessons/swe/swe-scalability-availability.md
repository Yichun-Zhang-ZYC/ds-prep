---
id: swe-scalability-availability
title: Scalability, availability
estimatedMinutes: 12
difficulty: medium
tags: [scalability, availability, sla, load-balancing, redundancy]
---

## Why it matters
Almost every system design question asks "how does this scale?" and "what if a node dies?". You need the vocabulary (vertical vs horizontal, stateless, replication, nines) and the arithmetic to back it up.

## Concept
**Scalability** is the ability to handle more load by adding resources. **Availability** is the fraction of time the system serves requests correctly. They are related but distinct: a system can scale and still go down.

**Scaling**:
- **Vertical** (scale up): a bigger machine. Simple, but has a ceiling and is a single point of failure.
- **Horizontal** (scale out): more machines behind a **load balancer** (round robin, least connections, consistent hashing). Requires **stateless** services: keep session and state in a shared store (Redis, DB) so any instance can serve any request.
- **Data layer**: **read replicas** for read-heavy load, **caching**, **sharding/partitioning** for write scale (pick a key that spreads load and avoids hot shards), CDNs for static content, queues to smooth bursts.
- Find the bottleneck first: measure CPU, memory, I/O, connections, then scale that.

**Availability** is measured in "nines": $A = \dfrac{\text{uptime}}{\text{uptime} + \text{downtime}}$. Downtime per year is $(1-A)\cdot 525{,}600$ minutes.

| A | Downtime / year |
|---|---|
| 99% | 3.65 days |
| 99.9% | 8.76 hours |
| 99.99% | 52.6 minutes |
| 99.999% | 5.26 minutes |

**Composition**:
- Components in **series** (all must work): $A = \prod A_i$. Dependencies reduce availability.
- **Redundant** components in parallel (any one suffices): $A = 1 - \prod (1 - A_i)$.

**Techniques**: redundancy across failure domains (instances, AZs, regions), health checks and automatic failover, replication (sync gives consistency, async gives speed but possible data loss), timeouts, retries with backoff and **circuit breakers**, graceful degradation, rolling and canary deploys.

**Related terms**: **SLI** (a measured indicator, e.g. success rate), **SLO** (the target, e.g. 99.9%), **SLA** (a contract with penalties). An **error budget** is $1 - \text{SLO}$. Also **RTO** (how fast you recover) and **RPO** (how much data you can lose). **Latency** is time per request, **throughput** is requests per second; watch p95/p99, not just averages.

```python
def availability_series(avails):
    out = 1.0
    for a in avails:
        out *= a
    return out
```

## Worked example
A model API calls a gateway (99.95%), the model server (99.9%) and a feature store (99.9%) in series: $0.9995 \cdot 0.999 \cdot 0.999 \approx 0.9975$, about 22 hours of downtime per year, worse than any component. Run two independent model-server replicas in different AZs: $1 - 0.001^2 = 0.999999$. New total $\approx 0.9995 \cdot 0.999999 \cdot 0.999 \approx 0.99850$, now limited by the gateway and feature store, which also need redundancy. Real failures are correlated (shared deploys, shared DB), so the parallel formula is optimistic.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What must be true of a service to scale it horizontally behind a load balancer?",
  "options": ["It must run on one very large machine", "It should be stateless, with shared state in an external store", "It must use sticky sessions", "It must avoid caching"],
  "answer": 1,
  "explanation": "Stateless instances are interchangeable, so you can add or remove them freely. State lives in a shared store such as Redis or a database."
}
```

```quiz
{
  "id": "q2",
  "question": "Three services in series each have 99.9% availability. Roughly what is the combined availability?",
  "options": ["99.9%", "99.97%", "99.7%", "97%"],
  "answer": 2,
  "explanation": "0.999^3 is about 0.997, so adding serial dependencies lowers availability."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `availability_series(avails)` (product), `availability_parallel(avails)` (1 minus the product of failure probabilities) and `downtime_minutes_per_year(a)` = (1 - a) * 525600.",
  "starterCode": "def availability_series(avails):\n    pass\n\ndef availability_parallel(avails):\n    pass\n\ndef downtime_minutes_per_year(a):\n    pass\n\nprint(availability_series([0.999] * 3))",
  "tests": "assert abs(availability_series([0.999] * 3) - 0.997002999) < 1e-9\nassert abs(availability_parallel([0.99, 0.99]) - 0.9999) < 1e-12\nassert abs(downtime_minutes_per_year(0.999) - 525.6) < 1e-6\nassert abs(downtime_minutes_per_year(0.9999) - 52.56) < 1e-6\nassert availability_series([]) == 1.0\nassert availability_parallel([0.5]) == 0.5\nassert abs(availability_series([0.9995, availability_parallel([0.999, 0.999]), 0.999]) - 0.9995 * 0.999999 * 0.999) < 1e-12",
  "solution": "def availability_series(avails):\n    out = 1.0\n    for a in avails:\n        out *= a\n    return out\n\ndef availability_parallel(avails):\n    fail = 1.0\n    for a in avails:\n        fail *= (1 - a)\n    return 1 - fail\n\ndef downtime_minutes_per_year(a):\n    return (1 - a) * 525600",
  "hints": ["For parallel, multiply the failure probabilities (1 - a_i) then subtract from 1.", "An empty series product is 1.0."]
}
```

> [!TIP] Interview tips
> - Structure the answer: identify the bottleneck, scale stateless tiers horizontally, then handle the data tier (replicas, cache, shards).
> - Quote numbers: nines to downtime, and mention that dependencies in series multiply down availability.
> - Name the trade-off: sync replication favors consistency, async favors latency (see CAP); also mention SLOs and error budgets when asked how you would measure reliability.
