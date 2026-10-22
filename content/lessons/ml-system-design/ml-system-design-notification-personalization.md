---
id: ml-system-design-notification-personalization
title: "Design: Notification personalization"
estimatedMinutes: 13
difficulty: medium
tags: [ml-system-design, notifications, uplift, personalization]
---

## Why it matters
Push, email and in-app notifications are a classic "design a system that decides *whether, when and what* to send" question. It tests whether you see that the target is incremental value (uplift), not click probability, and that every send has a cost: fatigue, opt-outs and uninstalls.

## Concept
**Framing**: for each (user, candidate notification, time) decide *send or not*. Three coupled problems: **eligibility and content** (which candidates exist: social activity, recommendations, promos, reminders), **send/no-send** (is it worth it), and **timing/channel** (when, push vs email vs in-app). Compare with the ranking in *Recommendation feed*: the feed shows items the user already came for, a notification interrupts them, so the bar is much higher.

**Objective**: long-term user value, not opens. A model that predicts $P(\text{open})$ mostly picks users who would have come back anyway. The right quantity is **uplift**:
$$\tau = P(\text{session}\mid\text{send}) - P(\text{session}\mid\text{no send}),\qquad \text{net} = \tau\cdot V - c_{\text{fatigue}}$$
with $V$ the value of an incremental session and $c_{\text{fatigue}} = P(\text{opt-out}\mid\text{send})\cdot\text{LTV}$ plus softer annoyance costs. Send only when net $>0$.

**Pipeline**:
1. *Candidate generation* from event triggers (a friend posted) and scheduled jobs (digest, abandoned cart).
2. *Scoring*: relevance model (per-candidate engagement, multi-task: open, downstream action, opt-out/uninstall as negative heads) and an uplift model (T-/X-learner or a two-model approach) trained on **randomized holdouts**.
3. *Policy layer*: frequency caps per user per day/week, quiet hours by timezone, per-type budgets, dedup, a global send budget for the day; pick the top candidates by net value.
4. *Timing*: send now vs defer to the user's usual active window; a contextual bandit over send-time slots works well.
5. *Logging*: record candidates *not* sent too, with propensities, so you can do off-policy evaluation.

**Data pitfalls**: observational logs are heavily confounded (the old rules sent to engaged users), so keep a small always-on random holdout (1-5%) per notification type. Opens are inflated by auto-open/preview; prefer downstream sessions and conversions inside a window. Optimizing short-term CTR drifts toward clickbait and raises opt-outs, so use the opt-out and uninstall rate as **guardrails**, ideally with a long-running holdout to measure the long-term effect.

**Evaluation**: offline, use uplift curves / Qini on holdout data and IPS or doubly-robust policy value on logged propensities. Online, A/B on sessions/retention at 7-28 days with guardrails: opt-out rate, uninstall rate, notification-disable rate, complaint rate.

**Cold start**: new users get conservative defaults (low cap, onboarding series), explored with bandits.

## Worked example
Illustrative numbers. An incremental session is worth V = \$1.00. Sending a promo raises the chance of an opt-out by $0.2\%$, and an opted-out user is worth LTV = \$20, so c = 0.002 × 20 = \$0.04.

| user | $P(\text{session}\mid\text{send})$ | $P(\text{session}\mid\text{no send})$ | $\tau$ | net |
|---|---|---|---|---|
| A (power user) | 0.40 | 0.38 | 0.02 | 0.02 × 1 − 0.04 = −\$0.02 |
| B (lapsing) | 0.12 | 0.04 | 0.08 | 0.08 × 1 − 0.04 = +\$0.04 |

A has the higher open propensity, but the send is mostly wasted and costs fatigue, so skip A and send to B. A pure CTR model would rank A first.

Measuring $\tau$ from a randomized holdout: 12 of 100 treated users and 4 of 100 control users had a session. $\hat\tau=0.12-0.04=0.08$, $\text{SE}=\sqrt{\frac{0.12\cdot0.88}{100}+\frac{0.04\cdot0.96}{100}}=\sqrt{0.00144}=0.038$. That is about 2.1 standard errors, so promising but needs more data before rollout.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why is ranking users by predicted open probability a poor way to choose who gets a notification?",
  "options": [
    "Open probability cannot be predicted accurately",
    "High-propensity users would often have returned anyway, so the incremental effect (uplift) can be small or negative after fatigue costs",
    "Open rates are always below 1%",
    "It ignores the user's timezone"
  ],
  "answer": 1,
  "explanation": "The decision should maximize incremental value minus costs. Propensity and uplift differ; use randomized holdouts to estimate uplift."
}
```

```quiz
{
  "id": "q2",
  "question": "Which set of guardrail metrics best protects against a notification model that boosts short-term clicks by annoying users?",
  "options": [
    "Model AUC and log loss",
    "Opt-out/notification-disable rate, uninstall rate and complaint rate, checked with a long-running holdout",
    "Server CPU and memory",
    "Number of candidates generated"
  ],
  "answer": 1,
  "explanation": "Fatigue shows up as opt-outs and churn, often weeks later, so track them as guardrails and keep a long-term holdout."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `uplift_estimate(treat, control)` where each list holds 0/1 outcomes; return `(tau_hat, se)` with $\\hat\\tau=\\bar y_t-\\bar y_c$ and $\\text{SE}=\\sqrt{\\hat p_t(1-\\hat p_t)/n_t+\\hat p_c(1-\\hat p_c)/n_c}$. Also write `net_value(p_send, p_nosend, value, cost)` returning $(p_{send}-p_{nosend})\\cdot value - cost$.",
  "starterCode": "import math\n\ndef uplift_estimate(treat, control):\n    pass\n\ndef net_value(p_send, p_nosend, value, cost):\n    pass\n\nprint(uplift_estimate([1] * 12 + [0] * 88, [1] * 4 + [0] * 96), net_value(0.12, 0.04, 1.0, 0.04))",
  "tests": "t, se = uplift_estimate([1] * 12 + [0] * 88, [1] * 4 + [0] * 96)\nassert abs(t - 0.08) < 1e-12\nassert abs(se - 0.0379473) < 1e-6\nt, se = uplift_estimate([1, 1], [1, 1])\nassert t == 0 and se == 0\nassert abs(net_value(0.40, 0.38, 1.0, 0.04) - (-0.02)) < 1e-12\nassert abs(net_value(0.12, 0.04, 1.0, 0.04) - 0.04) < 1e-12",
  "solution": "import math\n\ndef uplift_estimate(treat, control):\n    pt = sum(treat) / len(treat)\n    pc = sum(control) / len(control)\n    se = math.sqrt(pt * (1 - pt) / len(treat) + pc * (1 - pc) / len(control))\n    return pt - pc, se\n\ndef net_value(p_send, p_nosend, value, cost):\n    return (p_send - p_nosend) * value - cost",
  "hints": [
    "Use sum(list)/len(list) for each group mean.",
    "net_value is just uplift times value minus the fatigue cost."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `select_sends(cands, per_user_cap, budget)`. `cands` is a list of `(user, kind, net_value)`. Drop candidates with `net_value <= 0`, sort by net value descending (break ties by user, then kind), then walk the list: skip a candidate if that user already has `per_user_cap` selected, and stop when `budget` sends are selected. Return the list of `(user, kind)` in selection order.",
  "starterCode": "def select_sends(cands, per_user_cap, budget):\n    pass\n\ncands = [('a', 'promo', 0.04), ('a', 'news', 0.03), ('b', 'promo', 0.05), ('c', 'promo', -0.01)]\nprint(select_sends(cands, 1, 5))",
  "tests": "cands = [('a', 'promo', 0.04), ('a', 'news', 0.03), ('a', 'digest', 0.02), ('b', 'promo', 0.05), ('c', 'promo', -0.01), ('d', 'x', 0.01)]\nassert select_sends(cands, 2, 3) == [('b', 'promo'), ('a', 'promo'), ('a', 'news')]\nassert select_sends(cands, 2, 10) == [('b', 'promo'), ('a', 'promo'), ('a', 'news'), ('d', 'x')]\nassert select_sends(cands, 1, 10) == [('b', 'promo'), ('a', 'promo'), ('d', 'x')]\nassert select_sends([('u', 'k', 0.0)], 1, 5) == []\nassert select_sends(cands, 2, 0) == []",
  "solution": "def select_sends(cands, per_user_cap, budget):\n    pool = sorted((c for c in cands if c[2] > 0), key=lambda c: (-c[2], c[0], c[1]))\n    counts = {}\n    out = []\n    for user, kind, _ in pool:\n        if len(out) >= budget:\n            break\n        if counts.get(user, 0) >= per_user_cap:\n            continue\n        counts[user] = counts.get(user, 0) + 1\n        out.append((user, kind))\n    return out",
  "hints": [
    "sorted(..., key=lambda c: (-c[2], c[0], c[1])) gives a deterministic order.",
    "Keep a dict counting selected sends per user."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Design a notification system for a social app that maximizes engagement without annoying users.' Outline your answer.",
  "answer": "**Requirements**: 50M DAU, ~10 candidate notifications per user per day, send-time latency of seconds for event triggers, objective = retained, active users with opt-out rate as a hard guardrail.\n\n**Architecture**: event stream and schedulers -> candidate generator -> feature service (user activity, past notification responses, time since last send, tenure) -> scoring (multi-task relevance model plus uplift model) -> policy layer (caps, quiet hours, per-type budgets, dedup, daily global budget) -> channel/timing selector (bandit over send-time slots) -> delivery service. Log every candidate, decision, propensity and outcome.\n\n**Training and labels**: label = session or downstream action within a window (not raw opens), plus opt-out/uninstall as negative heads. Maintain 1-5% random holdouts per type to train and evaluate uplift without confounding.\n\n**Evaluation**: offline Qini/uplift curves and IPS policy value; online A/B on 7-28 day retention and sessions with guardrails on opt-out, uninstall and complaint rates; a persistent holdout that receives the old policy to catch long-term fatigue.\n\n**Operations**: global kill switch and per-type rate limits, monitoring of send volume and opt-out by cohort, fallback to simple rules if scoring is down, privacy and consent rules (quiet hours, regional opt-in requirements)."
}
```

> [!TIP] Interview tips
> - Say 'uplift, not propensity' early: it is the key insight interviewers look for.
> - Treat fatigue as a cost in the objective and opt-outs as guardrails, not as an afterthought.
> - Mention randomized holdouts and logging unsent candidates with propensities for off-policy evaluation.
> - Cover timing, frequency caps and cold start, and note the decision is send/no-send, not just ranking.
