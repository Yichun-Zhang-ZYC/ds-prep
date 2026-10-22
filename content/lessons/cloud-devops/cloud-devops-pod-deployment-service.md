---
id: cloud-devops-pod-deployment-service
title: Pod, Deployment, Service
estimatedMinutes: 14
difficulty: medium
tags: [cloud-devops, kubernetes, pod, deployment, service]
---

## Why it matters
These three objects are the core of Kubernetes. Interviewers ask how a request reaches a pod, how rolling updates avoid downtime and why you never create bare pods.

## Concept
**Pod**: the smallest deployable unit; one or more containers sharing a network namespace (one IP) and volumes. Pods are **ephemeral**: they get new IPs and are replaced, never repaired in place.

**Deployment**: declares the desired state ("3 replicas of image v2"). It manages a **ReplicaSet**, which keeps the replica count and recreates failed pods. Changing the pod template creates a new ReplicaSet and does a **rolling update**; `kubectl rollout undo` rolls back. Controllers run a reconcile loop: observe, compare to desired, act.

**Service**: a stable virtual IP and DNS name in front of a changing set of pods, chosen by a **label selector**. Only **Ready** pods (passing the readiness probe) receive traffic. Types: `ClusterIP` (internal, default), `NodePort`, `LoadBalancer` (cloud LB), plus **Ingress** for L7 HTTP routing.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: {name: api}
spec:
  replicas: 4
  strategy:
    rollingUpdate: {maxSurge: 25%, maxUnavailable: 25%}
  selector:
    matchLabels: {app: api}
  template:
    metadata:
      labels: {app: api}
    spec:
      containers:
      - name: api
        image: myrepo/api:2.1
        resources:
          requests: {cpu: 250m, memory: 256Mi}
          limits: {memory: 512Mi}
        readinessProbe:
          httpGet: {path: /healthz, port: 8000}
---
apiVersion: v1
kind: Service
metadata: {name: api}
spec:
  selector: {app: api}
  ports: [{port: 80, targetPort: 8000}]
```

**Rolling update math**: `maxSurge` is how many extra pods are allowed above `replicas` (percentages round **up**); `maxUnavailable` is how many may be missing (percentages round **down**).

**Probes**: *liveness* failing restarts the container; *readiness* failing removes the pod from Service endpoints; *startup* protects slow starters. Set resource **requests** (used for scheduling) and **limits**.

## Worked example
A Deployment has `replicas: 4` with 25% / 25%. Surge is $\lceil 4 \times 0.25 \rceil = 1$ and unavailable is $\lfloor 4 \times 0.25 \rfloor = 1$, so during the update there are at most 5 pods and at least 3 serving. Kubernetes starts 1 new pod, waits for it to become Ready, terminates 1 old pod, and repeats until all 4 are v2.1. The Service selector `app: api` matches old and new pods, but only Ready ones are in its endpoints, so clients keep getting responses. If the new image crashes, its pods never become Ready, the rollout stalls with at least 3 old pods still serving, and you run `kubectl rollout undo`.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A Service selects `app: api`. Which pods receive its traffic?",
  "options": [
    "All pods in the namespace",
    "Pods labelled app=api that are Ready",
    "Only the oldest pod",
    "Pods chosen at random across clusters"
  ],
  "answer": 1,
  "explanation": "The selector picks pods by label, and the endpoints list only includes pods passing their readiness probe."
}
```

```quiz
{
  "id": "q2",
  "question": "Why use a Deployment instead of creating a bare Pod?",
  "options": [
    "Pods cannot run containers",
    "A Deployment recreates failed pods, scales replicas and does rolling updates and rollbacks",
    "Deployments are cheaper",
    "Bare pods cannot have a Service"
  ],
  "answer": 1,
  "explanation": "A bare pod is not rescheduled if its node dies. The Deployment's ReplicaSet keeps the desired count and handles updates."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Simulate two Kubernetes behaviours. `service_endpoints(selector, pods)`: `pods` is a list of dicts `{'name', 'labels': {...}, 'ready': bool}`; return the sorted names of pods that are ready and whose labels contain every key/value of `selector`. `rolling_bounds(replicas, max_surge, max_unavailable)`: each of the last two is an int or a percentage string like `'25%'`; percentages of `replicas` round up for surge and down for unavailable. Return `(max_total_pods, min_available_pods)`.",
  "starterCode": "import math\n\ndef service_endpoints(selector, pods):\n    pass\n\ndef rolling_bounds(replicas, max_surge, max_unavailable):\n    pass\n",
  "tests": "pods = [\n    {'name': 'api-2', 'labels': {'app': 'api', 'v': '2'}, 'ready': True},\n    {'name': 'api-1', 'labels': {'app': 'api', 'v': '1'}, 'ready': True},\n    {'name': 'api-3', 'labels': {'app': 'api', 'v': '2'}, 'ready': False},\n    {'name': 'db-1', 'labels': {'app': 'db'}, 'ready': True},\n]\nassert service_endpoints({'app': 'api'}, pods) == ['api-1', 'api-2']\nassert service_endpoints({'app': 'api', 'v': '2'}, pods) == ['api-2']\nassert service_endpoints({'app': 'web'}, pods) == []\nassert rolling_bounds(4, '25%', '25%') == (5, 3)\nassert rolling_bounds(10, '25%', '25%') == (13, 8)\nassert rolling_bounds(3, 1, 0) == (4, 3)\nassert rolling_bounds(10, '10%', 2) == (11, 8)",
  "solution": "import math\n\ndef service_endpoints(selector, pods):\n    return sorted(p['name'] for p in pods\n                  if p['ready'] and all(p['labels'].get(k) == v for k, v in selector.items()))\n\ndef _resolve(value, replicas, up):\n    if isinstance(value, str) and value.endswith('%'):\n        x = replicas * int(value[:-1]) / 100\n        return math.ceil(round(x, 9)) if up else math.floor(round(x, 9))\n    return int(value)\n\ndef rolling_bounds(replicas, max_surge, max_unavailable):\n    surge = _resolve(max_surge, replicas, True)\n    unavail = _resolve(max_unavailable, replicas, False)\n    return replicas + surge, replicas - unavail",
  "hints": [
    "A selector matches when every key in it appears in the pod's labels with the same value.",
    "Max total = replicas + surge; min available = replicas - unavailable."
  ]
}
```

> [!TIP] Interview tips
> - Describe the chain: Service (selector) to Ready pods, created by a ReplicaSet, owned by a Deployment.
> - Explain readiness vs liveness probes and how they protect rolling updates.
> - Pitfall: no resource requests or readiness probe; the scheduler cannot place pods well and traffic hits pods that are not ready.
