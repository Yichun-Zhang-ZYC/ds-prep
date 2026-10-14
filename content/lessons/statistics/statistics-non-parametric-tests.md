---
id: statistics-non-parametric-tests
title: Non-parametric tests (Mann-Whitney U, Wilcoxon)
estimatedMinutes: 12
difficulty: medium
tags: [statistics, hypothesis-testing, non-parametric, ranks]
---

## Why it matters
With tiny samples, heavy tails or ordinal data (ratings 1–5), t-tests can mislead. Rank-based tests are the standard fallback, and interviewers like to hear when (and when not) to use them.

## Concept
Non-parametric tests replace values with **ranks**, so they don't assume normality and are robust to outliers.

| Parametric | Non-parametric counterpart | Data |
|---|---|---|
| Two-sample t | **Mann-Whitney U** (Wilcoxon rank-sum) | two independent groups |
| Paired t | **Wilcoxon signed-rank** | paired measurements |
| One-way ANOVA | Kruskal-Wallis | 3+ independent groups |

Mann-Whitney's $U$ counts, over all pairs (one value from each group), how often the first group's value is larger (ties count ½). $U / (n_1 n_2)$ estimates $P(X > Y)$, which is easy to explain.

Trade-offs: slightly less power than a t-test when data really is normal. They test whether one group tends to have larger values (stochastic dominance), not whether the **means** differ, which matters for revenue decisions.

## Worked example
Satisfaction ratings (1–5): A = 3, 4, 2, 5; B = 5, 4, 5, 3.

Compare every A value with every B value (16 pairs). A wins 3 pairs (4 > 3, 5 > 4, 5 > 3), ties 4 pairs (3 = 3, 4 = 4, and 5 = 5 twice), and loses 9. $U_A = 3 + 4 \times 0.5 = 5$, so $P(A > B) \approx 5/16 \approx 0.31$: B tends to rate higher.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Your A/B test metric is revenue per user and the business decision depends on total revenue. Why is Mann-Whitney not the right primary test?",
  "options": ["It can't handle large samples", "It tests whether values tend to be larger, not whether mean revenue (and so total revenue) differs", "It requires normal data", "It only works on ratings"],
  "answer": 1,
  "explanation": "A variant could win on ranks but lose on mean revenue (e.g. fewer whales). Use a t-test with large n, or bootstrap the mean."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `mann_whitney_u(xs, ys)` returning U for xs: over all pairs (x, y), add 1 if x > y and 0.5 if x == y. Also write `prob_superiority(xs, ys)` = U / (len(xs)·len(ys)).",
  "starterCode": "def mann_whitney_u(xs, ys):\n    pass\n\ndef prob_superiority(xs, ys):\n    pass\n\nprint(mann_whitney_u([3, 4, 2, 5], [5, 4, 5, 3]))",
  "tests": "assert mann_whitney_u([3, 4, 2, 5], [5, 4, 5, 3]) == 5.0\nassert mann_whitney_u([1, 2], [3, 4]) == 0\nassert prob_superiority([10, 20], [1, 2]) == 1.0\nassert abs(prob_superiority([1, 2, 3], [1, 2, 3]) - 0.5) < 1e-12",
  "solution": "def mann_whitney_u(xs, ys):\n    u = 0.0\n    for x in xs:\n        for y in ys:\n            if x > y:\n                u += 1\n            elif x == y:\n                u += 0.5\n    return u\n\ndef prob_superiority(xs, ys):\n    return mann_whitney_u(xs, ys) / (len(xs) * len(ys))",
  "hints": ["Loop over all pairs; ties count half.", "Identical groups give a probability of superiority of 0.5."]
}
```

> [!TIP] Interview tips
> - Use rank tests for ordinal data, small samples, or when outliers dominate.
> - Be precise about the hypothesis: rank tests compare distributions, not means.
> - Report the probability of superiority $P(X > Y)$ as an intuitive effect size.
