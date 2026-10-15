---
id: experimentation-novelty-and-primacy-effects
title: Novelty and primacy effects
estimatedMinutes: 10
difficulty: medium
tags: [experimentation, novelty, long-term-effects]
---

## Why it matters
"Engagement jumped 8% in week 1 but only 2% by week 3. What's the real effect?" Changes to familiar products often trigger temporary reactions. Interviewers want you to detect them and estimate the steady-state effect.

## Concept
- **Novelty effect**: users engage more with something simply because it's new (clicking a redesigned button out of curiosity). The lift **decays** over time.
- **Primacy (change aversion)**: existing users initially resist change because they're used to the old way. The effect **improves** over time as they adapt.

Both mainly affect **existing** users. New users have no "old way" to compare with.

How to detect and handle:
1. Plot the treatment effect **by day since exposure** (not by calendar day); a trend means the effect isn't stable.
2. Compare **new vs existing users**: if new users show a smaller (novelty) or larger (primacy) effect, that's a clue.
3. Run longer, or estimate the effect from later exposure days.
4. For big changes, keep a long-term holdout.

## Worked example
A redesigned feed shows click-through lift by days since first exposure: day 1 +9%, day 3 +6%, day 7 +3%, day 14 +2.5%, day 21 +2.4%. The effect is converging around +2.4%: the long-run benefit is real but much smaller than the week-1 number. Report ~+2.4% and note the decay.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A new navigation layout initially lowers task completion for existing users, but new users do better than control from day one. Which effect is this most likely?",
  "options": ["Novelty effect", "Primacy / change aversion among existing users", "Sample ratio mismatch", "Simpson's paradox"],
  "answer": 1,
  "explanation": "Existing users are slowed by unfamiliarity; new users have no habits to unlearn."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `steady_state_lift(daily_lifts, tail_days=7)` returning the average lift over the last `tail_days` entries, and `is_decaying(daily_lifts, tail_days=7)` returning True if the average of the first `tail_days` entries exceeds the steady-state lift by more than 50%.",
  "starterCode": "def steady_state_lift(daily_lifts, tail_days=7):\n    pass\n\ndef is_decaying(daily_lifts, tail_days=7):\n    pass\n\nlifts = [9, 8, 7, 6, 5, 4, 3.5, 3, 2.8, 2.6, 2.5, 2.5, 2.4, 2.4, 2.4, 2.4, 2.4, 2.4, 2.4, 2.4, 2.4]\nprint(steady_state_lift(lifts), is_decaying(lifts))",
  "tests": "lifts = [9, 8, 7, 6, 5, 4, 3.5, 3, 2.8, 2.6, 2.5, 2.5, 2.4, 2.4, 2.4, 2.4, 2.4, 2.4, 2.4, 2.4, 2.4]\nassert abs(steady_state_lift(lifts) - 2.4) < 1e-12\nassert is_decaying(lifts) is True\nassert is_decaying([2.0] * 21) is False",
  "solution": "def steady_state_lift(daily_lifts, tail_days=7):\n    tail = daily_lifts[-tail_days:]\n    return sum(tail) / len(tail)\n\ndef is_decaying(daily_lifts, tail_days=7):\n    head = daily_lifts[:tail_days]\n    return sum(head) / len(head) > 1.5 * steady_state_lift(daily_lifts, tail_days)",
  "hints": ["Use list slicing for the first and last tail_days entries."]
}
```

> [!TIP] Interview tips
> - Ask to see the effect by days since exposure before trusting a big early lift.
> - Split by new vs existing users to separate novelty from primacy.
> - For major UI changes, propose a long-term holdout to measure lasting impact.
