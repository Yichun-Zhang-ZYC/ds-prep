---
id: experimentation-network-effects-and-interference
title: Network effects and interference
estimatedMinutes: 12
difficulty: hard
tags: [experimentation, interference, marketplaces, sutva]
---

## Why it matters
"How would you A/B test a new ride pricing algorithm?" or "a feature that changes how users message each other?" Standard tests assume users don't affect each other. In marketplaces and social products they do, and interviewers want you to spot it.

## Concept
Standard A/B analysis relies on **SUTVA**: one user's outcome depends only on their own assignment. **Interference** breaks it:

| Setting | How control gets contaminated |
|---|---|
| Two-sided marketplace (rides, delivery, ads auctions) | treatment and control **share supply**; if treatment riders book more, control riders find fewer drivers |
| Social network | treated users message their control friends, changing their behavior |
| Inventory / budgets | treatment buyers take items or ad budget that control would have used |

Consequence: the measured difference (treatment − control) can be biased, often **overstating** the effect that a full launch would have (the gain comes partly from cannibalizing control).

Remedies:
- **Cluster randomization** by geography or social cluster, so interactions stay within an arm.
- **Switchback** designs (randomize time periods for a whole market).
- Two-sided / budget-split designs that give each arm its own slice of supply.
- Ego-network randomization for social features.

## Worked example
A delivery app tests faster dispatch for 50% of customers in a city. Treatment orders get couriers first, so control customers wait longer. Measured gap: +10% faster delivery for treatment. At full launch, everyone competes for the same couriers, so the true average gain is much smaller. Better design: randomize whole cities, or alternate 30-minute windows (switchback).

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "In a ride-sharing price test randomized by rider, why can the measured effect overstate the effect of a full launch?",
  "options": ["Riders lie in surveys", "Treatment and control riders compete for the same drivers, so treatment gains partly come at control's expense", "Prices are always higher on weekends", "SRM always happens in marketplaces"],
  "answer": 1,
  "explanation": "Shared supply creates interference: the comparison measures a transfer, not just the true effect."
}
```

## Practice

```reveal
{
  "prompt": "Design an experiment for a new LinkedIn-style feature that suggests people to message. What could go wrong with user-level randomization, and what would you do instead?",
  "answer": "**Problem**: treated users send more messages to their connections, many of whom are in control. Control users' metrics (replies, sessions) rise too, shrinking the measured difference (and the effect leaks across arms).\n\n**Options**:\n- **Graph cluster randomization**: partition the network into dense communities and randomize clusters, so most connections share an arm.\n- **Ego-network design**: randomize focal users and measure effects on them and their neighbors separately.\n- Measure spillover explicitly: compare control users with many treated friends vs few.\n\nTrade-off: clusters mean fewer randomization units, so power drops; plan for longer tests and cluster-robust standard errors."
}
```

> [!TIP] Interview tips
> - Ask "do users interact or share a resource?" before designing any test.
> - Name the assumption (SUTVA) and the likely direction of bias.
> - Propose cluster or switchback designs, and mention the power cost.
