---
id: cloud-devops-serverless-vs-vm-vs-container
title: "Serverless vs VM vs container"
estimatedMinutes: 10
difficulty: medium
tags: [serverless, containers, vm, cost, architecture]
---

## Why it matters

'Where would you run this model or service?' is a staple design question. A good answer compares operational burden, cost shape, scaling behaviour and limits instead of naming a favourite technology.

## Concept

Three points on a **control vs convenience** spectrum:
- **VM** (EC2, Compute Engine): you manage the OS, patching, scaling and packing. Maximum control: any software, GPUs, large memory, long-lived processes, local disk.
- **Container** (ECS/EKS/AKS/GKE, Fargate, Cloud Run): you ship an image that runs the same everywhere; an orchestrator schedules, restarts and scales it. You manage the image and (for Kubernetes) the cluster.
- **Serverless functions** (Lambda, Cloud Functions, Azure Functions): you ship code; the provider runs it per event, scales to zero and bills per invocation and duration.

**Cost shape**: a VM costs a flat amount whether busy or idle, so it wins at steady, high utilisation. Serverless costs $\approx \text{requests} \times (\text{per-request fee} + \text{GB-seconds} \times \text{price})$, so it wins for spiky or low-volume traffic and loses at sustained high volume. The **break-even** is where the pay-per-use bill equals the flat VM bill. Containers on a managed platform like Cloud Run sit in between: pay per use with higher per-unit limits and no function runtime constraints.

**Operational properties**:
- **Cold start**: a new function or container instance needs to start before serving (tens of ms to seconds; large ML libraries and models make it worse). Mitigate with provisioned concurrency or minimum instances, smaller images, lazy loading.
- **Limits**: Lambda has a 15-minute timeout, bounded memory (10 GB) and package size and no GPUs; heavy inference needs containers or VMs with GPUs.
- **State**: serverless and containers should be stateless; keep state in S3, a database or cache.
- **Scaling**: functions scale per request almost instantly (with concurrency limits); containers scale by metrics (CPU, requests) in seconds to minutes; VMs scale in minutes via autoscaling groups.
- **Portability and lock-in**: containers are the most portable; function triggers and runtimes are provider-specific.

**Rules of thumb**: event-driven glue, webhooks and cron-like tasks go serverless; steady APIs and microservices go on containers; GPU inference, big-memory jobs, licensed software and very steady workloads go on VMs (or GPU nodes in Kubernetes). Batch training on spot VMs is cheapest for long jobs.

## Worked example

Take a Lambda priced at \$0.20 per million requests and \$0.0000166667 per GB-second (x86, list price; ignore the free tier). A function runs 200 ms at 512 MB: $0.2 \text{ s} \times 0.5 \text{ GB} = 0.1$ GB-s per call, so cost per call $= 0.1 \times 0.0000166667 + 0.0000002 \approx \$1.867 \times 10^{-6}$, about \$1.87 per million calls. A small VM costs about \$0.0416/h $\times$ 730 h $\approx$ \$30.37 per month. Break-even $= 30.37 / (1.867 \times 10^{-6}) \approx 16.3$ million calls per month, around 6 requests per second sustained. A service averaging 1 request/s ($\approx$ 2.6 M/month, \$4.9) is cheaper on Lambda; one at 20 requests/s ($\approx$ 52 M/month, \$98) is cheaper on the VM, provided one VM can serve that load.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which workload is the best fit for serverless functions?",
  "options": [
    "Training a large model for 10 hours",
    "A latency-critical API at constant 500 requests/s",
    "A webhook that fires a few thousand times a day, unpredictably",
    "A job needing 8 GPUs"
  ],
  "answer": 2,
  "explanation": "Spiky, low-volume, event-driven work gains from scale-to-zero and pay-per-use; the others hit time limits, cost or hardware limits."
}
```

```quiz
{
  "id": "q2",
  "question": "How do you reduce the cold-start latency of an ML inference function?",
  "options": [
    "Increase the request timeout",
    "Use provisioned concurrency or min instances, a smaller image, and load the model outside the handler",
    "Move to a larger region",
    "Disable logging"
  ],
  "answer": 1,
  "explanation": "Keep some instances warm and avoid reloading heavy dependencies and weights on every invocation."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Build a small cost model. Write `lambda_cost(requests, ms, mem_mb, per_million=0.20, per_gb_s=0.0000166667)`: GB-seconds $= \\text{requests} \\times (\\text{ms}/1000) \\times (\\text{mem\\_mb}/1024)$, and cost $=$ `requests / 1e6 * per_million + gb_s * per_gb_s`. Write `break_even_requests(vm_monthly, ms, mem_mb, **prices)` returning the monthly request count at which Lambda cost equals the VM cost. Write `recommend(requests, vm_monthly, ms, mem_mb)` returning `'serverless'` if Lambda is strictly cheaper, otherwise `'vm'`.",
  "starterCode": "def lambda_cost(requests, ms, mem_mb, per_million=0.20, per_gb_s=0.0000166667):\n    pass\n\ndef break_even_requests(vm_monthly, ms, mem_mb, **prices):\n    pass\n\ndef recommend(requests, vm_monthly, ms, mem_mb):\n    pass\n\nprint(lambda_cost(1_000_000, 200, 512))\n",
  "tests": "assert abs(lambda_cost(1_000_000, 200, 512) - 1.86667) < 1e-5\nassert lambda_cost(0, 200, 512) == 0\nbe = break_even_requests(30.368, 200, 512)\nassert abs(be - 16_268_000) < 20_000, be\nassert abs(lambda_cost(be, 200, 512) - 30.368) < 1e-6\nassert abs(lambda_cost(1_000_000, 100, 1024, per_million=1.0, per_gb_s=0.0) - 1.0) < 1e-12\nassert recommend(2_600_000, 30.368, 200, 512) == 'serverless'\nassert recommend(52_000_000, 30.368, 200, 512) == 'vm'\nassert recommend(10_000_000_000, 30.368, 50, 128) == 'vm'",
  "solution": "def lambda_cost(requests, ms, mem_mb, per_million=0.20, per_gb_s=0.0000166667):\n    gb_s = requests * (ms / 1000) * (mem_mb / 1024)\n    return requests / 1e6 * per_million + gb_s * per_gb_s\n\ndef break_even_requests(vm_monthly, ms, mem_mb, **prices):\n    per_call = lambda_cost(1, ms, mem_mb, **prices)\n    return vm_monthly / per_call\n\ndef recommend(requests, vm_monthly, ms, mem_mb):\n    return 'serverless' if lambda_cost(requests, ms, mem_mb) < vm_monthly else 'vm'",
  "hints": [
    "Cost is linear in requests, so the break-even is vm_monthly divided by the cost of a single call.",
    "Reuse lambda_cost(1, ...) to get the per-call price, forwarding any price overrides."
  ]
}
```

> [!TIP] Interview tips
> - Compare on four axes: operational burden, cost shape (flat vs pay-per-use), scaling and limits (timeout, memory, GPU), and cold start.
> - Give the break-even logic: serverless wins at low or spiky volume, VMs and containers win at steady high utilisation.
> - For ML inference: small models and sporadic traffic on serverless or Cloud Run; large models and GPUs on dedicated containers or VMs.
