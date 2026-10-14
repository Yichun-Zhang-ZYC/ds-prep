---
id: probability-uniform
title: Uniform
estimatedMinutes: 8
difficulty: easy
tags: [probability, distributions, uniform, simulation]
---

## Why it matters
Uniform distributions show up in brain-teasers ("pick two random points on a stick") and are the starting point of every simulation: random number generators produce Uniform(0, 1), and other distributions are built from it.

## Concept
**Continuous Uniform(a, b)**: every value in $[a, b]$ is equally likely.

$$
f(x) = \frac{1}{b - a}, \qquad E[X] = \frac{a + b}{2}, \qquad \text{Var}(X) = \frac{(b - a)^2}{12}
$$

**Discrete uniform** on $\{1, \dots, n\}$ (a fair die): $E = (n + 1)/2$, $\text{Var} = (n^2 - 1)/12$.

**Inverse transform sampling**: if $U \sim \text{Uniform}(0, 1)$ and $F$ is a CDF, then $F^{-1}(U)$ has distribution $F$. For example, $-\ln(U)/\lambda$ is Exponential($\lambda$).

## Worked example
$X, Y$ independent Uniform(0, 1). What is $P(X + Y < 1)$?

The pairs $(X, Y)$ fill the unit square uniformly, and $X + Y < 1$ is the triangle below the diagonal, with area $1/2$. Geometry replaces integration whenever the joint distribution is uniform.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "X ~ Uniform(0, 1). What is E[X²]?",
  "options": ["1/2", "1/3", "1/4", "1/12"],
  "answer": 1,
  "explanation": "∫₀¹ x² dx = 1/3. Then Var(X) = 1/3 − (1/2)² = 1/12, matching the formula."
}
```

```quiz
{
  "id": "q2",
  "question": "Two independent Uniform(0, 1) values are drawn. What is the probability that the larger one is less than 0.5?",
  "options": ["0.5", "0.25", "0.75", "0.125"],
  "answer": 1,
  "explanation": "Both must be below 0.5: 0.5 × 0.5 = 0.25. The max of n uniforms has CDF xⁿ."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `exponential_sample(lam, u)` that turns a Uniform(0,1) number `u` into an Exponential(`lam`) sample with the inverse transform $-\\ln(1-u)/\\lambda$. Then write `mean_of_samples(lam, n, seed)` that draws `n` samples with `random.Random(seed).random()` and returns their mean.",
  "starterCode": "import math, random\n\ndef exponential_sample(lam, u):\n    pass\n\ndef mean_of_samples(lam, n, seed):\n    pass\n\nprint(mean_of_samples(2.0, 50000, 0))",
  "tests": "import math\nassert abs(exponential_sample(1.0, 0.0)) < 1e-12\nassert abs(exponential_sample(2.0, 1 - math.exp(-1)) - 0.5) < 1e-12\nm = mean_of_samples(2.0, 50000, 0)\nassert abs(m - 0.5) < 0.02, m",
  "solution": "import math, random\n\ndef exponential_sample(lam, u):\n    return -math.log(1 - u) / lam\n\ndef mean_of_samples(lam, n, seed):\n    rng = random.Random(seed)\n    return sum(exponential_sample(lam, rng.random()) for _ in range(n)) / n",
  "hints": ["The Exponential CDF is F(x) = 1 − e^(−λx); solve u = F(x) for x.", "The mean of Exponential(2) is 1/2."]
}
```

> [!TIP] Interview tips
> - For two or three uniform variables, draw the square or cube and compute areas or volumes.
> - Remember Var = (b − a)²/12; it appears in "rounding error" and quantization questions.
> - Mention inverse transform sampling when asked "how would you sample from distribution X?".
