---
id: ml-system-design-churn-prediction
title: Churn prediction
estimatedMinutes: 12
difficulty: medium
tags: [ml-system-design, churn, leakage, uplift]
---

## Why it matters
Churn prediction looks like plain classification, which is why interviewers use it to test judgment: defining the label and time windows, avoiding leakage, and deciding what action the prediction triggers and whether it pays off.

## Concept
**1. Define churn and the decision.** Subscription products: cancellation or non-renewal. Non-contractual products: no activity for $N$ days (choose $N$ from the inactivity-gap distribution, e.g. the 90th percentile of gaps between visits). Also fix the **prediction horizon** (will churn within 30 days) and the **action** (offer, outreach, product fix). The action determines the metric and the lead time you need.

**2. Build a snapshot dataset.** Pick many snapshot dates. For each eligible user at snapshot $t$: features from a **lookback window** ($\le t$ only), label from a **horizon window** ($(t, t+h]$). Stack snapshots to get several rows per user; split **by time** (train on earlier snapshots, test on later) and keep a user in one side only if you need independent users. Exclude users already churned or inactive at $t$.

**3. Features**: recency/frequency/monetary (days since last activity, sessions per week, spend), trend features (usage this 7 days vs previous 28), engagement depth (features used), support tickets, payment failures, plan and tenure, acquisition channel, NPS. Leakage traps: cancellation-page visits, "account closed" flags and anything logged after $t$.

**4. Models**: logistic regression or GBDT is usually enough. **Survival analysis** (Cox, discrete-time hazard) predicts *when* and handles censored users; useful when timing drives action. Voluntary vs involuntary churn (failed payments) need different interventions.

**5. Evaluate for the action**: AUC for ranking, but business value comes from **lift/precision in the top-$k$** (the contactable budget), calibrated probabilities for expected value, and drift over time. Naive prediction targets *who will churn*, not *who can be saved*: **uplift modeling** (treatment vs control) targets persuadables and avoids wasting offers on sure-things and lost causes. Validate with a randomized holdout campaign.

**6. Operate**: score weekly/daily to a CRM, log which users received which treatment (for uplift and to avoid contaminating future labels), monitor feature drift, retrain monthly. Fairness and consent apply to targeted offers.

## Worked example
1M subscribers, 5% churn per month = 50,000 churners. Contact the top decile, 100,000 users; 30,000 of them are actual churners.

Precision $=30{,}000/100{,}000=30\%$, so lift $=0.30/0.05=6\times$; recall $=30{,}000/50{,}000=60\%$.

Economics: an offer costs \$5 per contact and saves 20% of churners it reaches, each worth \$120 in remaining revenue. Cost $=100{,}000\times5=\$500{,}000$. Saved revenue $=30{,}000\times0.2\times120=\$720{,}000$. Net $=+\$220{,}000$. Contacting a broader group lowers precision, so gains eventually turn negative; choose $k$ where marginal benefit equals marginal cost.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A churn model has 0.95 AUC offline but is useless in production. You discover a feature, 'visited cancellation page in last 7 days'. What went wrong?",
  "options": [
    "Overfitting from too many trees",
    "Label leakage: the feature is a near-direct signal of the outcome, available too late to act on",
    "Class imbalance",
    "The horizon is too short"
  ],
  "answer": 1,
  "explanation": "The feature leaks the outcome and arrives too late for intervention. Features must be computed as of the snapshot and be actionable at that lead time."
}
```

```quiz
{
  "id": "q2",
  "question": "Why might ranking customers by churn probability be a poor way to target a retention discount?",
  "options": [
    "Probabilities are always uncalibrated",
    "It targets users who would leave anyway or stay anyway; the value is in users whose behavior changes with the offer (uplift)",
    "Discounts never work",
    "AUC is too low for targeting"
  ],
  "answer": 1,
  "explanation": "The decision is causal: target the persuadables, measured with treatment vs control (uplift modeling)."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `churn_labels(activity, snapshot, lookback, horizon)`. `activity` maps user -> list of active days (ints). A user is eligible if active on some day d with `snapshot - lookback < d <= snapshot`. Return `{user: label}` for eligible users where label = 1 if no activity on any day in `(snapshot, snapshot + horizon]`, else 0. Then write `lift_at_k(scores, labels, frac)` = churn rate among the top `ceil(frac * n)` scores divided by the overall churn rate (0.0 if no churners), and `campaign_net(contacted, churners_reached, save_rate, value, cost)` = `churners_reached * save_rate * value - contacted * cost`.",
  "starterCode": "import math\n\ndef churn_labels(activity, snapshot, lookback, horizon):\n    pass\n\ndef lift_at_k(scores, labels, frac):\n    pass\n\ndef campaign_net(contacted, churners_reached, save_rate, value, cost):\n    pass\n\nactivity = {'a': [1, 10, 28], 'b': [5, 25, 40], 'c': [2], 'd': [20, 29]}\nprint(churn_labels(activity, 30, 10, 14))",
  "tests": "activity = {'a': [1, 10, 28], 'b': [5, 25, 40], 'c': [2], 'd': [20, 29]}\nassert churn_labels(activity, 30, 10, 14) == {'a': 1, 'b': 0, 'd': 1}\nassert churn_labels({'x': [31]}, 30, 10, 14) == {}\nscores = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.05]\nlabels = [1, 1, 0, 1, 0, 0, 0, 0, 0, 1]\nassert abs(lift_at_k(scores, labels, 0.2) - 2.5) < 1e-12\nassert lift_at_k([0.5, 0.4], [0, 0], 0.5) == 0.0\nassert abs(campaign_net(100000, 30000, 0.2, 120, 5) - 220000) < 1e-6",
  "solution": "import math\n\ndef churn_labels(activity, snapshot, lookback, horizon):\n    out = {}\n    for u, days in activity.items():\n        if any(snapshot - lookback < d <= snapshot for d in days):\n            out[u] = 0 if any(snapshot < d <= snapshot + horizon for d in days) else 1\n    return out\n\ndef lift_at_k(scores, labels, frac):\n    n = len(scores)\n    base = sum(labels) / n\n    if base == 0:\n        return 0.0\n    k = math.ceil(frac * n)\n    order = sorted(range(n), key=lambda i: -scores[i])[:k]\n    return (sum(labels[i] for i in order) / k) / base\n\ndef campaign_net(contacted, churners_reached, save_rate, value, cost):\n    return churners_reached * save_rate * value - contacted * cost",
  "hints": [
    "The lookback window is the half-open interval (snapshot - lookback, snapshot]; the horizon window is (snapshot, snapshot + horizon].",
    "Lift = precision in the top-k divided by the base rate. In the test, 2 of the top 2 churn (rate 1.0) vs a base rate of 0.4."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Design a churn prediction system for a streaming service.' Outline your answer.",
  "answer": "**Clarify**: churn = cancels or fails to renew; predict 30-day churn so marketing has 2 weeks to act; action = personalized offer/outreach with a fixed monthly budget. Separate voluntary vs involuntary (payment) churn.\n\n**Data**: user x snapshot table (weekly snapshots over 12 months); lookback 28-90 day features: watch hours, recency, genres, device mix, support contacts, billing events, plan/tenure; label = cancellation effective in (t, t+30]. Time-based split; no post-t features.\n\n**Model**: GBDT baseline vs a simple logistic regression and a recency heuristic; calibrate; add a survival or uplift model once treatment logs exist.\n\n**Evaluation**: PR-AUC, lift/precision at the contact budget, calibration; online randomized holdout (offer vs none) to measure incremental retention and revenue net of discount cost.\n\n**Deployment**: weekly batch scoring into the CRM, log treatments, monitor drift and campaign ROI, retrain monthly. Risks: label delay, seasonality (new releases), training on users already treated."
}
```

> [!TIP] Interview tips
> - Start by defining churn, horizon and the action; everything else follows.
> - Describe snapshot construction with a lookback window and a horizon window to show you can prevent leakage.
> - Evaluate at the contact budget (lift or precision at top-k), not just AUC.
> - Distinguish propensity to churn from uplift, and propose a randomized holdout to measure true impact.
