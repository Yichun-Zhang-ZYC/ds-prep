---
id: probability-random-walks-and-gambler-s-ruin
title: Random walks and gambler's ruin
estimatedMinutes: 15
difficulty: hard
tags: [probability, random-walk, markov, brain-teasers]
---

## Why it matters
"You start with \$k and bet \$1 per round until you reach \$N or go broke: what's the chance you win?" Gambler's ruin is a staple in quant interviews, and random walks model anything that drifts up and down step by step (stock prices, user balances, queue lengths).

## Concept
A **simple random walk** moves +1 with probability $p$ and −1 with probability $q = 1 - p$ each step.

**Gambler's ruin**: starting at $k$, stop at 0 (ruin) or $N$ (win). Let $P_k$ = probability of reaching $N$ first. First-step analysis gives $P_k = p\,P_{k+1} + q\,P_{k-1}$ with $P_0 = 0$, $P_N = 1$. The solution:

$$
P_k = \frac{k}{N} \;\;(p = \tfrac12), \qquad P_k = \frac{1 - (q/p)^k}{1 - (q/p)^N} \;\;(p \ne \tfrac12)
$$

Even a small edge for the house ($p$ slightly below 1/2) makes ruin very likely over long games. For a fair game, the expected duration is $k(N - k)$ steps.

## Worked example
Fair coin, start with \$20, play until \$0 or \$100:

$$
P(\text{reach } \$100) = \frac{20}{100} = 0.2, \qquad E[\text{rounds}] = 20 \times 80 = 1600
$$

With a slightly unfair game, $p = 0.49$: $q/p \approx 1.0408$, and $P \approx \frac{1 - 1.0408^{20}}{1 - 1.0408^{100}} \approx 0.0326$. A 1-point edge cuts the win chance from 20% to about 3%.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "In a fair game you start with \\$30 and stop at \\$0 or \\$50. What is the probability of reaching \\$50?",
  "options": ["0.5", "0.6", "0.3", "0.4"],
  "answer": 1,
  "explanation": "For a fair walk, P = k/N = 30/50 = 0.6."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `ruin_win_prob(k, n, p)` returning the probability of reaching `n` before 0 when starting at `k` with up-probability `p` (handle p = 0.5 separately).",
  "starterCode": "def ruin_win_prob(k, n, p):\n    pass\n\nprint(ruin_win_prob(20, 100, 0.5), ruin_win_prob(20, 100, 0.49))",
  "tests": "assert abs(ruin_win_prob(20, 100, 0.5) - 0.2) < 1e-12\nassert abs(ruin_win_prob(30, 50, 0.5) - 0.6) < 1e-12\nr = 0.51 / 0.49\nassert abs(ruin_win_prob(20, 100, 0.49) - (1 - r**20) / (1 - r**100)) < 1e-12\nassert ruin_win_prob(0, 10, 0.6) == 0\nassert abs(ruin_win_prob(10, 10, 0.3) - 1) < 1e-12",
  "solution": "def ruin_win_prob(k, n, p):\n    if p == 0.5:\n        return k / n\n    r = (1 - p) / p\n    return (1 - r ** k) / (1 - r ** n)",
  "hints": ["For p = 0.5 the answer is k/n.", "Otherwise use r = q/p in (1 − r^k) / (1 − r^n)."]
}
```

> [!TIP] Interview tips
> - Set up the recurrence with first-step analysis and boundary conditions before quoting formulas.
> - For the fair case, the martingale argument is elegant: expected wealth stays k, so P(win) × N = k.
> - Mention the business angle: any negative expected value per round compounds into near-certain loss over many rounds.
