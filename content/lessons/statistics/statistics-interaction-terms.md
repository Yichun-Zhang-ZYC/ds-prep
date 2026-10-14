---
id: statistics-interaction-terms
title: Interaction terms
estimatedMinutes: 10
difficulty: medium
tags: [statistics, regression, interactions, heterogeneous-effects]
---

## Why it matters
"Does the discount work better for new users than for returning users?" That's an interaction. Interaction terms are how regression captures effects that differ across groups, and how A/B tests check heterogeneous treatment effects.

## Concept
$$
y = \beta_0 + \beta_1 x + \beta_2 z + \beta_3 (x \cdot z) + \varepsilon
$$

The effect of $x$ now depends on $z$: $\partial y / \partial x = \beta_1 + \beta_3 z$.

With a binary $z$ (new user = 1):
- $\beta_1$: effect of $x$ for returning users ($z = 0$).
- $\beta_1 + \beta_3$: effect of $x$ for new users.
- $\beta_3$: the **difference** in effects. Its test answers "do the effects differ?".

Rules: keep the main effects when you include an interaction. The main effect $\beta_1$ is the effect when $z = 0$, so centering continuous variables makes it interpretable.

## Worked example
A/B test with treatment $T$ and new-user flag $N$:

$$
\text{conv} = 0.05 + 0.004\,T + 0.010\,N + 0.006\,(T \cdot N)
$$

- Lift for returning users: +0.4 points.
- Lift for new users: 0.4 + 0.6 = +1.0 point.
- The interaction (+0.6) is the evidence that the treatment works better for new users, if its CI excludes 0 (and, ideally, the segment was pre-specified).

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "In y = 2 + 3x + 1z + 2(x·z), what is the effect of a one-unit increase in x when z = 4?",
  "options": ["3", "5", "11", "8"],
  "answer": 2,
  "explanation": "β₁ + β₃·z = 3 + 2 × 4 = 11."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `slope_of_x(b1, b3, z)` for the effect of x at a given z, and `group_lifts(b_t, b_tn)` returning `(lift_returning, lift_new)` for a treatment T and new-user flag N model.",
  "starterCode": "def slope_of_x(b1, b3, z):\n    pass\n\ndef group_lifts(b_t, b_tn):\n    pass\n\nprint(slope_of_x(3, 2, 4), group_lifts(0.004, 0.006))",
  "tests": "assert slope_of_x(3, 2, 4) == 11\nassert slope_of_x(3, 2, 0) == 3\nr, n = group_lifts(0.004, 0.006)\nassert abs(r - 0.004) < 1e-12 and abs(n - 0.010) < 1e-12",
  "solution": "def slope_of_x(b1, b3, z):\n    return b1 + b3 * z\n\ndef group_lifts(b_t, b_tn):\n    return b_t, b_t + b_tn",
  "hints": ["The effect of x is β1 + β3·z.", "For the binary case, the new-user lift adds the interaction to the base lift."]
}
```

> [!TIP] Interview tips
> - Interpret the main effect as "the effect when the other variable is 0" (or at its mean if centered).
> - Test the interaction coefficient directly to claim that effects differ; comparing two separate p-values isn't enough.
> - Beware of fishing: many post-hoc segment interactions will be false positives.
