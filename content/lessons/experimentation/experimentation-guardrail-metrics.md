---
id: experimentation-guardrail-metrics
title: Guardrail metrics
estimatedMinutes: 10
difficulty: easy
tags: [experimentation, guardrails, metrics, risk]
---

## Why it matters
A test can win on its primary metric while quietly hurting something important: revenue, latency, support load, trust. Guardrail metrics are how teams catch that, and naming good ones shows business judgment.

## Concept
**Guardrails** are metrics the treatment must **not** degrade beyond an acceptable margin. They're usually not expected to move.

Two kinds:
- **Business guardrails**: revenue per user, retention, unsubscribe / complaint rate, refund rate, ad load.
- **Trust / technical guardrails**: page load time, error and crash rate, SRM, logging completeness.

Practical rules:
- Define them and their thresholds **before** the test ("p95 latency may not increase more than 50 ms").
- Test them with **non-inferiority** logic: you want evidence the harm is smaller than the margin, not just "not significant".
- Many guardrails = many tests; use stricter thresholds or treat them as alarms that trigger investigation.

## Worked example
A new recommendation model increases clicks per session by 4% (primary). Guardrails:

- purchase conversion: −0.1% (CI −0.6% to +0.4%), within the −1% margin ✓
- p95 latency: +180 ms, above the 100 ms limit ✗

Decision: don't launch as is. Optimize serving latency, then retest. The click gain may not survive slower pages anyway.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which is the best guardrail for a test that adds more push notifications to drive engagement?",
  "options": ["Number of notifications sent", "Notification opt-out and app uninstall rates", "Daily active users", "Notification click rate"],
  "answer": 1,
  "explanation": "More notifications can boost short-term engagement while driving opt-outs and uninstalls, the long-term cost."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `guardrail_ok(ci_low, ci_high, margin, higher_is_better=True)`: return True if the CI shows the harm is within the margin. For higher-is-better metrics, require `ci_low > -margin`; for lower-is-better metrics (like latency), require `ci_high < margin`.",
  "starterCode": "def guardrail_ok(ci_low, ci_high, margin, higher_is_better=True):\n    pass\n\nprint(guardrail_ok(-0.6, 0.4, 1.0), guardrail_ok(150, 210, 100, higher_is_better=False))",
  "tests": "assert guardrail_ok(-0.6, 0.4, 1.0) is True\nassert guardrail_ok(-1.4, 0.2, 1.0) is False\nassert guardrail_ok(150, 210, 100, higher_is_better=False) is False\nassert guardrail_ok(-20, 60, 100, higher_is_better=False) is True",
  "solution": "def guardrail_ok(ci_low, ci_high, margin, higher_is_better=True):\n    if higher_is_better:\n        return ci_low > -margin\n    return ci_high < margin",
  "hints": ["Non-inferiority: the worst plausible effect (one end of the CI) must stay inside the margin."]
}
```

> [!TIP] Interview tips
> - Always propose guardrails alongside the primary metric, including one technical metric.
> - Set margins upfront and use non-inferiority reasoning.
> - When a guardrail fails, propose a fix-and-retest path rather than "don't launch" alone.
