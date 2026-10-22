---
id: mlops-ml-platform-design
title: "Designing an ML platform"
estimatedMinutes: 14
difficulty: hard
tags: [mlops, platform, system-design, build-vs-buy]
---

## Why it matters
Past a handful of models, every team re-solves the same problems: data access, training jobs, deployment, monitoring. "Design an ML platform" tests whether you can find the common layers, decide what to standardize versus leave flexible, and justify build versus buy. It builds on the lifecycle, registry, pipeline and serving lessons in this section.

## Concept
**Layers** of a typical platform, each with a self-service interface:
- **Data and features**: governed datasets, a feature store (offline and online, point-in-time joins), data validation, lineage.
- **Experimentation**: notebooks/workspaces, experiment tracking, shared compute with quotas.
- **Training and pipelines**: orchestrated, containerized, reproducible jobs; scheduling of GPUs/CPUs; hyperparameter tuning; distributed training.
- **Registry and release**: versioned models with metadata and approval stages, promotion gates (tests, bias and performance checks), canary and rollback.
- **Serving**: batch, online and streaming patterns; autoscaling; model servers; a standard request/response contract.
- **Monitoring and feedback**: data and prediction drift, performance with delayed labels, alerts, feedback logging for retraining.
- **Governance and cost**: access control, audit trail, model cards, per-team cost attribution.

**Design principles**:
- **Golden path, not mandate**: a paved road (templates, CLI/SDK, CI) that is easiest to use, with escape hatches for special cases.
- **Interfaces over implementations**: standardize artifacts (container image, model signature, feature definitions), not frameworks, so tools can be swapped.
- **Multi-tenancy**: namespaces, quotas, priorities and preemption; fair-share GPU scheduling; isolate noisy neighbors.
- **Reproducibility by default**: pinned environments, versioned data and code, config captured per run.

**Build vs buy**: buy or adopt managed/open-source (SageMaker, Vertex AI, Databricks, MLflow, Kubeflow, Feast) for undifferentiated parts; build thin glue and the parts that encode your constraints (compliance, latency, data locality). Count total cost of ownership including on-call.

**Measure the platform**: lead time from experiment to production, share of models on the golden path, deployment frequency, rollback and incident rate, cost per model and per 1,000 predictions, GPU utilization, user satisfaction.

**Pitfalls**: building before there are users, over-generalizing, forcing one framework, ignoring serving and monitoring (training-only platforms), and no cost visibility.

## Worked example
**Situation** (illustrative): 40 data scientists, 60 models in production, 5 teams. Pain points: models deployed by hand with bespoke scripts (median 6 weeks from approval to production), three different feature definitions of "7-day spend", no drift monitoring, GPU contention between teams.

**Plan (first 2 quarters)**:
1. A **template repository** (data, training, evaluation, serving, monitoring) with CI that builds an image, runs data and model tests, registers the model in the registry and deploys to staging.
2. A **feature store** with a handful of shared entities (user, merchant); migrate the 10 most reused features first; point-in-time-correct training sets and the same definitions online.
3. **Registry plus promotion gates**: staging to canary (5% traffic) to full; automatic rollback on error-rate or latency regressions.
4. **Monitoring defaults**: input drift, prediction distribution and latency dashboards are created automatically for every deployed model; label-delay-aware performance reports.
5. **GPU scheduling** with team quotas and a shared preemptible pool. With 10 GPUs and requests of 2, 5 and 8, max-min fairness grants 2, 4 and 4.

**Success criteria**: median lead time from 6 weeks to under 1 week, 80% of new models on the golden path within two quarters, and every model with an owner, a monitor and a cost tag. Review adoption monthly with the teams.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A platform team wants 40 data scientists to ship models faster. Which investment usually pays off first?",
  "options": [
    "A custom feature-store engine written in-house",
    "A 'golden path': a templated pipeline with CI, registry, deploy and monitoring built in, used by default",
    "A mandatory architecture review for every model",
    "Moving every model to Kubernetes"
  ],
  "answer": 1,
  "explanation": "Self-service defaults remove repeated glue work and enforce standards without gatekeeping. Build custom components only when off-the-shelf tools fail a real requirement."
}
```

```quiz
{
  "id": "q2",
  "question": "Which metric best shows whether an ML platform is working?",
  "options": [
    "Number of microservices",
    "Time from approved experiment to production, share of models on the golden path, and incident/rollback rate",
    "GPU count",
    "Lines of platform code"
  ],
  "answer": 1,
  "explanation": "Platforms are products: measure adoption, lead time, reliability and cost per model, not activity or size."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "GPU quota with max-min fairness. Write `fair_share(total, requests)` where `requests` maps team -> GPUs requested. Teams asking for less than an equal share get exactly what they asked for; the leftover is split equally among the remaining teams, repeating until everyone is satisfied or capacity runs out. Return a dict team -> allocated GPUs (floats are fine).",
  "starterCode": "def fair_share(total, requests):\n    pass\n\nprint(fair_share(10, {'a': 2, 'b': 5, 'c': 8}))",
  "tests": "r = fair_share(10, {'a': 2, 'b': 5, 'c': 8})\nassert abs(r['a'] - 2) < 1e-9 and abs(r['b'] - 4) < 1e-9 and abs(r['c'] - 4) < 1e-9\nr = fair_share(20, {'a': 2, 'b': 5, 'c': 8})\nassert r == {'a': 2, 'b': 5, 'c': 8}\nr = fair_share(3, {'a': 2, 'b': 5, 'c': 8})\nassert all(abs(v - 1) < 1e-9 for v in r.values())\nassert fair_share(5, {}) == {}",
  "solution": "def fair_share(total, requests):\n    alloc = {}\n    remaining = float(total)\n    teams = sorted(requests, key=lambda t: requests[t])\n    for idx, t in enumerate(teams):\n        share = remaining / (len(teams) - idx)\n        give = min(requests[t], share)\n        alloc[t] = give\n        remaining -= give\n    return alloc",
  "hints": [
    "Process teams from smallest request to largest.",
    "At each step the equal share is remaining capacity divided by teams not yet served."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Chargeback. `records` is a list of `(team, resource, units)`; `rates` maps resource -> price per unit; `shared` is the platform's fixed cost (control plane, on-call, registry). Write `chargeback(records, rates, shared)` returning team -> direct cost plus a share of `shared` proportional to direct cost.",
  "starterCode": "def chargeback(records, rates, shared):\n    pass\n\nprint(chargeback([('ads', 'gpu', 100), ('ads', 'cpu', 1000), ('search', 'gpu', 50)], {'gpu': 2.0, 'cpu': 0.05}, 90))",
  "tests": "r = chargeback([('ads', 'gpu', 100), ('ads', 'cpu', 1000), ('search', 'gpu', 50)], {'gpu': 2.0, 'cpu': 0.05}, 90)\nassert abs(r['ads'] - (250 + 90 * 250 / 350)) < 1e-9\nassert abs(r['search'] - (100 + 90 * 100 / 350)) < 1e-9\nassert abs(sum(r.values()) - 440) < 1e-9\nassert chargeback([], {}, 10) == {}",
  "solution": "def chargeback(records, rates, shared):\n    direct = {}\n    for team, res, units in records:\n        direct[team] = direct.get(team, 0.0) + units * rates[res]\n    total = sum(direct.values())\n    if total == 0:\n        return direct\n    return {t: c + shared * c / total for t, c in direct.items()}",
  "hints": [
    "First compute each team's direct cost, then add shared * direct / total_direct.",
    "The allocated amounts must sum to direct total + shared."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Design an ML platform for a company with 5 product teams, 60 models, batch and real-time use cases. What do you build first and what do you leave out?'",
  "answer": "**1. Clarify**: team skills, regulated data?, latency tiers (batch, <100 ms online), cloud, current pain (lead time, incidents, cost), model types (tabular, deep learning, LLM).\n\n**2. Principles**: golden path with escape hatches, standard interfaces (container image, model signature, feature definitions), self-service, cost attribution from day one.\n\n**3. Phase 1 (0 to 3 months)**: project template plus CI/CD; experiment tracking; model registry with stages; standard batch scoring job and a model server template (REST/gRPC) with canary and rollback; baseline monitoring (latency, errors, input and prediction drift).\n\n**4. Phase 2 (3 to 6 months)**: feature store for the most-shared features (offline, online, point-in-time joins); orchestrated training pipelines; GPU pool with quotas and preemption; automated retraining triggers; delayed-label performance monitoring.\n\n**5. Phase 3**: governance (model cards, audit, access), shadow and A/B tooling, cost dashboards and budgets, LLM-specific components (prompt registry, eval harness, gateway) if needed.\n\n**6. Left out initially**: custom schedulers, a bespoke training framework, a bespoke UI; adopt managed or open-source (MLflow, Kubeflow/Airflow, Feast, Kubernetes, a managed endpoint service).\n\n**7. Tradeoffs**: central vs embedded platform team, mandate vs paved road, build vs buy, flexibility vs consistency.\n\n**8. Metrics**: lead time to production, share on golden path, incident/rollback rate, GPU utilization, cost per 1,000 predictions, user satisfaction."
}
```

> [!TIP] Interview tips
> - Structure by layers (data, train, registry, serve, monitor, govern) and say what to standardize versus leave flexible.
> - Argue golden path over mandate, interfaces over implementations, build only what differentiates.
> - Close with how you measure the platform: lead time, adoption, reliability, cost per model.
