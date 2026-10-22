---
id: ml-system-design-fraud-detection
title: Fraud detection
estimatedMinutes: 14
difficulty: hard
tags: [ml-system-design, fraud, imbalance, real-time]
---

## Why it matters
Fraud detection packs the hardest ML-design themes into one problem: extreme class imbalance, delayed and biased labels, adversaries who adapt, asymmetric costs and a hard real-time latency limit.

## Concept
**Framing**: score each transaction/login/signup in real time and return **approve / step-up (3-D Secure, OTP) / review / decline**. The objective is dollars saved minus customer friction, not accuracy.

**Data and labels**:
- Fraud rate is ~0.01-1%. Labels come from **chargebacks** (arrive 30-90 days later), manual review and customer reports. Recent data is therefore **immature**: train on transactions old enough to have matured, and expect label noise (friendly fraud, unreported fraud).
- **Selection bias**: declined transactions never reveal their true label. Keep a small random holdout that is approved regardless (with spend caps) for unbiased training/evaluation, or use reject inference.
- Split **by time**, never randomly, and group by card/account to avoid leakage.

**Features** (computed in a streaming feature pipeline, point-in-time correct):
- *Velocity*: counts and sums per card/device/IP/merchant over 1 min, 1 h, 24 h; distinct cards per device.
- *Behavioral*: deviation from the account's usual amount, merchant category, hour, geography; "impossible travel".
- *Entity/graph*: shared devices, addresses, emails across accounts; connected-component fraud rate; graph embeddings or GNN scores for rings.
- *Device and network*: device fingerprint, emulator/VPN flags, IP reputation.

**Models**: gradient-boosted trees are the workhorse (tabular, fast, interpretable via SHAP); add an anomaly/unsupervised score for new attack types; layer **hand-written rules** for known patterns and compliance (rules deploy in minutes). Handle imbalance with class weights or downsampling (then re-calibrate), not blind SMOTE.

**Metrics**: ROC-AUC is misleading at 0.1% prevalence; use **precision-recall AUC**, recall at a fixed false-positive rate or review capacity, and **dollar-weighted** loss. The threshold comes from costs: flag when $p \cdot L > (1-p)\cdot C_{fp}$, where $L$ is the loss if fraud is approved and $C_{fp}$ the cost of friction or review.

**Serving**: p99 < ~100 ms, online feature store (Redis/DynamoDB), fail-open or fail-closed policy defined, shadow-mode launches, champion/challenger. **Monitor** score drift and fraud-rate-by-segment; adversaries adapt, so retrain often and keep an analyst feedback loop.

## Worked example
10M transactions/day, 0.1% fraud = 10,000 frauds, average loss \$120 each. A false alarm costs \$5 (review time plus customer friction).

With no model the daily loss is $10{,}000 \times 120=\$1{,}200{,}000$.

A model flags 20,000 transactions and 6,000 are real fraud: precision $=6000/20000=30\%$, recall $=6000/10000=60\%$. Cost: missed fraud $4{,}000\times120=\$480{,}000$ plus false alarms $14{,}000\times5=\$70{,}000$, total \$550,000, saving \$650,000 per day. Raising recall further is only worth it while each extra flagged transaction has fraud probability above $5/(120+5)=4\%$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A fraud model scores 0.99 ROC-AUC on a test set with 0.1% fraud, but analysts say it is useless at the operating point. What is the best explanation and fix?",
  "options": [
    "AUC is wrong; use accuracy",
    "ROC-AUC hides the huge number of false positives at low prevalence; evaluate precision-recall and cost at the chosen threshold",
    "The test set is too large",
    "Add more trees"
  ],
  "answer": 1,
  "explanation": "With 10M negatives, even a 1% false-positive rate means 100k false alarms. PR curves and cost-based metrics expose this."
}
```

```quiz
{
  "id": "q2",
  "question": "Chargebacks arrive up to 90 days after a transaction. How does this affect training and evaluation?",
  "options": [
    "No effect; label everything as non-fraud until proven otherwise and train on yesterday's data",
    "Recent transactions have incomplete labels, so use a time-based split with a maturity lag and consider faster proxy labels (manual review, early disputes)",
    "Random split is fine",
    "Delete old data"
  ],
  "answer": 1,
  "explanation": "Treating immature negatives as truly negative biases the model toward missing new fraud patterns."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `precision_recall_at_k(scores, y, k)` returning `(precision, recall)` when the top-k highest scores are flagged (stable order for ties; recall = 0.0 if there are no positives). Then write `best_threshold(scores, y, fn_cost, fp_cost)`: flag a transaction when `score >= t`; try every distinct score as `t`; return `(t, total_cost)` with the lowest cost, breaking ties by the larger `t`.",
  "starterCode": "def precision_recall_at_k(scores, y, k):\n    pass\n\ndef best_threshold(scores, y, fn_cost, fp_cost):\n    pass\n\nscores = [0.9, 0.8, 0.7, 0.4, 0.3, 0.1]\ny = [1, 1, 0, 1, 0, 0]\nprint(precision_recall_at_k(scores, y, 2), best_threshold(scores, y, 10, 1))",
  "tests": "scores = [0.9, 0.8, 0.7, 0.4, 0.3, 0.1]\ny = [1, 1, 0, 1, 0, 0]\np, r = precision_recall_at_k(scores, y, 2)\nassert abs(p - 1.0) < 1e-12 and abs(r - 2 / 3) < 1e-12\np, r = precision_recall_at_k(scores, y, 4)\nassert abs(p - 0.75) < 1e-12 and abs(r - 1.0) < 1e-12\nassert precision_recall_at_k([0.5, 0.2], [0, 0], 1) == (0.0, 0.0)\nt, c = best_threshold(scores, y, 10, 1)\nassert t == 0.4 and c == 1\nt, c = best_threshold(scores, y, 1, 10)\nassert t == 0.8 and c == 1\nt, c = best_threshold([0.5, 0.5], [1, 0], 3, 3)\nassert t == 0.5 and c == 3",
  "solution": "def precision_recall_at_k(scores, y, k):\n    order = sorted(range(len(scores)), key=lambda i: -scores[i])[:k]\n    tp = sum(y[i] for i in order)\n    pos = sum(y)\n    return tp / k, (tp / pos if pos else 0.0)\n\ndef best_threshold(scores, y, fn_cost, fp_cost):\n    best = None\n    for t in sorted(set(scores), reverse=True):\n        fn = sum(1 for s, yi in zip(scores, y) if s < t and yi == 1)\n        fp = sum(1 for s, yi in zip(scores, y) if s >= t and yi == 0)\n        cost = fn * fn_cost + fp * fp_cost\n        if best is None or cost < best[1]:\n            best = (t, cost)\n    return best",
  "hints": [
    "sorted() is stable, so sorting indices by -score keeps ties in input order.",
    "Iterate thresholds from high to low and only replace the best on a strictly lower cost; that keeps the larger t on ties."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Design a real-time fraud detection system for card payments.' Outline your answer.",
  "answer": "**Requirements**: 5k TPS peak, decision in < 100 ms, 0.1% fraud, loss and friction both matter; decisions: approve/step-up/decline.\n\n**Architecture**: payment event -> feature service (online store of velocity counters updated by a stream job, entity lookups, device data) -> rules engine + GBDT model + (async) graph score -> decision service with cost-based thresholds -> action. All events and decisions logged for training.\n\n**Training**: time-based split, matured labels, features backfilled point-in-time from the same definitions as online (feature store); class weights; recalibrate probabilities; random approved holdout to counter selection bias.\n\n**Evaluation**: PR-AUC, recall at fixed review capacity, dollar loss; shadow mode, then canary A/B on a small traffic slice with fraud-loss and decline-rate guardrails.\n\n**Monitoring and adaptation**: feature/score drift, fraud rate by segment, label-delay-aware performance, daily/weekly retrain, analyst queue feedback, rule-authoring workflow for emergencies. Define fail-open vs fail-closed per risk tier."
}
```

> [!TIP] Interview tips
> - Open with the cost matrix and the decision options; the threshold falls out of the costs.
> - Raise label delay, selection bias from declined transactions and time-based splits yourself.
> - Say why PR metrics beat ROC-AUC at low prevalence.
> - Mention rules plus ML, graph features for rings, and that adversaries adapt (drift, fast retraining).
