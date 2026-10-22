---
id: mlops-ml-pipelines-and-orchestration
title: "ML Pipelines & orchestration (Kubeflow, Airflow, SageMaker / Vertex AI Pipelines)"
estimatedMinutes: 13
difficulty: medium
tags: [mlops, pipelines, orchestration, kubeflow, airflow, vertex-ai, sagemaker]
---

## Why it matters
Notebooks do not retrain themselves. Interviewers ask how you turn data prep, training, evaluation and deployment into a reproducible, scheduled, observable pipeline, and which orchestrator you would pick.

## Concept
An **ML pipeline** is a DAG of steps: ingest and validate data, build features, train, evaluate, register, deploy (and sometimes batch-score). An **orchestrator** schedules the DAG, passes artifacts between steps, retries failures, and logs lineage.

**Design principles**:
- **Idempotent, parameterised steps** keyed by run date or data version, so reruns and backfills are safe.
- **Artifacts, not in-memory objects**, pass between steps (paths in object storage, metadata in a store such as ML Metadata or MLflow).
- **Containerised steps** with pinned dependencies so the same code runs on a laptop and a cluster.
- **Caching**: skip a step if its code, inputs and params are unchanged (Kubeflow and Vertex cache by input hash).
- **Gates**: data validation, evaluation versus champion, and manual approval before deploy. A failed gate stops the DAG.
- **Triggers**: schedule, new-data arrival, drift alert, or a code merge (CI/CD for the pipeline).

**Tools**:
- **Airflow** (also Dagster, Prefect): general-purpose, Python DAGs, rich operators; strong for data plumbing, weaker native ML artifact tracking.
- **Kubeflow Pipelines (KFP)**: Kubernetes-native, components as containers with typed inputs and outputs, artifact lineage and caching, plus Katib (hyperparameter tuning) and KServe (serving).
- **Vertex AI Pipelines** (managed KFP/TFX on GCP) and **SageMaker Pipelines** (AWS): managed, integrated with each cloud's registry, feature store and endpoints; less portable.
- **Metaflow, ZenML, Flyte**: Python-first, local-to-cloud workflows.

**Choosing**: use what your data platform already runs (Airflow if the data team uses it), a managed service to avoid ops, KFP/Flyte for a Kubernetes shop that wants typed ML components. A common split is Airflow for data pipelines triggering the ML pipeline.

**Continuous training** ties it together: monitoring or schedule triggers the pipeline, which retrains, evaluates against the champion and registers or deploys only if the gate passes.

## Worked example
Pipeline: `ingest -> validate -> features -> train -> evaluate -> register`. Yesterday's run took 60 min: validate 5, features 20, train 30, evaluate 5.

Today only a **hyperparameter in the train step** changed. With caching, `ingest`, `validate` and `features` have identical code, inputs and params, so they are skipped. Rerun `train`, `evaluate`, `register`: 30 + 5 + a few seconds, about 35 min instead of 60. If the *raw data* changed instead, every downstream step is invalidated, because each step's input hash includes its upstream outputs.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A step's code and params are unchanged, but its upstream step produced new output. Should a caching orchestrator rerun it?",
  "options": ["No, caching is by code only", "Yes, the input artifact hash changed", "Only if it is the last step", "Only on Mondays"],
  "answer": 1,
  "explanation": "Cache keys include input artifacts, so changed upstream outputs invalidate downstream steps."
}
```

```quiz
{
  "id": "q2",
  "question": "Which is the best reason to pass artifact paths between steps instead of in-memory objects?",
  "options": ["Paths are faster to pickle", "Steps run in separate containers or machines and must be rerunnable and traceable", "Python forbids objects", "It reduces model accuracy"],
  "answer": 1,
  "explanation": "Separate processes can only share durable artifacts, and durable artifacts give lineage and reruns."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Model a cached pipeline. `topo_order(deps)`: `deps` maps step to a list of upstream steps; return an execution order choosing the alphabetically smallest ready step each time. `steps_to_run(deps, changed)`: `changed` is the set of steps whose own code or params changed (or raw-data steps); return, in topological order, every step that must rerun, meaning the changed steps and everything downstream of them. Unchanged, unaffected steps are served from cache.",
  "starterCode": "def topo_order(deps):\n    pass\n\ndef steps_to_run(deps, changed):\n    pass\n",
  "tests": "deps = {'ingest': [], 'validate': ['ingest'], 'features': ['validate'], 'train': ['features'], 'evaluate': ['train'], 'register': ['evaluate'], 'docs': []}\nassert topo_order(deps) == ['docs', 'ingest', 'validate', 'features', 'train', 'evaluate', 'register']\nassert steps_to_run(deps, {'train'}) == ['train', 'evaluate', 'register']\nassert steps_to_run(deps, {'ingest'}) == ['ingest', 'validate', 'features', 'train', 'evaluate', 'register']\nassert steps_to_run(deps, set()) == []\nd2 = {'a': [], 'b': ['a'], 'c': ['a'], 'd': ['b', 'c']}\nassert steps_to_run(d2, {'b'}) == ['b', 'd']\nassert steps_to_run(d2, {'c'}) == ['c', 'd']",
  "solution": "def topo_order(deps):\n    remaining = {s: set(u) for s, u in deps.items()}\n    order = []\n    while remaining:\n        ready = sorted(s for s, u in remaining.items() if not u)\n        if not ready:\n            raise ValueError('cycle detected')\n        s = ready[0]\n        order.append(s)\n        del remaining[s]\n        for u in remaining.values():\n            u.discard(s)\n    return order\n\ndef steps_to_run(deps, changed):\n    dirty = set(changed)\n    for s in topo_order(deps):\n        if any(u in dirty for u in deps[s]):\n            dirty.add(s)\n    return [s for s in topo_order(deps) if s in dirty]",
  "hints": ["Kahn's algorithm: repeatedly pick a step whose upstreams are all done.", "Walk the topological order; a step is dirty if it changed or any upstream is dirty."]
}
```

> [!TIP] Interview tips
> - Frame it as a DAG with idempotent, containerised steps, caching, gates and triggers, then compare tools by who runs them (Airflow for data, KFP/Vertex/SageMaker for ML).
> - Mention continuous training: a trigger plus an evaluation gate against the champion, never auto-deploy blindly.
> - Pitfall: tight coupling to one orchestrator's SDK in business logic; keep step code in plain, testable functions or containers.
