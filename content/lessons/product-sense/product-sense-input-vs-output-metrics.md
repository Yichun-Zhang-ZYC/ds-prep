---
id: product-sense-input-vs-output-metrics
title: "Input vs output metrics"
estimatedMinutes: 10
difficulty: easy
tags: [product-sense, metrics, leading-indicators]
---

## Why it matters
Interviewers ask "which metrics would you track?" and then "how would you move it?" The gap between the two answers is the difference between input metrics (what you control) and output metrics (what you want). Mixing them up leads to goals nobody can act on.

## Concept
**Output metrics** (lagging) are the results the business cares about: revenue, retention, NPS, DAU. They are slow to move, noisy, and shaped by many teams.

**Input metrics** (leading) are the user behaviours and system properties that *drive* an output and that a team can move directly: onboarding completion, search success rate, p95 latency, % of new users who add 3 friends in week 1.

A useful input metric is:
- **Causally linked** to the output (not only correlated).
- **Fast**: it responds in days, so you can iterate and run experiments.
- **Controllable** by the team that owns it.
- **Predictive**: validated by cohort analysis or a past experiment.

Finding inputs: segment users by early behaviour and compare long-run outcomes (the "aha moment" analysis), then confirm with an experiment. Correlation alone is dangerous: engaged users do everything more, so an early action may be a *symptom* of intent rather than a cause.

Rule of thumb: executives own outputs, teams own inputs, and every input has a written hypothesis of how it moves an output.

## Worked example
A subscription app has 10,000 new users per cohort. Analysis shows users who finish onboarding step 3 ("create first project") in 24 h are the *activated* group:

| Group | Share of cohort | 30-day retention |
|---|---|---|
| Activated | 60% | 55% |
| Not activated | 40% | 22% |

Blended retention (the output) = 0.60 x 0.55 + 0.40 x 0.22 = 0.330 + 0.088 = **41.8%** (4,180 users).

The team targets the input: raise 24-hour activation from 60% to 70%. If the link is causal and the newly activated users retain like the existing activated group, retention becomes 0.70 x 0.55 + 0.30 x 0.22 = 0.385 + 0.066 = **45.1%**, a gain of 3.3 pp (+330 retained users per cohort).

Caveat to say aloud: the 2.5x retention ratio (55% vs 22%) is observational. Users who activate may be more motivated anyway, so the true causal effect is likely smaller; validate with an A/B test of an onboarding nudge, and track the output (retention) to confirm the input actually moved it.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which pair correctly labels the metrics?",
  "options": [
    "Revenue = input, search success rate = output",
    "30-day retention = output, % of users completing onboarding in 24 h = input",
    "DAU = input, p95 latency = output",
    "NPS = input, signups = output"
  ],
  "answer": 1,
  "explanation": "Retention is a lagging result of many things; onboarding completion is a fast behaviour a team can change directly."
}
```

```quiz
{
  "id": "q2",
  "question": "Users who invite a friend in week 1 retain 3x better. What is the right next step?",
  "options": [
    "Make invites mandatory",
    "Declare invites the north star",
    "Run an experiment that encourages invites to test causality",
    "Ignore it because it is only a correlation"
  ],
  "answer": 2,
  "explanation": "The pattern may reflect pre-existing motivation. Test with a randomized nudge; if retention rises among nudged users, the input is plausibly causal."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `blended(act_rate, r_act, r_non)` (overall retention given the activation rate and the retention of each group), `output_gain(old_act, new_act, r_act, r_non)` (change in blended retention if activation moves from `old_act` to `new_act`, assuming the causal link holds), and `retention_ratio(r_act, r_non)`.",
  "starterCode": "def blended(act_rate, r_act, r_non):\n    pass\n\ndef output_gain(old_act, new_act, r_act, r_non):\n    pass\n\ndef retention_ratio(r_act, r_non):\n    pass\n\nprint(blended(0.6, 0.55, 0.22), output_gain(0.6, 0.7, 0.55, 0.22))",
  "tests": "assert abs(blended(0.6, 0.55, 0.22) - 0.418) < 1e-9\nassert abs(blended(1.0, 0.55, 0.22) - 0.55) < 1e-9\nassert abs(output_gain(0.6, 0.7, 0.55, 0.22) - 0.033) < 1e-9\nassert abs(output_gain(0.7, 0.6, 0.55, 0.22) + 0.033) < 1e-9\nassert abs(retention_ratio(0.55, 0.22) - 2.5) < 1e-9",
  "solution": "def blended(act_rate, r_act, r_non):\n    return act_rate * r_act + (1 - act_rate) * r_non\n\ndef output_gain(old_act, new_act, r_act, r_non):\n    return blended(new_act, r_act, r_non) - blended(old_act, r_act, r_non)\n\ndef retention_ratio(r_act, r_non):\n    return r_act / r_non",
  "hints": [
    "Blended retention is a weighted average of the two groups' retention.",
    "The gain simplifies to (new - old) x (r_act - r_non)."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Our output goal is to raise paid conversion. What input metrics would you propose for a photo-editing app, and how would you validate them?'",
  "answer": "**Output**: free-to-paid conversion within 30 days.\n\n**Candidate inputs** (fast, controllable):\n- % of new users who export a first edited photo in session 1 (activation).\n- Number of premium-feature trials per user in week 1 (exposure to value).\n- Paywall view rate and paywall-to-trial rate (funnel efficiency).\n- Edit-to-export time (friction).\n\n**Validate**: (1) cohort analysis: conversion by first-week behaviour, controlling for acquisition channel and device; (2) an experiment on the candidate lever (for example a guided first edit) and check conversion moves, not just the input; (3) check stability across segments.\n\n**Guardrails**: refund rate, 30-day retention of paid users, support tickets. A paywall pushed too early raises conversion but hurts retention.\n\n**Close**: owners and cadence: product owns activation, growth owns paywall experiments, weekly input review, monthly check that inputs still predict the output."
}
```

> [!TIP] Interview tips
> - Say explicitly which metrics are inputs (team-owned) and which are outputs (business-owned), then connect them with a hypothesis.
> - Pitfall: treating correlation between an early action and retention as causal; propose an experiment.
> - Mention Goodhart's law: once an input becomes a target it can be gamed, so pair it with a guardrail.
