---
id: experimentation-confounding-dags
title: Confounding, DAGs
estimatedMinutes: 12
difficulty: medium
tags: [causal-inference, dags, confounding, colliders]
---

## Why it matters
"Which variables should you control for?" The intuitive answer ("everything") is wrong. Causal diagrams (DAGs) give a principled answer and help explain confounders, mediators and colliders in interviews.

## Concept
A **DAG** draws variables as nodes and causal effects as arrows. Three basic structures:

| Structure | Shape | Control for it? |
|---|---|---|
| **Confounder** | X ← Z → Y | **yes**: Z creates a spurious path |
| **Mediator** | X → M → Y | no, if you want the **total** effect (controlling blocks part of it) |
| **Collider** | X → C ← Y | **no**: conditioning on C creates a fake association |

The goal is to **block all backdoor paths** (paths from X to Y that start with an arrow into X) without blocking causal paths or opening collider paths.

Collider bias is subtle and common: "among hired candidates, coding skill and communication skill are negatively correlated" (hiring requires at least one, so selecting on hiring links them).

## Worked example
Question: does using the mobile app (X) increase purchases (Y)?

- **Engagement / interest** affects both app use and purchases → confounder → control for it (e.g. pre-period activity).
- **Number of sessions** is caused by app use and drives purchases → mediator → don't control if you want the total effect.
- **"Received a satisfaction survey"** (sent to people who used the app or purchased) → collider → don't condition on survey respondents.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Studying hospitalized patients only, two unrelated diseases appear negatively correlated. What's the most likely explanation?",
  "options": ["One disease prevents the other", "Collider bias: hospitalization is caused by either disease, so conditioning on it creates a spurious association", "Confounding by age", "Measurement error"],
  "answer": 1,
  "explanation": "This is Berkson's paradox, a classic collider bias."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Simulate collider bias. `collider_corr(n, seed)`: draw independent skill_a and skill_b ~ N(0, 1); a candidate is 'hired' if skill_a + skill_b > 1. Return `(corr_all, corr_hired)`: correlation of the two skills in everyone vs only among hired candidates. Use `statistics.correlation`.",
  "starterCode": "import random, statistics\n\ndef collider_corr(n, seed):\n    pass\n\nprint(collider_corr(20000, 0))",
  "tests": "a, h = collider_corr(20000, 0)\nassert abs(a) < 0.05, a\nassert h < -0.3, h",
  "solution": "import random, statistics\n\ndef collider_corr(n, seed):\n    rng = random.Random(seed)\n    xs = [rng.gauss(0, 1) for _ in range(n)]\n    ys = [rng.gauss(0, 1) for _ in range(n)]\n    hired = [(x, y) for x, y in zip(xs, ys) if x + y > 1]\n    return statistics.correlation(xs, ys), statistics.correlation([h[0] for h in hired], [h[1] for h in hired])",
  "hints": ["Skills are independent overall, so their correlation is about 0.", "Selecting on their sum (a collider) induces a negative correlation."]
}
```

> [!TIP] Interview tips
> - Sketch a DAG before choosing controls; it shows structured causal thinking.
> - Control for confounders; don't control for mediators (for total effects) or colliders.
> - Use Berkson's paradox or the hiring example to explain collider bias quickly.
