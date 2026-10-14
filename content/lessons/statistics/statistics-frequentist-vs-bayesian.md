---
id: statistics-frequentist-vs-bayesian
title: Frequentist vs Bayesian
estimatedMinutes: 10
difficulty: medium
tags: [statistics, bayesian, frequentist, ab-testing]
---

## Why it matters
"Frequentist or Bayesian A/B testing: which would you use and why?" A good answer is pragmatic: what each framework means, what it outputs, and when each fits the business question.

## Concept
| | Frequentist | Bayesian |
|---|---|---|
| Probability means | long-run frequency of repeated experiments | degree of belief |
| Parameters | fixed, unknown | random variables with distributions |
| Inputs | data + model | data + model + **prior** |
| Typical output | p-value, confidence interval | posterior, credible interval, P(B > A) |
| Interval reads as | procedure covers θ 95% of the time | 95% probability θ is in this interval (given the model and prior) |
| Peeking | inflates false positives unless corrected | posterior is always "valid", but decision rules still need care |

Neither is "right". Frequentist methods dominate regulated settings and classic A/B platforms; Bayesian methods shine with small data, prior knowledge, and decision-focused outputs ("expected loss of shipping B").

## Worked example
A test shows B converting at 5.6% vs A at 5.0% (10,000 users each).

- Frequentist: z ≈ 1.89, p ≈ 0.058. "Not significant at 0.05."
- Bayesian (flat priors): P(B > A) ≈ 0.97. "B is very likely better; expected loss of shipping B is small."

Same data, different questions. Make the decision rule explicit before the test either way.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which statement can be made directly from a Bayesian analysis but not from a frequentist confidence interval?",
  "options": ["The test has 80% power", "There is a 95% probability that the lift lies in [0.1, 1.1] points (given the prior and model)", "The p-value is 0.03", "The procedure covers the true value 95% of the time"],
  "answer": 1,
  "explanation": "Probability statements about the parameter itself require a prior and a posterior."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `prob_b_better(ka, na, kb, nb, draws, seed)` estimating P(p_B > p_A) with flat Beta(1, 1) priors (use `random.Random(seed).betavariate`). For A = 500/10,000 and B = 560/10,000 it should be close to 0.97.",
  "starterCode": "import random\n\ndef prob_b_better(ka, na, kb, nb, draws, seed):\n    pass\n\nprint(prob_b_better(500, 10000, 560, 10000, 20000, 0))",
  "tests": "p = prob_b_better(500, 10000, 560, 10000, 20000, 0)\nassert 0.95 < p < 0.985, p\nq = prob_b_better(500, 10000, 500, 10000, 20000, 1)\nassert 0.47 < q < 0.53, q",
  "solution": "import random\n\ndef prob_b_better(ka, na, kb, nb, draws, seed):\n    rng = random.Random(seed)\n    wins = 0\n    for _ in range(draws):\n        pa = rng.betavariate(1 + ka, 1 + na - ka)\n        pb = rng.betavariate(1 + kb, 1 + nb - kb)\n        wins += pb > pa\n    return wins / draws",
  "hints": ["Posterior for each arm: Beta(1 + conversions, 1 + non-conversions).", "Count how often the B draw beats the A draw."]
}
```

> [!TIP] Interview tips
> - Show you can speak both languages, then pick based on the decision and the team's tooling.
> - Point out that a Bayesian approach doesn't magically fix peeking or multiple metrics; decision rules still matter.
> - Mention that with flat priors and large samples, the two often agree numerically.
