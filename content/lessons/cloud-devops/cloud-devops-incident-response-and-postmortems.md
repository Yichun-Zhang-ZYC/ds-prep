---
id: cloud-devops-incident-response-and-postmortems
title: Incident response and postmortems
estimatedMinutes: 11
difficulty: medium
tags: [incident-response, postmortem, sre, oncall]
---

## Why it matters
Every production system fails, and interviewers for data, ML and platform roles ask how you behave when it does: how you triage, communicate, mitigate and then learn. A clear incident process and a blameless postmortem culture separate senior candidates from people who only know how to write code. See the SLA / SLO / SLI lesson for error budgets; this one is about the human and process side.

## Concept
**Lifecycle**: detect -> triage and declare -> mitigate -> resolve -> postmortem -> follow-up actions.

**Roles** (for anything beyond a trivial fix): an **incident commander** who coordinates and decides (and does not debug), a **communications lead** who updates stakeholders on a fixed cadence, and **responders/subject experts** who investigate. One shared channel and one timeline document.

**Severity** is defined by impact, not by cause: for example SEV1 = customer-facing outage or data loss, SEV2 = major degradation, SEV3 = minor. Severity sets who is paged and how often you communicate.

**Mitigate first, root-cause later.** The first goal is to stop the bleeding: roll back the last deploy, flip a feature flag, fail over, scale up, shed load, pause a pipeline. Ask "what changed?" (deploys, config, traffic, dependencies, data) before theorising.

**Metrics**: **MTTD** (time to detect), **MTTA** (to acknowledge), **MTTR** (to restore; define whether it starts at impact or detection). Detection through SLO burn-rate alerts beats customers reporting it. Alert on symptoms (user impact), keep a runbook link in each alert.

**Blameless postmortem**: written within a few days, focused on systems not people. Contents: summary and impact (users, duration, data affected, error budget spent), timeline, root cause(s) and contributing factors (use "5 whys" without stopping at "human error"), what went well or badly (detection, response, luck), and **action items** with an owner, priority and due date. Track them to completion; a postmortem without follow-through is theatre.

**Data and ML incidents**: late or wrong data silently poisons dashboards and models. Add freshness, volume and schema checks; plan backfills and communicate which downstream tables or model versions were affected; quarantine bad data before re-running.

**Pitfalls**: everyone debugging, nobody communicating; changing many things at once; skipping the timeline; blaming individuals; action items like "be more careful" instead of a guardrail.

## Worked example
A nightly feature pipeline silently loads a partially empty table, and a recommender degrades. Illustrative timeline (minutes from impact start): 0 bad load; 90 an analyst notices odd CTR; 100 incident declared SEV2, commander assigned; 115 team asks "what changed?" and finds a schema change upstream; 125 mitigation: roll the model back to yesterday's features and pause the pipeline; 190 table backfilled and validated, features restored.

Time to detect = 90 min (a human noticed; an anomaly alert would have cut this to minutes); time to mitigate = 25 min after declaration; total impact about 125 min measured to mitigation. Postmortem actions: (1) add a row-count anomaly check that blocks publication (owner: data eng, 1 week), (2) contract test on the upstream schema (owner: platform, 2 weeks), (3) alert on feature null-rate in the serving path (owner: ML, 2 weeks). Note the actions are guardrails, not "review changes more carefully".

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Mid-incident, a recent deploy is the prime suspect and a rollback is available. What should the commander do first?",
  "options": [
    "Keep investigating until the root cause is proven",
    "Roll back to restore service, then investigate with the evidence preserved",
    "Wait for the postmortem meeting",
    "Page the whole company"
  ],
  "answer": 1,
  "explanation": "Mitigation takes priority over root-causing. Roll back, then preserve logs and state for analysis."
}
```

```quiz
{
  "id": "q2",
  "question": "Which postmortem action item is best?",
  "options": [
    "Engineers should be more careful with config changes",
    "Add a CI check that rejects config changes without a canary stage (owner: platform, due in 2 weeks)",
    "Blame the engineer who deployed",
    "Never deploy on Fridays"
  ],
  "answer": 1,
  "explanation": "Good actions are specific, owned, dated and change the system so the failure is prevented or detected sooner."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `incident_stats(incidents)`. Each incident is `(start, detected, resolved)` in minutes. Return `(mttd, mttr)` where MTTD is the mean of `detected - start` and MTTR is the mean of `resolved - detected`. Return `(0.0, 0.0)` for an empty list.",
  "starterCode": "def incident_stats(incidents):\n    \"\"\"incidents: list of (start, detected, resolved) in minutes.\n    Return (mttd, mttr): mean of detected-start and mean of resolved-detected.\"\"\"\n    pass\n\nprint(incident_stats([(0, 5, 35), (100, 110, 150)]))",
  "tests": "a, b = incident_stats([(0, 5, 35), (100, 110, 150)])\nassert abs(a - 7.5) < 1e-9 and abs(b - 35) < 1e-9\na, b = incident_stats([(10, 10, 40)])\nassert abs(a - 0) < 1e-9 and abs(b - 30) < 1e-9\nassert incident_stats([]) == (0.0, 0.0)",
  "solution": "def incident_stats(incidents):\n    if not incidents:\n        return (0.0, 0.0)\n    n = len(incidents)\n    mttd = sum(d - s for s, d, r in incidents) / n\n    mttr = sum(r - d for s, d, r in incidents) / n\n    return (mttd, mttr)",
  "hints": [
    "Sum the differences with generator expressions and divide by the count.",
    "Guard the empty case before dividing."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Error-budget maths for incident decisions. Implement `budget_minutes(slo, days)`, `budget_remaining(slo, days, outages)` (outages is a list of minutes) and `burn_rate(error_rate, slo)` = error rate divided by the allowed error rate.",
  "starterCode": "def budget_minutes(slo, days):\n    \"\"\"Allowed downtime in minutes for an availability SLO over `days` days.\"\"\"\n    pass\n\ndef budget_remaining(slo, days, outages):\n    \"\"\"Minutes of budget left after the outage durations (list of minutes). May be negative.\"\"\"\n    pass\n\ndef burn_rate(error_rate, slo):\n    \"\"\"How many times faster than 'sustainable' the budget is being consumed.\"\"\"\n    pass\n\nprint(budget_minutes(0.999, 30), budget_remaining(0.999, 30, [10, 20]), burn_rate(0.0144, 0.999))",
  "tests": "assert abs(budget_minutes(0.999, 30) - 43.2) < 1e-9\nassert abs(budget_minutes(0.99, 1) - 14.4) < 1e-9\nassert abs(budget_remaining(0.999, 30, [10, 20]) - 13.2) < 1e-9\nassert budget_remaining(0.999, 30, [30, 30]) < 0\nassert abs(burn_rate(0.0144, 0.999) - 14.4) < 1e-9\nassert abs(burn_rate(0.001, 0.999) - 1.0) < 1e-9",
  "solution": "def budget_minutes(slo, days):\n    return (1 - slo) * days * 24 * 60\n\ndef budget_remaining(slo, days, outages):\n    return budget_minutes(slo, days) - sum(outages)\n\ndef burn_rate(error_rate, slo):\n    return error_rate / (1 - slo)",
  "hints": [
    "Allowed error fraction is 1 - slo; a 30-day month has 30 * 24 * 60 minutes.",
    "A burn rate of 1 uses exactly the whole budget by the end of the window."
  ]
}
```

> [!TIP] Interview tips
- Describe the loop out loud: detect, declare, mitigate, communicate, resolve, learn.
- Say "mitigate first, root-cause later" and name concrete levers (rollback, flag, failover, pause pipeline).
- Emphasise blameless culture and action items with owners and dates.
- For data/ML, mention silent failures, freshness/volume checks and backfill communication.
