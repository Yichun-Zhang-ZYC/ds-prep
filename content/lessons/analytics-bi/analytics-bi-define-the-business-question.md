---
id: analytics-bi-define-the-business-question
title: Define the business question
estimatedMinutes: 8
difficulty: easy
tags: [analytics, workflow, problem-framing, interview-pattern]
---

## Why it matters
Most failed analyses answer the wrong question well. Case interviews start with a vague prompt ("engagement is down", "should we launch in Brazil?") and grade whether you clarify the decision, the metric and the baseline before touching data.

## Concept
Turn a request into a **decision-ready question** in five steps:
1. **Decision and owner**: what will change depending on the answer (roll back a release, shift budget, hire)? If nothing would change, don't analyze.
2. **Metric definition**: numerator, denominator, population, time window, and what "active" or "revenue" means (gross vs net, refunds, timezone).
3. **Comparison**: versus last week, last year, a target or a control group. A number without a baseline isn't a finding.
4. **Driver tree**: decompose the metric to generate hypotheses, e.g. revenue = visitors × conversion × average order value; DAU = new + returning + resurrected users.
5. **Scope and constraints**: available data, deadline, required precision, who consumes the result.

Classify the ask: **descriptive** (what happened), **diagnostic** (why), **predictive** (what will happen), **prescriptive** (what should we do). Stakeholders usually ask the first but need the last.

A good framing reads: "Did *[metric]* for *[population]* change by *[amount]* over *[period]* versus *[baseline]*, and which *[driver]* explains it, so that *[owner]* can decide *[action]*?" 

## Worked example
A PM says "engagement is down". Clarifying questions: which metric, since when, which users, what decision? Answers: DAU, since the March 4 release, and the PM must decide whether to roll back.

Quantify the baseline: DAU fell from 120,000 to 112,800, which is $-6\%$ ($120{,}000 \times 0.94$). Decompose with the driver tree:

| Driver | Before | After | Change |
|---|---|---|---|
| New-user DAU | 20,000 | 19,000 | −1,000 |
| Returning-user DAU | 100,000 | 93,800 | −6,200 |

Returning users explain $6{,}200 / 7{,}200 \approx 86\%$ of the drop, so the question narrows: "Did returning-user DAU on Android fall after the March 4 release compared with the prior 3 weeks?" That question is testable with one query and maps directly to the rollback decision.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which is the best-framed question for the request \"checkout feels broken\"?",
  "options": [
    "Why do users hate checkout?",
    "Did checkout completion rate (orders / checkout starts) for mobile web drop versus the prior 4 weeks, and at which step?",
    "Build a dashboard of all checkout events",
    "Run an A/B test on the checkout button color"
  ],
  "answer": 1,
  "explanation": "It names a metric with numerator and denominator, a population, a baseline and a diagnostic cut (step). The others are vague, premature or solution-first."
}
```

```quiz
{
  "id": "q2",
  "question": "A stakeholder says \"revenue is down\". What should you do first?",
  "options": [
    "Write a query for total revenue by day",
    "Clarify the metric definition, period, baseline and the decision the answer feeds",
    "Segment by every available dimension",
    "Propose a pricing experiment"
  ],
  "answer": 1,
  "explanation": "Without a definition, baseline and decision, any query may answer the wrong question. Clarify first, then decompose and query."
}
```

## Practice

```reveal
{
  "prompt": "Interview: 'Signups are down. Investigate.' List the clarifying questions you would ask and the driver tree you would build.",
  "answer": "**Clarify**: Which signups (all, paid, a platform)? Down versus what (last week, last year, target)? By how much and since when? Is the data trustworthy (tracking change, bot filtering, outage)? What decision depends on this (spend, release, campaign)?\n\n**Driver tree**: signups = visits × visit-to-signup conversion. Visits split by channel (organic, paid, referral, direct) and device; conversion splits by funnel step (landing, form start, form complete, verification).\n\n**Hypotheses to test fast**: tracking or logging bug (check raw event counts and other products), seasonality or holiday, a paid campaign ended, a release changed the form, a competitor or outage, a mix shift toward low-converting channels.\n\n**Next step**: compare channel volumes and step conversion to the baseline; a mix shift changes the answer from 'product problem' to 'marketing problem'. Close with a recommendation, the owner and the metric you will monitor."
}
```

> [!TIP] Interview tips
> - Never start with a query: restate the goal, ask 3-4 clarifying questions, then state your plan.
> - Always pin down metric definition, baseline and the decision the answer supports.
> - Use a driver tree to turn "why is X down" into a short list of testable hypotheses, ordered by likelihood and cost to check.
