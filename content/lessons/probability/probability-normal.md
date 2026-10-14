---
id: probability-normal
title: Normal
estimatedMinutes: 12
difficulty: easy
tags: [probability, distributions, normal, z-scores]
---

## Why it matters
The normal distribution underlies confidence intervals, z-tests and most A/B test math (through the central limit theorem). Interviewers expect quick mental math with z-scores and the 68–95–99.7 rule.

## Concept
$X \sim N(\mu, \sigma^2)$ has the bell-shaped density

$$
f(x) = \frac{1}{\sigma\sqrt{2\pi}} \exp\!\left(-\frac{(x - \mu)^2}{2\sigma^2}\right)
$$

Key facts:
- **Standardize**: $Z = (X - \mu)/\sigma \sim N(0, 1)$. Every normal probability is a standard-normal lookup.
- **68–95–99.7**: about 68%, 95% and 99.7% of values fall within 1, 2 and 3 standard deviations of the mean. (Exactly 95% is ±1.96σ.)
- **Sums**: independent normals add: $N(\mu_1, \sigma_1^2) + N(\mu_2, \sigma_2^2) = N(\mu_1 + \mu_2, \sigma_1^2 + \sigma_2^2)$.
- Many real metrics are **not** normal (revenue, latency are skewed). Sample means of them often are, thanks to the CLT.

## Worked example
Daily signups are roughly $N(1000, 50^2)$. How unusual is a day with 1,120 signups?

$$
z = \frac{1120 - 1000}{50} = 2.4, \qquad P(Z \ge 2.4) \approx 0.008
$$

That's about 1 day in 120, worth a look but not proof of anything by itself.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Heights are N(170, 10²) cm. Roughly what fraction of people are taller than 190 cm?",
  "options": ["5%", "2.5%", "16%", "0.15%"],
  "answer": 1,
  "explanation": "190 is 2σ above the mean. About 95% lie within ±2σ, leaving 5% in both tails, so about 2.5% above."
}
```

```quiz
{
  "id": "q2",
  "question": "X ~ N(10, 9) and Y ~ N(5, 16) are independent. What is the standard deviation of X + Y?",
  "options": ["7", "5", "25", "√7"],
  "answer": 1,
  "explanation": "Variances add: 9 + 16 = 25, so SD = 5. Standard deviations don't add (3 + 4 ≠ 5)."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `normal_cdf(x, mu, sigma)` using `math.erf` (Φ(z) = (1 + erf(z/√2)) / 2), and `prob_between(a, b, mu, sigma)`.",
  "starterCode": "import math\n\ndef normal_cdf(x, mu=0.0, sigma=1.0):\n    pass\n\ndef prob_between(a, b, mu=0.0, sigma=1.0):\n    pass\n\nprint(prob_between(-1.96, 1.96))",
  "tests": "assert abs(normal_cdf(0) - 0.5) < 1e-12\nassert abs(prob_between(-1.96, 1.96) - 0.9500042) < 1e-6\nassert abs(normal_cdf(190, 170, 10) - 0.9772499) < 1e-6\nassert abs(prob_between(160, 180, 170, 10) - 0.6826895) < 1e-6",
  "solution": "import math\n\ndef normal_cdf(x, mu=0.0, sigma=1.0):\n    z = (x - mu) / sigma\n    return 0.5 * (1 + math.erf(z / math.sqrt(2)))\n\ndef prob_between(a, b, mu=0.0, sigma=1.0):\n    return normal_cdf(b, mu, sigma) - normal_cdf(a, mu, sigma)",
  "hints": ["Standardize first: z = (x − μ) / σ.", "P(a < X < b) = Φ(b) − Φ(a)."]
}
```

> [!TIP] Interview tips
> - Memorize 1.645 (90% two-sided / 95% one-sided), 1.96 (95%), 2.576 (99%).
> - Add variances, not standard deviations, for independent sums.
> - Before assuming normality, ask about skew and heavy tails; suggest a log transform or the median for skewed metrics.
