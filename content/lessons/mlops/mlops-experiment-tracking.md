---
id: mlops-experiment-tracking
title: "Experiment Tracking (MLflow, Weights & Biases)"
estimatedMinutes: 11
difficulty: easy
tags: [mlops, experiment-tracking, mlflow, wandb, reproducibility]
---

## Why it matters
"Which run produced the model in production, and can you reproduce it?" is a classic MLOps question. Experiment tracking turns ad-hoc notebook tinkering into a searchable, reproducible record.

## Concept
A tracker records, per **run**: **parameters** (hyperparameters, feature set), **metrics** (often as step-indexed curves), **artifacts** (model files, plots, confusion matrices), and **context** (code version via git SHA, data version, environment, random seed, hardware, who ran it).

**MLflow** (open source, self-hostable):
- **Tracking**: `mlflow.start_run()`, `log_param`, `log_metric(name, value, step)`, `log_artifact`; runs are grouped into **experiments**. Autologging (`mlflow.sklearn.autolog()`) captures params, metrics and the model for common libraries.
- **Models / Registry**: packaged model flavors plus versioned registration (next lesson).
- Backend store (SQL DB) for metadata and an artifact store (S3, GCS) for files.

**Weights & Biases** (hosted SaaS): live dashboards, run comparison, hyperparameter **sweeps**, artifacts with lineage, and team reports. Others: Neptune, Comet, TensorBoard (curves only).

**What makes a run reproducible**: pinned code (commit SHA, plus a flag for uncommitted changes), pinned data (version or content hash), the full config, seeds, and a dependency lockfile or container image.

**Good practice**:
- Log the *config object*, not scattered variables, and tag runs (`baseline`, `ablation`).
- Log evaluation on a fixed validation set so runs are comparable; keep the test set out of selection.
- Use **nested runs** for CV folds or sweeps, with a parent run holding the aggregate.
- Select with a rule, for example best validation metric subject to a latency constraint, and record why.
- Beware comparing runs across different data versions or metric definitions.

**Search and compare**: filter by metric (`metrics.val_auc > 0.9`), by tags, or by params, and use parallel-coordinates plots to see which hyperparameters matter.

## Worked example
Three runs on the same data version (`d7`):

| run | lr | depth | val AUC | train time |
|---|---|---|---|---|
| a1 | 0.1 | 4 | 0.871 | 40 s |
| a2 | 0.05 | 6 | 0.884 | 95 s |
| a3 | 0.05 | 8 | 0.885 | 210 s |

`a3` has the best AUC, but only +0.001 over `a2` for 2.2x the training time. With a rule of "within 0.002 of the best AUC, then fastest", choose `a2`. The tracker lets you state this decision and rerun `a2` from its logged SHA, config and data version.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which item is essential for reproducing a tracked run but is often forgotten?",
  "options": ["The run's display name", "The data version and random seed", "The color of the plot", "The number of browser tabs open"],
  "answer": 1,
  "explanation": "Code and parameters are not enough: without the exact data version and seeds, results may not reproduce."
}
```

```quiz
{
  "id": "q2",
  "question": "In MLflow, where do large artifacts such as model files typically go?",
  "options": ["The backend metadata store row itself", "An artifact store such as S3 or GCS, referenced from the run", "Git history", "The Python process memory"],
  "answer": 1,
  "explanation": "MLflow keeps lightweight metadata in a backend store (a SQL database) and stores files in an artifact store."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement a tiny tracker. `Tracker.log_run(params, metrics)` stores a run and returns its id (`'run-1'`, `'run-2'`, ...). `best_run(metric, mode='max')` returns the id of the best run by that metric (ties: earliest run; runs missing the metric are ignored; return `None` if none). `filter_runs(**params)` returns ids (in order) of runs whose params contain all the given key/value pairs.",
  "starterCode": "class Tracker:\n    def __init__(self):\n        self.runs = []\n\n    def log_run(self, params, metrics):\n        pass\n\n    def best_run(self, metric, mode='max'):\n        pass\n\n    def filter_runs(self, **params):\n        pass\n",
  "tests": "t = Tracker()\nassert t.best_run('auc') is None\nassert t.log_run({'lr': 0.1, 'depth': 4}, {'auc': 0.871}) == 'run-1'\nassert t.log_run({'lr': 0.05, 'depth': 6}, {'auc': 0.884, 'secs': 95}) == 'run-2'\nassert t.log_run({'lr': 0.05, 'depth': 8}, {'auc': 0.884, 'secs': 210}) == 'run-3'\nassert t.best_run('auc') == 'run-2'\nassert t.best_run('auc', mode='min') == 'run-1'\nassert t.best_run('secs', mode='min') == 'run-2'\nassert t.best_run('missing') is None\nassert t.filter_runs(lr=0.05) == ['run-2', 'run-3']\nassert t.filter_runs(lr=0.05, depth=8) == ['run-3']\nassert t.filter_runs(lr=9) == []",
  "solution": "class Tracker:\n    def __init__(self):\n        self.runs = []\n\n    def log_run(self, params, metrics):\n        rid = f'run-{len(self.runs) + 1}'\n        self.runs.append((rid, dict(params), dict(metrics)))\n        return rid\n\n    def best_run(self, metric, mode='max'):\n        best_id, best_val = None, None\n        for rid, _, m in self.runs:\n            if metric not in m:\n                continue\n            v = m[metric]\n            if best_val is None or (v > best_val if mode == 'max' else v < best_val):\n                best_id, best_val = rid, v\n        return best_id\n\n    def filter_runs(self, **params):\n        return [rid for rid, p, _ in self.runs if all(k in p and p[k] == v for k, v in params.items())]",
  "hints": ["Keep runs in a list; the id is f'run-{len(runs)+1}'.", "Use strict > or < so ties keep the earliest run."]
}
```

> [!TIP] Interview tips
> - Say what you track: params, metrics by step, artifacts, git SHA, data version, seed, environment.
> - Contrast MLflow (open source, self-hosted, strong registry) with W&B (hosted, rich dashboards and sweeps), and be honest that either works.
> - Pitfall: comparing runs across different data versions or leaky validation splits makes the leaderboard meaningless.
