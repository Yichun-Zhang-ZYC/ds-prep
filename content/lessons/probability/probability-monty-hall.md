---
id: probability-monty-hall
title: Monty Hall
estimatedMinutes: 10
difficulty: medium
tags: [probability, conditional, brain-teasers]
---

## Why it matters
Monty Hall is the most famous counter-intuitive probability puzzle. Interviewers use it (and its variants) to see whether you reason from the information process rather than gut feeling.

## Concept
Three doors: one car, two goats. You pick a door. The host, **who knows where the car is**, opens one of the other two doors to reveal a goat, then offers a switch.

- Stay wins only if your first pick was the car: **1/3**.
- Switch wins whenever your first pick was a goat: **2/3**.

The key is the host's rule. He never opens the car door, so his choice carries information. If he opened a door at random and it happened to show a goat, switching would win only 1/2 of the time.

## Worked example
Bayes view. You pick door 1; the host opens door 3. Let $C_i$ = car behind door $i$.

$$
P(\text{opens } 3 \mid C_1) = \tfrac12,\quad P(\text{opens } 3 \mid C_2) = 1,\quad P(\text{opens } 3 \mid C_3) = 0
$$

$$
P(C_2 \mid \text{opens } 3) = \frac{1 \cdot \frac13}{\frac12 \cdot \frac13 + 1 \cdot \frac13} = \frac{2}{3}
$$

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "100 doors, one car. You pick one; the host (who knows) opens 98 goat doors. What's the probability the remaining closed door has the car?",
  "options": ["1/2", "1/100", "99/100", "1/99"],
  "answer": 2,
  "explanation": "Your pick has a 1/100 chance. All the remaining 99/100 probability concentrates on the one door the host had to leave closed."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `simulate(switch, trials, seed, host_knows=True)` returning the win rate. When `host_knows` is False, the host opens a random other door, and trials where the car is revealed are discarded.",
  "starterCode": "import random\n\ndef simulate(switch, trials, seed, host_knows=True):\n    pass\n\nprint(simulate(True, 20000, 0), simulate(False, 20000, 0), simulate(True, 30000, 0, host_knows=False))",
  "tests": "assert abs(simulate(True, 20000, 0) - 2/3) < 0.02\nassert abs(simulate(False, 20000, 0) - 1/3) < 0.02\nassert abs(simulate(True, 30000, 0, host_knows=False) - 0.5) < 0.02",
  "solution": "import random\n\ndef simulate(switch, trials, seed, host_knows=True):\n    rng = random.Random(seed)\n    wins = played = 0\n    for _ in range(trials):\n        car = rng.randrange(3)\n        pick = rng.randrange(3)\n        others = [d for d in range(3) if d != pick]\n        if host_knows:\n            opened = rng.choice([d for d in others if d != car])\n        else:\n            opened = rng.choice(others)\n            if opened == car:\n                continue\n        played += 1\n        final = next(d for d in range(3) if d not in (pick, opened)) if switch else pick\n        wins += final == car\n    return wins / played",
  "hints": ["A knowing host picks among the other doors that hide a goat.", "For the random host, skip trials where the car was revealed, and divide by the trials you kept."]
}
```

> [!TIP] Interview tips
> - Explain with the 100-door version; it makes the intuition click immediately.
> - State the host's rule explicitly. The answer depends on it, and that's the real lesson.
> - Offer a quick simulation as a sanity check; interviewers like candidates who verify.
