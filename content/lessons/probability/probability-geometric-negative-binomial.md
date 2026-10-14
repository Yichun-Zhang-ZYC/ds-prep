---
id: probability-geometric-negative-binomial
title: Geometric, Negative Binomial
estimatedMinutes: 10
difficulty: medium
tags: [probability, distributions, waiting-times]
---

## Why it matters
"How many cold calls until the first sale?" and "how many tries until 3 successes?" are waiting-time questions. The geometric distribution also explains the memoryless shortcut in many brain-teasers.

## Concept
- **Geometric(p)**: number of trials until the **first** success (counting the success).

$$
P(X = k) = (1 - p)^{k - 1} p, \qquad E[X] = \frac{1}{p}, \qquad \text{Var}(X) = \frac{1 - p}{p^2}
$$

- It is **memoryless**: $P(X > m + n \mid X > m) = P(X > n)$. Ten failures so far don't make success "due".
- **Negative Binomial(r, p)**: number of trials until the $r$-th success; a sum of $r$ independent geometrics, so $E = r / p$.

Watch the convention: some libraries count *failures before* the first success, which shifts the mean to $(1 - p)/p$.

## Worked example
A sales rep closes 1 in 10 calls. Expected calls to the first sale: $1 / 0.1 = 10$. Probability the first sale needs more than 20 calls:

$$
P(X > 20) = (0.9)^{20} \approx 0.122
$$

Expected calls to close 3 deals: $3 / 0.1 = 30$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A slot machine pays out with probability 0.05 per spin, independently. You've lost 40 spins in a row. What is the probability you win on the next spin?",
  "options": ["Higher than 0.05, it's due", "0.05", "Lower than 0.05", "1 − 0.95⁴¹"],
  "answer": 1,
  "explanation": "Independent trials are memoryless. The 'gambler's fallacy' says otherwise, and it's wrong."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `geom_pmf(k, p)` (trials until first success, k ≥ 1), `geom_tail(n, p)` = P(X > n), and `negbin_mean(r, p)` = expected trials until r successes.",
  "starterCode": "def geom_pmf(k, p):\n    pass\n\ndef geom_tail(n, p):\n    pass\n\ndef negbin_mean(r, p):\n    pass\n\nprint(geom_pmf(1, 0.1), geom_tail(20, 0.1), negbin_mean(3, 0.1))",
  "tests": "assert abs(geom_pmf(1, 0.1) - 0.1) < 1e-12\nassert abs(geom_pmf(3, 0.5) - 0.125) < 1e-12\nassert abs(geom_tail(20, 0.1) - 0.9**20) < 1e-12\nassert abs(sum(geom_pmf(k, 0.3) for k in range(1, 200)) - 1) < 1e-9\nassert abs(negbin_mean(3, 0.1) - 30) < 1e-9",
  "solution": "def geom_pmf(k, p):\n    return (1 - p) ** (k - 1) * p\n\ndef geom_tail(n, p):\n    return (1 - p) ** n\n\ndef negbin_mean(r, p):\n    return r / p",
  "hints": ["X > n means the first n trials all failed.", "r successes is r independent geometric waits."]
}
```

> [!TIP] Interview tips
> - "Expected tries until success = 1/p" answers many brain-teasers instantly; say why (geometric mean).
> - Mention memorylessness when someone argues a success is "due".
> - Clarify the counting convention (trials vs failures) before giving a formula.
