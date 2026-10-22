---
id: mlops-data-drift-concept-drift
title: Data drift, concept drift
estimatedMinutes: 12
difficulty: medium
tags: [mlops, monitoring, drift, psi]
---

## Why it matters
Production data never stays the same as training data. Distinguishing data drift from concept drift, and knowing how to detect each without labels, is a standard MLOps interview question.

## Concept
Let $X$ be the inputs and $Y$ the target. Types of drift:
- **Covariate (data) drift**: $P(X)$ changes, $P(Y \mid X)$ does not. Example: a new marketing channel brings younger users.
- **Label (prior) drift**: $P(Y)$ changes. Example: the fraud rate doubles.
- **Concept drift**: $P(Y \mid X)$ changes, the relationship itself. Example: after a policy change, the same applicant profile now defaults more often.
- **Pattern in time**: sudden (outage, new app version), gradual, seasonal/recurring, or an upstream **schema or unit change** (often a bug, not real drift).

**Detection without labels** compares a reference window (training or a stable period) with a recent window, per feature and on the prediction distribution:
- **PSI** (Population Stability Index): bin the feature, then $\text{PSI} = \sum_i (a_i - e_i)\ln\frac{a_i}{e_i}$ with $e_i$ and $a_i$ the expected and actual bin shares. Rule of thumb: $<0.1$ stable, $0.1$ to $0.25$ moderate, $>0.25$ significant.
- **KS test** (continuous), **chi-square** (categorical), **Jensen-Shannon / Wasserstein** distances. With huge samples every test is "significant", so look at effect size, not only p-values.
- **Domain classifier**: train a model to tell reference from current rows; AUC near 0.5 means no drift.

**Key point**: drift is not the same as damage. Covariate drift in an unimportant feature may not hurt; concept drift can hurt with *no* input drift, and is only visible through labels (performance monitoring).

## Worked example
A feature is binned into 3 buckets. Training shares $e = (0.5, 0.3, 0.2)$; this week $a = (0.3, 0.3, 0.4)$.
$\text{PSI} = (0.3-0.5)\ln\frac{0.3}{0.5} + 0 + (0.4-0.2)\ln\frac{0.4}{0.2} = 0.102 + 0.139 \approx 0.24$, moderate and close to significant. Action: check for an upstream change, then see whether the model's output distribution and live metrics moved before retraining.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Input features look unchanged, but the relationship between a user profile and churn changed after a pricing change. This is:",
  "options": ["Covariate drift", "Concept drift", "Label drift only", "Nothing; PSI is low so the model is fine"],
  "answer": 1,
  "explanation": "P(Y|X) changed while P(X) did not. Input-drift metrics like PSI will not catch it; you need labels."
}
```

```quiz
{
  "id": "q2",
  "question": "With millions of rows, a KS test flags every feature as drifted (p < 1e-10). What is the best response?",
  "options": ["Retrain everything", "Ignore the test", "Look at effect size (PSI, distance) and importance of the feature", "Reduce the number of features"],
  "answer": 2,
  "explanation": "Large samples make tiny shifts significant. Use effect-size measures and weight by feature importance."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `psi(expected, actual, edges, eps=1e-4)`. Bin each value list with `edges` (sorted upper bounds; bin 0 is `x <= edges[0]`, the last bin is `x > edges[-1]`), convert to shares, floor each share at `eps` to avoid log(0), and return $\\sum (a_i - e_i)\\ln(a_i/e_i)$. Also implement `severity(p)`: `'stable'` below 0.1, `'moderate'` below 0.25, otherwise `'significant'`.",
  "starterCode": "import math\nfrom bisect import bisect_left\n\ndef psi(expected, actual, edges, eps=1e-4):\n    pass\n\ndef severity(p):\n    pass\n",
  "tests": "edges = [3, 7]\nexp = [1, 1, 2, 3, 4, 5, 6, 8, 9, 9]\nact = [1, 2, 3, 4, 5, 6, 8, 9, 9, 9]\ne = [0.4, 0.3, 0.3]\na = [0.3, 0.3, 0.4]\nref = sum((ai - ei) * math.log(ai / ei) for ai, ei in zip(a, e))\nassert abs(psi(exp, act, edges) - ref) < 1e-9\nassert abs(psi(exp, exp, edges)) < 1e-12\nassert math.isfinite(psi(exp, [100] * 10, edges))\nassert psi(exp, [100] * 10, edges) > 0.25\nassert severity(0.05) == 'stable' and severity(0.1) == 'moderate' and severity(0.24) == 'moderate' and severity(0.25) == 'significant'",
  "solution": "import math\nfrom bisect import bisect_left\n\ndef _shares(vals, edges, eps):\n    counts = [0] * (len(edges) + 1)\n    for v in vals:\n        counts[bisect_left(edges, v)] += 1\n    n = len(vals)\n    return [max(c / n, eps) for c in counts]\n\ndef psi(expected, actual, edges, eps=1e-4):\n    e = _shares(expected, edges, eps)\n    a = _shares(actual, edges, eps)\n    return sum((ai - ei) * math.log(ai / ei) for ei, ai in zip(e, a))\n\ndef severity(p):\n    if p < 0.1:\n        return 'stable'\n    if p < 0.25:\n        return 'moderate'\n    return 'significant'",
  "hints": ["bisect_left(edges, x) returns the bin index when bins are (-inf, e0], (e0, e1], ...", "Compute shares with max(count / n, eps) so empty bins stay finite."]
}
```

> [!TIP] Interview tips
> - Define the three drifts with P(X), P(Y), P(Y|X) and give one example each.
> - Detect input drift with PSI/KS per feature and on the prediction distribution; concept drift needs labels.
> - Say drift is a signal to investigate (often an upstream bug), not an automatic retrain trigger.
