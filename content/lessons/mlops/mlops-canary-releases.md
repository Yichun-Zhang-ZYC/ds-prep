---
id: mlops-canary-releases
title: Canary releases
estimatedMinutes: 11
difficulty: medium
tags: [mlops, deployment, canary, rollback]
---

## Why it matters
A canary limits the blast radius of a bad model by exposing it to a small share of real users first. Interviewers expect you to describe the traffic ramp, the metrics you compare, and the automatic rollback rule.

## Concept
In a **canary release** the new version serves a small slice of live traffic (1-5%) alongside the stable version, and the slice grows only while the canary looks healthy.

**Process**:
1. Deploy the candidate next to the baseline; route e.g. 5% of traffic to it.
2. **Compare canary vs baseline** on the same period: error rate, latency, resource use, **model metrics** (score distribution, null rate) and, as labels or outcomes arrive, **business metrics** (CTR, conversion, approval rate).
3. If healthy for a set duration and a **minimum sample size**, ramp up (5% → 25% → 50% → 100%); otherwise **automatically roll back** by sending traffic to the baseline.

**Design points**:
- **Sticky routing**: hash the user id so the same user always sees the same version (consistent experience, clean analysis). Route by hash bucket, not randomly per request.
- **Guardrail metrics** with explicit thresholds (e.g. canary error rate no more than 1.2x baseline); use statistical tests or sequential tests when the metric is noisy.
- **Minimum traffic**: a canary at 1% may need hours to gather enough requests; small samples give false alarms or false comfort.
- Keep baseline replicas running for instant rollback; make model and feature changes backward compatible.
- Tools: Argo Rollouts, Flagger, Istio/Envoy weighted routing, SageMaker deployment guardrails, Vertex AI traffic splitting.

**Canary vs A/B test**: a canary asks "is it safe?" (guardrails, short); an A/B test asks "is it better?" (powered, longer, randomised).

## Worked example
A new model gets 5% of traffic, about 4,000 requests in the first 30 minutes. Baseline error rate is 0.5%. The canary shows 36 errors, 0.9%. The rule says roll back above 1.2 x 0.5% = 0.6%, and the sample is above the 1,000-request minimum, so the controller **rolls back** automatically and pages the owner. Had the canary shown 0.55% at 4,000 requests it would have been promoted to 25%.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why route canary traffic by hashing the user id instead of randomly per request?",
  "options": ["It is faster", "Each user consistently sees one version, giving a stable experience and cleaner analysis", "It increases traffic", "It avoids monitoring"],
  "answer": 1,
  "explanation": "Sticky routing avoids flipping a user between versions and keeps per-user metrics interpretable."
}
```

```quiz
{
  "id": "q2",
  "question": "The canary has 20 requests so far and zero errors. What should the controller do?",
  "options": ["Promote to 100%", "Wait: the sample is too small to judge", "Roll back", "Disable the guardrail"],
  "answer": 1,
  "explanation": "Small samples cannot establish safety. Require a minimum sample and duration before deciding."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `route(user_id, pct)` returning True if the user is in the canary: use `zlib.crc32(str(user_id).encode()) % 100 < pct` so routing is sticky and a user in at 5% stays in at 25%. Implement `decide(baseline_err, canary_err, canary_n, min_n=1000, max_ratio=1.2)` returning `'wait'` if `canary_n < min_n`, `'rollback'` if `canary_err > baseline_err * max_ratio`, else `'promote'`.",
  "starterCode": "import zlib\n\ndef route(user_id, pct):\n    pass\n\ndef decide(baseline_err, canary_err, canary_n, min_n=1000, max_ratio=1.2):\n    pass\n",
  "tests": "users = list(range(5000))\nin5 = {u for u in users if route(u, 5)}\nin25 = {u for u in users if route(u, 25)}\nassert in5 <= in25\nassert abs(len(in25) / 5000 - 0.25) < 0.03\nassert abs(len(in5) / 5000 - 0.05) < 0.02\nassert all(route(u, 100) for u in users[:100])\nassert not any(route(u, 0) for u in users[:100])\nassert route('alice', 10) == route('alice', 10)\nassert decide(0.005, 0.009, 4000) == 'rollback'\nassert decide(0.005, 0.0055, 4000) == 'promote'\nassert decide(0.005, 0.5, 10) == 'wait'",
  "solution": "import zlib\n\ndef route(user_id, pct):\n    return zlib.crc32(str(user_id).encode()) % 100 < pct\n\ndef decide(baseline_err, canary_err, canary_n, min_n=1000, max_ratio=1.2):\n    if canary_n < min_n:\n        return 'wait'\n    if canary_err > baseline_err * max_ratio:\n        return 'rollback'\n    return 'promote'",
  "hints": ["A deterministic hash (not Python's salted hash()) keeps routing stable across processes.", "Check the sample size first: with too few requests, always wait."]
}
```

> [!TIP] Interview tips
> - Describe the ramp (e.g. 1% → 5% → 25% → 100%), the guardrail metrics and the automatic rollback rule.
> - Mention sticky hash routing and a minimum sample size so decisions are not made on noise.
> - Distinguish canary (safety check) from A/B test (is it better, powered and randomised).
