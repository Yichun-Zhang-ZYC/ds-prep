---
id: experimentation-uplift-modeling
title: Uplift modeling
estimatedMinutes: 12
difficulty: hard
tags: [causal-inference, uplift, targeting, marketing]
---

## Why it matters
"Who should we send the coupon to?" Predicting who will buy isn't the same as predicting who will buy **because of** the coupon. Uplift modeling targets the persuadable users and is a common marketing-analytics interview topic.

## Concept
Uplift (CATE) for a user with features $x$:

$$
\tau(x) = P(Y = 1 \mid T = 1, x) - P(Y = 1 \mid T = 0, x)
$$

Four types of users:

| | Buys if not treated | Doesn't buy if not treated |
|---|---|---|
| **Buys if treated** | sure things (coupon wasted) | **persuadables** (target these) |
| **Doesn't buy if treated** | sleeping dogs (coupon hurts) | lost causes |

Approaches (all need randomized training data):
- **Two-model (T-learner)**: fit $P(Y \mid x)$ separately on treated and control; uplift = difference.
- **Single model with a treatment feature (S-learner)**, transformed-outcome methods, uplift trees / causal forests.

Evaluate with **uplift / Qini curves**: rank users by predicted uplift and check that the top deciles really show larger treatment-minus-control differences.

## Worked example
A response model (who buys?) targets loyal customers with high purchase probability, many of them **sure things**, so the coupon mostly gives away margin. An uplift model, trained on a randomized coupon test, targets mid-engagement users whose purchase rate rises from 4% to 9% with the coupon. Same budget, about 2× the incremental orders.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why is a classic purchase-propensity model a poor tool for choosing who gets a discount?",
  "options": ["It's too slow", "It targets likely buyers, many of whom would buy anyway, instead of users whose behavior the discount changes", "It can't use demographic features", "It needs more data than uplift models"],
  "answer": 1,
  "explanation": "Propensity ≠ incrementality. Uplift models target the difference the treatment makes."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Rows are `(segment, treated, bought)`. Write `uplift_by_segment(rows)` returning a dict segment → (treated purchase rate − control purchase rate), and `best_segment(rows)` returning the segment with the highest uplift.",
  "starterCode": "def uplift_by_segment(rows):\n    pass\n\ndef best_segment(rows):\n    pass\n\nrows = [('loyal', 1, 1), ('loyal', 1, 1), ('loyal', 0, 1), ('loyal', 0, 1),\n        ('mid', 1, 1), ('mid', 1, 0), ('mid', 0, 0), ('mid', 0, 0),\n        ('new', 1, 0), ('new', 1, 0), ('new', 0, 0), ('new', 0, 1)]\nprint(uplift_by_segment(rows), best_segment(rows))",
  "tests": "rows = [('loyal', 1, 1), ('loyal', 1, 1), ('loyal', 0, 1), ('loyal', 0, 1), ('mid', 1, 1), ('mid', 1, 0), ('mid', 0, 0), ('mid', 0, 0), ('new', 1, 0), ('new', 1, 0), ('new', 0, 0), ('new', 0, 1)]\nu = uplift_by_segment(rows)\nassert u == {'loyal': 0.0, 'mid': 0.5, 'new': -0.5}\nassert best_segment(rows) == 'mid'",
  "solution": "def uplift_by_segment(rows):\n    stats = {}\n    for seg, t, y in rows:\n        s = stats.setdefault(seg, [0, 0, 0, 0])\n        if t:\n            s[0] += y\n            s[1] += 1\n        else:\n            s[2] += y\n            s[3] += 1\n    return {seg: s[0] / s[1] - s[2] / s[3] for seg, s in stats.items()}\n\ndef best_segment(rows):\n    u = uplift_by_segment(rows)\n    return max(u, key=u.get)",
  "hints": ["Track (treated buys, treated count, control buys, control count) per segment.", "Loyal users buy either way (uplift 0): sure things."]
}
```

> [!TIP] Interview tips
> - Separate "likely to buy" from "likely to be persuaded"; give the 4-quadrant picture.
> - Stress that uplift models need randomized data to train and evaluate.
> - Mention Qini / uplift curves for evaluation, and the cost of treating sleeping dogs.
