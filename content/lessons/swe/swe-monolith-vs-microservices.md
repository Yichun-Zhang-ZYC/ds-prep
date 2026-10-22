---
id: swe-monolith-vs-microservices
title: Monolith vs microservices
estimatedMinutes: 12
difficulty: medium
tags: [architecture, monolith, microservices, system-design, trade-offs]
---

## Why it matters
"Would you use microservices?" tests judgment, not buzzwords. The strong answer is a trade-off analysis tied to team size, scale and operational maturity, and the same question appears for ML platforms (one serving app vs separate feature, model and ranking services).

## Concept
A **monolith** is deployed as one unit: one codebase, one process (or identical replicas), usually one database. **Microservices** split the system into small, independently deployable services, each owning its data and communicating over the network (HTTP/gRPC or events).

**Monolith pros**: simple to develop, test, debug and deploy; in-process calls are fast and transactional (ACID across modules); low operational overhead. **Cons**: scaling is all-or-nothing, a bad deploy or memory leak affects everything, the codebase can become tangled, build and release times grow with team size, and one tech stack.

**Microservices pros**: independent deploy and scaling per service (scale the GPU inference service, not the admin UI), team autonomy, fault isolation, polyglot freedom (a Python model service beside a Go gateway). **Cons**:
- **Distributed-systems cost**: network latency, partial failure, timeouts, retries, and cascading failures.
- **Data consistency**: no cross-service ACID transactions; use sagas and eventual consistency, and "database per service" makes joins hard.
- **Operational overhead**: service discovery, observability (tracing, metrics, logs), CI/CD per service, versioned contracts, on-call.
- **Testing** end to end is harder.

Availability multiplies: $n$ synchronous dependencies each at $a$ give $a^n$. A chain of 10 services at 99.9% is $0.999^{10} \approx 99.0\%$.

**Middle path**: a **modular monolith** with strict module boundaries and one deployable. Split a service out only when there is a reason: a different scaling profile (GPU model serving), different release cadence, a team boundary, or isolation of a risky component. A common rule: start with a monolith, extract services when pain demands it (the **strangler fig** pattern migrates incrementally).

**Communication**: synchronous (REST/gRPC) is simple but couples availability; asynchronous events (queues/Kafka) decouple but add complexity. Use an **API gateway** at the edge, timeouts, retries with backoff and circuit breakers between services.

**Anti-patterns**: a **distributed monolith** (services that must deploy together or share a DB), and too-fine "nano-services".

```python
# in-process call (monolith): microseconds, shares a transaction
price = pricing.quote(order)
# microservice call: network, can fail or time out
price = http.post("http://pricing/quote", json=order, timeout=0.2)
```

## Worked example
A startup has 6 engineers and an app with web UI, an orders module and a recommendation model. Choice: a modular monolith on a shared Postgres. Cost: one pipeline, simple transactions for checkout. Two years later, the recommender needs GPUs and 10x the scale, and a 40-person org struggles with release conflicts. Extract the recommender as a service (sync gRPC for `GET /recs` with a 100 ms timeout and a fallback to popular items) and keep orders in the monolith. Each hop adds about 1-5 ms, and a failed recommender no longer blocks checkout because of the fallback.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A 5-person team is building a new product with unclear requirements. Which is the most defensible starting point?",
  "options": ["Microservices from day one for scalability", "A modular monolith, extracting services later if needed", "One service per database table", "Serverless functions for everything"],
  "answer": 1,
  "explanation": "Small teams and uncertain boundaries favor a modular monolith. Premature microservices add distributed-systems overhead without the benefit."
}
```

```quiz
{
  "id": "q2",
  "question": "Which is a genuine reason to extract a component into its own service?",
  "options": ["It is written in a different file", "It has very different scaling or hardware needs, such as GPU inference", "Microservices are modern", "To avoid writing tests"],
  "answer": 1,
  "explanation": "Different scaling profile, release cadence, team ownership or isolation needs justify the extra cost of a network boundary."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Model a service dependency graph as a dict `service -> list of services it calls`. Write `affected_by(graph, failed)` returning a sorted list of all services that would be affected if `failed` goes down, meaning those that directly or transitively depend on it (excluding `failed` itself). Handle cycles without looping forever. Also write `chain_availability(a, n)` = a ** n.",
  "starterCode": "def affected_by(graph, failed):\n    pass\n\ndef chain_availability(a, n):\n    pass\n\ng = {'web': ['orders', 'users'], 'orders': ['db', 'payments'], 'users': ['db'], 'payments': [], 'db': []}\nprint(affected_by(g, 'db'))",
  "tests": "g = {'web': ['orders', 'users'], 'orders': ['db', 'payments'], 'users': ['db'], 'payments': [], 'db': []}\nassert affected_by(g, 'db') == ['orders', 'users', 'web']\nassert affected_by(g, 'payments') == ['orders', 'web']\nassert affected_by(g, 'web') == []\nc = {'a': ['b'], 'b': ['a']}\nassert affected_by(c, 'a') == ['b']\nassert abs(chain_availability(0.999, 10) - 0.990045) < 1e-6",
  "solution": "def affected_by(graph, failed):\n    hit = set()\n    changed = True\n    while changed:\n        changed = False\n        for svc, deps in graph.items():\n            if svc == failed or svc in hit:\n                continue\n            if failed in deps or any(d in hit for d in deps):\n                hit.add(svc)\n                changed = True\n    return sorted(hit)\n\ndef chain_availability(a, n):\n    return a ** n",
  "hints": ["Repeat: add any service that calls the failed service or an already-affected service, until nothing changes.", "Skip the failed service itself so cycles don't add it."]
}
```

> [!TIP] Interview tips
> - Never answer "microservices are better". Say "it depends" and name the factors: team size, scaling profile, domain boundaries, operational maturity.
> - Mention the modular-monolith middle ground and the distributed-monolith anti-pattern.
> - For ML systems, a typical split is serving/inference separated from the product backend, justified by GPU needs and different release cadence.
