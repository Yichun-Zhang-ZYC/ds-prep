---
id: statistics-z-test-t-test
title: z-test, t-test (one-sample, two-sample, paired)
estimatedMinutes: 15
difficulty: medium
tags: [statistics, hypothesis-testing, t-test, ab-testing]
---

## Why it matters
Choosing the right test (z vs t, independent vs paired) and computing the statistic by hand is a staple question. Most A/B tests on means or proportions are z- or t-tests underneath.

## Concept
All share the form **(estimate − null value) / standard error**.

| Test | Use when | Statistic |
|---|---|---|
| One-sample t | compare a mean to a fixed value | $t = \dfrac{\bar x - \mu_0}{s/\sqrt n}$, df = n − 1 |
| Two-sample (Welch) t | two independent groups | $t = \dfrac{\bar x_1 - \bar x_2}{\sqrt{s_1^2/n_1 + s_2^2/n_2}}$ |
| Paired t | same units measured twice (before/after) | one-sample t on the differences $d_i$ |
| Two-proportion z | conversion rates | $z = \dfrac{\hat p_2 - \hat p_1}{\sqrt{\hat p(1-\hat p)(1/n_1 + 1/n_2)}}$ with pooled $\hat p$ |

z vs t: t accounts for estimating σ from the data; with large samples (hundreds+) they agree. Prefer **Welch's** t over the equal-variance version by default.

Pairing removes between-unit variation, so a paired test can be far more powerful when measurements are correlated.

## Worked example
Two-proportion z-test: A converts 500 / 10,000, B 560 / 10,000.

$$
\hat p = \frac{1060}{20{,}000} = 0.053, \quad SE = \sqrt{0.053 \times 0.947 \times \tfrac{2}{10{,}000}} \approx 0.00317, \quad z = \frac{0.006}{0.00317} \approx 1.89
$$

Two-sided $p \approx 0.058$: not significant at 0.05.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You measure each user's task time before and after a redesign. Which test fits?",
  "options": ["Two-sample t-test", "Paired t-test", "Chi-square test", "Two-proportion z-test"],
  "answer": 1,
  "explanation": "The same users are measured twice; test the per-user differences."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `two_prop_z(k1, n1, k2, n2)` (pooled SE, returns z for group 2 minus group 1), `welch_t(xs, ys)` (returns t for mean(xs) − mean(ys)), and `paired_t(before, after)` (returns t for mean(after − before)). Use sample variances (n − 1).",
  "starterCode": "import math\n\ndef two_prop_z(k1, n1, k2, n2):\n    pass\n\ndef welch_t(xs, ys):\n    pass\n\ndef paired_t(before, after):\n    pass\n\nprint(two_prop_z(500, 10000, 560, 10000))",
  "tests": "import math, statistics\nz = two_prop_z(500, 10000, 560, 10000)\nassert abs(z - 1.8938) < 1e-3, z\nxs, ys = [5, 6, 7, 8, 9], [3, 4, 5, 6]\nexp = (7 - 4.5) / math.sqrt(statistics.variance(xs) / 5 + statistics.variance(ys) / 4)\nassert abs(welch_t(xs, ys) - exp) < 1e-12\nb, a = [10, 12, 11, 14], [11, 14, 12, 16]\nd = [y - x for x, y in zip(b, a)]\nassert abs(paired_t(b, a) - statistics.mean(d) / (statistics.stdev(d) / 2)) < 1e-12",
  "solution": "import math\n\ndef _var(v):\n    m = sum(v) / len(v)\n    return sum((x - m) ** 2 for x in v) / (len(v) - 1)\n\ndef two_prop_z(k1, n1, k2, n2):\n    p = (k1 + k2) / (n1 + n2)\n    se = math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2))\n    return (k2 / n2 - k1 / n1) / se\n\ndef welch_t(xs, ys):\n    se = math.sqrt(_var(xs) / len(xs) + _var(ys) / len(ys))\n    return (sum(xs) / len(xs) - sum(ys) / len(ys)) / se\n\ndef paired_t(before, after):\n    d = [a - b for b, a in zip(before, after)]\n    return (sum(d) / len(d)) / math.sqrt(_var(d) / len(d))",
  "hints": ["Pool the proportions for the z-test SE under H0.", "A paired test is a one-sample t-test on the differences."]
}
```

> [!TIP] Interview tips
> - Ask "independent or paired?" first; it's the most consequential choice.
> - Default to Welch's t; mention that z and t converge for large samples.
> - For revenue-like metrics, note that the t-test relies on the CLT; with heavy tails, consider bootstrap or trimming.
