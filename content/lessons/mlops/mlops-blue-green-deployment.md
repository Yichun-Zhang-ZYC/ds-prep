---
id: mlops-blue-green-deployment
title: Blue-green deployment
estimatedMinutes: 9
difficulty: easy
tags: [mlops, deployment, blue-green, rollback]
---

## Why it matters
Blue-green gives you zero-downtime releases and a one-step rollback. It is the classic contrast to canary and shadow, and interviewers ask when you would pick it.

## Concept
Maintain **two identical production environments**:
- **Blue**: the live version serving all traffic.
- **Green**: the idle environment where you deploy and test the new version.

**Release flow**: deploy the new model to green → **warm up** (load weights, fill caches, run a few requests) → **smoke test** with synthetic or replayed traffic → **flip the router** (load balancer, DNS, K8s Service selector, ingress) so 100% of traffic goes to green → keep blue running for a while. To **roll back**, flip the router back to blue: seconds, no redeploy.

**Strengths**: instant, atomic cut-over and rollback; the new version is fully tested in a production-identical environment before any user sees it; no mixed versions serving at once.

**Costs and caveats**:
- **Double infrastructure** during the release (costly for GPU fleets); scale green down or recycle blue after the bake period.
- **All-at-once exposure**: unlike a canary, a problem that only appears under real traffic hits everyone until you flip back. Combine with a short canary phase if risk is high.
- **Shared state**: databases, feature stores and queues are usually shared. Schema or feature changes must be **backward compatible** (expand-then-contract) so both colors can run against them.
- **In-flight requests and sessions**: drain connections on blue before shutting it down; stateful sessions may need sticky handling.
- **Model-specific**: the model and its feature transformation code must ship together, and monitoring must be tagged by color/version.

**Choosing**: shadow validates safely with no exposure; canary limits exposure gradually; blue-green optimises for fast switch and rollback.

## Worked example
v1 runs on blue. The team deploys v2 to green, warms it up and replays 1,000 recorded requests (error rate 0%, p95 110 ms vs 105 ms on blue). They flip the load balancer to green at 14:00. At 14:07 the conversion rate drops 8%, so they flip back to blue in under a minute, with no redeploy, then investigate offline. Green is kept for debugging and blue stays warm for 24 hours before being recycled.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What is the main advantage of blue-green over a canary?",
  "options": ["Lower infrastructure cost", "Instant, atomic switch and rollback with a fully tested environment", "Gradual exposure to risk", "No need for monitoring"],
  "answer": 1,
  "explanation": "Blue-green cuts over and rolls back in one step; canary instead limits exposure gradually and costs less infrastructure."
}
```

```quiz
{
  "id": "q2",
  "question": "Why must database or feature-schema changes be backward compatible in a blue-green release?",
  "options": ["To save storage", "Both environments may run against the shared data store during cut-over and rollback", "The router requires it", "To speed up training"],
  "answer": 1,
  "explanation": "Rollback only works if the old version still understands the shared state the new version touched."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement a `BlueGreen` class. `BlueGreen(version)` starts with `blue` live running `version`, `green` empty. `idle` is the non-live color. `deploy(version)` puts the version on the idle environment and marks it unhealthy. `smoke_test(ok)` records health of the idle environment. `switch()` makes the idle environment live and returns its version, but raises `ValueError` if it has no version or is unhealthy. `rollback()` makes the previous (now idle) environment live again, raising `ValueError` if it is empty. `serve()` returns the live version.",
  "starterCode": "class BlueGreen:\n    def __init__(self, version):\n        pass\n\n    @property\n    def idle(self):\n        pass\n\n    def deploy(self, version):\n        pass\n\n    def smoke_test(self, ok):\n        pass\n\n    def switch(self):\n        pass\n\n    def rollback(self):\n        pass\n\n    def serve(self):\n        pass\n",
  "tests": "bg = BlueGreen('v1')\nassert bg.serve() == 'v1' and bg.idle == 'green'\ntry:\n    bg.switch()\n    raise AssertionError('empty idle must fail')\nexcept ValueError:\n    pass\nbg.deploy('v2')\ntry:\n    bg.switch()\n    raise AssertionError('untested must fail')\nexcept ValueError:\n    pass\nassert bg.serve() == 'v1'\nbg.smoke_test(True)\nassert bg.switch() == 'v2'\nassert bg.serve() == 'v2' and bg.idle == 'blue'\nassert bg.rollback() == 'v1' or bg.serve() == 'v1'\nassert bg.serve() == 'v1'\nbg.deploy('v3')\nassert bg.idle == 'green'\ntry:\n    bg.switch()\n    raise AssertionError('v3 untested must fail')\nexcept ValueError:\n    pass\nassert bg.serve() == 'v1'\nbg2 = BlueGreen('a')\ntry:\n    bg2.rollback()\n    raise AssertionError('nothing to roll back to')\nexcept ValueError:\n    pass",
  "solution": "class BlueGreen:\n    def __init__(self, version):\n        self.envs = {'blue': version, 'green': None}\n        self.healthy = {'blue': True, 'green': False}\n        self.live = 'blue'\n\n    @property\n    def idle(self):\n        return 'green' if self.live == 'blue' else 'blue'\n\n    def deploy(self, version):\n        self.envs[self.idle] = version\n        self.healthy[self.idle] = False\n\n    def smoke_test(self, ok):\n        self.healthy[self.idle] = bool(ok)\n\n    def switch(self):\n        if self.envs[self.idle] is None or not self.healthy[self.idle]:\n            raise ValueError('idle environment is not ready')\n        self.live = self.idle\n        return self.envs[self.live]\n\n    def rollback(self):\n        if self.envs[self.idle] is None:\n            raise ValueError('nothing to roll back to')\n        self.live = self.idle\n        return self.envs[self.live]\n\n    def serve(self):\n        return self.envs[self.live]",
  "hints": ["Store versions and health in dicts keyed by 'blue' / 'green', plus a `live` color.", "Rollback does not need a smoke test: the previous environment already served traffic."]
}
```

> [!TIP] Interview tips
> - Explain the flow: deploy to idle, warm up, smoke test, flip the router, keep the old color for rollback.
> - Name the costs: double infrastructure, all-at-once exposure, and shared-state compatibility (expand-contract).
> - Compare with canary (gradual exposure) and shadow (no exposure) and say when you would choose each.
