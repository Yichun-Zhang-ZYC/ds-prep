---
id: experimentation-propensity-score-matching
title: Propensity score matching
estimatedMinutes: 15
difficulty: hard
tags: [causal-inference, propensity-scores, matching, observational]
---

## Why it matters
"Users who joined the loyalty program spend more. How much of that is the program?" With observational data and measured confounders, propensity scores are a standard approach, and interviewers like to probe their limits.

## Concept
The **propensity score** is $e(x) = P(T = 1 \mid X = x)$: the probability of treatment given observed covariates, typically estimated with logistic regression.

If treatment assignment depends only on observed $X$ (**no unmeasured confounding**), then comparing treated and control units with similar propensity scores removes the bias from those covariates.

Ways to use it:
- **Matching**: pair each treated unit with the control unit(s) with the closest score; compare outcomes (estimates the ATT).
- **Inverse probability weighting (IPW)**: weight treated units by $1/e(x)$ and controls by $1/(1 - e(x))$.
- **Stratification**: compare within score bins.

Checks: **overlap** (both groups have units across the score range) and **balance** (covariates look similar after matching).

The big limitation: it can't fix **unmeasured** confounders (motivation, intent). Matching on what you see isn't randomization.

## Worked example
Loyalty members spend \$80/month vs \$50 for non-members (+\$30). Members were more active before joining. After matching each member to a non-member with a similar propensity score (based on prior spend, tenure, visits), the matched non-members spend \$72. The estimated effect on members shrinks to about +\$8.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What is the main limitation of propensity score matching?",
  "options": ["It requires randomized data", "It only adjusts for observed covariates; unmeasured confounders still bias the estimate", "It can't handle binary outcomes", "It always overestimates effects"],
  "answer": 1,
  "explanation": "Propensity scores summarize observed X only."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `nn_match_att(treated, control)`: each is a list of `(propensity, outcome)`. For each treated unit, find the control unit with the closest propensity (matching with replacement) and return the average of (treated outcome − matched control outcome).",
  "starterCode": "def nn_match_att(treated, control):\n    pass\n\ntreated = [(0.8, 85), (0.6, 78), (0.7, 80)]\ncontrol = [(0.2, 40), (0.65, 72), (0.75, 74), (0.3, 45)]\nprint(nn_match_att(treated, control))",
  "tests": "treated = [(0.8, 85), (0.6, 78), (0.7, 80)]\ncontrol = [(0.2, 40), (0.65, 72), (0.75, 74), (0.3, 45)]\nassert abs(nn_match_att(treated, control) - ((85 - 74) + (78 - 72) + (80 - 72)) / 3) < 1e-9\nassert nn_match_att([(0.5, 10)], [(0.5, 7), (0.9, 100)]) == 3",
  "solution": "def nn_match_att(treated, control):\n    diffs = []\n    for p, y in treated:\n        cp, cy = min(control, key=lambda c: abs(c[0] - p))\n        diffs.append(y - cy)\n    return sum(diffs) / len(diffs)",
  "hints": ["min(control, key=lambda c: abs(c[0] - p)) finds the nearest control.", "Ties go to the first closest control in the list."]
}
```

> [!TIP] Interview tips
> - State the assumption plainly: no unmeasured confounding, plus overlap.
> - Always mention balance checks after matching.
> - Prefer an experiment when possible; use matching as a fallback and stress-test it with sensitivity analysis.
