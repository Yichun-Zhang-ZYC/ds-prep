---
id: product-sense-define-success-for-a-feature
title: "Define success for a feature"
estimatedMinutes: 12
difficulty: medium
tags: [product-sense, metrics, product-case]
---

## Why it matters
"How would you measure the success of feature X?" is the single most common product-sense question. A strong answer is a structured chain from goal to user behaviour to metrics, targets and guardrails, not a list of favourite KPIs.

## Concept
Use a repeatable skeleton:
1. **Clarify the goal**: why does the feature exist (growth, engagement, revenue, cost, trust)? Who is it for (segment) and what changes in their behaviour?
2. **Hypothesis**: "If users can do X, they will do Y more, which drives business outcome Z."
3. **Metric tree**: *adoption* (do they try it), *engagement* (do they use it repeatedly and well), *outcome* (does the target behaviour or business metric move). Pick **one primary** metric tied to the goal.
4. **Guardrails and counters**: what could break (latency, quality, cannibalization of another feature, supply side, cost).
5. **Targets and timeline**: baseline, expected lift, minimum effect worth shipping, when to read out (allow for novelty effects).
6. **Measurement plan**: A/B test or holdout; compare *incremental* outcomes, not just adopters.

Incrementality matters: adopters are self-selected and usually already your best users. Never claim success from "adopters do 25% more"; compare randomized treatment vs control. The overall lift is diluted by adoption:

$$\text{overall lift} \approx \text{adoption} \times \text{lift among adopters}$$

Also separate **leading** metrics (adoption, week-1 usage) read in weeks from **lagging** ones (retention, revenue) read in months.

## Worked example
A job board launches **saved searches with email alerts**. Goal: help seekers find relevant jobs faster so they apply more, which feeds employers.

Metric tree:
- Adoption: % of weekly active seekers who create a saved search within 14 days. Target 15%.
- Engagement: alert open rate, click-through to job, % of alerts that lead to an application.
- **Primary outcome**: applications per seeker per week (baseline 2.0).
- Guardrails: unsubscribe rate, spam complaints, application quality (employer interview-request rate), server cost of alert jobs.

Sizing with 1,000,000 weekly seekers: if 15% adopt and adopters apply 25% more (relative), overall lift = 0.15 x 0.25 = **3.75%**, so applications go from 2.0 to 2.075 per seeker, or +75,000 applications per week (1,000,000 x 2.0 x 0.0375).

If leadership wants +5% overall, adoption must reach 0.05 / 0.25 = **20%**, or the per-adopter effect must be bigger. If the experiment shows only +10% among adopters, 15% adoption yields just +1.5%.

Read-out at 4 weeks to account for novelty, with a long-term holdback group to check that applications are not simply shifted earlier and that the interview-request rate does not fall.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Users who enabled the new feature show 30% higher retention. Why can't you call it a success from this alone?",
  "options": [
    "Retention is a vanity metric",
    "Adopters are self-selected and were probably more engaged to begin with; you need a randomized comparison",
    "30% is too small",
    "Retention cannot be measured per feature"
  ],
  "answer": 1,
  "explanation": "Selection bias: engaged users adopt more features. Only a randomized treatment/control (or a credible quasi-experiment) isolates the feature's incremental effect."
}
```

```quiz
{
  "id": "q2",
  "question": "Which is the best primary metric for a saved-search alert feature on a job board?",
  "options": [
    "Number of alerts sent",
    "Alert open rate",
    "Applications per active seeker",
    "Saved searches created"
  ],
  "answer": 2,
  "explanation": "Applications per seeker tracks the goal (finding and acting on relevant jobs). Alerts sent and saved searches are adoption/activity; open rate can rise with clickbait subject lines."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `overall_lift(adoption, adopter_lift)` (diluted relative lift), `needed_adoption(target_lift, adopter_lift)` (adoption required to hit a target overall lift, capped at 1.0), and `extra_events(users, baseline, adoption, adopter_lift)` (additional events per week, e.g. applications).",
  "starterCode": "def overall_lift(adoption, adopter_lift):\n    pass\n\ndef needed_adoption(target_lift, adopter_lift):\n    pass\n\ndef extra_events(users, baseline, adoption, adopter_lift):\n    pass\n\nprint(overall_lift(0.15, 0.25), needed_adoption(0.05, 0.25), extra_events(1_000_000, 2.0, 0.15, 0.25))",
  "tests": "assert abs(overall_lift(0.15, 0.25) - 0.0375) < 1e-12\nassert abs(overall_lift(0.15, 0.10) - 0.015) < 1e-12\nassert abs(needed_adoption(0.05, 0.25) - 0.2) < 1e-12\nassert needed_adoption(0.50, 0.25) == 1.0\nassert abs(extra_events(1_000_000, 2.0, 0.15, 0.25) - 75_000) < 1e-6",
  "solution": "def overall_lift(adoption, adopter_lift):\n    return adoption * adopter_lift\n\ndef needed_adoption(target_lift, adopter_lift):\n    return min(1.0, target_lift / adopter_lift)\n\ndef extra_events(users, baseline, adoption, adopter_lift):\n    return users * baseline * overall_lift(adoption, adopter_lift)",
  "hints": [
    "Only the adopting share of users gets the lift, so the overall effect is the product.",
    "Invert the formula for needed_adoption, then cap at 1."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'How would you define success for Slack Huddles (lightweight audio rooms in channels)?'",
  "answer": "**Goal**: make quick synchronous conversations cheaper than scheduling a meeting, increasing team collaboration and stickiness (and reducing churn to other tools).\n\n**Hypothesis**: if starting a call is one click inside the conversation, teams hold more short calls and resolve issues faster, so they use Slack more and renew.\n\n**Metrics**:\n- Adoption: % of active workspaces and users who start or join a huddle within 30 days.\n- Engagement: huddles per active workspace per week, median duration (short is a feature), repeat usage in week 2-4.\n- **Primary**: weekly active huddle users among eligible users (or workspaces with at least 3 huddle users).\n- Outcome: workspace retention and seat expansion for adopters vs matched or randomized controls.\n\n**Guardrails**: message volume and channel activity (not replacing written decisions), call quality (join failure and audio drop rate), CPU and battery, usage of integrated meeting tools, support tickets.\n\n**Targets and timing**: 25% workspace adoption in 90 days; read leading metrics at 4 weeks, retention at 3-6 months, with a holdout where feasible. Segment by company size and remote vs hybrid."
}
```

> [!TIP] Interview tips
> - Walk the chain: goal, user, behaviour, primary metric, secondary, guardrails, target, measurement.
> - Pitfall: crediting the feature with adopters' behaviour; insist on incremental effect via an experiment.
> - Pick one primary metric and say why it is the right one; a long list of equal metrics signals no priorities.
