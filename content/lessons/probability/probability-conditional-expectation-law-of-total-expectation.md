---
id: probability-conditional-expectation-law-of-total-expectation
title: Conditional expectation, law of total expectation
estimatedMinutes: 15
difficulty: medium
tags: [probability, expectation, recursion, brain-teasers]
---

## Why it matters
"Expected number of flips until…" questions are usually solved by conditioning on the first step and writing an equation. That's the law of total expectation, the workhorse of probability interviews.

## Concept
$E[X \mid Y = y]$ is the average of $X$ among outcomes where $Y = y$. Averaging those conditional means over $Y$ gives back the overall mean:

$$
E[X] = E\big[E[X \mid Y]\big] = \sum_y E[X \mid Y = y]\,P(Y = y)
$$

**First-step analysis**: condition on what happens first, express the remaining expectation in terms of the unknown itself, and solve.

The variance version (law of total variance) is also handy:

$$
\text{Var}(X) = E[\text{Var}(X \mid Y)] + \text{Var}(E[X \mid Y])
$$

## Worked example
Expected number of fair-coin flips to get the first heads, $E$:

- With probability 1/2 the first flip is heads: done in 1 flip.
- With probability 1/2 it's tails: you used 1 flip and are back at the start.

$$
E = \tfrac{1}{2}(1) + \tfrac{1}{2}(1 + E) \;\Rightarrow\; E = 2
$$

Expected flips to see **two heads in a row** uses two states (no progress, one head): solving the equations gives 6.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A die is rolled until a 6 appears. What is the expected number of rolls?",
  "options": ["3", "6", "5", "3.5"],
  "answer": 1,
  "explanation": "E = (1/6)(1) + (5/6)(1 + E) ⇒ E = 6. In general, waiting for an event of probability p takes 1/p tries on average."
}
```

```quiz
{
  "id": "q2",
  "question": "60% of users are on mobile with mean session 4 min; 40% on desktop with mean session 9 min. What is the overall mean session length?",
  "options": ["6.5 min", "6 min", "5 min", "13 min"],
  "answer": 1,
  "explanation": "E[X] = 0.6 × 4 + 0.4 × 9 = 2.4 + 3.6 = 6."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `expected_flips_for_k_heads_in_a_row(k)` returning the exact expected number of fair-coin flips until `k` heads in a row. Hint: the answer is $2^{k+1} - 2$; derive it or verify it with first-step analysis. Also write `simulate(k, trials, seed)` that estimates it.",
  "starterCode": "import random\n\ndef expected_flips_for_k_heads_in_a_row(k):\n    pass\n\ndef simulate(k, trials, seed):\n    pass\n\nprint(expected_flips_for_k_heads_in_a_row(2), simulate(2, 20000, 1))",
  "tests": "assert expected_flips_for_k_heads_in_a_row(1) == 2\nassert expected_flips_for_k_heads_in_a_row(2) == 6\nassert expected_flips_for_k_heads_in_a_row(3) == 14\nest = simulate(2, 20000, 1)\nassert abs(est - 6) < 0.25, est",
  "solution": "import random\n\ndef expected_flips_for_k_heads_in_a_row(k):\n    return 2 ** (k + 1) - 2\n\ndef simulate(k, trials, seed):\n    rng = random.Random(seed)\n    total = 0\n    for _ in range(trials):\n        flips = streak = 0\n        while streak < k:\n            flips += 1\n            streak = streak + 1 if rng.random() < 0.5 else 0\n        total += flips\n    return total / trials",
  "hints": ["Let E_j be the expected remaining flips with a current streak of j; E_k = 0.", "In the simulation, reset the streak to 0 on tails."]
}
```

> [!TIP] Interview tips
> - Say "condition on the first step" and write the equation before doing arithmetic.
> - Define states clearly for sequence problems ("0 heads so far", "1 head so far").
> - Use the law of total variance to explain why pooled metrics are noisier: variation between segments adds to variation within them.
