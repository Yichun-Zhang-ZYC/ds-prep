---
id: product-sense-metric-frameworks
title: "Metric frameworks (AARRR, HEART)"
estimatedMinutes: 12
difficulty: easy
tags: [product-sense, metrics, aarrr, heart, funnel]
---

## Why it matters
When asked "how would you measure the health of product X?", a framework gives you structure so you do not list random metrics. AARRR and HEART are the two most-cited; interviewers want to see you pick one for a reason and then go beyond it.

## Concept
**AARRR ("pirate metrics")** follows the user lifecycle funnel. Best for growth and acquisition-driven businesses:
- **Acquisition**: how users find you (visits, signups, CAC by channel).
- **Activation**: first value moment (completed onboarding, first purchase).
- **Retention**: they come back (D1/D7/D30 retention, WAU/MAU).
- **Revenue**: they pay (conversion to paid, ARPU, LTV).
- **Referral**: they bring others (invite rate, viral coefficient $k$).

**HEART** (Google) measures user experience quality of a *feature or product area*; use it with Goals - Signals - Metrics for each dimension:
- **Happiness**: satisfaction (CSAT, NPS, ratings).
- **Engagement**: depth/frequency of use (sessions per week, actions per session).
- **Adoption**: new users of a feature (% of eligible users trying it in 7 days).
- **Retention**: continued use over time.
- **Task success**: efficiency and error rate (completion rate, time to complete, errors).

Choosing: AARRR answers "where does the business leak?" (whole-product funnel); HEART answers "is this experience good for users?" (feature-level UX). In practice combine: use AARRR to find the weak stage, HEART to evaluate the fix. Always add a guardrail and name the segment (new vs existing users, platform).

Funnel arithmetic: overall conversion = product of step rates, so a relative lift in any step lifts the end of the funnel by the same relative amount. Prioritize by headroom vs a benchmark and by how fixable the step is.

## Worked example
A budgeting app sees this monthly AARRR funnel:

| Stage | Users | Step rate | Benchmark |
|---|---|---|---|
| Visits | 100,000 | - | - |
| Signups (Acquisition) | 20,000 | 20% | 22% |
| Activated (linked a bank in 24 h) | 12,000 | 60% | 80% |
| Retained at week 4 | 4,200 | 35% | 40% |
| Paying (Revenue) | 1,260 | 30% | 30% |

Overall visit-to-paid = 0.20 x 0.60 x 0.35 x 0.30 = 1.26%.

Relative shortfall vs benchmark = 1 - rate/benchmark: signup 9%, **activation 25%**, retention 12.5%, revenue 0%. Activation has the most headroom, and it is a classic fixable step (bank linking friction).

Impact: lifting activation to 80% gives 100,000 x 0.20 x 0.80 = 16,000 activated, then 16,000 x 0.35 = 5,600 retained and 5,600 x 0.30 = **1,680 payers** (+420, +33%).

Then switch to HEART for the fix: Task success (bank-link completion rate, time to link, error rate) and Happiness (post-onboarding CSAT) judge whether the new flow is actually better, with retention as the guardrail.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You are asked to evaluate the quality of the new in-app search feature. Which framework fits best?",
  "options": [
    "AARRR, because search drives acquisition",
    "HEART, using Task success (search success rate, time to result) and Engagement",
    "Neither, use revenue only",
    "AARRR's Referral stage"
  ],
  "answer": 1,
  "explanation": "HEART evaluates the user experience of a specific feature. Task success and Engagement map directly to search quality; AARRR is a whole-funnel growth lens."
}
```

```quiz
{
  "id": "q2",
  "question": "A funnel has step rates 50%, 40% and 10%. Which statement about adding end-to-end conversions is correct?",
  "options": [
    "Step 1 from 50% to 55% adds the most",
    "Step 2 from 40% to 42% adds the most",
    "Step 3 from 10% to 11% adds the most",
    "Steps 1 and 3 tie (+10% relative each) and both beat step 2 (+5% relative)"
  ],
  "answer": 3,
  "explanation": "End-to-end conversion is the product of step rates, so only the relative lift matters: 50 to 55 and 10 to 11 each multiply the total by 1.10, while 40 to 42 multiplies it by 1.05."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `step_rates(counts)` (conversion of each stage from the previous one, as a list of floats), `overall_rate(counts)` (last count divided by first), and `biggest_gap(rates, benchmarks)` returning the index of the step with the largest relative shortfall `1 - rate/benchmark`.",
  "starterCode": "def step_rates(counts):\n    pass\n\ndef overall_rate(counts):\n    pass\n\ndef biggest_gap(rates, benchmarks):\n    pass\n\ncounts = [100000, 20000, 12000, 4200, 1260]\nr = step_rates(counts)\nprint(r, overall_rate(counts), biggest_gap(r, [0.22, 0.80, 0.40, 0.30]))",
  "tests": "counts = [100000, 20000, 12000, 4200, 1260]\nr = step_rates(counts)\nassert len(r) == 4\nassert all(abs(a - b) < 1e-9 for a, b in zip(r, [0.2, 0.6, 0.35, 0.3]))\nassert abs(overall_rate(counts) - 0.0126) < 1e-12\nassert biggest_gap(r, [0.22, 0.80, 0.40, 0.30]) == 1\nassert biggest_gap(r, [0.22, 0.62, 0.40, 0.60]) == 3\nassert abs(overall_rate([10, 5]) - 0.5) < 1e-12",
  "solution": "def step_rates(counts):\n    return [b / a for a, b in zip(counts, counts[1:])]\n\ndef overall_rate(counts):\n    return counts[-1] / counts[0]\n\ndef biggest_gap(rates, benchmarks):\n    gaps = [1 - r / b for r, b in zip(rates, benchmarks)]\n    return gaps.index(max(gaps))",
  "hints": [
    "zip(counts, counts[1:]) pairs each stage with the next.",
    "Compute the shortfall list, then use max and index."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Apply HEART to a new comments feature in Google Docs.'",
  "answer": "**Goal of the feature**: faster, clearer collaborative review.\n\n**Happiness**: signal = users feel review is easy; metric = in-product survey CSAT on comments, thumbs rating of the comment UI.\n\n**Engagement**: signal = comments created and replied to; metrics = comments per active doc, replies per thread, % of shared docs with at least one comment per week.\n\n**Adoption**: signal = users try it; metric = % of users who create a first comment within 7 days of eligibility; % of collaborators who reply.\n\n**Retention**: signal = repeated use; metric = % of week-1 commenters who comment again in weeks 2-4.\n\n**Task success**: signal = review gets done; metrics = time from first comment to resolved, % of threads resolved, error rate (failed posts, lost comments), notification-to-reply latency.\n\n**Guardrails**: doc load latency, notification opt-outs, document edit activity (comments should not displace editing).\n\n**Close**: pick one primary metric (for example resolved threads per shared doc per week) and say which segments matter (owners vs reviewers, mobile vs desktop)."
}
```

> [!TIP] Interview tips
> - Name the framework, say why it fits (AARRR for funnel leaks, HEART for feature UX), then give one concrete metric per dimension.
> - Prioritize: pick the weakest stage using benchmarks or step conversions and explain how you would test a fix.
> - Pitfall: reciting all letters with generic metrics; tie each to the product, define the segment, and add a guardrail.
