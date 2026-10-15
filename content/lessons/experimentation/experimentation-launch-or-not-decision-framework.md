---
id: experimentation-launch-or-not-decision-framework
title: "\"Launch or not?\" decision framework"
estimatedMinutes: 15
difficulty: medium
tags: [experimentation, decision-making, case-interview, product-sense]
---

## Why it matters
Almost every experimentation case interview ends with "So, would you launch?" A one-word answer fails. Interviewers want a structured decision that weighs trust in the data, statistical and practical significance, guardrails, and business context.

## Concept
Work through four questions, in order:

1. **Can I trust the result?** Check sample ratio mismatch (SRM), logging, test duration (at least one full weekly cycle), and novelty effects. If the data is broken, stop here.
2. **Is the primary metric effect real and big enough?** Look at the confidence interval, not just the p-value. Compare it with the **minimum practical effect** (the smallest lift worth the cost of launching and maintaining).
3. **Did any guardrail get worse?** Latency, crashes, unsubscribes, revenue. A significant guardrail regression usually blocks launch even when the primary metric wins.
4. **What does the business context say?** Cost of the change, reversibility, strategic value, and whether effects differ by segment.

Map the confidence interval for the lift against the practical threshold $\delta$:

| CI for lift | Decision |
|---|---|
| Entirely above $\delta$ | Launch (if guardrails are fine) |
| Above 0 but includes values below $\delta$ | Significant but maybe not worth it: weigh cost, or extend the test |
| Includes 0, wide | Underpowered: extend or redesign; don't call it "no effect" |
| Includes 0, narrow around 0 | Real "no meaningful effect": don't launch unless there's another reason |
| Entirely below 0 | Don't launch; learn why |

## Worked example
A new checkout flow: conversion lift +1.2%, 95% CI [+0.4%, +2.0%], with $\delta$ = 0.5%. SRM check passes and the test ran 14 days. Guardrails: page latency +30 ms (not significant), refund rate unchanged.

The CI is above 0 but its lower end (0.4%) is just under $\delta$. Most of the interval clears the bar, guardrails are clean, and the change is easy to roll back. Recommendation: **launch**, keep a small holdout to confirm the long-run effect, and monitor latency.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "The primary metric lift is +3% (p = 0.01), but the crash rate rose significantly from 0.20% to 0.35%. What's the best answer?",
  "options": ["Launch: the primary metric is significant", "Don't launch yet: fix the crash regression, then re-test", "Ignore crashes because they're rare", "Run the test longer until crashes become non-significant"],
  "answer": 1,
  "explanation": "A significant guardrail regression usually blocks launch. Find and fix the cause, then re-run. Waiting for significance to disappear is p-hacking."
}
```

```quiz
{
  "id": "q2",
  "question": "The lift's 95% CI is [−4%, +6%]. Which conclusion is correct?",
  "options": ["The feature has no effect", "The test is underpowered; we can't distinguish a meaningful gain from a meaningful loss", "The feature should launch because the point estimate is positive", "The feature hurts the metric"],
  "answer": 1,
  "explanation": "A wide interval spanning 0 means inconclusive, not 'no effect'. Extend the test or increase the sample."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `decide(ci_low, ci_high, delta, guardrail_breached, trustworthy)` that returns one of `'investigate'`, `'do not launch'`, `'launch'`, `'judgment call'`, `'extend test'`, `'no meaningful effect'`. Rules in order: untrustworthy data → `'investigate'`; guardrail breached → `'do not launch'`; `ci_high < 0` → `'do not launch'`; `ci_low >= delta` → `'launch'`; `ci_low > 0` → `'judgment call'`; if the CI includes 0 and its width is greater than `2 * delta` → `'extend test'`; otherwise → `'no meaningful effect'`.",
  "starterCode": "def decide(ci_low, ci_high, delta, guardrail_breached, trustworthy):\n    pass\n\nprint(decide(0.6, 2.0, 0.5, False, True))",
  "tests": "assert decide(0.6, 2.0, 0.5, False, True) == 'launch'\nassert decide(0.6, 2.0, 0.5, True, True) == 'do not launch'\nassert decide(0.6, 2.0, 0.5, False, False) == 'investigate'\nassert decide(0.2, 1.5, 0.5, False, True) == 'judgment call'\nassert decide(-4, 6, 0.5, False, True) == 'extend test'\nassert decide(-0.3, 0.4, 0.5, False, True) == 'no meaningful effect'\nassert decide(-2, -0.5, 0.5, False, True) == 'do not launch'",
  "solution": "def decide(ci_low, ci_high, delta, guardrail_breached, trustworthy):\n    if not trustworthy:\n        return 'investigate'\n    if guardrail_breached or ci_high < 0:\n        return 'do not launch'\n    if ci_low >= delta:\n        return 'launch'\n    if ci_low > 0:\n        return 'judgment call'\n    if ci_high - ci_low > 2 * delta:\n        return 'extend test'\n    return 'no meaningful effect'",
  "hints": ["Order matters: trust and guardrails come before the primary metric.", "Width of the interval is ci_high − ci_low."]
}
```

```reveal
{
  "prompt": "Case: a recommendation change raises clicks by +5% (significant) but time spent per session is flat and 7-day retention shows −0.3% (CI [−0.8%, +0.2%]). Would you launch?",
  "answer": "Walk the framework out loud:\n\n1. **Trust**: confirm SRM, duration (≥ 1–2 weeks), and check novelty, since click lifts often fade.\n2. **Primary metric**: clicks are a proxy. If session time is flat, users may be clicking more but finding less value (clickbait-style recommendations).\n3. **Guardrail**: retention isn't significantly down, but the CI includes a −0.8% loss, which could outweigh the click gain. Retention is closer to long-term value.\n4. **Context**: is the change cheap to revert? Do new vs. tenured users behave differently?\n\nRecommendation: **don't launch broadly yet**. Extend the test or run a larger retention-powered test, inspect click quality (downstream actions per click), and consider a holdout. Launch only if retention is shown to be flat within an agreed margin."
}
```

> [!TIP] Interview tips
> - Say the framework first ("trust → primary metric → guardrails → business context"), then apply it.
> - Always separate statistical significance from practical significance; quote the CI.
> - End with a clear recommendation plus follow-ups (holdout, monitoring, segment analysis). "It depends" without a decision loses points.
