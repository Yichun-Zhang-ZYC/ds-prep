---
id: product-sense-case-notification-strategy
title: "Case: Notification strategy"
estimatedMinutes: 12
difficulty: medium
tags: [case-study, notifications, growth, uplift, guardrails]
---

## Why it matters
Push, email and in-app notifications are the cheapest engagement lever and the easiest to abuse. "Our notification volume is growing and users are complaining. What would you do?" tests whether you measure incremental value, long-term opt-out cost and relevance together, instead of celebrating click-through rate.

## Concept
**Why open rate and CTR are not enough**: users who tap a notification are the ones who would often have opened the app anyway (cannibalisation of organic sessions). The value of a notification is the **incremental** behaviour it causes.

**Measurement design**:
- **Holdout**: keep a random group with no notifications (or no notifications of a given type) and compare sessions, retention and revenue. This is the gold standard.
- **Per-send randomisation**: randomise the send decision per user per opportunity to measure the causal effect of each notification type, and use it to train **uplift models** ($\hat\tau = P(\text{act}\mid\text{send}) - P(\text{act}\mid\text{no send})$).
- **Long-term holdout**: effects of fatigue appear over weeks, not days.

**Metrics**:
- Primary: incremental active users or sessions, retention, and downstream conversion.
- Engagement: open or tap rate, time to open, conversion from notification.
- **Guardrails**: notification disable and opt-out rate (permanent loss of a channel), app uninstall, unsubscribes, spam complaints, and sessions from other channels.
- **Fatigue curves**: engagement per notification as a function of daily volume.

**Levers**:
- **Relevance**: personalise by user interest and recent behaviour; only send when the predicted incremental value exceeds the expected cost.
- **Frequency capping and pacing**: daily and weekly caps, minimum gaps between sends, and quiet hours.
- **Timing**: send-time optimisation by user's active hours, time zone.
- **Channel and priority**: transactional (receipts, security) always go through; promotional compete for a limited budget. Offer granular preferences so a user can reduce a category instead of disabling the channel.

**Decision rule**: send if $\hat\tau \cdot V - \Delta P(\text{disable}) \cdot C > 0$, where $V$ is the value of an incremental action and $C$ the lifetime cost of losing the channel.

**Pitfalls**: optimising per-notification CTR creates click-bait; opt-out is nearly irreversible; regional and OS rules (iOS permission prompts, Android 13 runtime permission) change the denominators.

## Worked example
A content app sends push notifications. A 4-arm test with 100,000 users per arm (illustrative):

| Arm | Weekly active (wk 1-2) | Weekly active (wk 5-8) | Push disabled |
|---|---|---|---|
| Holdout (none) | 45.0% | 45.0% | 0.5% (baseline) |
| 1 per day | 48.0% | 47.4% | 2.0% |
| 3 per day | 48.8% | 47.5% | 6.0% |

- **1/day vs holdout**: +3.0 pp early, +2.4 pp later. Relative lift = 3.0 / 45.0 = 6.7%. Pooled standard error = $\sqrt{0.465 \times 0.535 \times 2/100{,}000} \approx 0.22$ pp, so z ≈ 13: clearly real.
- **3/day vs 1/day**: +0.8 pp early but only **+0.1 pp** in weeks 5-8 (habituation), while push-disabled is 4 pp higher (4,000 more users who permanently lose the channel).
- The short-term CTR of 3/day looks great, but the extra volume mostly pulls forward activity that would have happened anyway.

**Decision**: ship the 1/day baseline with a frequency cap, then improve relevance rather than volume: send the extra notifications only to users whose predicted uplift is high and whose opt-out risk is low. **Guardrails**: disable rate, uninstall rate, and sessions from other channels. **Follow-up**: keep a 1% long-term holdout to track fatigue, and add category-level preferences so unhappy users can mute only one type.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Notification A has a 12% tap rate and B has 6%. Why might B still be the better notification?",
  "options": [
    "Lower tap rate means less intrusion, always",
    "A's tappers may have opened the app anyway; B may cause more incremental sessions or conversions",
    "Tap rate is only valid for email",
    "B must have a higher open rate"
  ],
  "answer": 1,
  "explanation": "Tap rate measures response, not causal impact. Compare against a holdout to see incremental behaviour."
}
```

```quiz
{
  "id": "q2",
  "question": "Which guardrail is most important to track when increasing notification volume, and why?",
  "options": [
    "Open rate, because it is quick to compute",
    "Notification disable / opt-out rate, because losing the channel is nearly permanent and compounds",
    "Server cost",
    "Number of notification types"
  ],
  "answer": 1,
  "explanation": "An opt-out removes all future notification value for that user, so its cost far exceeds one annoyed session. Track it alongside uninstalls and long-term retention."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `lift_test(x_t, n_t, x_c, n_c)` for a holdout test on a proportion (e.g. weekly active users). Return `(abs_lift, rel_lift, z)` where abs_lift = p_t − p_c, rel_lift = abs_lift / p_c, and z uses the pooled standard error `sqrt(p*(1-p)*(1/n_t + 1/n_c))` with `p = (x_t + x_c) / (n_t + n_c)`.",
  "starterCode": "import math\n\ndef lift_test(x_t, n_t, x_c, n_c):\n    pass\n\nprint(lift_test(48000, 100000, 45000, 100000))",
  "tests": "a, r, z = lift_test(48000, 100000, 45000, 100000)\nassert abs(a - 0.03) < 1e-12\nassert abs(r - 0.03 / 0.45) < 1e-12\nassert abs(z - 13.44) < 0.05\na, r, z = lift_test(500, 1000, 500, 1000)\nassert a == 0 and r == 0 and z == 0",
  "solution": "import math\n\ndef lift_test(x_t, n_t, x_c, n_c):\n    pt, pc = x_t / n_t, x_c / n_c\n    p = (x_t + x_c) / (n_t + n_c)\n    se = math.sqrt(p * (1 - p) * (1 / n_t + 1 / n_c))\n    return pt - pc, (pt - pc) / pc, (pt - pc) / se",
  "hints": [
    "Pooled p combines both groups' successes over both groups' sizes.",
    "z = (p_t − p_c) / SE."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Implement `apply_cap(candidates, cap, min_gap)`. `candidates` is a list of `(id, hour, score)` for one user on one day. Greedily consider candidates by score (highest first, ties by smaller id) and accept one if fewer than `cap` are accepted and its hour differs by at least `min_gap` hours from every accepted one. Return the accepted ids ordered by hour.",
  "starterCode": "def apply_cap(candidates, cap, min_gap):\n    pass\n\nc = [('a', 9, 0.9), ('b', 10, 0.8), ('c', 14, 0.7), ('d', 20, 0.6)]\nprint(apply_cap(c, 2, 3))",
  "tests": "c = [('a', 9, 0.9), ('b', 10, 0.8), ('c', 14, 0.7), ('d', 20, 0.6)]\nassert apply_cap(c, 2, 3) == ['a', 'c']\nassert apply_cap(c, 3, 3) == ['a', 'c', 'd']\nassert apply_cap(c, 1, 0) == ['a']\nassert apply_cap(c, 0, 0) == []\nassert apply_cap([('x', 8, 0.5), ('y', 8, 0.5)], 2, 0) == ['x', 'y']",
  "solution": "def apply_cap(candidates, cap, min_gap):\n    accepted = []\n    for cid, hour, score in sorted(candidates, key=lambda t: (-t[2], t[0])):\n        if len(accepted) >= cap:\n            break\n        if all(abs(hour - h) >= min_gap for _, h, _ in accepted):\n            accepted.append((cid, hour, score))\n    return [cid for cid, h, _ in sorted(accepted, key=lambda t: (t[1], t[0]))]",
  "hints": [
    "Sort by `(-score, id)` for a deterministic greedy order.",
    "Check the gap against all already-accepted notifications."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Implement `should_send(p_send, p_nosend, value, d_disable, disable_cost)`. The expected incremental value is `(p_send - p_nosend) * value`, the expected cost is `d_disable * disable_cost` (the added probability of disabling the channel times its lifetime cost). Return `(send, net)` where `net` is value minus cost and `send` is `net > 0`.",
  "starterCode": "def should_send(p_send, p_nosend, value, d_disable, disable_cost):\n    pass\n\nprint(should_send(0.30, 0.25, 2.0, 0.001, 20.0))",
  "tests": "s, n = should_send(0.30, 0.25, 2.0, 0.001, 20.0)\nassert s and abs(n - (0.1 - 0.02)) < 1e-12\ns, n = should_send(0.26, 0.25, 2.0, 0.001, 20.0)\nassert (not s) and abs(n - (0.02 - 0.02)) < 1e-12\ns, n = should_send(0.2, 0.25, 2.0, 0.0, 20.0)\nassert (not s) and n < 0",
  "solution": "def should_send(p_send, p_nosend, value, d_disable, disable_cost):\n    net = (p_send - p_nosend) * value - d_disable * disable_cost\n    return net > 1e-12, net",
  "hints": [
    "Only the difference p_send − p_nosend counts as value; the base rate would happen anyway.",
    "Use a tiny tolerance so a net of exactly zero does not send."
  ]
}
```

> [!TIP] Interview tips
> - Say the value of a notification is incremental behaviour, so use a holdout (and per-send randomisation) rather than CTR.
> - Treat opt-out and uninstall as the key guardrails: they are near-permanent and compound with volume.
> - Propose levers in order: relevance (uplift targeting), caps and timing, then user controls by category.
