---
id: consulting-stakeholder-management
title: Stakeholder management
estimatedMinutes: 10
difficulty: easy
tags: [consulting, stakeholders, communication, raci]
---

## Why it matters
Data projects rarely fail on modelling; they fail on misaligned expectations, silent blockers and scope creep. Interviewers probe how you map, align and influence the people around a project.

## Concept
**Map**: list every stakeholder and place them on a power-interest grid: high power and high interest means *manage closely*; high power, low interest means *keep satisfied*; low power, high interest means *keep informed*; low and low means *monitor*. Add attitude (champion, neutral, sceptic) and what each one is measured on.

**Clarify roles**: use RACI: **R**esponsible (does the work), **A**ccountable (one owner who signs off), **C**onsulted (two-way input), **I**nformed (one-way). Every task has exactly one A.

**Align early**: agree the problem, success metric, scope, timeline and decision-maker in a one-page charter before building. Pre-wire key people one-on-one before big meetings so nobody is surprised.

**Communicate**: a fixed cadence, no surprises (bad news early with options), plain language, ranges instead of point estimates, and written decisions.

**Handle conflict and scope creep**: listen for the underlying need, restate it, then offer trade-offs ("we can add this, which moves delivery by 3 weeks, or swap it for X"). Let the accountable owner choose; escalate only with facts and options.

## Worked example
**Project**: a churn model for a subscription business; 6-week plan, 2 data scientists.

Stakeholders (power, interest on 1-10): VP Marketing (9, 9) is the sponsor, so *manage closely*, weekly demo. CFO (8, 3): *keep satisfied*, one-page ROI at kickoff and at the end. Privacy counsel (7, 2): *keep satisfied*, review data use before week 2 because they can block launch. CRM operations (3, 8): *keep informed* and consult on how scores become campaigns. Data engineering (4, 6): *keep informed* and agree on feature table SLAs.

**Scope creep**: in week 3 Marketing asks to add a lifetime-value model and a Spanish-language segment. Response: "Both are valuable. Option A: ship churn in week 6 with 2 features. Option B: add both and ship in week 9 with 5 features." Marketing, as the accountable owner, picks A and schedules LTV as phase 2.

**Disagreement**: the CFO doubts the savings. Pre-wire with a conservative case (10% save rate instead of 20%): net benefit still positive, \$180k vs \$360k, and agree on an A/B test as the decision criterion before launch.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A stakeholder has high power but low interest in your project. The standard approach is:",
  "options": [
    "Ignore them",
    "Keep them satisfied with brief, targeted updates and early sign-off on key decisions",
    "Include them in every meeting",
    "Monitor only"
  ],
  "answer": 1,
  "explanation": "High-power stakeholders can block the project, so keep them satisfied without overloading them."
}
```

```quiz
{
  "id": "q2",
  "question": "In a RACI chart, how many 'A' (Accountable) owners should each task have?",
  "options": [
    "Zero",
    "Exactly one",
    "At least two",
    "As many as stakeholders"
  ],
  "answer": 1,
  "explanation": "A single accountable owner prevents diffusion of responsibility."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `grid(stakeholders, threshold=5)` where stakeholders is a list of `(name, power, interest)`. Return a dict name -> strategy: power >= threshold and interest >= threshold: 'manage closely'; power >= threshold only: 'keep satisfied'; interest >= threshold only: 'keep informed'; otherwise 'monitor'. Write `raci_ok(raci)` where raci maps task -> dict of person -> letter (one of R, A, C, I); return True only if every task has exactly one 'A' and at least one 'R'.",
  "starterCode": "def grid(stakeholders, threshold=5):\n    pass\n\ndef raci_ok(raci):\n    pass\n\nprint(grid([('VP', 9, 9), ('CFO', 8, 3)]))\n",
  "tests": "g = grid([('VP', 9, 9), ('CFO', 8, 3), ('CRM', 3, 8), ('Data eng', 4, 6), ('Intern', 1, 1), ('Legal', 7, 2)])\nassert g['VP'] == 'manage closely' and g['CFO'] == 'keep satisfied'\nassert g['CRM'] == 'keep informed' and g['Data eng'] == 'keep informed'\nassert g['Intern'] == 'monitor' and g['Legal'] == 'keep satisfied'\nassert grid([('X', 5, 5)])['X'] == 'manage closely'\nassert grid([('X', 5, 4)], threshold=6)['X'] == 'monitor'\nassert raci_ok({'model': {'ana': 'R', 'bo': 'A', 'cy': 'C'}}) is True\nassert raci_ok({'model': {'ana': 'R', 'bo': 'A', 'cy': 'A'}}) is False\nassert raci_ok({'model': {'ana': 'R', 'bo': 'C'}}) is False\nassert raci_ok({'model': {'ana': 'C', 'bo': 'A'}}) is False",
  "solution": "def grid(stakeholders, threshold=5):\n    out = {}\n    for name, power, interest in stakeholders:\n        hp = power >= threshold\n        hi = interest >= threshold\n        if hp and hi:\n            out[name] = 'manage closely'\n        elif hp:\n            out[name] = 'keep satisfied'\n        elif hi:\n            out[name] = 'keep informed'\n        else:\n            out[name] = 'monitor'\n    return out\n\ndef raci_ok(raci):\n    for task, roles in raci.items():\n        letters = list(roles.values())\n        if letters.count('A') != 1 or letters.count('R') < 1:\n            return False\n    return True",
  "hints": [
    "Two booleans (high power, high interest) give the four quadrants.",
    "Count letters with list.count for each task."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'A senior stakeholder keeps asking for new features mid-project and the deadline is fixed. What do you do?'",
  "answer": "**Understand**: ask what business problem each request solves; often one request hides the real need and several can be dropped.\n\n**Quantify**: estimate effort per request (e.g. +2 weeks for a segment model, +1 week for a dashboard) against the fixed deadline and the original success metric.\n\n**Offer options, not a refusal**: (A) hold scope and ship on time with the agreed metric; (B) add the request and move the date; (C) swap it for a lower-value item of equal size; (D) put it in phase 2 with a date. Recommend one with reasoning.\n\n**Decide with the accountable owner**: put the choice in writing (email or ticket) and update the charter so the trade-off is visible to everyone.\n\n**Prevent repeats**: a change-request process, a weekly scope review and a visible backlog; keep the stakeholder involved with early demos so they feel heard.\n\n**Escalate** only if two options cannot be agreed, with facts and a recommendation rather than a complaint."
}
```

> [!TIP] Interview tips
> - Name concrete techniques: pre-wiring, a one-page charter, RACI and trade-off options instead of a flat no.
> - Use a specific example with a stakeholder who disagreed and say what changed because of your approach.
> - Pitfall: blaming stakeholders. Show empathy for their incentives while holding the scope line.
