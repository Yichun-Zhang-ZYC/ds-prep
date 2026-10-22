---
id: behavioral-prioritization-under-deadlines
title: Prioritization under deadlines
estimatedMinutes: 12
difficulty: medium
tags: [behavioral, prioritization, rice, time-management]
---

## Why it matters
Data teams get more requests than capacity. Interviewers want to hear a defensible way to rank work, negotiate scope and protect quality when everything is "urgent".

## Concept
**Frameworks**: **Impact vs effort** (do high-impact, low-effort first); **Eisenhower** (urgent vs important); **MoSCoW** (must, should, could, won't); and **RICE**: $\text{score} = \dfrac{\text{Reach} \times \text{Impact} \times \text{Confidence}}{\text{Effort}}$ with reach in users per period, impact on a 0.25-3 scale, confidence 0-1 and effort in person-days.

**Process**: (1) list all requests and deadlines; (2) clarify the goal and the real deadline (hard, such as a regulator or board meeting, vs soft); (3) score and rank; (4) fit the ranking to capacity; (5) **communicate trade-offs** with options ("I can do A and C by Friday; B slips to next week unless we drop C"); (6) get the accountable person to confirm; (7) protect the critical path and quality checks: cut scope, not correctness.

**Under a crunch**: deliver a minimum viable answer first (the 80% analysis with caveats), then refine; automate or template recurring work; say no or "not now" with reasons; renegotiate early rather than miss silently.

**Pitfalls**: letting the loudest stakeholder win, saying yes to everything, hiding trade-offs, and sacrificing validation to meet a date.

## Worked example
**Situation**: in a 2-week sprint with 8 person-days of capacity, four requests arrive:

| Request | Reach | Impact | Confidence | Effort (days) | RICE |
|---|---|---|---|---|---|
| Churn-model refresh | 2000 | 2 | 0.8 | 5 | 640 |
| Fix broken dashboard | 500 | 1 | 0.8 | 2 | 200 |
| Exec KPI report | 50 | 3 | 1.0 | 1 | 150 |
| Pricing deep dive | 100 | 3 | 0.5 | 4 | 37.5 |

For example, the churn refresh scores $2000 \times 2 \times 0.8 / 5 = 640$. Total effort is 12 days against 8 of capacity. Taking requests in score order: churn (5 days) leaves 3, dashboard (2) leaves 1, exec report (1) leaves 0, so the pricing deep dive does not fit.

**Conversation**: "I can deliver the churn refresh, the dashboard fix and the exec report this sprint (8 days). The pricing deep dive (4 days) would move to the next sprint, or we could drop the dashboard fix to start it. The exec report is a hard deadline for Thursday's board meeting, so I'm doing it first regardless of score." The hard deadline overrides the score, and the trade-off is written down and confirmed by the manager.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A request has Reach 1000, Impact 2, Confidence 0.5 and Effort 4 person-days. What is its RICE score?",
  "options": [
    "125",
    "250",
    "500",
    "1000"
  ],
  "answer": 1,
  "explanation": "1000 x 2 x 0.5 / 4 = 250."
}
```

```quiz
{
  "id": "q2",
  "question": "You cannot finish everything before a hard deadline. What is the best action?",
  "options": [
    "Work overtime silently and skip validation",
    "Tell stakeholders early, present options and trade-offs, and agree what to cut or delay",
    "Do the easy items only",
    "Miss the deadline without notice"
  ],
  "answer": 1,
  "explanation": "Early, transparent trade-off conversations preserve trust and quality; cut scope, not correctness."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `rice(reach, impact, confidence, effort)` returning reach * impact * confidence / effort. Write `plan(requests, capacity)` where requests is a list of `(name, reach, impact, confidence, effort)`; rank by RICE descending (ties by name), then walk down the ranking and accept each request if its effort fits in the remaining capacity (skip it otherwise, but keep going). Return `(accepted_names_in_rank_order, deferred_names_in_rank_order)`.",
  "starterCode": "def rice(reach, impact, confidence, effort):\n    pass\n\ndef plan(requests, capacity):\n    pass\n\nreqs = [('churn', 2000, 2, 0.8, 5), ('dashboard', 500, 1, 0.8, 2), ('exec', 50, 3, 1.0, 1), ('pricing', 100, 3, 0.5, 4)]\nprint(plan(reqs, 8))\n",
  "tests": "assert abs(rice(2000, 2, 0.8, 5) - 640) < 1e-9\nassert abs(rice(1000, 2, 0.5, 4) - 250) < 1e-9\nreqs = [('churn', 2000, 2, 0.8, 5), ('dashboard', 500, 1, 0.8, 2), ('exec', 50, 3, 1.0, 1), ('pricing', 100, 3, 0.5, 4)]\nassert plan(reqs, 8) == (['churn', 'dashboard', 'exec'], ['pricing'])\nassert plan(reqs, 6) == (['churn', 'exec'], ['dashboard', 'pricing'])\nassert plan(reqs, 100) == (['churn', 'dashboard', 'exec', 'pricing'], [])\nassert plan(reqs, 0) == ([], ['churn', 'dashboard', 'exec', 'pricing'])\nassert plan([('b', 1, 1, 1, 1), ('a', 1, 1, 1, 1)], 1) == (['a'], ['b'])",
  "solution": "def rice(reach, impact, confidence, effort):\n    return reach * impact * confidence / effort\n\ndef plan(requests, capacity):\n    ranked = sorted(requests, key=lambda r: (-rice(r[1], r[2], r[3], r[4]), r[0]))\n    accepted, deferred, left = [], [], capacity\n    for name, reach, impact, conf, effort in ranked:\n        if effort <= left:\n            accepted.append(name)\n            left -= effort\n        else:\n            deferred.append(name)\n    return accepted, deferred",
  "hints": [
    "Sort with key (-score, name).",
    "A request that does not fit is deferred, but smaller later requests may still fit."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'You have three urgent requests from three senior stakeholders and capacity for two. What do you do?'",
  "answer": "**1. Clarify**: ask each stakeholder the goal, the real deadline and the consequence of delay; often \"urgent\" is soft.\n\n**2. Evaluate**: rank by impact on a common metric (revenue at risk, decisions blocked, reach), effort and confidence; identify any hard deadline (board meeting, regulator, launch).\n\n**3. Look for leverage**: can two requests share a dataset or be satisfied by one analysis? Can one be delivered as a quick 80% version, a self-serve dashboard, or by a teammate?\n\n**4. Decide and communicate**: propose a plan to my manager and the three stakeholders together: \"A and C this week, B on Tuesday after next, here is what each of you gets and when.\" Offer an alternative for B (a rough estimate by Thursday).\n\n**5. Escalate if conflict remains**: ask the shared manager to decide using the impact ranking.\n\n**6. Follow up**: report what shipped and capture demand patterns to argue for capacity."
}
```

> [!TIP] Interview tips
> - Name a framework (RICE or impact/effort) but explain the judgement, including hard deadlines.
> - Say how you communicate trade-offs and get the accountable person to confirm the call.
> - Pitfall: heroics. Working nights is not a plan; show options, scope cuts and early renegotiation.
