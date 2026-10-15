---
id: experimentation-multi-armed-bandits
title: Multi-armed bandits
estimatedMinutes: 15
difficulty: hard
tags: [experimentation, bandits, thompson-sampling, exploration]
---

## Why it matters
"Why not use a bandit instead of an A/B test?" Bandits shift traffic toward winners during the test, reducing the cost of showing bad variants. Interviewers want the trade-offs, not just the algorithm.

## Concept
A **multi-armed bandit** chooses among K options (arms) repeatedly, balancing **exploration** (learning about arms) and **exploitation** (using the best so far).

| Algorithm | Idea |
|---|---|
| ε-greedy | play the best arm with prob. 1 − ε, a random arm with prob. ε |
| UCB | play the arm with the highest upper confidence bound (optimism under uncertainty) |
| **Thompson sampling** | sample a plausible rate for each arm from its posterior (e.g. Beta); play the highest sample |

Bandits vs A/B tests:

| | A/B test | Bandit |
|---|---|---|
| Goal | learn the effect precisely | maximize reward during the test |
| Traffic | fixed split | adaptive |
| Good for | launch decisions, long-term metrics, inference | short-lived content (headlines, promos), many arms, quick feedback |
| Weakness | regret from showing losers | biased effect estimates, hard with delayed metrics or changing rates |

## Worked example
Thompson sampling for 3 headlines with Beta(1, 1) priors. After some traffic: A = 30/1,000 clicks, B = 45/1,000, C = 20/500. Each new visitor: draw $p_A \sim \text{Beta}(31, 971)$, $p_B \sim \text{Beta}(46, 956)$, $p_C \sim \text{Beta}(21, 481)$, and show the headline with the largest draw. B wins most draws, so it gets most traffic, while A and C still get occasional exploration.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "When is a classic A/B test usually better than a bandit?",
  "options": ["Choosing among 10 headlines for a 2-day news story", "Deciding whether to permanently launch a new checkout flow measured on 30-day retention", "Rotating daily promotional banners", "Tuning an ad creative with instant click feedback"],
  "answer": 1,
  "explanation": "Delayed long-term metrics and the need for an unbiased effect estimate favor a fixed-split test."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement Thompson sampling. `thompson(true_rates, rounds, seed)`: keep Beta(1 + successes, 1 + failures) per arm; each round, sample from each posterior with `rng.betavariate`, play the arm with the largest sample, and draw a reward with probability `true_rates[arm]`. Return the list of pull counts per arm.",
  "starterCode": "import random\n\ndef thompson(true_rates, rounds, seed):\n    pass\n\nprint(thompson([0.03, 0.045, 0.04], 5000, 0))",
  "tests": "pulls = thompson([0.02, 0.10, 0.05], 3000, 0)\nassert sum(pulls) == 3000\nassert pulls[1] > 0.6 * 3000, pulls\nassert min(pulls) > 0",
  "solution": "import random\n\ndef thompson(true_rates, rounds, seed):\n    rng = random.Random(seed)\n    k = len(true_rates)\n    wins = [0] * k\n    losses = [0] * k\n    pulls = [0] * k\n    for _ in range(rounds):\n        samples = [rng.betavariate(1 + wins[i], 1 + losses[i]) for i in range(k)]\n        arm = max(range(k), key=lambda i: samples[i])\n        pulls[arm] += 1\n        if rng.random() < true_rates[arm]:\n            wins[arm] += 1\n        else:\n            losses[arm] += 1\n    return pulls",
  "hints": ["Each arm's posterior is Beta(1 + wins, 1 + losses).", "Over time, the best arm should receive most pulls, but every arm gets some."]
}
```

> [!TIP] Interview tips
> - Frame the choice as "learn vs earn": A/B tests for decisions and inference, bandits for optimization during short campaigns.
> - Mention Thompson sampling as the practical default.
> - Point out bandit pitfalls: delayed feedback, non-stationary rates, biased estimates for reporting.
