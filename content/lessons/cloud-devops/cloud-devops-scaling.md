---
id: cloud-devops-scaling
title: Scaling
estimatedMinutes: 12
difficulty: medium
tags: [cloud-devops, kubernetes, autoscaling, hpa]
---

## Why it matters
Traffic is spiky and GPUs are expensive, so autoscaling is a staple question: what scales, on which signal, and how you avoid flapping. Expect to explain the HPA formula and its limits.

## Concept
**Vertical vs horizontal**: vertical scaling gives one instance more CPU/RAM (simple, capped, often needs a restart); horizontal scaling adds instances (needs stateless or partitioned design, scales much further).

**Kubernetes autoscalers**:
- **HPA (Horizontal Pod Autoscaler)**: changes a Deployment's replica count from metrics (CPU, memory, custom/external such as requests per second or queue length).
- **VPA**: adjusts pod CPU/memory requests (do not combine with HPA on the same metric).
- **Cluster Autoscaler / Karpenter**: adds or removes **nodes** when pods are unschedulable or nodes are idle.
- **KEDA**: event-driven scaling, including **scale to zero**, for queues and streams.

**HPA formula**:
$$\text{desired} = \left\lceil \text{current} \times \frac{\text{currentMetric}}{\text{targetMetric}} \right\rceil$$
then clamp to `[minReplicas, maxReplicas]`. Within a **tolerance** (default 10%) of the target nothing changes. CPU utilisation is measured relative to the pod's **request**, so requests must be realistic.

**Avoiding flapping**: scale up fast, scale down slowly. The **stabilization window** (default 300 s for scale-down) means the controller uses the **highest** recommendation seen in the window before shrinking. `behavior` policies cap the step size (e.g. at most 4 pods or 100% per minute).

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: {name: api}
spec:
  scaleTargetRef: {apiVersion: apps/v1, kind: Deployment, name: api}
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource: {name: cpu, target: {type: Utilization, averageUtilization: 60}}
```

**Gotchas**: new pods take time (image pull, model load, node provisioning), so keep **headroom** or pre-warm; CPU is a poor signal for I/O- or GPU-bound inference, so use request concurrency, queue depth or GPU utilisation; scaling needs a metrics source (metrics-server, Prometheus adapter).

## Worked example
An API runs 4 pods with a 60% CPU target. Load rises and average utilisation hits 90%: $\lceil 4 \times 90/60 \rceil = 6$ pods. Later, with 6 pods, utilisation drops to 30%: $\lceil 6 \times 30/60 \rceil = 3$. But the scale-down window holds the highest recommendation of the last 5 minutes: if a spike a minute ago recommended 6, the deployment stays at 6 and only shrinks once that spike leaves the window. At 63% with 5 pods the ratio is 1.05, within the 10% tolerance, so nothing changes.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "An HPA has 4 replicas, a 50% CPU target and current average CPU of 100%. What is the desired replica count (max is 10)?",
  "options": [
    "4",
    "6",
    "8",
    "10"
  ],
  "answer": 2,
  "explanation": "$\\lceil 4 \\times 100/50 \\rceil = 8$, which is below the max of 10."
}
```

```quiz
{
  "id": "q2",
  "question": "Why does the HPA use a longer stabilization window for scale-down than for scale-up?",
  "options": [
    "To save API calls",
    "To avoid flapping: shrinking too eagerly on a brief dip causes repeated scale-up delays and cold starts",
    "Because scale-up is cheaper",
    "Because pods cannot be deleted quickly"
  ],
  "answer": 1,
  "explanation": "Adding capacity late hurts users, while removing it early only saves a little. Slow scale-down keeps capacity through short dips."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement the HPA decision. `desired_replicas(current, metric, target, min_r, max_r, tolerance=0.1)`: let `ratio = metric / target`; if `abs(ratio - 1) <= tolerance` return `current`; otherwise return `ceil(current * ratio)` clamped to `[min_r, max_r]`. Then `stabilized_down(history, window)`: `history` is a list of past recommendations (oldest first, the last one is the newest); return the maximum of the last `window` entries, which is the replica count to use when scaling down.",
  "starterCode": "import math\n\ndef desired_replicas(current, metric, target, min_r, max_r, tolerance=0.1):\n    pass\n\ndef stabilized_down(history, window):\n    pass\n",
  "tests": "assert desired_replicas(4, 90, 60, 2, 10) == 6\nassert desired_replicas(4, 100, 50, 2, 10) == 8\nassert desired_replicas(10, 50, 70, 2, 20) == 8\nassert desired_replicas(5, 63, 60, 2, 10) == 5\nassert desired_replicas(4, 300, 60, 2, 10) == 10\nassert desired_replicas(4, 5, 60, 2, 10) == 2\nassert desired_replicas(6, 30, 60, 1, 10) == 3\nassert stabilized_down([6, 4, 3, 3], 3) == 4\nassert stabilized_down([6, 4, 3, 3], 2) == 3\nassert stabilized_down([5], 10) == 5",
  "solution": "import math\n\ndef desired_replicas(current, metric, target, min_r, max_r, tolerance=0.1):\n    ratio = metric / target\n    if abs(ratio - 1) <= tolerance:\n        return current\n    d = math.ceil(round(current * ratio, 9))\n    return max(min_r, min(max_r, d))\n\ndef stabilized_down(history, window):\n    return max(history[-window:])",
  "hints": [
    "Float products like 4 * 1.5 can drift; rounding to 9 decimals before `ceil` avoids off-by-one results.",
    "`history[-window:]` slices the last `window` items (or all if shorter)."
  ]
}
```

> [!TIP] Interview tips
> - Give the HPA formula, the min/max clamp and the tolerance; mention scale-down stabilization to stop flapping.
> - Separate pod scaling (HPA) from node scaling (Cluster Autoscaler or Karpenter), and name KEDA for queue-driven and scale-to-zero cases.
> - Pitfall: scaling on CPU for GPU or I/O-bound models; pick a signal that tracks saturation, and account for slow pod start-up.
