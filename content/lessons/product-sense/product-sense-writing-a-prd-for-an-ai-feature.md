---
id: product-sense-writing-a-prd-for-an-ai-feature
title: Writing a PRD for an AI feature
estimatedMinutes: 10
difficulty: medium
tags: [product-sense, ai-pm, prd, evaluation, launch]
---

## Why it matters

A classic PRD says what the feature does; an AI PRD must also say how well it must do it, on which inputs, and what happens when it is wrong. Interviewers use "write a PRD for X" to see whether you can turn a fuzzy model capability into testable requirements, launch gates and a rollout plan.

## Concept

Sections of an AI-feature PRD, in order:

1. **Problem and user**: who, which job, current workflow and pain, with baseline numbers.
2. **Goals and non-goals**: one primary success metric, a few guardrails, and an explicit list of what is out of scope (languages, intents, document types).
3. **Behavior spec**: input/output contract plus **example cases**: good, bad and edge cases that become the **golden eval set**. Say what the system should refuse or escalate.
4. **Quality bar per slice**: thresholds such as "task success at least 85% overall and at least 80% on every top-5 language", measured offline before launch.
5. **Non-functional budgets**: p95 latency, cost per request, throughput, availability.
6. **Failure modes and UX**: how uncertainty, refusals, errors and fallbacks look; how users correct the AI; feedback capture.
7. **Data, privacy and risk**: sources, consent, retention, PII handling, risk tier and mitigations.
8. **Evaluation plan**: offline metrics, human review, LLM-judge calibration, then online A/B test with success and guardrail metrics.
9. **Rollout**: internal dogfood, shadow mode (model runs, output hidden), canary 1-5%, ramp, with **launch gates** and rollback triggers.
10. **Monitoring and ownership**: dashboards, drift and quality alerts, retraining cadence, on-call owner.

The key difference: requirements are statistical (rates on a test set), so each needs a number, a dataset and a measurement method.

## Worked example

PRD excerpt for "AI reply suggestions for support agents" (replies drafted from the ticket and knowledge base; the agent edits and sends).

**Problem**: average handle time is 9.0 minutes; 40% of replies repeat templated content.

**Primary metric**: suggestion acceptance rate (sent with at most light edits) at least 35% by week 4 of the ramp. **Business outcome**: handle time down at least 10% (to 8.1 minutes or less) in the A/B test. **Non-goals**: refunds, legal topics, languages other than English and Spanish.

**Quality bar (offline, 400 golden tickets)**: factual accuracy at least 90%, harmful or policy-violating output at most 0.1%, no fabricated order data. **Budgets**: p95 latency at most 2.5 s, cost at most \$0.01 per suggestion.

**Failure UX**: if retrieval confidence is low, show "no suggestion" instead of a guess; one-click thumbs-down with reason.

**Rollout**: shadow on 10% of tickets for a week to compare against agent replies, then 5% of agents, 25%, 100%. Roll back if harmful rate exceeds 0.1% or acceptance falls below 20% for two days. Every item has a number, an eval set and a decision rule.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which requirement is written the way an AI PRD should state it?",
  "options": [
    "The assistant should be accurate",
    "At least 90% factual accuracy on the 400-ticket golden set, and at least 85% on every top-5 language",
    "Use the best available model",
    "Users will love it"
  ],
  "answer": 1,
  "explanation": "A testable requirement names a metric, a threshold, a dataset and the slices it must hold on."
}
```

```quiz
{
  "id": "q2",
  "question": "What is the purpose of shadow mode before a canary?",
  "options": [
    "Hide the feature from competitors",
    "Run the model on live traffic without showing outputs, to compare against real outcomes at zero user risk",
    "Speed up the model",
    "Reduce training data"
  ],
  "answer": 1,
  "explanation": "Shadow mode validates quality, latency and cost on real inputs before any user is affected."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `failed_gates(measured, gates)`. `gates` maps metric name → `(op, threshold)` where op is `'>='` or `'<='`; `measured` maps metric name → value. Return a sorted list of metric names that fail their gate. A metric missing from `measured` counts as failing. Then write `launch_decision(measured, gates)` returning `'ship'` if nothing fails, otherwise `'hold: ' + ', '.join(sorted_failures)`.",
  "starterCode": "def failed_gates(measured, gates):\n    pass\n\ndef launch_decision(measured, gates):\n    pass\n\ngates = {'accuracy': ('>=', 0.9), 'harmful_rate': ('<=', 0.001), 'p95_latency_s': ('<=', 2.5)}\nprint(launch_decision({'accuracy': 0.92, 'harmful_rate': 0.0004, 'p95_latency_s': 2.1}, gates))",
  "tests": "gates = {'accuracy': ('>=', 0.9), 'harmful_rate': ('<=', 0.001), 'p95_latency_s': ('<=', 2.5)}\nok = {'accuracy': 0.92, 'harmful_rate': 0.0004, 'p95_latency_s': 2.1}\nassert failed_gates(ok, gates) == []\nassert launch_decision(ok, gates) == 'ship'\nbad = {'accuracy': 0.88, 'harmful_rate': 0.002, 'p95_latency_s': 2.5}\nassert failed_gates(bad, gates) == ['accuracy', 'harmful_rate']\nassert launch_decision(bad, gates) == 'hold: accuracy, harmful_rate'\nmissing = {'accuracy': 0.95, 'harmful_rate': 0.0}\nassert failed_gates(missing, gates) == ['p95_latency_s']\nassert launch_decision(missing, gates) == 'hold: p95_latency_s'",
  "solution": "def failed_gates(measured, gates):\n    fails = []\n    for name, (op, thr) in gates.items():\n        v = measured.get(name)\n        if v is None:\n            fails.append(name)\n        elif op == '>=' and not v >= thr:\n            fails.append(name)\n        elif op == '<=' and not v <= thr:\n            fails.append(name)\n    return sorted(fails)\n\ndef launch_decision(measured, gates):\n    f = failed_gates(measured, gates)\n    return 'ship' if not f else 'hold: ' + ', '.join(f)",
  "hints": [
    "Use `measured.get(name)`; None means the metric was not measured, which fails.",
    "Boundary values pass: 2.5 <= 2.5 is true."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Write the outline of a PRD for an AI feature that auto-generates product descriptions for a marketplace seller tool.'",
  "answer": "**Problem**: sellers spend about 12 minutes per listing; 30% of listings have thin descriptions that convert worse.\n\n**Goals**: primary: listings published with an AI description (adoption) at least 40% of eligible listings; outcome: listing conversion lift (A/B on buyers) and time-to-publish down 50%. **Non-goals**: regulated categories, translation.\n\n**Behavior spec**: input is title, attributes, photos; output is 80-150 words, uses only provided attributes, no unverifiable claims (for example \"FDA approved\"). 300 golden listings across the top 10 categories, with unacceptable examples.\n\n**Quality bar**: attribute faithfulness at least 98% (no invented specs), policy-violation at most 0.1%, seller acceptance with light edits at least 50%, checked per category.\n\n**Budgets**: p95 under 5 s, cost under $0.02 per description.\n\n**UX and failure**: editable draft, highlight claims not found in attributes, regenerate button, clear AI label.\n\n**Risks**: IP and brand-name misuse, misleading claims, bias in tone; guardrail classifiers and human review for flagged items.\n\n**Rollout**: shadow, 5% of sellers, A/B, ramp; rollback if faithfulness or policy metrics regress.\n\n**Ownership**: weekly quality review, drift alerts, owner on call."
}
```

> [!TIP] Interview tips
> - Every AI requirement needs a metric, a threshold, a dataset and slices; vague adjectives fail.
> - Include non-goals, failure UX and a golden eval set built from examples in the PRD itself.
> - End with a staged rollout (shadow, canary, ramp) with explicit launch gates and rollback triggers.
