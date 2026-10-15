---
id: experimentation-hypothesis-and-metric-selection
title: Hypothesis and metric selection
estimatedMinutes: 12
difficulty: medium
tags: [experimentation, ab-testing, metrics]
---

## Why it matters
"How would you test this feature?" interviews are graded mostly on the first two minutes: a clear hypothesis and the right primary metric. Everything else (sample size, analysis) depends on them.

## Concept
A good hypothesis names the change, the user behavior it should affect, and the metric that captures it:

> "Showing delivery dates on product pages will reduce purchase uncertainty, increasing **checkout conversion** among product-page visitors."

Choose metrics in layers:

| Layer | Purpose | Example |
|---|---|---|
| **Primary (OEC)** | the one metric that decides launch | conversion per visitor |
| **Secondary** | explain *why* the primary moved | add-to-cart rate, time to purchase |
| **Guardrails** | must not get worse | page load time, refund rate, unsubscribes |

A good primary metric is **sensitive** (moves within the test window), **aligned** with long-term value (not just clicks), **attributable** to the change, and has a clear **unit** (per user, not per pageview, if you randomize by user).

## Worked example
Feature: one-click reorder button for repeat customers.

- Hypothesis: lowering reorder friction increases repeat purchases.
- Primary: orders per eligible user over 14 days (not "button clicks", which is guaranteed to rise).
- Secondary: share of orders via reorder, basket size.
- Guardrails: return rate, customer support contacts, average order value.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Testing a new homepage recommendation widget, which primary metric is best?",
  "options": ["Clicks on the widget", "Purchases (or revenue) per visitor", "Time on homepage", "Number of widget impressions"],
  "answer": 1,
  "explanation": "Widget clicks will almost surely rise and may cannibalize other paths. A per-visitor outcome tied to value is the right decision metric."
}
```

## Practice

```reveal
{
  "prompt": "Your company tests a redesigned onboarding flow for a meditation app. Propose the hypothesis, primary metric, two secondary metrics and two guardrails.",
  "answer": "**Hypothesis**: a shorter onboarding that starts a first session immediately increases early habit formation.\n\n**Primary**: % of new users who complete ≥ 3 sessions in their first 7 days (sensitive, tied to retention).\n\n**Secondary**: onboarding completion rate; time to first session.\n\n**Guardrails**: 30-day subscription conversion (don't trade habits for revenue), uninstall rate in week 1, crash rate.\n\nAlso state the randomization unit (new user) and that the test runs at least two full weeks to cover weekly cycles."
}
```

> [!TIP] Interview tips
> - State one primary metric and justify it before listing others.
> - Avoid "vanity" primaries the treatment mechanically increases (clicks on the new thing).
> - Always add guardrails, including a technical one (latency, errors).
