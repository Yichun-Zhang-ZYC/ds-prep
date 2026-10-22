---
id: ml-system-design-serving-and-deployment
title: Serving & deployment
estimatedMinutes: 12
difficulty: medium
tags: [ml-system-design, framework, serving, deployment]
---

## Why it matters
A model that is not served reliably is worth nothing. Interviewers ask how you package, release and roll back models, how you size the serving fleet, and how you split a latency budget across a multi-stage pipeline.

## Concept
**Pipeline from training to production**
1. **Package**: a versioned artifact (weights, preprocessing, feature schema) in a **model registry**, built into a container with pinned dependencies. Same transformation code for training and serving.
2. **Serve**: a model server (Triton, TorchServe, TF Serving, vLLM for LLMs, or a plain REST/gRPC service) behind a load balancer, with batching, autoscaling and health checks. Optimise with quantization, ONNX/TensorRT, and dynamic batching.
3. **Release safely**
   - **Shadow**: new model gets live traffic but its output is only logged; checks latency, errors, score distributions.
   - **Canary**: 1-5% of real traffic, auto-compare guardrails against the control, promote or roll back.
   - **A/B test** for business impact, then full rollout. **Blue/green**: switch traffic between two full stacks for instant rollback.
   - Always keep the previous version warm and a one-step **rollback**.
4. **Reliability**: timeouts, retries with backoff, circuit breakers, and a **fallback** (cached result, popularity list, rule-based model) when the model or feature store is slow.

**Latency budget**: split the end-to-end SLO across stages (network, feature fetch, retrieval, ranking, post-processing), and size for the **tail** (p95/p99), not the mean. Use parallel feature fetches and caching to stay inside it.

**Capacity planning**:
$$\text{replicas} = \left\lceil \frac{\text{peak QPS}}{\text{QPS per replica} \times \text{target utilisation}} \right\rceil + \text{spare}.$$
Target utilisation of 50-70% leaves headroom for bursts and p99; add N+1 (or zone) redundancy. GPU instances are costly, so batch requests and share models.

**Online vs offline serving**: precompute for stable, low-cardinality predictions (batch scoring to a key-value store); compute online when inputs are fresh or the input space is huge. (The next lessons cover this trade-off in depth.)

Also plan **CI/CD for ML** (tests on data/schema, model validation gates before promotion), **versioning of data + code + model**, and **monitoring hooks** for the next lesson.

## Worked example
Ranking service: peak 2,000 QPS. One replica sustains 250 QPS at the p99 SLO, and we run at 60% target utilisation.
- Replicas $= \lceil 2000/(250 \times 0.6) \rceil = \lceil 13.33 \rceil = 14$; plus 1 spare gives **15**.
- At \$0.50 per replica-hour: $15 \times 0.5 \times 24 \times 30 = \$5{,}400$ per month.

Latency budget for a 200 ms p99 SLO: network 20 ms, feature fetch 40 ms, candidate retrieval 50 ms, ranking 60 ms. The sum is 170 ms, leaving 30 ms of slack for serialisation and jitter.

Rollout: shadow for 1 day, canary at 5% for 2 hours (auto-rollback if error rate rises more than 0.2 pp or p99 exceeds 200 ms), then A/B at 50%, then 100% with the old version kept warm for 24 h.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What is the main purpose of a shadow deployment?",
  "options": ["Serve the new model's predictions to a small share of users", "Run the new model on live traffic without affecting users, to compare outputs, latency and errors", "Reduce training cost", "Replace A/B testing"],
  "answer": 1,
  "explanation": "Shadow mode logs the new model's output while users still get the old model's, so risk is zero."
}
```

```quiz
{
  "id": "q2",
  "question": "Why size an inference fleet at 50-70% utilisation at peak instead of 95%?",
  "options": ["Models run faster at low utilisation only in the cloud", "Headroom absorbs traffic bursts and keeps p99 latency within the SLO", "It is required by Kubernetes", "To reduce model size"],
  "answer": 1,
  "explanation": "Queueing delay grows sharply near saturation, so tail latency blows up without headroom."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `replicas_needed(peak_qps, qps_per_replica, target_util, spare=1)` = ceil(peak / (per_replica × util)) + spare. Write `latency_slack(slo_ms, stages)` where `stages` maps stage name → ms; return SLO minus the sum (negative means over budget). Write `canary_decision(base_err, canary_err, canary_n, min_n=1000, max_increase=0.002)`: return `'rollback'` if the canary error rate exceeds the baseline by more than `max_increase` (absolute); otherwise `'wait'` if `canary_n < min_n`; otherwise `'promote'`.",
  "starterCode": "import math\n\ndef replicas_needed(peak_qps, qps_per_replica, target_util, spare=1):\n    pass\n\ndef latency_slack(slo_ms, stages):\n    pass\n\ndef canary_decision(base_err, canary_err, canary_n, min_n=1000, max_increase=0.002):\n    pass\n",
  "tests": "assert replicas_needed(2000, 250, 0.6) == 15\nassert replicas_needed(2000, 250, 0.6, spare=0) == 14\nassert replicas_needed(100, 250, 0.5, spare=1) == 2\nassert latency_slack(200, {'net': 20, 'feat': 40, 'retr': 50, 'rank': 60}) == 30\nassert latency_slack(100, {'a': 70, 'b': 50}) == -20\nassert canary_decision(0.010, 0.011, 5000) == 'promote'\nassert canary_decision(0.010, 0.015, 5000) == 'rollback'\nassert canary_decision(0.010, 0.010, 200) == 'wait'",
  "solution": "import math\n\ndef replicas_needed(peak_qps, qps_per_replica, target_util, spare=1):\n    return math.ceil(peak_qps / (qps_per_replica * target_util)) + spare\n\ndef latency_slack(slo_ms, stages):\n    return slo_ms - sum(stages.values())\n\ndef canary_decision(base_err, canary_err, canary_n, min_n=1000, max_increase=0.002):\n    if canary_err - base_err > max_increase:\n        return 'rollback'\n    if canary_n < min_n:\n        return 'wait'\n    return 'promote'",
  "hints": ["Use math.ceil on the unrounded replica count before adding spare.", "Check the rollback condition first: bad canaries should be stopped even with few requests."]
}
```

> [!TIP] Interview tips
> - Walk through registry, container, serving stack, rollout (shadow, canary, A/B) and rollback, in that order.
> - Give a latency budget per stage and size for p99 with headroom; say what the fallback is when a dependency is slow.
> - Do the capacity math out loud: peak QPS, per-replica throughput, utilisation, redundancy, cost.
