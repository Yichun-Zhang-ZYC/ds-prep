---
id: probability-central-limit-theorem
title: Central limit theorem
estimatedMinutes: 12
difficulty: medium
tags: [probability, limit-theorems, clt, ab-testing]
---

## Why it matters
The central limit theorem (CLT) is why we can use z-tests and normal confidence intervals for averages of non-normal data like revenue or conversions. "Explain the CLT and why it matters for A/B testing" is one of the most common statistics interview questions.

## Concept
For independent, identically distributed $X_i$ with mean $\mu$ and finite variance $\sigma^2$, the sample mean is approximately normal for large $n$, **whatever the shape of the original distribution**:

$$
\bar X_n \;\approx\; N\!\left(\mu,\; \frac{\sigma^2}{n}\right) \qquad\text{equivalently}\qquad \frac{\bar X_n - \mu}{\sigma/\sqrt{n}} \approx N(0, 1)
$$

What to keep in mind:
- It's about the **sample mean** (or sum), not the data. Revenue stays skewed; its average across many users is close to normal.
- "Large enough" depends on skew: ~30 is fine for symmetric data, heavy-tailed metrics (revenue with whales) may need thousands.
- It needs finite variance; extremely heavy tails (Cauchy-like) break it.

## Worked example
Revenue per user has mean \$5 and SD \$40 (very skewed). With 10,000 users per arm, the arm's average revenue has

$$
SE = \frac{40}{\sqrt{10{,}000}} = 0.40
$$

So a 95% interval for the arm mean is about $\$5 \pm 1.96 \times 0.40 = \$5 \pm 0.78$, valid even though individual revenue is nothing like a bell curve.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which statement about the CLT is correct?",
  "options": ["Large samples make the data normally distributed", "The distribution of the sample mean approaches a normal distribution as n grows", "It only works if the data are normal", "It guarantees the sample mean equals μ"],
  "answer": 1,
  "explanation": "The CLT is about the sampling distribution of the mean, not the raw data."
}
```

```quiz
{
  "id": "q2",
  "question": "To halve the standard error of a sample mean, how much must the sample size grow?",
  "options": ["2×", "4×", "√2×", "8×"],
  "answer": 1,
  "explanation": "SE = σ/√n, so halving SE needs √n to double, i.e. n to quadruple."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `sample_means(n, reps, seed)` that draws `reps` samples of size `n` from a skewed Exponential(1) distribution (`rng.expovariate(1.0)`) and returns the list of sample means. Then `standard_error(n)` should return the theoretical SE for Exponential(1), whose SD is 1.",
  "starterCode": "import random, statistics\n\ndef sample_means(n, reps, seed):\n    pass\n\ndef standard_error(n):\n    pass\n\nmeans = sample_means(50, 4000, 7)\nprint(statistics.mean(means), statistics.pstdev(means), standard_error(50))",
  "tests": "import statistics\nmeans = sample_means(50, 4000, 7)\nassert len(means) == 4000\nassert abs(statistics.mean(means) - 1) < 0.02\nassert abs(statistics.pstdev(means) - standard_error(50)) < 0.01\nassert abs(standard_error(100) - 0.1) < 1e-12",
  "solution": "import random, statistics\n\ndef sample_means(n, reps, seed):\n    rng = random.Random(seed)\n    return [sum(rng.expovariate(1.0) for _ in range(n)) / n for _ in range(reps)]\n\ndef standard_error(n):\n    return 1 / n ** 0.5",
  "hints": ["Each rep: average n exponential draws.", "SE = σ / √n with σ = 1."]
}
```

> [!TIP] Interview tips
> - One-sentence version: "the average of many independent draws is approximately normal, with SD σ/√n, regardless of the original shape".
> - Connect it to A/B tests: it's why a z-test on mean revenue works with large samples despite skew.
> - Mention its limits: heavy tails need larger n (or trimming / log transforms), and dependence (same user, many rows) violates independence.
