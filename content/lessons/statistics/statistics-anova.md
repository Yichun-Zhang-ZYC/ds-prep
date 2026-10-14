---
id: statistics-anova
title: ANOVA
estimatedMinutes: 12
difficulty: medium
tags: [statistics, hypothesis-testing, anova, multiple-groups]
---

## Why it matters
With three or more variants (A/B/C/D), running every pairwise t-test inflates false positives. One-way ANOVA asks the single question "do any group means differ?" first.

## Concept
ANOVA splits total variation into **between-group** and **within-group** parts:

$$
F = \frac{\text{between-group variance}}{\text{within-group variance}} = \frac{SS_B / (k - 1)}{SS_W / (N - k)}
$$

- $SS_B = \sum_j n_j (\bar x_j - \bar x)^2$: how far group means are from the grand mean.
- $SS_W = \sum_j \sum_i (x_{ij} - \bar x_j)^2$: spread inside groups.

$H_0$: all group means are equal. A large $F$ means group means differ more than noise would explain. ANOVA only says **some** difference exists; follow up with post-hoc tests (e.g. Tukey HSD) to find which.

Assumptions: independent observations, roughly normal residuals, similar variances (Welch's ANOVA relaxes the last one). With two groups, ANOVA is equivalent to a t-test ($F = t^2$).

## Worked example
Three checkout variants, five users each (seconds to complete): A = 30, 32, 31, 29, 33; B = 35, 36, 34, 37, 33; C = 30, 31, 29, 32, 28.

Group means 31, 35, 30; grand mean 32. $SS_B = 5(1 + 9 + 4) = 70$, $SS_W = 10 + 10 + 10 = 30$.

$$
F = \frac{70 / 2}{30 / 12} = 14
$$

Far above the critical value (~3.89 for df 2 and 12): at least one variant differs, most likely B.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "With 5 variants, how many pairwise comparisons are there, and why is that a problem?",
  "options": ["5; no problem", "10; at α = 0.05 each, the chance of at least one false positive is about 40%", "20; tests become dependent", "4; you only compare to control"],
  "answer": 1,
  "explanation": "C(5, 2) = 10 comparisons; 1 − 0.95¹⁰ ≈ 0.40 if they were independent."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `anova_f(groups)` returning the one-way ANOVA F statistic for a list of groups (each a list of numbers).",
  "starterCode": "def anova_f(groups):\n    pass\n\nA = [30, 32, 31, 29, 33]\nB = [35, 36, 34, 37, 33]\nC = [30, 31, 29, 32, 28]\nprint(anova_f([A, B, C]))",
  "tests": "A = [30, 32, 31, 29, 33]\nB = [35, 36, 34, 37, 33]\nC = [30, 31, 29, 32, 28]\nassert abs(anova_f([A, B, C]) - 14.0) < 1e-9\nimport math, statistics\nx, y = [1, 2, 3, 4], [3, 4, 5, 6]\nsp = math.sqrt((statistics.variance(x) * 3 + statistics.variance(y) * 3) / 6)\nt = (statistics.mean(y) - statistics.mean(x)) / (sp * math.sqrt(0.5))\nassert abs(anova_f([x, y]) - t * t) < 1e-9",
  "solution": "def anova_f(groups):\n    k = len(groups)\n    n = sum(len(g) for g in groups)\n    grand = sum(sum(g) for g in groups) / n\n    means = [sum(g) / len(g) for g in groups]\n    ssb = sum(len(g) * (m - grand) ** 2 for g, m in zip(groups, means))\n    ssw = sum((x - m) ** 2 for g, m in zip(groups, means) for x in g)\n    return (ssb / (k - 1)) / (ssw / (n - k))",
  "hints": ["SS_B weights each group's squared distance from the grand mean by its size.", "With two groups, F equals the pooled-variance t statistic squared."]
}
```

> [!TIP] Interview tips
> - For multi-variant tests, say "ANOVA (or a chi-square for proportions) first, then corrected pairwise comparisons".
> - Remember $F = t^2$ for two groups; it's a nice sanity check.
> - In practice, many teams skip ANOVA and compare each variant to control with a multiple-testing correction; mention both.
