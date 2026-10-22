---
id: experimentation-case-notifications-and-email
title: "Case: Notification and email experiments"
estimatedMinutes: 13
difficulty: medium
tags: [experimentation, notifications, email, incrementality, case-study]
---

## Why it matters
Push, email and SMS programs are the classic place where "attributed" results are wildly inflated and the real costs (opt-outs, fatigue) show up weeks later. Interviewers ask how to prove a campaign is incremental and when to stop sending.

## Concept
**Playbook** (builds on Holdout groups and Guardrail metrics):
1. **Randomize users, not sends.** Assign each eligible user to *send* or *holdout* **before** any eligibility filter that depends on behaviour after assignment (opens, clicks).
2. **Analyze by assignment (intention-to-treat, ITT).** Compare **all** assigned-to-send users with **all** holdout users. Never compare "openers" with the holdout: opening is post-treatment selection.
3. **Handle non-delivery.** Some users never get the message (no push token, bounced email, notifications disabled). The ITT effect is diluted by the **delivery rate** $d$. The effect on those actually reached (CACE, via the Wald estimator) is $\text{ITT} / d$.
4. **Incrementality vs attribution.** "Purchases within 24h of a click" counts people who would have bought anyway. Only the randomized difference is incremental.
5. **Guardrails with long fuse**: unsubscribe/opt-out rate, push-permission revocation, spam complaints, app uninstalls. An opt-out is a permanent loss of a channel, so price it with LTV.
6. **Frequency and timing tests**: test *cadence* (1 vs 3 per week) as arms against a no-send holdout; effects often saturate while opt-outs keep rising. Evaluate over 4+ weeks to capture fatigue.
7. **Pitfalls**: cross-channel substitution (push suppresses email conversions), triggered messages where the trigger itself is post-assignment, and novelty in the first sends.

## Worked example
A retailer tests a weekly promo email (illustrative numbers). 190,000 users are randomized to send, 10,000 to holdout. Only 80% of the send group is deliverable.

- Purchase rate (7 days): send 4.20%, holdout 3.90%. **ITT = +0.30 pp**.
- Effect on reachable users: $0.30 / 0.80 = +0.375$ pp.
- The email tool reports **1.10%** of recipients "purchased after clicking": taken as lift, that overstates the true incremental lift by $1.10/0.30 \approx 3.7\times$.
- Guardrail: unsubscribes 0.45% in send vs 0.00% in holdout (they cannot unsubscribe from what they never get; measure with a matched baseline such as the previous 4 weeks).

With \$40 average order value and \$25 estimated lifetime value per retained subscriber: per 1,000 users, incremental revenue is $1000 \times 0.003 \times 40 = 120$ dollars against lost subscriber value $1000 \times 0.0045 \times 25 = 112.5$ dollars. Marginally positive: the cadence deserves a test, not a celebration.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why is comparing users who opened the email with the holdout group biased?",
  "options": [
    "Opening is decided after assignment and correlates with purchase intent, so it breaks randomization",
    "Openers are too few",
    "Holdout users also open emails",
    "It lowers statistical power only"
  ],
  "answer": 0,
  "explanation": "Conditioning on a post-treatment behaviour selects engaged users in one arm only. Analyze all assigned users (ITT)."
}
```

```quiz
{
  "id": "q2",
  "question": "ITT lift is +0.2 pp and only 50% of the send group received the message. What is the estimated effect on users who actually received it?",
  "options": [
    "+0.1 pp",
    "+0.2 pp",
    "+0.4 pp",
    "+0.5 pp"
  ],
  "answer": 2,
  "explanation": "Wald / CACE estimate = ITT / delivery rate = 0.2 / 0.5 = 0.4 pp, assuming delivery only affects outcomes through receiving the message and holdout users cannot receive it."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `itt_and_cace(n_s, buy_s, n_h, buy_h, delivery_rate)`: `buy_*` are purchaser counts. Return `(itt, cace)` where itt = buy_s/n_s - buy_h/n_h (as fractions) and cace = itt / delivery_rate.",
  "starterCode": "def itt_and_cace(n_s, buy_s, n_h, buy_h, delivery_rate):\n    pass\n\nprint(itt_and_cace(190000, 7980, 10000, 390, 0.8))",
  "tests": "itt, cace = itt_and_cace(190000, 7980, 10000, 390, 0.8)\nassert abs(itt - 0.003) < 1e-12\nassert abs(cace - 0.00375) < 1e-12\nitt, cace = itt_and_cace(1000, 50, 1000, 50, 1.0)\nassert itt == 0 and cace == 0",
  "solution": "def itt_and_cace(n_s, buy_s, n_h, buy_h, delivery_rate):\n    itt = buy_s / n_s - buy_h / n_h\n    return itt, itt / delivery_rate",
  "hints": [
    "7,980 / 190,000 = 4.2% and 390 / 10,000 = 3.9%.",
    "Divide the ITT by the delivery rate for the effect on reached users."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `attribution_inflation(attributed_rate, itt)` returning attributed_rate / itt, i.e. how many times the attributed conversion rate overstates the incremental lift. Raise `ValueError` if `itt <= 0`. Then write `incremental_share(attributed_rate, itt)` = itt / attributed_rate, the share of attributed conversions that are truly incremental.",
  "starterCode": "def attribution_inflation(attributed_rate, itt):\n    pass\n\ndef incremental_share(attributed_rate, itt):\n    pass\n\nprint(attribution_inflation(0.011, 0.003), incremental_share(0.011, 0.003))",
  "tests": "assert abs(attribution_inflation(0.011, 0.003) - 11 / 3) < 1e-9\nassert abs(incremental_share(0.011, 0.003) - 3 / 11) < 1e-9\ntry:\n    attribution_inflation(0.01, 0)\n    assert False\nexcept ValueError:\n    pass",
  "solution": "def attribution_inflation(attributed_rate, itt):\n    if itt <= 0:\n        raise ValueError('itt must be positive')\n    return attributed_rate / itt\n\ndef incremental_share(attributed_rate, itt):\n    return itt / attributed_rate",
  "hints": [
    "The inflation factor and the incremental share are reciprocals.",
    "1.1% attributed vs 0.3% incremental gives about 3.7x."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Write `net_value_per_1000(itt, aov, unsub_delta, subscriber_ltv)` = 1000*itt*aov - 1000*unsub_delta*subscriber_ltv, and `breakeven_unsub(itt, aov, subscriber_ltv)` = the unsubscribe-rate increase at which net value is exactly zero.",
  "starterCode": "def net_value_per_1000(itt, aov, unsub_delta, subscriber_ltv):\n    pass\n\ndef breakeven_unsub(itt, aov, subscriber_ltv):\n    pass\n\nprint(net_value_per_1000(0.003, 40, 0.0045, 25), breakeven_unsub(0.003, 40, 25))",
  "tests": "assert abs(net_value_per_1000(0.003, 40, 0.0045, 25) - 7.5) < 1e-9\nassert abs(breakeven_unsub(0.003, 40, 25) - 0.0048) < 1e-12\nassert abs(net_value_per_1000(0.003, 40, breakeven_unsub(0.003, 40, 25), 25)) < 1e-9",
  "solution": "def net_value_per_1000(itt, aov, unsub_delta, subscriber_ltv):\n    return 1000 * itt * aov - 1000 * unsub_delta * subscriber_ltv\n\ndef breakeven_unsub(itt, aov, subscriber_ltv):\n    return itt * aov / subscriber_ltv",
  "hints": [
    "Set 1000*itt*aov = 1000*u*ltv and solve for u.",
    "0.003 * 40 / 25 = 0.0048."
  ]
}
```

```reveal
{
  "prompt": "Interview: \"Growth wants to triple push notification volume because CTR is 8%. What do you do?\"",
  "answer": "**Reframe**: CTR measures attention, not incremental value, and the marginal send is worth less than the average send.\n\n**Test**: randomize users into 1x, 2x, 3x weekly volume plus a small no-notification holdout. Hold the targeting rules fixed and analyze all assigned users (ITT).\n\n**Metrics**: primary is incremental 28-day sessions or purchases versus the holdout; plus marginal lift per extra send (the 2x vs 1x and 3x vs 2x differences, not the 3x vs 0x average).\n\n**Guardrails**: push opt-out/permission revocation, uninstalls, email opt-outs (cross-channel), 28-day retention. Run at least 4 weeks to see fatigue.\n\n**Decision**: if 3x adds +0.05 pp conversion over 2x but raises opt-outs by 0.3 pp, price the opt-out with LTV; most likely the answer is a smarter, personalized cap (uplift-based targeting) rather than blanket volume."
}
```

> [!TIP] Interview tips
> - Say "incremental" and "holdout" early; attribution and CTR are not lift.
> - Analyze all assigned users (ITT), then scale by delivery rate if asked for the effect on reached users.
> - Always price the long-fuse guardrail: opt-outs and permission loss are permanent.
