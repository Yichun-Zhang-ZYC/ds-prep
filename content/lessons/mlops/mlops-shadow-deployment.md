---
id: mlops-shadow-deployment
title: Shadow deployment
estimatedMinutes: 9
difficulty: medium
tags: [mlops, deployment, shadow, testing-in-production]
---

## Why it matters
How do you test a new model on real traffic without risking users? Shadow deployment is the safest first step and a common interview answer for "how would you roll out a new model?".

## Concept
In a **shadow (dark launch)** deployment, the production model keeps serving users while a **copy of each request** is also sent to the candidate model. The candidate's predictions are **logged, never returned** to the user.

**What you learn** (with zero user impact):
- **Operational**: latency (p50/p95/p99), error rate, memory/CPU, behaviour on real edge cases and malformed inputs.
- **Output behaviour**: prediction distribution, agreement with the production model, and where they disagree.
- **Offline quality on live data**: once labels arrive, score both models on the *same* requests for a paired comparison.

**How to build it**: mirror traffic at the gateway/service mesh (Istio, Envoy) or in the app; call the shadow **asynchronously** with a timeout so it can never slow or break the main response; log request id, features, both predictions and model versions; sample if cost matters.

**Limits**:
- **No causal business impact**: users never see the shadow output, so click-through or conversion cannot be measured. For that use a canary or A/B test.
- **Feedback effects are absent** (e.g. a recommender's ranking changes what users click).
- **Double compute cost** and extra load on shared feature stores.
- Side effects (writes, emails, charges) must be disabled in the shadow path.

Typical sequence: offline eval → **shadow** → canary → full rollout.

## Worked example
A new ranking model shadows 10,000 live requests. Decisions agree with production on 94% of requests; mean score difference is 0.04. Shadow p95 latency is 180 ms vs 120 ms for production against a 150 ms SLO, so the release is **blocked** until the model is optimised (distilled or quantised) even though quality looks fine. Agreement is checked on a slice too: the disagreements are concentrated in new users, which is flagged for review.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What is the key limitation of shadow deployment?",
  "options": ["It risks user experience", "Users never see the shadow output, so you cannot measure its effect on user behaviour or business metrics", "It cannot measure latency", "It needs labels immediately"],
  "answer": 1,
  "explanation": "Shadow output is not served, so there are no behavioural outcomes. Use canary or A/B testing to measure business impact."
}
```

```quiz
{
  "id": "q2",
  "question": "Why call the shadow model asynchronously with a timeout?",
  "options": ["To improve its accuracy", "So a slow or failing shadow can never delay or break the user's response", "To reduce storage", "To avoid logging"],
  "answer": 1,
  "explanation": "The production path must be isolated from the candidate's failures and latency."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `shadow_report(prod, shadow, prod_lat, shadow_lat, threshold=0.5)` where `prod` and `shadow` are score lists for the same requests. Return a dict with `agreement` (share of requests where `score >= threshold` decisions match), `mean_abs_diff` (mean absolute score difference), and `p95_prod` / `p95_shadow` (nearest-rank p95: sorted value at 1-based rank `ceil(0.95 * n)`; use integer arithmetic `(95 * n + 99) // 100`). Then implement `can_promote(report, min_agreement, max_latency_ratio)`: True if agreement is at least `min_agreement` and `p95_shadow <= max_latency_ratio * p95_prod`.",
  "starterCode": "def shadow_report(prod, shadow, prod_lat, shadow_lat, threshold=0.5):\n    pass\n\ndef can_promote(report, min_agreement, max_latency_ratio):\n    pass\n",
  "tests": "r = shadow_report([0.2, 0.8, 0.6, 0.4], [0.3, 0.7, 0.4, 0.45], list(range(1, 21)), [x * 2 for x in range(1, 21)])\nassert abs(r['agreement'] - 0.75) < 1e-12\nassert abs(r['mean_abs_diff'] - 0.1125) < 1e-12\nassert r['p95_prod'] == 19 and r['p95_shadow'] == 38\nassert can_promote(r, 0.7, 2.0) is True\nassert can_promote(r, 0.8, 2.0) is False\nassert can_promote(r, 0.7, 1.5) is False\nr2 = shadow_report([0.9], [0.9], [100], [100])\nassert r2['agreement'] == 1.0 and r2['p95_prod'] == 100",
  "solution": "def _p95(vals):\n    s = sorted(vals)\n    rank = (95 * len(s) + 99) // 100\n    return s[rank - 1]\n\ndef shadow_report(prod, shadow, prod_lat, shadow_lat, threshold=0.5):\n    n = len(prod)\n    agree = sum((a >= threshold) == (b >= threshold) for a, b in zip(prod, shadow))\n    diff = sum(abs(a - b) for a, b in zip(prod, shadow)) / n\n    return {'agreement': agree / n, 'mean_abs_diff': diff, 'p95_prod': _p95(prod_lat), 'p95_shadow': _p95(shadow_lat)}\n\ndef can_promote(report, min_agreement, max_latency_ratio):\n    return report['agreement'] >= min_agreement and report['p95_shadow'] <= max_latency_ratio * report['p95_prod']",
  "hints": ["Compare decisions (score >= threshold), not raw scores, for agreement.", "For n = 20, the p95 rank is (95 * 20 + 99) // 100 = 19, so take sorted index 18."]
}
```

> [!TIP] Interview tips
> - Frame shadow as zero-risk validation of latency, errors and output behaviour on real traffic, before any user exposure.
> - State its limit: no user-behaviour or business metrics, so follow with a canary or A/B test.
> - Mention isolation: async mirroring, timeouts, no side effects, and logging both predictions for paired comparison.
