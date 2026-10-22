---
id: mlops-reproducibility-and-governance
title: "Reproducibility & governance"
estimatedMinutes: 12
difficulty: medium
tags: [mlops, reproducibility, governance, lineage, model-cards]
---

## Why it matters
Regulators, auditors and teammates will ask which model made a decision, and whether you can rebuild it. Reproducibility and governance turn ML from notebooks into an auditable system, a frequent senior-level interview topic.

## Concept
**Reproducibility** = same **code + data + config + environment + randomness** gives the same model (or the same metrics within a stated tolerance).
- **Code**: git commit SHA recorded on every run; no uncommitted changes.
- **Data**: immutable, versioned snapshots (DVC, lakeFS, Delta/Iceberg time travel) or content hashes; record the query and time window.
- **Config**: hyperparameters and feature definitions in files, logged with the run, not typed into a notebook.
- **Environment**: pinned dependencies (lock file), container image digest, hardware/driver versions.
- **Randomness**: set seeds for Python, NumPy and the framework; use seeded splits (or hash-based splits by id). Bit-for-bit equality can still fail on GPUs (non-deterministic kernels, parallel reductions) and with changing data order, so define "close enough".
- **Tracking**: an experiment tracker (MLflow, W&B) stores params, metrics, artifacts, and links run → data version → code SHA. Pipelines make steps re-runnable end to end.

**Governance** = who may do what, with what evidence:
- **Model registry** with stages and **approvals** (staging → production needs review); immutable versions and an **audit trail** of who promoted what and when.
- **Lineage**: for any prediction, trace the model version, training run, dataset version and features. Log model version with every prediction.
- **Documentation**: **model cards** (intended use, training data, metrics by slice, limitations) and data sheets.
- **Risk and compliance**: fairness and bias checks, explainability where required, privacy (PII minimisation, GDPR deletion/retention), access control, and regulatory frameworks such as model-risk management (SR 11-7) and the EU AI Act risk tiers.
- **Operational policy**: ownership, on-call, review cadence, retirement of stale models.

## Worked example
An auditor asks: "Which model rejected loan application #8841 on 3 March, and can you reproduce it?" The prediction log gives `model_version = 14`. The registry maps v14 to run `a3f9`, which recorded git SHA `7c1d2e`, dataset snapshot `loans@2024-02-15` (content hash), config `cfg.yaml`, seed 42 and image digest `sha256:ab12...`. Rerunning that run yields the same AUC within 0.001 and the model card shows its approval by the risk team. Without this lineage, the honest answer would be "we cannot say".

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which is NOT normally needed to reproduce a training run?",
  "options": ["The git commit SHA", "A versioned data snapshot or content hash", "The exact seed and pinned dependencies", "The laptop the original engineer used"],
  "answer": 3,
  "explanation": "Reproducibility depends on recorded code, data, config, environment and seeds, not on specific hardware owners."
}
```

```quiz
{
  "id": "q2",
  "question": "A regulator asks which model scored a past customer. What must you have logged?",
  "options": ["Only the final accuracy", "The model version with each prediction, linked in the registry to its run, data and code", "The GPU model", "Nothing: models are stateless"],
  "answer": 1,
  "explanation": "Lineage from prediction to model version to training data and code is what makes decisions auditable."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `run_fingerprint(config, data_rows, code_version, seed)` returning a 64-char hex SHA-256 of a canonical JSON of those four values (`json.dumps(..., sort_keys=True, separators=(',', ':'))`), so key order in `config` does not matter but any change to config, data (including row order), code version or seed changes the hash. Implement `seeded_split(ids, test_frac, seed)` that shuffles a copy of `ids` with `random.Random(seed)` and returns `(train, test)` where `test` has `round(len(ids) * test_frac)` items. Implement `missing_card_fields(card, required)` returning the sorted list of required fields that are absent or empty.",
  "starterCode": "import hashlib\nimport json\nimport random\n\ndef run_fingerprint(config, data_rows, code_version, seed):\n    pass\n\ndef seeded_split(ids, test_frac, seed):\n    pass\n\ndef missing_card_fields(card, required):\n    pass\n",
  "tests": "a = run_fingerprint({'lr': 0.1, 'depth': 3}, [{'x': 1}, {'x': 2}], 'abc123', 42)\nb = run_fingerprint({'depth': 3, 'lr': 0.1}, [{'x': 1}, {'x': 2}], 'abc123', 42)\nassert a == b and len(a) == 64\nassert a != run_fingerprint({'lr': 0.2, 'depth': 3}, [{'x': 1}, {'x': 2}], 'abc123', 42)\nassert a != run_fingerprint({'lr': 0.1, 'depth': 3}, [{'x': 2}, {'x': 1}], 'abc123', 42)\nassert a != run_fingerprint({'lr': 0.1, 'depth': 3}, [{'x': 1}, {'x': 2}], 'abc124', 42)\nassert a != run_fingerprint({'lr': 0.1, 'depth': 3}, [{'x': 1}, {'x': 2}], 'abc123', 43)\nids = list(range(50))\ntr, te = seeded_split(ids, 0.2, 7)\nassert len(te) == 10 and len(tr) == 40\nassert sorted(tr + te) == ids\nassert seeded_split(ids, 0.2, 7) == (tr, te)\nassert seeded_split(ids, 0.2, 8) != (tr, te)\nassert ids == list(range(50))\ncard = {'intended_use': 'credit', 'metrics': {'auc': 0.9}, 'limitations': '', 'owner': 'risk'}\nassert missing_card_fields(card, ['owner', 'limitations', 'metrics', 'training_data']) == ['limitations', 'training_data']",
  "solution": "import hashlib\nimport json\nimport random\n\ndef run_fingerprint(config, data_rows, code_version, seed):\n    payload = {'config': config, 'data': data_rows, 'code': code_version, 'seed': seed}\n    text = json.dumps(payload, sort_keys=True, separators=(',', ':'))\n    return hashlib.sha256(text.encode()).hexdigest()\n\ndef seeded_split(ids, test_frac, seed):\n    items = list(ids)\n    random.Random(seed).shuffle(items)\n    n_test = round(len(items) * test_frac)\n    return items[n_test:], items[:n_test]\n\ndef missing_card_fields(card, required):\n    return sorted(f for f in required if not card.get(f))",
  "hints": ["sort_keys=True makes the JSON independent of dict key order, but list order (rows) still matters.", "Use random.Random(seed) so you do not touch the global random state; shuffle a copy."]
}
```

> [!TIP] Interview tips
> - Define reproducibility as code + data + config + environment + randomness, and say how you record each.
> - Link prediction logs to model version, run, data version and code SHA so any decision can be audited.
> - Cover governance beyond tooling: registry approvals, model cards, fairness and privacy review, ownership and retirement.
