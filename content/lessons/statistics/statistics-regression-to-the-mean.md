---
id: statistics-regression-to-the-mean
title: Regression to the mean
estimatedMinutes: 10
difficulty: medium
tags: [statistics, paradoxes, selection, experimentation]
---

## Why it matters
"We targeted our worst-performing stores with a new program and they improved 20%!" Regression to the mean often explains such results with no program effect at all. Spotting it is a mark of a careful analyst.

## Concept
When a measurement has a noisy component, extreme values are partly extreme **by chance**. Measured again, they tend to move back toward the average, even if nothing changed.

It shows up whenever you **select on an extreme value** and then re-measure:
- the worst stores last quarter, the top sales reps, the users with the most support tickets,
- a "sophomore slump" after a breakout season,
- a metric that spiked on the day you launched an investigation.

The effect is larger when the measurement is noisier (lower correlation between the two measurements):

$$
E[\text{second} \mid \text{first}] \approx \mu + \rho\,(\text{first} - \mu)
$$

Fix: compare against a **control group selected the same way** (ideally randomized), which experiences the same regression.

## Worked example
Stores' monthly sales have true level 100 plus noise; month-to-month correlation ρ = 0.5. The bottom stores averaged 70 last month.

Expected next month with **no intervention**: $100 + 0.5\,(70 - 100) = 85$, an apparent "+21%" improvement from noise alone. A program only works if treated low performers beat untreated low performers.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Students who scored in the bottom 10% on a first test score higher on a retest, without tutoring. Why?",
  "options": ["The test got easier", "Part of their low first score was bad luck, which doesn't repeat on average", "They cheated", "Retests are always easier"],
  "answer": 1,
  "explanation": "Selection on an extreme noisy measurement guarantees some regression toward the mean."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Simulate it. `simulate(n, seed)`: each unit has true skill ~ N(100, 10) and two noisy measurements = skill + N(0, 10). Select the bottom 10% by the first measurement and return `(mean_first, mean_second)` for that group. The second mean should be clearly higher, with no intervention. Use `random.Random(seed).gauss`.",
  "starterCode": "import random\n\ndef simulate(n, seed):\n    pass\n\nprint(simulate(20000, 0))",
  "tests": "f, s = simulate(20000, 0)\nassert s - f > 10, (f, s)\nassert s < 100\nassert abs((s - 100) - 0.5 * (f - 100)) < 2.5, (f, s)",
  "solution": "import random\n\ndef simulate(n, seed):\n    rng = random.Random(seed)\n    units = []\n    for _ in range(n):\n        skill = rng.gauss(100, 10)\n        units.append((skill + rng.gauss(0, 10), skill + rng.gauss(0, 10)))\n    units.sort(key=lambda u: u[0])\n    low = units[: n // 10]\n    return sum(u[0] for u in low) / len(low), sum(u[1] for u in low) / len(low)",
  "hints": ["With equal skill and noise variances, ρ = 0.5, so the second mean is about halfway back to 100.", "Sort by the first measurement, keep the bottom 10%, average both measurements."]
}
```

> [!TIP] Interview tips
> - Whenever a group was chosen because it was extreme, say "regression to the mean" before crediting any intervention.
> - The fix is a control group chosen by the same rule, ideally randomized.
> - Connect to A/B tests: early "winning" variants that fade are often the same phenomenon (plus novelty effects).
