---
id: statistics-logistic-regression-interpretation
title: Logistic regression interpretation (odds ratios)
estimatedMinutes: 12
difficulty: medium
tags: [statistics, regression, logistic, odds-ratio]
---

## Why it matters
"Explain this logistic regression coefficient to a stakeholder" is a common follow-up in churn and conversion interviews. The trap: coefficients are on the log-odds scale, not probability.

## Concept
$$
\log\frac{p}{1 - p} = \beta_0 + \beta_1 x_1 + \dots \qquad p = \frac{1}{1 + e^{-(\beta_0 + \beta_1 x_1 + \dots)}}
$$

- $\beta_1$: change in the **log-odds** for +1 unit of $x_1$, holding others fixed.
- $e^{\beta_1}$ = **odds ratio**: the odds multiply by $e^{\beta_1}$ per unit. $e^{0.4} \approx 1.49$ → odds 49% higher.
- The effect on **probability** isn't constant: it depends on the starting probability (largest near p = 0.5, small near 0 or 1).

Odds vs probability: odds = p / (1 − p). With p = 0.2, odds = 0.25. An odds ratio of 2 takes p from 0.2 to 0.33, not to 0.4.

## Worked example
Churn model: $\log\text{odds}(\text{churn}) = -2 + 0.7\cdot\text{support\_tickets}$.

- Odds ratio per ticket: $e^{0.7} \approx 2.0$: each extra ticket doubles the odds of churning.
- 0 tickets: $p = 1/(1 + e^{2}) \approx 0.12$. 1 ticket: $p = 1/(1 + e^{1.3}) \approx 0.21$. 3 tickets: $p = 1/(1 + e^{-0.1}) \approx 0.52$.

"Doubles the odds" and "+9 percentage points at baseline" are both correct, for different audiences.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A coefficient of 0.693 in a logistic regression means…",
  "options": ["Probability increases by 69.3 points", "Odds double per unit increase (e^0.693 ≈ 2)", "Probability doubles", "The log-probability increases by 0.693"],
  "answer": 1,
  "explanation": "Exponentiate to get the odds ratio. Doubling odds isn't doubling probability."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `sigmoid(z)`, `odds_ratio(beta)`, and `prob_at(beta0, beta1, x)` for a one-predictor logistic model.",
  "starterCode": "import math\n\ndef sigmoid(z):\n    pass\n\ndef odds_ratio(beta):\n    pass\n\ndef prob_at(beta0, beta1, x):\n    pass\n\nprint(odds_ratio(0.7), prob_at(-2, 0.7, 0), prob_at(-2, 0.7, 1))",
  "tests": "import math\nassert abs(sigmoid(0) - 0.5) < 1e-12\nassert abs(odds_ratio(math.log(2)) - 2) < 1e-12\np0, p1 = prob_at(-2, 0.7, 0), prob_at(-2, 0.7, 1)\nodds = lambda p: p / (1 - p)\nassert abs(odds(p1) / odds(p0) - math.exp(0.7)) < 1e-9\nassert abs(p0 - 1 / (1 + math.exp(2))) < 1e-12",
  "solution": "import math\n\ndef sigmoid(z):\n    return 1 / (1 + math.exp(-z))\n\ndef odds_ratio(beta):\n    return math.exp(beta)\n\ndef prob_at(beta0, beta1, x):\n    return sigmoid(beta0 + beta1 * x)",
  "hints": ["The odds ratio between x + 1 and x is e^β1 whatever the starting x."]
}
```

> [!TIP] Interview tips
> - Translate coefficients into odds ratios, then into a probability change at a realistic baseline.
> - Don't say "probability increases by β"; that's the most common mistake.
> - For non-technical audiences, show predicted probabilities for 2–3 example customers.
