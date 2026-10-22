---
id: cloud-devops-load-balancers-reverse-proxies
title: Load balancers, reverse proxies
estimatedMinutes: 11
difficulty: medium
tags: [cloud-devops, networking, load-balancer, reverse-proxy]
---

## Why it matters
Every scalable service sits behind a load balancer or reverse proxy, including model-serving endpoints. Interviewers ask how traffic is spread, how failures are detected and what changes between L4 and L7.

## Concept
A **reverse proxy** accepts client requests and forwards them to backend servers; clients never see the backends. A **load balancer (LB)** is a reverse proxy whose main job is spreading load across several backends. Nginx, HAProxy, Envoy, AWS ALB/NLB and GCP Cloud Load Balancing are common.

**L4 vs L7**:
- **L4 (transport)**: routes TCP/UDP connections by IP and port, without reading the payload. Very fast, protocol-agnostic (AWS NLB).
- **L7 (application)**: understands HTTP, so it can route by host, path or header, terminate TLS, rewrite, cache, compress and do canary splits (AWS ALB, Nginx, Envoy).

**Algorithms**:
- **Round robin / weighted round robin**: rotate through backends; weights favour bigger machines.
- **Least connections**: pick the backend with the fewest active connections; better when request durations vary.
- **IP / consistent hash**: the same client or key maps to the same backend (session affinity, cache locality); consistent hashing limits remapping when backends change.

**Health checks** remove unhealthy backends: *active* (LB probes `/healthz` every few seconds) and *passive* (LB ejects backends returning errors). Separate **liveness** (restart me) from **readiness** (send me traffic).

**Other jobs**: TLS termination, connection draining on deploys, rate limiting, and `X-Forwarded-For` to pass the client IP. Prefer **stateless** services; sticky sessions hurt balance and failover. The LB itself must not be a single point of failure (multiple nodes, anycast or DNS in front).

```nginx
upstream api {
    least_conn;
    server 10.0.1.10:8000 max_fails=3 fail_timeout=10s;
    server 10.0.1.11:8000;
}
server {
    listen 443 ssl;
    location /api/ { proxy_pass http://api; }
}
```

## Worked example
Three backends A, B, C serve a model API. With round robin, 9 requests go A, B, C, A, B, C, A, B, C: 3 each. Now B fails its health check. The next 6 requests rotate over A and C only: 3 each, and the surviving servers each go from 33% to 50% of traffic. If capacity per server was sized for 40% utilisation at 3 servers, it is now 60%, which is why you provision **N+1** headroom. With least connections, if a slow request leaves A holding 5 open connections while C holds 1, new requests go to C until the counts even out.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which load-balancing algorithm is usually best when request durations vary widely?",
  "options": [
    "Round robin",
    "Least connections",
    "Random",
    "Alphabetical order"
  ],
  "answer": 1,
  "explanation": "Round robin ignores how busy each backend is. Least connections sends new work to the backend with the fewest in-flight requests, which adapts to slow requests."
}
```

```quiz
{
  "id": "q2",
  "question": "Why can an L7 load balancer do path-based routing but an L4 one cannot?",
  "options": [
    "L7 is always faster",
    "L7 parses HTTP, while L4 only sees IPs and ports",
    "L4 does not support TCP",
    "L7 does not need health checks"
  ],
  "answer": 1,
  "explanation": "L4 forwards connections without reading the payload. L7 understands HTTP, so it can route on host, path or headers."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement a `LB` class. `LB(backends)` keeps a round-robin pointer and a set of healthy backends (all healthy at first). `mark_down(b)` / `mark_up(b)` update health. `pick_rr()` returns the next healthy backend in list order, skipping unhealthy ones, or `None` if all are down. `pick_least_conn(conns)` takes a dict `{backend: active_connections}` and returns the healthy backend with the fewest connections (ties go to the earlier backend in the list), or `None`.",
  "starterCode": "class LB:\n    def __init__(self, backends):\n        pass\n\n    def mark_down(self, b):\n        pass\n\n    def mark_up(self, b):\n        pass\n\n    def pick_rr(self):\n        pass\n\n    def pick_least_conn(self, conns):\n        pass\n",
  "tests": "lb = LB(['a', 'b', 'c'])\nassert [lb.pick_rr() for _ in range(4)] == ['a', 'b', 'c', 'a']\nlb.mark_down('b')\nassert [lb.pick_rr() for _ in range(3)] == ['c', 'a', 'c']\nassert lb.pick_least_conn({'a': 5, 'b': 0, 'c': 1}) == 'c'\nassert lb.pick_least_conn({'a': 2, 'b': 9, 'c': 2}) == 'a'\nlb.mark_up('b')\nassert lb.pick_least_conn({'a': 5, 'b': 0, 'c': 1}) == 'b'\nfor x in 'abc':\n    lb.mark_down(x)\nassert lb.pick_rr() is None\nassert lb.pick_least_conn({'a': 0, 'b': 0, 'c': 0}) is None",
  "solution": "class LB:\n    def __init__(self, backends):\n        self.backends = list(backends)\n        self.healthy = set(backends)\n        self.i = 0\n\n    def mark_down(self, b):\n        self.healthy.discard(b)\n\n    def mark_up(self, b):\n        self.healthy.add(b)\n\n    def pick_rr(self):\n        n = len(self.backends)\n        for _ in range(n):\n            b = self.backends[self.i % n]\n            self.i += 1\n            if b in self.healthy:\n                return b\n        return None\n\n    def pick_least_conn(self, conns):\n        best = None\n        for b in self.backends:\n            if b in self.healthy and (best is None or conns[b] < conns[best]):\n                best = b\n        return best",
  "hints": [
    "For round robin, try at most len(backends) positions, advancing the pointer each time.",
    "Iterate backends in list order and only replace the best on a strictly smaller count to keep the tie rule."
  ]
}
```

> [!TIP] Interview tips
> - Say L4 vs L7 and what each can route on; name a concrete tool (ALB, Nginx, Envoy).
> - Explain health checks, connection draining and N+1 capacity so a failed node does not cascade.
> - Pitfall: sticky sessions and in-memory state; push state to Redis or a database so any backend can serve any request.
