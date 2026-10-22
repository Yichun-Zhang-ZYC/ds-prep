---
id: mlops-cost-and-capacity-management
title: "Cost and capacity management for ML"
estimatedMinutes: 13
difficulty: medium
tags: [mlops, cost, capacity, finops, serving]
---

## Why it matters
GPUs make ML the most expensive line item in many cloud bills, and "reduce serving cost by 40% without hurting quality" is a standard staff-level question. You need to size capacity from first principles, name the cost levers, and protect latency and quality while cutting spend. Related: Model servers, Batch scoring, and the Scaling lesson in Cloud and DevOps.

## Concept
**Where the money goes**: GPU/CPU hours (training, tuning, serving; idle time is waste), data storage and egress, feature-store and streaming infrastructure, monitoring and logging volume, and people/on-call.

**Capacity planning**:
- **Little's law**: in-flight requests $L = \lambda W$ (QPS times latency). Replicas $= \lceil L / (c \cdot u) \rceil + \text{spare}$ with per-replica concurrency $c$ and target utilization $u$ (about 50 to 70% for latency-sensitive services; queueing delay blows up near 100%).
- Size for **peak plus headroom (N+1)**, not average; autoscale on concurrency, queue depth or GPU utilization, with warm-up time in mind (large models load slowly); scale to zero only if cold starts are acceptable.
- Test with load tests; measure p50/p99 at the target QPS per instance type.

**Serving levers** (roughly ordered by safety):
1. **Right-size** instance types; choose by cost per 1,000 predictions at your SLO, not hourly price.
2. **Dynamic batching** raises throughput per GPU at some latency cost; set a max wait (a few ms).
3. **Autoscaling and scheduling**: off-peak scale-down, schedule batch work in valleys; **batch** instead of real-time where freshness allows.
4. **Model efficiency**: quantization (INT8/FP8), distillation, pruning, smaller architectures, ONNX/TensorRT compilation; verify accuracy and tail latency.
5. **Caching** of repeated inputs or embeddings; **cascades** (cheap model first, escalate uncertain cases).
6. **Pricing**: reserved or savings plans for the steady baseline, on-demand for burst, **spot/preemptible** for fault-tolerant work.

**Training levers**: spot with checkpointing, mixed precision, early stopping, smaller sweeps (Bayesian search), reuse pretrained models and cached features, retrain only when monitoring says so.

**Governance (FinOps)**: tag every resource by team and model, show cost per model and per 1,000 predictions, set budgets and anomaly alerts, auto-stop idle notebooks, lifecycle rules for artifacts and logs. Track **unit economics** alongside quality so a cut cannot silently degrade the product.

## Worked example
**Service** (illustrative): peak 400 QPS, 50 ms per request, each replica runs 4 requests concurrently, target utilization 60%, one spare replica.
- In flight: $400 \times 0.05 = 20$. Replicas: $\lceil 20/(4 \times 0.6) \rceil + 1 = \lceil 8.33 \rceil + 1 = 10$.
- At \$1.20 per replica-hour and 730 hours per month: $10 \times 1.20 \times 730 = \$8{,}760$ per month.
- **Lever 1, dynamic batching** doubles concurrency to 8 per replica (p99 verified within SLO): $\lceil 20/(8 \times 0.6) \rceil + 1 = \lceil 4.17 \rceil + 1 = 6$ replicas, $\$5{,}256$ per month, a 40% saving.
- Unit cost at an average of 150 QPS ($\approx 394$M requests per month): before $8{,}760 / 394{,}200 = \$0.022$ per 1,000 predictions; after $\$0.013$.

**Training**: 8 GPUs for 20 h at \$3/h on demand costs \$480. On spot at a 65% discount with 10% rework: $480 \times 0.35 \times 1.1 = \$184.80$, a 62% saving, provided the job checkpoints often.

**Cascade**: a small model costs 0.1 units per request and the large one 1.0. If 20% of requests escalate, expected cost is $0.1 + 0.2 = 0.3$, a 70% saving; it stops paying off once the escalation rate approaches 90%.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why not run inference replicas at 95% utilization to save money?",
  "options": [
    "Utilization above 50% is unsupported",
    "Queueing delay grows sharply near saturation, so tail latency and failure risk explode under bursts; target roughly 50 to 70% with autoscaling",
    "GPUs cannot exceed 80%",
    "It only matters for training"
  ],
  "answer": 1,
  "explanation": "Queueing theory: waiting time scales like $\\rho/(1-\\rho)$. At 95% a small burst or a replica loss pushes p99 far past the SLO. Leave headroom and scale on a leading signal such as concurrency or queue depth."
}
```

```quiz
{
  "id": "q2",
  "question": "Which saving is usually the safest first step for an online model that is slightly over-provisioned?",
  "options": [
    "Switch the whole service to spot instances",
    "Right-size and enable dynamic batching or autoscaling, measure p99, then consider quantization or caching",
    "Delete monitoring",
    "Retrain weekly"
  ],
  "answer": 1,
  "explanation": "Right-sizing and batching preserve behaviour and are reversible. Spot interruptions suit fault-tolerant training and batch jobs, not latency-critical serving without redundancy. Quantization needs accuracy validation."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Capacity planning with Little's law. Write `replicas_needed(qps, latency_s, concurrency, target_util, spare=1)`: the average number of in-flight requests is `qps * latency_s`; each replica handles `concurrency` requests at once but should run at `target_util` (0-1) of that. Return `ceil(in_flight / (concurrency * target_util)) + spare`.",
  "starterCode": "import math\n\ndef replicas_needed(qps, latency_s, concurrency, target_util, spare=1):\n    pass\n\nprint(replicas_needed(400, 0.05, 4, 0.6))",
  "tests": "assert replicas_needed(400, 0.05, 4, 0.6) == 10\nassert replicas_needed(400, 0.05, 8, 0.6) == 6\nassert replicas_needed(400, 0.05, 4, 1.0, spare=0) == 5\nassert replicas_needed(0, 0.05, 4, 0.6, spare=2) == 2",
  "solution": "import math\n\ndef replicas_needed(qps, latency_s, concurrency, target_util, spare=1):\n    in_flight = qps * latency_s\n    return math.ceil(in_flight / (concurrency * target_util) - 1e-9) + spare",
  "hints": [
    "400 qps * 0.05 s = 20 requests in flight on average.",
    "Subtract a tiny epsilon before ceil to avoid float artifacts such as 5.000000001."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Spot vs on-demand training. Write `training_cost(gpus, hours, rate, spot_discount, spot_frac, rework)`. The on-demand cost is `gpus * hours * rate`. A fraction `spot_frac` of the work runs on spot at price `rate * (1 - spot_discount)` and must redo `rework` (a fraction, e.g. 0.1 = 10%) of its work after preemptions; the rest runs on demand. Return the total cost.",
  "starterCode": "def training_cost(gpus, hours, rate, spot_discount, spot_frac, rework):\n    pass\n\nprint(training_cost(8, 20, 3.0, 0.65, 1.0, 0.1))",
  "tests": "assert abs(training_cost(8, 20, 3.0, 0.65, 1.0, 0.1) - 184.8) < 1e-9\nassert abs(training_cost(8, 20, 3.0, 0.65, 0.5, 0.1) - 332.4) < 1e-9\nassert abs(training_cost(8, 20, 3.0, 0.65, 0.0, 0.1) - 480) < 1e-9\nassert abs(training_cost(1, 10, 2.0, 0.0, 1.0, 0.5) - 30) < 1e-9",
  "solution": "def training_cost(gpus, hours, rate, spot_discount, spot_frac, rework):\n    base = gpus * hours * rate\n    return base * ((1 - spot_frac) + spot_frac * (1 - spot_discount) * (1 + rework))",
  "hints": [
    "Spot work costs (1 - discount) of the rate and takes (1 + rework) times the hours.",
    "With spot_frac = 0 the answer is the plain on-demand cost."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Model cascade economics. A small model handles every request; a fraction `p_escalate` is also sent to the large model. Write `cascade_cost(p_escalate, cost_small, cost_large)` returning `(expected_cost, saving)` where `expected_cost = cost_small + p_escalate * cost_large` and `saving = 1 - expected_cost / cost_large` (negative if the cascade is more expensive than always using the large model).",
  "starterCode": "def cascade_cost(p_escalate, cost_small, cost_large):\n    pass\n\nprint(cascade_cost(0.2, 0.1, 1.0))",
  "tests": "c, s = cascade_cost(0.2, 0.1, 1.0)\nassert abs(c - 0.3) < 1e-12 and abs(s - 0.7) < 1e-12\nc, s = cascade_cost(1.0, 0.1, 1.0)\nassert abs(c - 1.1) < 1e-12 and abs(s + 0.1) < 1e-12\nc, s = cascade_cost(0.0, 0.05, 2.0)\nassert abs(c - 0.05) < 1e-12 and abs(s - 0.975) < 1e-12",
  "solution": "def cascade_cost(p_escalate, cost_small, cost_large):\n    c = cost_small + p_escalate * cost_large\n    return c, 1 - c / cost_large",
  "hints": [
    "The small model always runs, so its cost is paid on every request.",
    "The cascade only pays off when p_escalate < 1 - cost_small / cost_large."
  ]
}
```

> [!TIP] Interview tips
> - Size with Little's law (QPS times latency), then divide by concurrency and target utilization; always say why not 100%.
> - List levers from safest to riskiest (right-size, batching, autoscale, quantize, cache, cascade, spot) and say how you protect p99 and quality.
> - Talk unit economics (cost per 1,000 predictions) and tagging/budgets, not just a one-off cut.
