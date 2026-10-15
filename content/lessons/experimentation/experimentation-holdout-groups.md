---
id: experimentation-holdout-groups
title: Holdout groups
estimatedMinutes: 10
difficulty: medium
tags: [experimentation, holdouts, long-term-effects]
---

## Why it matters
"Our team shipped 20 winning tests this year, each +1%. Why didn't revenue grow 20%?" Long-term holdouts answer that question honestly, and are a common topic for senior roles.

## Concept
A **holdout** is a small group of users (often 1–5%) who are kept **out** of a set of launched changes for a long time, as a persistent control.

Uses:
- **Cumulative impact**: measure the combined effect of all launches in a quarter or year (individual test lifts often don't add up because of novelty fading, interactions and winner's curse).
- **Long-term effects**: metrics that take months (retention, LTV, churn) and effects that decay or grow over time.
- **Marketing / notification holdouts**: users who never receive a campaign, to measure its true incremental value.

Costs and care:
- Holdout users get a worse (or older) product: keep it small and time-limited.
- Maintaining old code paths is engineering work.
- Watch for contamination (users noticing others have features) and sample erosion over time.

## Worked example
A product team launches 12 features in H1, each with a significant short-term lift summing to +9% engagement. A 2% global holdout measured at the end of H1 shows a cumulative lift of +4%. The gap reflects faded novelty, overlapping effects (features competing for the same attention) and overestimated individual wins: useful calibration for future planning.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why do the lifts of many individually tested launches usually not add up to the total observed impact?",
  "options": ["Holdouts are always biased", "Novelty fades, features interact or cannibalize each other, and selected winners' lifts are biased upward", "Tests are always underpowered", "Revenue can't be measured"],
  "answer": 1,
  "explanation": "A holdout measures the combined, longer-term effect directly."
}
```

## Practice

```reveal
{
  "prompt": "Your email marketing team claims their campaigns drive 15% of all purchases. How would you measure their true incremental impact?",
  "answer": "Attribution (purchases after an email click) overstates impact: many of those customers would have bought anyway.\n\nSet up a **randomized holdout**: e.g. 5% of eligible customers receive no marketing emails for a quarter. Compare purchases per customer between the holdout and the emailed group. The difference is the incremental effect of the email program.\n\nAlso track guardrails like unsubscribes and spam complaints, and consider per-campaign holdouts for finer-grained measurement."
}
```

> [!TIP] Interview tips
> - Propose a holdout whenever someone sums individual test wins or claims attribution-based impact.
> - Mention the cost: some users get a worse experience, so keep holdouts small and time-boxed.
> - Holdouts are the standard way to measure incrementality of marketing and notifications.
