---
id: product-sense-counter-guardrail-metrics
title: "Counter / guardrail metrics"
estimatedMinutes: 10
difficulty: medium
tags: [product-sense, metrics, guardrails]
---

## Why it matters
Any metric you push hard will eventually be gamed or will hurt something else. Interviewers expect every success metric to come with guardrails, and they probe whether you can make a ship decision when the primary metric wins and a guardrail loses.

## Concept
**Guardrail metrics** protect things that must not get worse (retention, latency, trust, revenue, unsubscribe rate). **Counter metrics** are paired directly with a primary metric to catch its predictable side effect: speed vs quality, volume vs accuracy, engagement vs satisfaction.

Common pairs:
- Notifications sent / CTR vs **opt-out and uninstall rate**.
- Support tickets resolved per hour vs **CSAT and reopen rate**.
- Conversion rate vs **refund / chargeback rate**.
- Model recall vs **precision or false-positive cost**.
- Feature adoption vs **page latency, crash rate**.

Practical rules:
- Set a **threshold up front** (for example, opt-out may rise at most 0.3 pp), not after seeing results.
- Distinguish **hard guardrails** (breach blocks launch: crashes, privacy, payment errors) from **soft ones** (breach triggers discussion).
- Guardrails need enough **power**: a flat result on an underpowered guardrail is not safety; check the confidence interval against the threshold, not just significance.
- Include **long-term** counters (30-day retention) because short-term wins can borrow from the future.
- With many guardrails, correct for multiple comparisons or pre-declare a small set.

Ship rule: primary significantly positive AND no hard-guardrail breach (CI upper bound within tolerance).

## Worked example
A team tests more push notifications on 100,000 users per arm. Primary metric: daily active users per user (DAU/user).

| Metric | Control | Treatment | Delta | Allowed |
|---|---|---|---|---|
| DAU/user | 0.200 | 0.206 | +3.0% (95% CI +1.2% to +4.8%) | primary |
| Notification opt-out | 1.0% | 1.8% | +0.8 pp | +0.3 pp max |
| 30-day retention | 41.0% | 40.9% | -0.1 pp | -0.5 pp max |
| App crash rate | 0.40% | 0.41% | +0.01 pp | +0.05 pp max |

The primary clears zero (CI lower bound +1.2%) and retention and crashes are within tolerance, but **opt-out breaches its guardrail by 0.5 pp**. Opt-outs are also permanent: each opted-out user loses the channel forever, which hits future DAU even if the 30-day numbers look fine.

Decision: do not ship as is. Iterate (cap frequency, personalize timing, send only high-value notifications) and re-test, or ship to the segment where opt-out stayed within tolerance. Stating the trade-off in numbers shows judgment, not just metric vocabulary.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A new checkout flow raises conversion by 2%. Which counter metric is most important to check?",
  "options": [
    "Page views per session",
    "Refund and chargeback rate",
    "Number of A/B tests running",
    "Average session length"
  ],
  "answer": 1,
  "explanation": "Easier checkout can push through accidental or low-intent purchases; refunds and chargebacks reveal whether conversion is real value."
}
```

```quiz
{
  "id": "q2",
  "question": "The retention guardrail shows -0.2 pp, p = 0.74, with a 95% CI of [-1.4, +1.0] pp and a tolerance of -0.5 pp. What is the right reading?",
  "options": [
    "Safe, because it is not significant",
    "Inconclusive: the CI includes harm beyond the tolerance, so more power or a rollout with monitoring is needed",
    "Breached, because the point estimate is negative",
    "Irrelevant, because the primary won"
  ],
  "answer": 1,
  "explanation": "Non-significance is not evidence of safety. Compare the CI to the pre-set tolerance; the lower bound -1.4 pp exceeds the -0.5 pp limit."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Each guardrail is `name: (delta, max_allowed)` where `delta` is the change in the harmful direction (positive = worse). Write `guardrail_breaches(guardrails)` returning the sorted names with `delta > max_allowed`, and `decide(primary_ci_low, guardrails)` returning `'block'` if any guardrail is breached, else `'ship'` if `primary_ci_low > 0`, else `'inconclusive'`.",
  "starterCode": "def guardrail_breaches(guardrails):\n    pass\n\ndef decide(primary_ci_low, guardrails):\n    pass\n\ng = {'optout': (0.8, 0.3), 'retention': (0.1, 0.5), 'crash': (0.01, 0.05)}\nprint(guardrail_breaches(g), decide(1.2, g))",
  "tests": "g = {'optout': (0.8, 0.3), 'retention': (0.1, 0.5), 'crash': (0.01, 0.05)}\nassert guardrail_breaches(g) == ['optout']\nassert decide(1.2, g) == 'block'\nok = {'retention': (0.1, 0.5), 'crash': (0.05, 0.05)}\nassert guardrail_breaches(ok) == []\nassert decide(1.2, ok) == 'ship'\nassert decide(-0.3, ok) == 'inconclusive'\nassert decide(0.0, ok) == 'inconclusive'\nassert guardrail_breaches({'b': (2, 1), 'a': (3, 1)}) == ['a', 'b']",
  "solution": "def guardrail_breaches(guardrails):\n    return sorted(k for k, (d, m) in guardrails.items() if d > m)\n\ndef decide(primary_ci_low, guardrails):\n    if guardrail_breaches(guardrails):\n        return 'block'\n    return 'ship' if primary_ci_low > 0 else 'inconclusive'",
  "hints": [
    "A delta exactly equal to the limit is not a breach (strictly greater).",
    "Check guardrails before looking at the primary."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Your team launches an auto-reply feature for customer support that cuts average handle time by 20%. What counter and guardrail metrics do you track?'",
  "answer": "**Primary**: average handle time (and tickets resolved per agent-hour).\n\n**Counter metrics** (the obvious side effect of speed is lower quality):\n- CSAT and post-contact survey score.\n- Reopen / repeat-contact rate within 7 days (fake resolutions).\n- Escalation rate to senior agents.\n\n**Guardrails**: policy or compliance error rate from sampled QA review, wrong-answer rate on audited replies, agent adoption and override rate, churn of contacting customers over 30 days.\n\n**Thresholds**: set before launch (for example CSAT may drop at most 1 pt, reopen rate may rise at most 2 pp). Use sampled human QA because automated metrics miss tone errors.\n\n**Decision**: ship if handle time falls with CSAT and reopen within tolerance; if reopen rises, the 20% saving is partly an illusion, so quantify net cost (extra contacts x cost per contact) against the savings."
}
```

> [!TIP] Interview tips
> - Always pair a metric with a named counter metric and a numeric tolerance fixed before the test.
> - Pitfall: treating a non-significant guardrail as safe; look at the confidence interval against the tolerance.
> - Mention long-term effects (opt-outs and churn are hard to reverse) when short-term numbers look good.
