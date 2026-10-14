---
id: probability-multinomial
title: Multinomial
estimatedMinutes: 10
difficulty: medium
tags: [probability, distributions, categorical]
---

## Why it matters
Traffic split across several sources, users choosing among plans, dice with six faces: when each trial has more than two outcomes, the binomial generalizes to the multinomial. It's behind chi-square tests and sample-ratio-mismatch checks.

## Concept
Each of $n$ independent trials lands in one of $k$ categories with probabilities $p_1, \dots, p_k$ (summing to 1). The counts $(X_1, \dots, X_k)$ follow

$$
P(X_1 = x_1, \dots, X_k = x_k) = \frac{n!}{x_1! \cdots x_k!}\, p_1^{x_1} \cdots p_k^{x_k}
$$

Each count on its own is Binomial($n, p_i$): $E[X_i] = np_i$, $\text{Var}(X_i) = np_i(1 - p_i)$. Counts are **negatively correlated** ($\text{Cov}(X_i, X_j) = -np_ip_j$) because they must sum to $n$.

## Worked example
A fair die rolled 6 times. Probability of seeing each face exactly once:

$$
\frac{6!}{1!\cdots 1!}\left(\frac{1}{6}\right)^6 = \frac{720}{46656} \approx 0.0154
$$

Even the "most balanced" outcome is rare, which is why small samples rarely look perfectly even.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Visitors come from search (50%), social (30%) and direct (20%). Out of 1,000 visitors, what is the expected number and SD of social visitors?",
  "options": ["300 and about 14.5", "300 and 30", "333 and about 15", "300 and 210"],
  "answer": 0,
  "explanation": "The social count alone is Binomial(1000, 0.3): mean 300, SD = √(1000 × 0.3 × 0.7) = √210 ≈ 14.5."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `multinomial_pmf(counts, probs)` returning the probability of an exact vector of category `counts` given category `probs`.",
  "starterCode": "from math import factorial\n\ndef multinomial_pmf(counts, probs):\n    pass\n\nprint(multinomial_pmf([1, 1, 1, 1, 1, 1], [1/6] * 6))",
  "tests": "assert abs(multinomial_pmf([1, 1, 1, 1, 1, 1], [1/6] * 6) - 720 / 6**6) < 1e-12\nassert abs(multinomial_pmf([2, 0], [0.5, 0.5]) - 0.25) < 1e-12\nassert abs(multinomial_pmf([1, 1, 0], [0.5, 0.3, 0.2]) - 0.3) < 1e-12",
  "solution": "from math import factorial\n\ndef multinomial_pmf(counts, probs):\n    n = sum(counts)\n    coef = factorial(n)\n    for c in counts:\n        coef //= factorial(c)\n    p = 1.0\n    for c, q in zip(counts, probs):\n        p *= q ** c\n    return coef * p",
  "hints": ["The coefficient is n! divided by the product of each count's factorial.", "Multiply by p_i raised to count_i for every category."]
}
```

> [!TIP] Interview tips
> - Treat a single category as binomial to get quick means and standard deviations.
> - Mention the chi-square goodness-of-fit test for "does this split match the expected proportions?" (e.g. a 50/50 A/B assignment).
> - Point out the negative correlation between categories when interpreting shifts in a mix.
