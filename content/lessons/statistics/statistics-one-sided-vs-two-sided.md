---
id: statistics-one-sided-vs-two-sided
title: One-sided vs two-sided tests
estimatedMinutes: 8
difficulty: easy
tags: [statistics, hypothesis-testing, ab-testing]
---

## Why it matters
Switching to a one-sided test after seeing the data halves the p-value, a quiet form of p-hacking. Interviewers check that you choose the direction for the right reasons, before looking.

## Concept
- **Two-sided**: $H_1: \mu \ne \mu_0$. Detects changes in either direction. Rejection region split between both tails ($|z| > 1.96$ at α = 0.05).
- **One-sided**: $H_1: \mu > \mu_0$. All of α in one tail ($z > 1.645$). More power for that direction, **zero** ability to detect the opposite.

For the same data, $p_{\text{one-sided}} = p_{\text{two-sided}} / 2$ when the effect goes in the hypothesized direction.

When one-sided is defensible: the opposite direction leads to the same decision (e.g. a non-inferiority or "is it above the SLA?" check), and you decided that before seeing data. For most product A/B tests, two-sided is the default because harming the metric is something you must detect.

## Worked example
A test gives $z = 1.80$.

- Two-sided: $p = 2(1 - \Phi(1.80)) \approx 0.072$, not significant at 0.05.
- One-sided (if pre-registered for "increase"): $p \approx 0.036$, significant.

Picking one-sided only after seeing z = 1.80 would double the real false-positive rate for that analysis.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why do most product A/B tests use two-sided tests?",
  "options": ["They have more power", "A change can hurt the metric, and we must be able to detect harm", "One-sided tests are not valid", "Two-sided p-values are smaller"],
  "answer": 1,
  "explanation": "A one-sided 'improvement' test can't flag a significant drop."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `p_values(z)` returning `(two_sided, one_sided_greater)` using `statistics.NormalDist().cdf`.",
  "starterCode": "from statistics import NormalDist\n\ndef p_values(z):\n    pass\n\nprint(p_values(1.80))",
  "tests": "two, one = p_values(1.80)\nassert abs(two - 0.07186) < 1e-4 and abs(one - 0.03593) < 1e-4\ntwo, one = p_values(-1.80)\nassert abs(two - 0.07186) < 1e-4 and one > 0.95\nassert abs(p_values(0)[0] - 1) < 1e-12",
  "solution": "from statistics import NormalDist\n\ndef p_values(z):\n    cdf = NormalDist().cdf\n    two = 2 * (1 - cdf(abs(z)))\n    one = 1 - cdf(z)\n    return two, one",
  "hints": ["Two-sided uses |z| and doubles the tail.", "One-sided 'greater' is just the upper tail; a negative z gives a large p."]
}
```

> [!TIP] Interview tips
> - Say "two-sided by default; one-sided only if pre-registered and the opposite direction doesn't matter".
> - Name the risk: switching after seeing data is p-hacking.
> - For "make sure we didn't break it", a one-sided non-inferiority test with a margin is the principled choice.
