---
id: experimentation-test-duration
title: Test duration
estimatedMinutes: 10
difficulty: easy
tags: [experimentation, duration, seasonality]
---

## Why it matters
"Can we stop the test early since it's already significant?" or "Why not run it for 3 days with lots of traffic?" Duration questions test whether you understand that time matters for more than sample size.

## Concept
Duration = max of several requirements:

1. **Sample size**: days needed to reach the required n per group.
2. **Full weekly cycles**: run at least 1–2 complete weeks; weekday and weekend users behave differently.
3. **Novelty / primacy effects**: early behavior may not reflect the steady state; longer tests let them fade.
4. **Metric maturity**: a "7-day retention" metric needs users to have 7 days of exposure after entering.
5. **Business cycles**: avoid ending during holidays or promotions unless that's the point.

Don't stop early because the result looks significant (the peeking problem), and don't run forever: long tests accumulate cookie churn, sample pollution and opportunity cost.

## Worked example
Sample size says 9 days. But:
- weekly cycle → round up to 14 days,
- primary metric is 7-day repeat purchase → users entering on day 14 need 7 more days of observation,
- so the final read happens on day 21, with enrollment closing on day 14.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A test reaches its sample size in 3 days thanks to heavy traffic. Why might you still run it for 2 weeks?",
  "options": ["To get a smaller p-value", "Weekly behavior cycles and novelty effects can make a 3-day sample unrepresentative", "Tests must always run 2 weeks by law", "To increase the MDE"],
  "answer": 1,
  "explanation": "Three weekdays may miss weekend users entirely, and early reactions to something new may not last."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `plan_duration(days_for_sample, metric_window_days=0, min_weeks=1)`: enrollment = max(days_for_sample, 7·min_weeks) rounded **up** to a whole number of weeks; return `(enrollment_days, final_read_day)` where final_read_day = enrollment_days + metric_window_days.",
  "starterCode": "import math\n\ndef plan_duration(days_for_sample, metric_window_days=0, min_weeks=1):\n    pass\n\nprint(plan_duration(9, 7))",
  "tests": "assert plan_duration(9, 7) == (14, 21)\nassert plan_duration(3) == (7, 7)\nassert plan_duration(15, 0, 2) == (21, 21)\nassert plan_duration(14, 28) == (14, 42)",
  "solution": "import math\n\ndef plan_duration(days_for_sample, metric_window_days=0, min_weeks=1):\n    days = max(days_for_sample, 7 * min_weeks)\n    enrollment = math.ceil(days / 7) * 7\n    return enrollment, enrollment + metric_window_days",
  "hints": ["Round up to a multiple of 7 with math.ceil(days / 7) * 7.", "The final read waits for the last enrolled users' metric window."]
}
```

> [!TIP] Interview tips
> - List the duration constraints, then take the maximum.
> - Commit to the duration before launch; stopping early on significance inflates false positives.
> - Mention metric maturity for retention-style metrics; it's often forgotten.
