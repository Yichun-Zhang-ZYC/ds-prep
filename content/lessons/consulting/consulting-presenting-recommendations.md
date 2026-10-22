---
id: consulting-presenting-recommendations
title: Presenting recommendations
estimatedMinutes: 10
difficulty: medium
tags: [consulting, communication, pyramid-principle, npv]
---

## Why it matters
Analysis only matters when someone acts on it. Case interviews end with "Give me your recommendation", and data roles are judged on whether executives can decide from your slides in two minutes.

## Concept
**Answer first (Pyramid Principle)**: lead with the recommendation, then 2-3 MECE supporting arguments, each backed by evidence. Use **SCQA** for context: Situation, Complication, Question, Answer.

**Structure of a recommendation**: (1) the recommendation and the ask, (2) why (impact in numbers), (3) what it costs and returns (investment, NPV or payback), (4) risks and mitigations, (5) next steps with owners and dates.

**Slides**: one message per slide, an action title that states the takeaway ("Churn model pays back in 1.7 years"), the simplest chart that proves it (bar for comparison, waterfall for bridges, line for trends), and details in an appendix.

**Compare options with economics**: $\text{NPV} = \sum_{t=0}^{T} \frac{CF_t}{(1+r)^t}$ and payback = time until cumulative cash flow turns positive. Show a sensitivity (best, base, worst) rather than one number.

**Deliver**: tailor depth to the audience (executive: 1 slide plus ask; expert: method and caveats), pause for questions, answer the question asked, and say "I don't know, I will check and follow up" when needed. End by restating the decision requested.

## Worked example
Options for a churn program (cash flows in \$k, year 0 to year 3, discount rate 10%): **A, build in-house**: -300, +180, +180, +180. **B, buy a vendor tool**: -100, +70, +70, +70.

NPV(A) $= -300 + 180/1.1 + 180/1.21 + 180/1.331 = -300 + 163.6 + 148.8 + 135.2 = \$147.6\text{k}$. NPV(B) $= -100 + 63.6 + 57.9 + 52.6 = \$74.1\text{k}$. Payback of A: cumulative -300, -120, +60, so $1 + 120/180 = 1.67$ years. Payback of B: cumulative -100, -30, +40, so $1 + 30/70 = 1.43$ years.

B pays back faster, but A creates twice the value. Recommendation slide: "Build in-house: NPV \$148k vs \$74k, 1.7-year payback." Support: (1) value, (2) control of data and roadmap, (3) risk: delivery risk is mitigated by a 6-week prototype gate; if the prototype misses its lift target, buy B. Ask: approve \$300k and a 6-week gate review.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What should the first slide of an executive recommendation contain?",
  "options": [
    "The data sources",
    "The recommendation, the ask and the headline impact",
    "The methodology",
    "A list of all analyses performed"
  ],
  "answer": 1,
  "explanation": "Pyramid principle: answer first, then support. Method and data details belong in the appendix."
}
```

```quiz
{
  "id": "q2",
  "question": "Option X has cash flows -100, +60, +60 at 10% discount. What is its NPV (approximately)?",
  "options": [
    "-100",
    "+4",
    "+20",
    "+8"
  ],
  "answer": 1,
  "explanation": "60/1.1 + 60/1.21 = 54.55 + 49.59 = 104.13; minus 100 gives about +4.1."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `npv(rate, flows)` where flows[0] occurs at time 0. Write `payback(flows)` returning the time in years (float, linear interpolation inside the year of crossing) at which cumulative cash flow first reaches >= 0, or `None` if never. Write `best_option(options, rate)` where options is a dict name -> flows; return the name with the highest NPV.",
  "starterCode": "def npv(rate, flows):\n    pass\n\ndef payback(flows):\n    pass\n\ndef best_option(options, rate):\n    pass\n\nA = [-300, 180, 180, 180]\nB = [-100, 70, 70, 70]\nprint(npv(0.1, A), payback(A), best_option({'A': A, 'B': B}, 0.1))\n",
  "tests": "A = [-300, 180, 180, 180]\nB = [-100, 70, 70, 70]\nassert abs(npv(0.1, A) - (-300 + 180/1.1 + 180/1.21 + 180/1.331)) < 1e-9\nassert abs(npv(0.1, B) - 74.07964) < 1e-3\nassert abs(npv(0.0, A) - 240) < 1e-9\nassert abs(payback(A) - (1 + 120 / 180)) < 1e-9\nassert abs(payback(B) - (1 + 30 / 70)) < 1e-9\nassert payback([-100, 10, 10]) is None\nassert payback([50, -10]) == 0\nassert best_option({'A': A, 'B': B}, 0.1) == 'A'\nassert best_option({'A': A, 'B': B}, 0.5) == 'B'",
  "solution": "def npv(rate, flows):\n    return sum(cf / (1 + rate) ** t for t, cf in enumerate(flows))\n\ndef payback(flows):\n    cum = 0.0\n    for t, cf in enumerate(flows):\n        prev = cum\n        cum += cf\n        if cum >= 0:\n            if t == 0 or cf == 0:\n                return float(t)\n            return t - 1 + (-prev) / cf\n    return None\n\ndef best_option(options, rate):\n    return max(options, key=lambda k: npv(rate, options[k]))",
  "hints": [
    "Discount each flow by (1 + rate) ** t.",
    "When cumulative flow crosses zero in year t, the fraction is (-previous cumulative) / that year's flow."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Your analysis says the VP's flagship project should be cancelled. Present it to the VP and the leadership team.'",
  "answer": "**Open with the answer and the ask**: \"I recommend we stop the project after this quarter and redirect the team to X; this frees USD 1.2M and delivers an estimated USD 2M of value next year.\"\n\n**Acknowledge the goal**: start from what the project set out to do (e.g. reduce onboarding time) so the VP sees the analysis as aligned with their objective, not against it.\n\n**Evidence in three points**: (1) results so far vs target: 4% lift vs 15% needed; (2) cost to reach target: 3 more quarters and USD 1.8M with a low probability of success; (3) alternative: option X reaches a 10% lift in one quarter. Use one clear chart per point and a sensitivity range.\n\n**Be fair**: state what would change the conclusion (if pilot lift reaches 12% by week 6) and credit what was learned (reusable data pipeline).\n\n**Pre-wire**: share the draft with the VP one-on-one beforehand so the meeting is a decision, not a surprise.\n\n**Close**: restate the decision requested, owners, dates and the checkpoint to revisit."
}
```

> [!TIP] Interview tips
> - Practise the 30-second version of every recommendation: answer, three reasons, ask.
> - Show numbers with a range and name the single assumption that would flip your answer.
> - Pitfall: narrating your analysis chronologically. Executives want the conclusion first and the method on request.
