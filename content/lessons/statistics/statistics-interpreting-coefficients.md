---
id: statistics-interpreting-coefficients
title: Interpreting coefficients
estimatedMinutes: 12
difficulty: medium
tags: [statistics, regression, interpretation, log-transforms]
---

## Why it matters
"What does this coefficient mean?" Interviewers want a precise sentence with units, "holding other variables constant", and the right reading for log-transformed variables.

## Concept
In $y = \beta_0 + \beta_1 x_1 + \beta_2 x_2 + \varepsilon$:

- $\beta_1$: the expected change in $y$ for a one-unit increase in $x_1$, **holding $x_2$ constant**.
- $\beta_0$: expected $y$ when all predictors are 0 (often not meaningful; centering helps).
- Dummy variable: the difference from the reference category.

Log transforms change the reading:

| Model | Interpretation of β |
|---|---|
| $y \sim x$ | +1 unit of x → +β units of y |
| $\log y \sim x$ | +1 unit of x → about $100\beta\%$ change in y (exactly $e^\beta - 1$) |
| $y \sim \log x$ | +1% in x → about $\beta/100$ units of y |
| $\log y \sim \log x$ | +1% in x → about β% change in y (an **elasticity**) |

Coefficients describe associations; a causal reading needs the exogeneity assumption (or an experiment).

## Worked example
$\log(\text{salary}) = 10.2 + 0.08\cdot\text{years\_exp} + 0.15\cdot\text{has\_masters}$

- Each extra year of experience: about +8% salary (exactly $e^{0.08} - 1 = 8.3\%$), holding the degree fixed.
- A master's degree: about +16% ($e^{0.15} - 1$) versus no master's, at the same experience.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "In log(sales) = 2 + 0.6·log(price_ads), what does 0.6 mean?",
  "options": ["+1 unit of ad spend → +0.6 units of sales", "+1% ad spend → about +0.6% sales", "+1% ad spend → +60% sales", "Sales are 60% ads"],
  "answer": 1,
  "explanation": "Log-log coefficients are elasticities."
}
```

```quiz
{
  "id": "q2",
  "question": "A regression of house price on size and number of bedrooms gives a **negative** bedrooms coefficient. What's the most likely reading?",
  "options": ["Bedrooms reduce value in general", "Holding size fixed, more bedrooms means smaller rooms, which buyers value less", "The model is broken", "It's always a sign of multicollinearity"],
  "answer": 1,
  "explanation": "\"Holding other variables constant\" changes the question. Bedrooms alone would correlate positively with price."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `pct_effect_log_linear(beta)` returning the exact % change in y for +1 unit of x in a log(y) ~ x model, and `elasticity_effect(beta, pct_x)` returning the approximate % change in y for a `pct_x` % change in x in a log-log model.",
  "starterCode": "import math\n\ndef pct_effect_log_linear(beta):\n    pass\n\ndef elasticity_effect(beta, pct_x):\n    pass\n\nprint(pct_effect_log_linear(0.08), elasticity_effect(0.6, 10))",
  "tests": "import math\nassert abs(pct_effect_log_linear(0.08) - (math.exp(0.08) - 1) * 100) < 1e-9\nassert abs(pct_effect_log_linear(0) ) < 1e-12\nassert abs(elasticity_effect(0.6, 10) - 6) < 1e-12",
  "solution": "import math\n\ndef pct_effect_log_linear(beta):\n    return (math.exp(beta) - 1) * 100\n\ndef elasticity_effect(beta, pct_x):\n    return beta * pct_x",
  "hints": ["The exact multiplicative change is e^β.", "Elasticity: % change in y ≈ β × % change in x."]
}
```

> [!TIP] Interview tips
> - Always include units and "holding the other variables constant".
> - State that a coefficient is an association unless the design supports causality.
> - For log models, give both the quick reading (100β%) and the exact one ($e^\beta - 1$).
