---
id: analytics-bi-root-cause-analysis
title: Root cause analysis
estimatedMinutes: 12
difficulty: medium
tags: [case-study, root-cause, five-whys, segmentation, sql]
---

## Why it matters
Finding a metric movement is easy; explaining it with evidence is the job. Root cause analysis (RCA) questions test whether you can separate symptoms from causes, rule out alternatives and avoid jumping to a convenient story.

## Concept
**Root cause** = the underlying change that, if fixed, stops the problem from recurring. Symptoms (the metric moved) and proximate causes (a funnel step broke) sit above it.

**A repeatable process**
1. **Define the problem precisely**: metric, size, start date, affected population, and what "normal" looks like.
2. **Verify the data** (tracking, joins, late data) and rule out expected variation.
3. **Localise** with segmentation (platform, version, region, channel, cohort, product area). Rank segments by their **contribution to the change** ($\Delta$ in absolute units), not by percentage drop; a 50% fall in a tiny segment rarely matters.
4. **Build a timeline** of releases, experiments, pricing, campaigns, incidents and external events. A cause must come before the effect, and the drop should start when the change reached users.
5. **Generate hypotheses** (MECE tree: supply vs demand, internal vs external, acquisition vs conversion vs retention) and decide which evidence would confirm or kill each.
6. **Test**: dose-response (more exposure, bigger effect), rollbacks or holdouts, comparing exposed vs unexposed groups, checking mechanism metrics (e.g. error rate, latency).
7. **Five whys**: keep asking why until you reach something you can act on (process, design, ownership), not a person.
8. **Act and monitor**: fix, quantify recovery, add an alert or a guardrail metric, and write a short post-mortem.

**Pitfalls**: confusing correlation with cause (two things changed the same day), stopping at the first plausible story, ignoring mix effects, treating one segment as the cause when it is also the biggest one, and not checking whether the fix worked.

## Worked example
Weekly orders fell from 3,200 to 2,680 (-16%).

| Platform / version | Week 1 | Week 2 | Change |
|---|---|---|---|
| android 5.1 | 900 | 420 | -480 |
| web | 800 | 760 | -40 |
| ios 7.2 | 1,200 | 1,190 | -10 |
| android 5.0 | 300 | 310 | +10 |

Android 5.1 explains 480 of the 520-order loss (92%), while android 5.0 on the same OS is flat. So it is not "Android" or demand; it is something in version 5.1. The timeline shows 5.1 shipped in week 2 with a new checkout. Five whys: orders fell $\to$ 5.1 users abandon at payment $\to$ payment call times out $\to$ new SDK has a 3 s timeout $\to$ the release had no payment-flow test in CI. The fix is a hotfix and a CI test, with a guardrail alert on checkout success rate.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Sign-ups dropped 20% the day a new landing page launched. Which evidence best supports that the page is the cause?",
  "options": [
    "Both events happened the same day",
    "The drop is only in traffic that saw the new page, while users still on the old page (a holdout) were unaffected",
    "Team members think the page looks worse",
    "Sign-ups dropped last year at the same time too"
  ],
  "answer": 1,
  "explanation": "Comparing exposed vs unexposed groups at the same time controls for other changes. Timing alone is correlation and does not rule out other causes."
}
```

```quiz
{
  "id": "q2",
  "question": "Segment A fell 50% (from 100 to 50 orders). Segment B fell 5% (from 5,000 to 4,750). The total fell by 300. Which segment should you investigate first?",
  "options": [
    "A, because the percentage drop is larger",
    "B, because it contributes 250 of the 300 decline",
    "Neither; both are noise",
    "A, because it is smaller and easier to study"
  ],
  "answer": 1,
  "explanation": "Rank by contribution to the total change: B lost 250 orders versus 50 for A. Percentage drops in small segments are often misleading."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Orders fell between week 1 and week 2. For every `(platform, app_version)` combination compute `delta = week 2 orders - week 1 orders`. Return `platform`, `app_version` and `delta` for the three combinations with the largest decline (most negative delta first).",
  "setup": "CREATE TABLE weekly_orders (week INTEGER, platform TEXT, app_version TEXT, orders INTEGER); INSERT INTO weekly_orders VALUES (1,'ios','7.2',1200),(2,'ios','7.2',1190),(1,'android','5.0',300),(2,'android','5.0',310),(1,'android','5.1',900),(2,'android','5.1',420),(1,'web','-',800),(2,'web','-',760);",
  "starterCode": "SELECT platform, app_version,\n       -- week 2 total minus week 1 total\n       AS delta\nFROM weekly_orders\nGROUP BY platform, app_version\nORDER BY delta\nLIMIT 3;",
  "solution": "SELECT platform, app_version,\n       SUM(CASE WHEN week = 2 THEN orders ELSE 0 END) - SUM(CASE WHEN week = 1 THEN orders ELSE 0 END) AS delta\nFROM weekly_orders\nGROUP BY platform, app_version\nORDER BY delta ASC\nLIMIT 3;",
  "orderMatters": true,
  "hints": [
    "Conditional aggregation: SUM(CASE WHEN week = 2 THEN orders ELSE 0 END).",
    "Subtract the week 1 sum from the week 2 sum, then ORDER BY delta ASC and LIMIT 3."
  ]
}
```

```reveal
{
  "prompt": "Interview: \"Customer support tickets doubled this month. Find the root cause.\" Walk through your approach.",
  "answer": "**Define**: tickets per day vs last 8 weeks, start date, which queue, and whether the definition changed (new auto-created tickets, a new channel).\n\n**Verify**: ticket-creation logs, duplicates, a bot or integration spamming tickets; check volume per active customer (tickets rose but did customers also rise?).\n\n**Localise**: by category, product, plan, country, platform and version, customer tenure and channel (chat, email). Rank by contribution to the increase. Suppose 60% of the extra volume is \"payment failed\" tickets from iOS.\n\n**Timeline**: an iOS release on the 3rd, payment provider change on the 5th. Tickets began rising on the 3rd for iOS users on the new version only (dose-response by app version).\n\n**Mechanism**: payment error rate for the new version jumped from 1% to 9%; the logs show a token-refresh bug.\n\n**Five whys**: payments fail $\\to$ token expires $\\to$ refresh is not retried $\\to$ edge case not in QA $\\to$ no payment test on new SDK versions.\n\n**Act**: hotfix, proactive email to affected customers, an auto-reply for known issues, a CI test and an alert on payment errors. Re-measure in a week: ticket volume should return to baseline within two weeks; otherwise keep digging."
}
```

> [!TIP] Interview tips
> - Define and verify before explaining. Mention data issues, seasonality and definition changes first, then segment by contribution to the change.
> - Build the timeline and test the mechanism (error rates, exposure vs holdout). Say how you would prove the cause, not just suggest it.
> - Finish with the fix, the expected recovery, and a guardrail or alert. Use five whys to land on a process gap, not on blaming someone.
