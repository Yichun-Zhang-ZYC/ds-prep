---
id: experimentation-instrumental-variables
title: Instrumental variables
estimatedMinutes: 15
difficulty: hard
tags: [causal-inference, iv, encouragement-design, compliance]
---

## Why it matters
Often you can randomize **encouragement** (an email, a banner) but not the behavior itself (actually using the feature). Instrumental variables turn that into a causal estimate of the behavior's effect. It's a favorite senior-level question.

## Concept
An **instrument** Z affects the outcome Y **only through** the treatment T. Three conditions:

1. **Relevance**: Z changes T (e.g. the email increases feature adoption).
2. **Exclusion**: Z affects Y only via T (the email itself doesn't change purchases).
3. **Independence**: Z is as good as random (it was randomized).

The **Wald estimator** for a binary instrument:

$$
\text{effect of } T = \frac{E[Y \mid Z{=}1] - E[Y \mid Z{=}0]}{E[T \mid Z{=}1] - E[T \mid Z{=}0]} = \frac{\text{ITT on } Y}{\text{effect of } Z \text{ on } T}
$$

This estimates the **LATE**: the effect for **compliers** (users who adopt only because they were encouraged), not for everyone.

Weak instruments (Z barely moves T) give unstable, biased estimates.

## Worked example
A randomized email promotes a new budgeting tool.

- Adoption: 30% in the email group vs 10% in the no-email group (+20 points).
- Monthly savings: \$52 vs \$48 (+\$4 intent-to-treat effect).

$$
\text{LATE} = \frac{\$4}{0.20} = \$20 \text{ per adopter (among compliers)}
$$

Comparing adopters vs non-adopters directly would be confounded by who chooses to adopt.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which assumption is violated if the promotional email itself (not the tool) makes users save more?",
  "options": ["Relevance", "Exclusion restriction", "Independence", "Overlap"],
  "answer": 1,
  "explanation": "The instrument must affect the outcome only through the treatment."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `wald_late(y_z1, y_z0, t_z1, t_z0)` returning ITT / first-stage using group means, and `itt(y_z1, y_z0)`. Inputs are lists of outcomes (y) and treatment indicators (t) for the encouraged (z1) and non-encouraged (z0) groups.",
  "starterCode": "def itt(y_z1, y_z0):\n    pass\n\ndef wald_late(y_z1, y_z0, t_z1, t_z0):\n    pass\n\nprint(wald_late([52] * 10, [48] * 10, [1] * 3 + [0] * 7, [1] + [0] * 9))",
  "tests": "assert itt([52] * 10, [48] * 10) == 4\nassert abs(wald_late([52] * 10, [48] * 10, [1] * 3 + [0] * 7, [1] + [0] * 9) - 20) < 1e-9\nassert abs(wald_late([3, 5], [1, 1], [1, 1], [0, 0]) - 3) < 1e-12",
  "solution": "def _mean(v):\n    return sum(v) / len(v)\n\ndef itt(y_z1, y_z0):\n    return _mean(y_z1) - _mean(y_z0)\n\ndef wald_late(y_z1, y_z0, t_z1, t_z0):\n    return itt(y_z1, y_z0) / (_mean(t_z1) - _mean(t_z0))",
  "hints": ["The denominator is the difference in treatment take-up between the groups."]
}
```

> [!TIP] Interview tips
> - Frame IV as "randomize the nudge, scale by how much the nudge changes behavior".
> - State all three assumptions and which one is most debatable (usually exclusion).
> - Say the estimate is a LATE for compliers, and mention weak-instrument problems.
