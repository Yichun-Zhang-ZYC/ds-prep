---
id: probability-expectation-variance-covariance-correlation
title: Expectation, variance, covariance, correlation
estimatedMinutes: 15
difficulty: medium
tags: [probability, expectation, variance, correlation]
---

## Why it matters
These four quantities are the vocabulary of statistics and ML: the mean of a metric, its noise, how two metrics move together. Interviewers test the formulas and the classic pitfalls (correlation is scale-free, zero correlation isn't independence).

## Concept
| Quantity | Definition | Notes |
|---|---|---|
| Expectation | $E[X] = \sum x\,p(x)$ or $\int x f(x)\,dx$ | long-run average |
| Variance | $\text{Var}(X) = E[(X - \mu)^2] = E[X^2] - E[X]^2$ | spread; units squared |
| Covariance | $\text{Cov}(X, Y) = E[XY] - E[X]E[Y]$ | sign shows direction |
| Correlation | $\rho = \dfrac{\text{Cov}(X, Y)}{\sigma_X \sigma_Y}$ | between −1 and 1; unit-free |

Rules you'll use constantly:

$$
\text{Var}(aX + b) = a^2\,\text{Var}(X) \qquad \text{Var}(X + Y) = \text{Var}(X) + \text{Var}(Y) + 2\,\text{Cov}(X, Y)
$$

Independence implies $\text{Cov} = 0$, but not the other way round: $Y = X^2$ with $X$ symmetric around 0 has zero correlation yet is fully dependent. Correlation only measures **linear** association.

## Worked example
A fair die: $E[X] = 3.5$, $E[X^2] = \frac{1 + 4 + 9 + 16 + 25 + 36}{6} = \frac{91}{6}$, so

$$
\text{Var}(X) = \tfrac{91}{6} - 3.5^2 = \tfrac{35}{12} \approx 2.92
$$

The sum of two independent dice has variance $2 \times 35/12 \approx 5.83$; the average of the two has variance $5.83 / 4 \approx 1.46$, which is why averaging reduces noise.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Var(X) = 4. What is Var(3X − 7)?",
  "options": ["12", "36", "5", "29"],
  "answer": 1,
  "explanation": "Constants shift but don't spread: Var(aX + b) = a²Var(X) = 9 × 4 = 36."
}
```

```quiz
{
  "id": "q2",
  "question": "Corr(X, Y) = 0. Which statement is always true?",
  "options": ["X and Y are independent", "There is no linear relationship between X and Y", "Knowing X tells you nothing about Y", "Cov(X, Y) > 0"],
  "answer": 1,
  "explanation": "Zero correlation rules out a linear relationship only. Y = X² is a classic dependent but uncorrelated example."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `mean(xs)`, `variance(xs)` (population variance, divide by n), `covariance(xs, ys)` and `correlation(xs, ys)` without libraries.",
  "starterCode": "def mean(xs):\n    pass\n\ndef variance(xs):\n    pass\n\ndef covariance(xs, ys):\n    pass\n\ndef correlation(xs, ys):\n    pass\n\nprint(correlation([1, 2, 3, 4], [2, 4, 6, 8]))",
  "tests": "assert abs(mean([1, 2, 3, 4]) - 2.5) < 1e-12\nassert abs(variance([1, 2, 3, 4, 5, 6]) - 35/12) < 1e-12\nassert abs(covariance([1, 2, 3], [1, 2, 3]) - 2/3) < 1e-12\nassert abs(correlation([1, 2, 3, 4], [2, 4, 6, 8]) - 1) < 1e-12\nassert abs(correlation([1, 2, 3, 4], [8, 6, 4, 2]) + 1) < 1e-12\nassert abs(correlation([-2, -1, 0, 1, 2], [4, 1, 0, 1, 4])) < 1e-12",
  "solution": "def mean(xs):\n    return sum(xs) / len(xs)\n\ndef variance(xs):\n    m = mean(xs)\n    return sum((x - m) ** 2 for x in xs) / len(xs)\n\ndef covariance(xs, ys):\n    mx, my = mean(xs), mean(ys)\n    return sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / len(xs)\n\ndef correlation(xs, ys):\n    return covariance(xs, ys) / (variance(xs) ** 0.5 * variance(ys) ** 0.5)",
  "hints": ["Build each function on top of the previous one.", "The last test is y = x²: dependent, but correlation 0."]
}
```

> [!TIP] Interview tips
> - Mention population (÷n) vs sample (÷(n−1)) variance when you write a formula.
> - Use $\text{Var}(\bar X) = \sigma^2 / n$ to explain why bigger samples give tighter estimates.
> - When asked about correlation, add "and it doesn't imply causation, and it only captures linear relationships".
