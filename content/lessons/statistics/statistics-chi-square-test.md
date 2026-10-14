---
id: statistics-chi-square-test
title: Chi-square test
estimatedMinutes: 12
difficulty: medium
tags: [statistics, hypothesis-testing, categorical, srm]
---

## Why it matters
"Is plan choice related to country?" and "is our 50/50 A/B split actually 50/50?" are chi-square questions. The second one (sample ratio mismatch) is a must-know check before trusting any experiment.

## Concept
Compares **observed** counts with the counts **expected** under $H_0$:

$$
\chi^2 = \sum \frac{(O - E)^2}{E}
$$

| Test | Question | Expected counts | df |
|---|---|---|---|
| Goodness of fit | do counts match given proportions? | $n \times p_i$ | k − 1 |
| Independence (contingency table) | are two categorical variables related? | $\frac{\text{row total} \times \text{column total}}{n}$ | (r − 1)(c − 1) |

Large $\chi^2$ → reject $H_0$. Critical values at α = 0.05: 3.84 (df 1), 5.99 (df 2), 7.81 (df 3). Rule of thumb: expected counts should be at least ~5 per cell; otherwise use Fisher's exact test.

## Worked example
**Sample ratio mismatch (SRM) check**: a 50/50 test assigned 50,600 users to A and 49,400 to B.

$$
E = 50{,}000 \text{ each}, \quad \chi^2 = \frac{600^2}{50{,}000} + \frac{600^2}{50{,}000} = 14.4
$$

That's far above 3.84 (p ≈ 0.0001). The assignment is broken (a bug, bot filtering, or redirect loss), so the test results can't be trusted until the cause is found.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A 3×4 contingency table is tested for independence. What are the degrees of freedom?",
  "options": ["12", "11", "6", "7"],
  "answer": 2,
  "explanation": "(3 − 1) × (4 − 1) = 6."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `chi2_gof(observed, expected_props)` for a goodness-of-fit statistic, and `chi2_independence(table)` for a contingency table given as a list of rows. Return only the χ² statistic.",
  "starterCode": "def chi2_gof(observed, expected_props):\n    pass\n\ndef chi2_independence(table):\n    pass\n\nprint(chi2_gof([50600, 49400], [0.5, 0.5]))",
  "tests": "assert abs(chi2_gof([50600, 49400], [0.5, 0.5]) - 14.4) < 1e-9\nassert abs(chi2_gof([10, 10, 10], [1/3] * 3)) < 1e-12\nt = [[20, 30], [30, 20]]\nassert abs(chi2_independence(t) - 4.0) < 1e-9\nassert abs(chi2_independence([[10, 20], [20, 40]])) < 1e-12",
  "solution": "def chi2_gof(observed, expected_props):\n    n = sum(observed)\n    return sum((o - n * p) ** 2 / (n * p) for o, p in zip(observed, expected_props))\n\ndef chi2_independence(table):\n    n = sum(sum(r) for r in table)\n    rows = [sum(r) for r in table]\n    cols = [sum(c) for c in zip(*table)]\n    chi2 = 0.0\n    for i, r in enumerate(table):\n        for j, o in enumerate(r):\n            e = rows[i] * cols[j] / n\n            chi2 += (o - e) ** 2 / e\n    return chi2",
  "hints": ["Expected count for cell (i, j) = row_i total × column_j total / n.", "Proportional rows (like [10, 20] and [20, 40]) give χ² = 0."]
}
```

> [!TIP] Interview tips
> - Mention the SRM check unprompted when discussing A/B tests; it's a sign of real experimentation experience.
> - Chi-square tests association, not direction or strength; report proportions (or Cramér's V) too.
> - With small expected counts, switch to Fisher's exact test.
