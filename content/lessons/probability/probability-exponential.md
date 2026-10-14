---
id: probability-exponential
title: Exponential
estimatedMinutes: 10
difficulty: medium
tags: [probability, distributions, waiting-times, memoryless]
---

## Why it matters
Time between customer arrivals, time until a server fails, time to the next click: waiting times in continuous time are often modeled as exponential. Its memoryless property is a classic interview twist.

## Concept
$T \sim \text{Exponential}(\lambda)$ with rate $\lambda$ (events per unit time):

$$
f(t) = \lambda e^{-\lambda t}, \quad F(t) = 1 - e^{-\lambda t}, \quad E[T] = \frac{1}{\lambda}, \quad \text{Var}(T) = \frac{1}{\lambda^2}
$$

Properties:
- **Memoryless**: $P(T > s + t \mid T > s) = P(T > t)$. A component that has survived 5 years is "as good as new" under this model (often unrealistic for wear-out failures).
- It's the continuous cousin of the geometric distribution, and the gap between Poisson events.
- **Minimum of exponentials**: if $T_1 \sim \text{Exp}(\lambda_1)$ and $T_2 \sim \text{Exp}(\lambda_2)$ are independent, $\min(T_1, T_2) \sim \text{Exp}(\lambda_1 + \lambda_2)$, and $P(T_1 < T_2) = \lambda_1 / (\lambda_1 + \lambda_2)$.

## Worked example
Buses arrive as a Poisson process at 4 per hour. Expected wait is $1/4$ hour = 15 minutes. Probability of waiting more than 30 minutes:

$$
P(T > 0.5) = e^{-4 \times 0.5} = e^{-2} \approx 0.135
$$

If you've already waited 20 minutes, the expected *additional* wait is still 15 minutes (memoryless).

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Two independent servers fail at rates 1 and 3 per year (exponential lifetimes). What is the probability that server 1 fails first?",
  "options": ["1/3", "1/4", "3/4", "1/2"],
  "answer": 1,
  "explanation": "P(T₁ < T₂) = λ₁ / (λ₁ + λ₂) = 1 / (1 + 3) = 1/4."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `exp_survival(t, lam)` = P(T > t), `exp_median(lam)` (the t with F(t) = 0.5), and `p_first(lam1, lam2)` = P(T1 < T2).",
  "starterCode": "import math\n\ndef exp_survival(t, lam):\n    pass\n\ndef exp_median(lam):\n    pass\n\ndef p_first(lam1, lam2):\n    pass\n\nprint(exp_survival(0.5, 4), exp_median(4), p_first(1, 3))",
  "tests": "import math\nassert abs(exp_survival(0.5, 4) - math.exp(-2)) < 1e-12\nassert abs(exp_median(4) - math.log(2) / 4) < 1e-12\nassert abs(p_first(1, 3) - 0.25) < 1e-12\nassert abs(exp_survival(0, 7) - 1) < 1e-12",
  "solution": "import math\n\ndef exp_survival(t, lam):\n    return math.exp(-lam * t)\n\ndef exp_median(lam):\n    return math.log(2) / lam\n\ndef p_first(lam1, lam2):\n    return lam1 / (lam1 + lam2)",
  "hints": ["Survival = 1 − CDF = e^(−λt).", "Solve 1 − e^(−λt) = 0.5 for t: the median is ln 2 / λ, smaller than the mean 1/λ."]
}
```

> [!TIP] Interview tips
> - Note that the median ($\ln 2/\lambda$) is below the mean ($1/\lambda$): the distribution is right-skewed.
> - Use memorylessness to answer "given it's lasted X, how much longer?" questions, and say when it's unrealistic (aging, wear-out).
> - Tie it to Poisson: "arrivals are Poisson with rate λ, so gaps are exponential with mean 1/λ".
