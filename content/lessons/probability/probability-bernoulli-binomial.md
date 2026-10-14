---
id: probability-bernoulli-binomial
title: Bernoulli, Binomial
estimatedMinutes: 12
difficulty: easy
tags: [probability, distributions, binomial]
---

## Why it matters
Clicks, conversions, defects: any yes/no outcome is Bernoulli, and counting successes over n tries is Binomial. It's the distribution behind conversion-rate A/B tests.

## Concept
- **Bernoulli(p)**: one trial, $X \in \{0, 1\}$, $P(X = 1) = p$. Mean $p$, variance $p(1 - p)$.
- **Binomial(n, p)**: number of successes in $n$ independent Bernoulli(p) trials.

$$
P(X = k) = \binom{n}{k} p^k (1 - p)^{n - k}, \qquad E[X] = np, \qquad \text{Var}(X) = np(1 - p)
$$

Assumptions: fixed $n$, independent trials, the same $p$ every time. The observed rate $\hat p = X / n$ has standard error $\sqrt{p(1 - p) / n}$, which is the basis of confidence intervals for conversion rates.

## Worked example
A page converts at 5%. Out of 20 visitors, what's the chance that at least one converts?

$$
P(X \ge 1) = 1 - (0.95)^{20} \approx 1 - 0.358 = 0.642
$$

Expected conversions: $20 \times 0.05 = 1$. Standard deviation: $\sqrt{20 \times 0.05 \times 0.95} \approx 0.97$, so seeing 0 or 3 conversions is entirely normal noise.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A fair coin is flipped 10 times. What is P(exactly 5 heads)?",
  "options": ["0.5", "C(10,5) / 2¹⁰ ≈ 0.246", "5/10", "1/32"],
  "answer": 1,
  "explanation": "C(10, 5) = 252 and 252 / 1024 ≈ 0.246. The single most likely outcome still has under 25% probability."
}
```

```quiz
{
  "id": "q2",
  "question": "For a fixed n, which p maximizes the variance of Binomial(n, p)?",
  "options": ["p = 0.1", "p = 0.5", "p = 0.9", "Variance doesn't depend on p"],
  "answer": 1,
  "explanation": "p(1 − p) is largest at p = 0.5. That's why sample-size calculations often assume p = 0.5 as the worst case."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `binom_pmf(k, n, p)` and `binom_cdf(k, n, p)` (P(X ≤ k)) using `math.comb`. Then use them in `p_at_least(k, n, p)` for P(X ≥ k).",
  "starterCode": "from math import comb\n\ndef binom_pmf(k, n, p):\n    pass\n\ndef binom_cdf(k, n, p):\n    pass\n\ndef p_at_least(k, n, p):\n    pass\n\nprint(binom_pmf(5, 10, 0.5), p_at_least(1, 20, 0.05))",
  "tests": "assert abs(binom_pmf(5, 10, 0.5) - 252/1024) < 1e-12\nassert abs(binom_cdf(10, 10, 0.3) - 1) < 1e-12\nassert abs(p_at_least(1, 20, 0.05) - (1 - 0.95**20)) < 1e-12\nassert abs(p_at_least(0, 7, 0.2) - 1) < 1e-12",
  "solution": "from math import comb\n\ndef binom_pmf(k, n, p):\n    return comb(n, k) * p**k * (1 - p)**(n - k)\n\ndef binom_cdf(k, n, p):\n    return sum(binom_pmf(i, n, p) for i in range(0, k + 1))\n\ndef p_at_least(k, n, p):\n    return 1 - binom_cdf(k - 1, n, p) if k > 0 else 1.0",
  "hints": ["P(X ≥ k) = 1 − P(X ≤ k − 1).", "Handle k = 0 separately: P(X ≥ 0) = 1."]
}
```

> [!TIP] Interview tips
> - Name the assumptions (independent, same p). Repeat visits by the same user break independence in real funnels.
> - Use $\sqrt{p(1-p)/n}$ to reason about noise in small samples before calling a change "significant".
> - For large n and small p, mention the Poisson approximation; for large n and moderate p, the normal approximation.
