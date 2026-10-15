---
id: experimentation-potential-outcomes-framework
title: Potential outcomes framework
estimatedMinutes: 12
difficulty: medium
tags: [causal-inference, potential-outcomes, rubin]
---

## Why it matters
Every causal method (A/B tests, DiD, matching, IV) is easier to explain with potential outcomes. Interviewers use it to check that you know what "causal effect" means precisely and why randomization works.

## Concept
For each unit $i$ there are two **potential outcomes**:
- $Y_i(1)$: outcome if treated,
- $Y_i(0)$: outcome if not treated.

The individual causal effect is $Y_i(1) - Y_i(0)$, but we only ever observe **one** of them: the **fundamental problem of causal inference**.

So we estimate averages:
- **ATE** (average treatment effect): $E[Y(1) - Y(0)]$ over everyone.
- **ATT** (on the treated): the average effect for those who actually got treatment.

The naive comparison decomposes as

$$
\underbrace{E[Y \mid T{=}1] - E[Y \mid T{=}0]}_{\text{observed difference}} = \underbrace{\text{ATT}}_{\text{effect}} + \underbrace{E[Y(0) \mid T{=}1] - E[Y(0) \mid T{=}0]}_{\text{selection bias}}
$$

**Randomization** makes treatment independent of potential outcomes, so selection bias is zero and the simple difference in means estimates the ATE.

## Worked example
Users who opt into a premium tutorial spend \$30 more next month than users who don't. But opt-in users were already heavy spenders: even without the tutorial, their $Y(0)$ would be ~\$25 higher. The selection bias is ~\$25, so the true effect on them is closer to \$5.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What is the 'fundamental problem of causal inference'?",
  "options": ["Samples are too small", "For each unit we observe only one potential outcome, never both", "p-values are hard to interpret", "Treatment effects are always zero"],
  "answer": 1,
  "explanation": "We can't see the same user both treated and untreated at the same time, so we estimate average effects using comparable groups."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "You're given a simulated dataset where both potential outcomes are known: a list of `(y0, y1, treated)` tuples. Write `true_ate(rows)`, `naive_diff(rows)` (mean observed y among treated minus among untreated, where the observed y is y1 if treated else y0), and `selection_bias(rows)` = naive_diff − ATT, where ATT is the mean of (y1 − y0) among treated.",
  "starterCode": "def true_ate(rows):\n    pass\n\ndef naive_diff(rows):\n    pass\n\ndef selection_bias(rows):\n    pass\n\nrows = [(50, 55, 1), (60, 65, 1), (20, 25, 0), (30, 35, 0)]\nprint(true_ate(rows), naive_diff(rows), selection_bias(rows))",
  "tests": "rows = [(50, 55, 1), (60, 65, 1), (20, 25, 0), (30, 35, 0)]\nassert true_ate(rows) == 5\nassert naive_diff(rows) == 35\nassert selection_bias(rows) == 30\nrandomized = [(50, 55, 1), (20, 25, 1), (60, 65, 0), (30, 35, 0)]\nassert selection_bias(randomized) == -10",
  "solution": "def true_ate(rows):\n    return sum(y1 - y0 for y0, y1, _ in rows) / len(rows)\n\ndef naive_diff(rows):\n    t = [y1 for y0, y1, d in rows if d]\n    c = [y0 for y0, y1, d in rows if not d]\n    return sum(t) / len(t) - sum(c) / len(c)\n\ndef selection_bias(rows):\n    att = [y1 - y0 for y0, y1, d in rows if d]\n    return naive_diff(rows) - sum(att) / len(att)",
  "hints": ["Observed outcome = y1 for treated units, y0 for control units.", "Selection bias = difference in baseline outcomes y0 between the groups."]
}
```

> [!TIP] Interview tips
> - Define the effect as $Y(1) - Y(0)$ and say we never see both for the same unit.
> - Use the decomposition "observed difference = effect + selection bias" to explain why correlations mislead.
> - Explain randomization as the device that zeroes out selection bias.
