---
id: experimentation-cluster-switchback-experiments
title: Cluster and switchback experiments
estimatedMinutes: 12
difficulty: hard
tags: [experimentation, cluster-randomization, switchback, marketplaces]
---

## Why it matters
When interference rules out user-level randomization, the two standard alternatives are randomizing **clusters** (cities, stores) or **time periods** (switchbacks). Knowing their trade-offs is expected for marketplace and logistics roles.

## Concept
**Cluster randomization**: assign whole groups (cities, stores, schools, social communities) to treatment or control.
- Contains interference within clusters.
- Effective sample size is closer to the **number of clusters** than the number of users. The **design effect** $1 + (m - 1)\rho$ (m = users per cluster, ρ = intra-cluster correlation) tells you how much variance grows.
- Analyze at the cluster level or with cluster-robust standard errors. Stratify or pair clusters (big with big) to reduce imbalance.

**Switchback**: for one market, alternate treatment and control over time windows (e.g. 1-hour blocks, randomized).
- Everyone in a window shares the same condition, so shared supply isn't split.
- Needs windows long enough for the system to reach the new state, and **carryover** handling (drop a buffer after each switch).
- Time effects (rush hours, weekdays) must be balanced by randomizing the schedule.

## Worked example
A delivery company tests a new dispatch algorithm.

- Cluster design: 40 cities, 20 per arm, paired by size. With so few units, the MDE is large: only big effects are detectable.
- Switchback design: in 5 cities, alternate 2-hour windows for 4 weeks (≈ 1,000+ windows), dropping the first 15 minutes of each window as a buffer. Much more power for the same cities.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You randomize 20 stores (10 per arm), each with 5,000 customers. Roughly what drives the precision of the estimate?",
  "options": ["The 100,000 customers", "Mostly the 20 stores, because customers within a store are correlated", "Only the largest store", "The number of transactions"],
  "answer": 1,
  "explanation": "With meaningful intra-cluster correlation, effective sample size is far below the user count."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `design_effect(m, icc)` = 1 + (m − 1)·icc and `effective_n(total_users, m, icc)` = total_users / design_effect.",
  "starterCode": "def design_effect(m, icc):\n    pass\n\ndef effective_n(total_users, m, icc):\n    pass\n\nprint(design_effect(5000, 0.01), effective_n(100000, 5000, 0.01))",
  "tests": "assert abs(design_effect(5000, 0.01) - 50.99) < 1e-9\nassert abs(effective_n(100000, 5000, 0.01) - 100000 / 50.99) < 1e-6\nassert design_effect(1, 0.5) == 1\nassert effective_n(1000, 10, 0) == 1000",
  "solution": "def design_effect(m, icc):\n    return 1 + (m - 1) * icc\n\ndef effective_n(total_users, m, icc):\n    return total_users / design_effect(m, icc)",
  "hints": ["Even a small ICC (0.01) with big clusters (5,000) inflates variance about 51×."]
}
```

> [!TIP] Interview tips
> - Choose clusters for spatial or social interference, switchbacks for shared real-time supply.
> - Quantify the power cost with the design effect.
> - For switchbacks, mention carryover buffers and balancing time-of-day.
