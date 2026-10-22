---
id: mlops-automated-retraining
title: Automated retraining
estimatedMinutes: 11
difficulty: medium
tags: [mlops, retraining, ci-cd, champion-challenger]
---

## Why it matters
Models decay as the world changes, but retraining by hand does not scale past a handful of models. Interviewers ask when a model should be retrained, what triggers it, and how you stop a bad retrain from reaching production.

## Concept
**Retraining triggers** (often combined):
- **Schedule**: fixed cadence (daily, weekly). Simple and predictable; wasteful if nothing changed, too slow if something broke.
- **Drift-based**: input or prediction drift (PSI, KS) crosses a threshold. Works without labels.
- **Performance-based**: live metric (once labels arrive) falls more than a tolerance below the baseline.
- **Data-based**: enough new labelled rows have accumulated, or a new data source landed.

**An automated retraining pipeline** is a normal ML pipeline run by the orchestrator: pull a fresh snapshot → validate data → build features → train → evaluate → register → gated promotion.
- **Champion-challenger gate**: evaluate the new model on the *same* recent holdout as the current production model; promote only if it beats the champion by a margin larger than noise.
- **Safe rollout**: promoted models still go through shadow/canary before taking full traffic, and the previous version stays in the registry for rollback.
- **Guardrails**: cooldown (minimum days between retrains), data-validation failures abort the run, compute budget, and human approval for high-risk models.

**Pitfalls**: retraining on data produced by the model's own decisions creates **feedback loops**; label delay means the freshest data is unlabelled; retraining on a drift caused by an upstream bug just bakes the bug in.

## Worked example
A fraud model retrains weekly (schedule) and also whenever PSI on the top features exceeds 0.2 (drift). After a retrain, the champion scores AUC 0.912 on last week's holdout. The challenger scores 0.915, a gain of 0.003, below the required margin of 0.005, so it is **not** promoted (the gain is within noise). The next retrain scores 0.921 > 0.912 + 0.005 = 0.917, so it is registered as `staging` and enters a 5% canary.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why must the challenger and the champion be evaluated on the same holdout?",
  "options": ["It is cheaper", "Different holdouts make the metric difference reflect data differences, not model quality", "The registry requires it", "To avoid retraining"],
  "answer": 1,
  "explanation": "A fair comparison holds the evaluation data fixed so the difference comes from the models, not from easier or harder samples."
}
```

```quiz
{
  "id": "q2",
  "question": "A model's input features drift sharply because an upstream job started emitting nulls. What should automated retraining do?",
  "options": ["Retrain immediately on the new data", "Fail data validation and alert, not retrain", "Delete the old model", "Lower the drift threshold"],
  "answer": 1,
  "explanation": "Retraining on corrupted data bakes the bug in. Data validation should abort the run and page the owner."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `should_retrain(days_since_train, psi, live_metric, baseline_metric, min_days=1, max_days=30, psi_thresh=0.2, drop_tol=0.03)` returning a reason string or `None`. Rules in order: if `days_since_train < min_days` return `None` (cooldown); if `psi > psi_thresh` return `'drift'`; if `baseline_metric - live_metric > drop_tol` return `'performance'`; if `days_since_train >= max_days` return `'schedule'`; else `None`. Also implement `promote(champion, challenger, margin)` returning True only if the challenger beats the champion by more than `margin`.",
  "starterCode": "def should_retrain(days_since_train, psi, live_metric, baseline_metric, min_days=1, max_days=30, psi_thresh=0.2, drop_tol=0.03):\n    pass\n\ndef promote(champion, challenger, margin):\n    pass\n",
  "tests": "assert should_retrain(0, 0.5, 0.5, 0.9) is None\nassert should_retrain(10, 0.25, 0.9, 0.9) == 'drift'\nassert should_retrain(10, 0.25, 0.8, 0.9) == 'drift'\nassert should_retrain(10, 0.1, 0.85, 0.90) == 'performance'\nassert should_retrain(10, 0.1, 0.88, 0.90) is None\nassert should_retrain(30, 0.1, 0.9, 0.9) == 'schedule'\nassert promote(0.912, 0.921, 0.005) is True\nassert promote(0.912, 0.915, 0.005) is False\nassert promote(0.9, 0.85, 0.0) is False",
  "solution": "def should_retrain(days_since_train, psi, live_metric, baseline_metric, min_days=1, max_days=30, psi_thresh=0.2, drop_tol=0.03):\n    if days_since_train < min_days:\n        return None\n    if psi > psi_thresh:\n        return 'drift'\n    if baseline_metric - live_metric > drop_tol:\n        return 'performance'\n    if days_since_train >= max_days:\n        return 'schedule'\n    return None\n\ndef promote(champion, challenger, margin):\n    return challenger > champion + margin",
  "hints": ["The cooldown check comes first so a noisy signal cannot trigger back-to-back retrains.", "promote compares challenger against champion + margin, not just champion."]
}
```

> [!TIP] Interview tips
> - Name the trigger types (schedule, drift, performance, data) and say you combine them with a cooldown.
> - Always gate promotion with a champion-challenger comparison on the same holdout, then canary/shadow.
> - Mention validation before training and feedback loops: retraining blindly on bad or self-generated data makes things worse.
