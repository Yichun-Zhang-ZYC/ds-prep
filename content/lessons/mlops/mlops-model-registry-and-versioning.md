---
id: mlops-model-registry-and-versioning
title: "Model Registry & versioning"
estimatedMinutes: 11
difficulty: medium
tags: [mlops, model-registry, versioning, deployment, governance]
---

## Why it matters
A registry is the handoff point between training and serving: it answers "which model is in production, who approved it, and how do we roll back?" Expect questions on promotion workflows and lineage.

## Concept
A **model registry** is a central, versioned catalog of trained models with metadata and lifecycle state. In MLflow each **registered model** (a name) has immutable **versions** (1, 2, 3, ...), each pointing to the run and artifact that produced it.

**Stored per version**: artifact URI, source run, code SHA, training data version, metrics, signature (input/output schema), dependencies, description, tags, approver.

**Lifecycle**:
- Classic **stages**: `None` to `Staging` to `Production` to `Archived`. Recent MLflow versions deprecate stages in favour of **aliases** (`champion`, `challenger`) and tags, because a model can be in several roles at once.
- Serving code loads by alias (`models:/fraud@champion`), never by a hard-coded version, so promotion is a metadata change and **rollback** is re-pointing the alias.

**Promotion gate** (automate it in CI):
1. Candidate beats the champion on a fixed evaluation set by a margin (for example +0.5% AUC).
2. No regression on key slices (regions, new users) or on latency and cost.
3. Fairness and compliance checks, signature check, and a model card.
4. Human approval for high-risk models, then canary or shadow rollout.

**Versioning**: the model version is only reproducible if code, data and config are pinned. Use incrementing versions in the registry, and keep the *serving image* version separate from the *model* version.

**Other options**: SageMaker Model Registry, Vertex AI Model Registry, Hugging Face Hub, DVC or Git-LFS for small teams.

**Pitfalls**: overwriting an artifact in place, promoting by hand with no audit trail, and a model version that ignores the feature-pipeline version it expects.

## Worked example
Champion `fraud` v7 has AUC 0.912, p99 latency 40 ms. Candidate v8 trains with AUC 0.918 (+0.006), p99 38 ms, but recall on new accounts drops from 0.71 to 0.64.

Gate: AUC margin passes (needs at least +0.005), latency passes, **slice check fails** (max allowed drop 0.02). v8 stays `challenger`, and the `champion` alias stays on v7. Had it passed, you would run a 5% canary, then move `champion` to v8. If errors spiked, setting the alias back to v7 is the whole rollback.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why should serving code load `models:/fraud@champion` rather than `models:/fraud/8`?",
  "options": ["Aliases make models smaller", "Promotion and rollback become metadata changes with no redeploy", "Version numbers are random", "Aliases speed up inference"],
  "answer": 1,
  "explanation": "Indirection through an alias decouples releases from code deploys and gives one-step rollback."
}
```

```quiz
{
  "id": "q2",
  "question": "A candidate has a higher overall AUC but is much worse on a key segment. What should the promotion gate do?",
  "options": ["Promote it, since overall AUC wins", "Block or escalate it, because slice regressions are explicit gate criteria", "Delete the champion", "Ignore slices when data is large"],
  "answer": 1,
  "explanation": "Aggregate gains can hide harmful regressions; gates should include slice, latency and cost checks."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `Registry`. `register(name, metrics)` creates the next version (1, 2, ...) for `name` and returns it. `promote(name, version, gate)` where `gate = {'metric': str, 'min_gain': float, 'max_slice_drop': float}`: compare the candidate's `metrics[gate['metric']]` with the current champion's; if there is no champion, promote. Otherwise promote only if `candidate - champion >= min_gain - 1e-12` and every slice metric (keys starting with `'slice_'`) present in both has drop `champion - candidate <= max_slice_drop + 1e-12`. Return True and set the alias, else False. `champion(name)` returns the champion version or None. `rollback(name)` sets the champion back to the previous champion (return it; None if there is no history).",
  "starterCode": "class Registry:\n    def __init__(self):\n        self.models = {}\n\n    def register(self, name, metrics):\n        pass\n\n    def promote(self, name, version, gate):\n        pass\n\n    def champion(self, name):\n        pass\n\n    def rollback(self, name):\n        pass\n",
  "tests": "r = Registry()\ngate = {'metric': 'auc', 'min_gain': 0.005, 'max_slice_drop': 0.02}\nassert r.register('fraud', {'auc': 0.912, 'slice_new': 0.71}) == 1\nassert r.register('fraud', {'auc': 0.918, 'slice_new': 0.64}) == 2\nassert r.champion('fraud') is None\nassert r.promote('fraud', 1, gate) is True\nassert r.champion('fraud') == 1\nassert r.promote('fraud', 2, gate) is False\nassert r.champion('fraud') == 1\nassert r.register('fraud', {'auc': 0.915, 'slice_new': 0.72}) == 3\nassert r.promote('fraud', 3, gate) is False\nassert r.register('fraud', {'auc': 0.919, 'slice_new': 0.70}) == 4\nassert r.promote('fraud', 4, gate) is True\nassert r.champion('fraud') == 4\nassert r.rollback('fraud') == 1\nassert r.champion('fraud') == 1\nassert r.rollback('fraud') is None\nassert r.register('other', {'auc': 0.5}) == 1",
  "solution": "class Registry:\n    def __init__(self):\n        self.models = {}\n\n    def _m(self, name):\n        return self.models.setdefault(name, {'versions': [], 'history': []})\n\n    def register(self, name, metrics):\n        m = self._m(name)\n        m['versions'].append(dict(metrics))\n        return len(m['versions'])\n\n    def promote(self, name, version, gate):\n        m = self._m(name)\n        cand = m['versions'][version - 1]\n        if m['history']:\n            champ = m['versions'][m['history'][-1] - 1]\n            if cand[gate['metric']] - champ[gate['metric']] < gate['min_gain'] - 1e-12:\n                return False\n            for k, v in cand.items():\n                if k.startswith('slice_') and k in champ:\n                    if champ[k] - v > gate['max_slice_drop'] + 1e-12:\n                        return False\n        m['history'].append(version)\n        return True\n\n    def champion(self, name):\n        h = self._m(name)['history']\n        return h[-1] if h else None\n\n    def rollback(self, name):\n        h = self._m(name)['history']\n        if len(h) < 2:\n            return None\n        h.pop()\n        return h[-1]",
  "hints": ["Keep a versions list and a champion history stack per model name.", "On rollback, pop the current champion; the new top of the stack is the previous one."]
}
```

> [!TIP] Interview tips
> - Describe the flow: train, log, register a version, evaluate against the champion, gate, canary, promote via alias, with rollback by re-pointing.
> - Say what metadata makes a version reproducible: run, code SHA, data version, signature, dependencies.
> - Pitfall: tracking only the model file and not the feature code or schema it depends on; a model can be "correct" yet unusable.
