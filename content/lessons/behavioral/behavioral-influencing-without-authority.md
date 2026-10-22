---
id: behavioral-influencing-without-authority
title: Influencing without authority
estimatedMinutes: 10
difficulty: medium
tags: [behavioral, influence, stakeholders, persuasion]
---

## Why it matters
Data scientists rarely own the teams that act on their work: engineers, PMs and executives decide. Interviewers ask how you change minds and drive adoption when you cannot give orders.

## Concept
**Levers of influence**: (1) **credibility**: a record of reliable, accurate work; (2) **relationships**: trust built before you need it; (3) **understanding their incentives**: what do they care about, what are they measured on (the WIIFM: what's in it for me)?; (4) **evidence**: data plus a story; (5) **coalitions**: allies, early adopters and a sponsor; (6) **making it easy**: a pilot, a template, a small first step; (7) **reciprocity and credit**: share the win.

**A sequence that works**: listen to the other side's goals and objections; frame the proposal in their language and metrics; offer a low-risk pilot with a clear success criterion; bring a respected champion; show early results; scale and give credit publicly.

**Choose the channel**: a 1:1 for objections, a short document for decisions, a demo for intangible benefits, and a pre-meeting before the group meeting.

**Pitfalls**: arguing from your own metrics, surprising people in public, over-reliance on escalation, and treating "no" as the end rather than a signal about their constraints.

**Story shape**: obstacle (no authority, resistance) then your approach (understand, pilot, allies) then measurable adoption.

## Worked example
**Question**: "Tell me about a time you convinced a team to adopt your idea without being their manager."

**Situation**: "Our data scientists shipped models to production through ad hoc scripts, and the platform engineering team resisted a standard model-deployment template: they feared more support burden. Incidents from broken model jobs ran at 12 a month."

**Action**: "I first asked the lead engineer what worried him: on-call load and unclear ownership. I reframed the proposal around his metric: fewer pages. I offered a 4-week pilot with one model: I would own the template and first-line support, and we would measure incidents and deploy time. I recruited a data scientist who wanted it and agreed on success criteria in advance (incidents down 50%, deploy under one day). I shared weekly numbers in the team channel."

**Result**: "In the pilot, incidents for that model went from 4 a month to 0 and deploy time from 5 days to 1. The engineering lead then proposed adopting the template for all models. Across the team incidents fell from 12 to 3 a month (75%) within a quarter. I credited the engineer in the all-hands."

**Lesson**: tie the idea to the other person's goal and lower their risk.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A senior engineer resists adopting your new process. What is the best first move?",
  "options": [
    "Escalate to their manager",
    "Understand their concerns and incentives, then reframe the proposal around what they care about",
    "Implement it anyway",
    "Present more slides of data"
  ],
  "answer": 1,
  "explanation": "Influence starts with understanding the other party's incentives and objections, not with more arguments for your own view."
}
```

```quiz
{
  "id": "q2",
  "question": "Why propose a small pilot with success criteria agreed in advance?",
  "options": [
    "It delays the decision",
    "It lowers the other side's risk and creates evidence they trust",
    "It avoids measuring results",
    "It gives you more authority"
  ],
  "answer": 1,
  "explanation": "A time-boxed pilot is low-risk and shared success criteria make the result persuasive."
}
```

## Practice

```reveal
{
  "prompt": "Interview: 'How would you convince a skeptical product manager to run an A/B test instead of just shipping?'",
  "answer": "**Start with their goal**: she wants to ship fast and hit a quarterly target; the test has to look like a way to hit it, not block it.\n\n**Quantify the risk**: \"Of our last 12 launches, 4 had no measurable effect and 2 hurt retention; shipping blind costs us weeks of rework.\" A test on 20% of traffic for 7 days costs one week and protects the other 80%.\n\n**Make it easy**: I handle the design (power calculation: needs about 40,000 users per arm for a 0.5-point lift), the instrumentation and the readout; she makes the decision. Agree the decision rule in advance.\n\n**Pilot and credit**: begin with the next launch only; if the test finds a hidden problem, share the credit (\"your launch avoided a 1-point retention hit\").\n\n**Respect constraints**: if a test is not feasible (legal deadline), propose a staged rollout with guardrails instead."
}
```

```reveal
{
  "prompt": "Interview: 'Tell me about a time you needed buy-in from a senior leader you rarely met.'",
  "answer": "**Approach**: borrow credibility and make the ask small and specific. \"I needed approval for $150,000 of cloud spend for a feature-store pilot. I couldn't get time with the VP, so I first aligned her chief of staff and two directors whose teams benefited. I wrote a one-page memo: problem (model training took 3 days because features were recomputed), proposal, cost, expected 60% reduction in time-to-model, risk, and a decision date. I asked the directors to add one line each about their needs, then presented in the VP's existing staff meeting for 5 minutes. She approved the pilot with a gate at 8 weeks.\"\n\n**Takeaways**: pre-wire, write for the decision-maker, quantify the ask, use allies, and propose a gate to reduce perceived risk."
}
```

> [!TIP] Interview tips
> - Lead the story with the other party's incentives, then your approach, then measurable adoption.
> - Mention allies, pilots and credit-sharing; they show you build coalitions rather than push.
> - Pitfall: describing escalation as your main tactic. Show persuasion and empathy first.
