---
id: probability-practice-expected-value-games
title: "Practice: Expected value and games"
estimatedMinutes: 14
difficulty: medium
tags: [probability, expected-value, games, kelly, puzzles, practice]
---

## Why it matters

Expected-value games test whether you can turn a story into a recursion or a linearity argument and then reason about decisions: when to stop, what a fair price is, how much to bet. This set builds on linearity of expectation and expected number of trials.

## Concept

**Fair price** of a game is its expected payoff. For multi-stage games solve **backward**: let $V_k$ be the optimal expected value with $k$ decisions left, and at each stage take $\max(\text{stop now}, \text{continue})$. Typical shape: $V_k = E[\max(X, V_{k-1})]$.

**Linearity tricks**: expected fixed points of a random permutation $= 1$; coupon collector for $n$ types $= nH_n$; expected number of records in $n$ iid draws $= H_n$. No independence needed.

**Optimal stopping**: secretary problem: reject the first $\approx n/e$, then take the first best-so-far; success $\to 1/e$. For "keep or redraw" games the threshold is the value of continuing.

**Risk**: expectation is not always the right criterion. St. Petersburg has infinite expectation but finite fair price once bankroll is capped (or utility is concave). **Kelly criterion** maximizes $E[\log W]$: for win probability $p$, net odds $b$, bet fraction $f^* = p - (1-p)/b$. It maximizes long-run growth but is volatile; practitioners bet a fraction of Kelly.

**Two-envelope** style paradoxes come from conditioning on a quantity whose distribution is improper (no uniform prior on all positive reals). Always ask: what is the actual random mechanism?

## Worked example

Roll a fair die and get that many dollars. You may reroll once. What is the expected payoff with optimal play, and what if you may reroll twice?

No reroll: $V_0 = 3.5$. One reroll: keep if the roll beats 3.5, i.e. 4, 5, 6 (average 5, probability 1/2); otherwise reroll worth 3.5. $V_1 = \tfrac12\cdot 5 + \tfrac12\cdot 3.5 = 4.25$.

Two rerolls: keep only if the roll beats $V_1 = 4.25$, i.e. 5 or 6 (probability 1/3, average 5.5). $V_2 = \tfrac13\cdot 5.5 + \tfrac23\cdot 4.25 = 1.8333 + 2.8333 = 14/3 \approx 4.667$. Check by enumeration: $(5 + 6 + 4\cdot 4.25)/6 = 28/6 = 14/3$. Each extra reroll helps less, and values approach but never reach 6.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "In the St. Petersburg game you win \\$2^n if the first head is on flip n. A casino can only pay up to \\$2^{20} (about a million). What is the fair price?",
  "options": [
    "Infinite",
    "About \\$2",
    "About \\$21",
    "About \\$1,000,000"
  ],
  "answer": 2,
  "explanation": "Rounds 1 to 20 each contribute $2^{-n}\\cdot 2^n = 1$, and all later rounds pay the capped $2^{20}$ with total probability $2^{-20}$, adding 1. So $E = 21$. The uncapped expectation is infinite, which is why utility and bankrolls matter."
}
```

```quiz
{
  "id": "q2",
  "question": "You can bet any fraction of your bankroll on a 60% even-money coin. Which fraction maximizes long-run growth rate?",
  "options": [
    "10%",
    "20%",
    "60%",
    "100%"
  ],
  "answer": 1,
  "explanation": "Kelly: $f^* = p - (1-p)/b = 0.6 - 0.4 = 0.2$. Betting everything has expected value 1.2 per round but ruins you with probability 0.4 each time, so log growth is $-\\infty$."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Optimal stopping with rerolls. You roll a fair `sides`-sided die and receive the face value, but you may reroll up to `n` times (each reroll discards the current value). Implement `game_value(n, sides=6)` returning the exact `Fraction` expected payoff under optimal play, using backward induction: with $n$ rerolls left, keep the roll $x$ iff $x$ exceeds the value with $n - 1$ rerolls left.",
  "starterCode": "from fractions import Fraction\n\ndef game_value(n, sides=6):\n    pass\n",
  "tests": "assert game_value(0) == Fraction(7, 2)\nassert game_value(1) == Fraction(17, 4)\nassert game_value(2) == Fraction(14, 3)\nassert game_value(0, 2) == Fraction(3, 2)\nassert game_value(1, 2) == Fraction(7, 4)\nassert game_value(10) < 6 and game_value(10) > game_value(9)",
  "solution": "from fractions import Fraction\n\ndef game_value(n, sides=6):\n    v = Fraction(sides + 1, 2)\n    for _ in range(n):\n        v = sum((max(Fraction(x), v) for x in range(1, sides + 1)), Fraction(0)) / sides\n    return v",
  "hints": [
    "With $n$ rerolls left, the payoff for roll $x$ is $\\max(x, V_{n-1})$; average over faces to get $V_n$.",
    "$V_0 = (\\text{sides} + 1)/2$."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Betting. Implement `kelly_fraction(p, b)` for a bet that pays `b` per unit staked with win probability `p` (Kelly: $f^* = p - (1-p)/b$, floored at 0), `log_growth(f, p, b)` = $p\\ln(1 + bf) + (1-p)\\ln(1 - f)$ (expected log-wealth growth per bet), and `best_grid_fraction(p, b, steps=1000)` returning the fraction `f = i/steps` ($0 \\le i < $ `steps`) with the highest growth.",
  "starterCode": "import math\n\ndef kelly_fraction(p, b):\n    pass\n\ndef log_growth(f, p, b):\n    pass\n\ndef best_grid_fraction(p, b, steps=1000):\n    pass\n",
  "tests": "assert abs(kelly_fraction(0.6, 1) - 0.2) < 1e-12\nassert abs(kelly_fraction(0.5, 2) - 0.25) < 1e-12\nassert kelly_fraction(0.4, 1) == 0\nassert abs(log_growth(0.2, 0.6, 1) - (0.6 * math.log(1.2) + 0.4 * math.log(0.8))) < 1e-12\nassert log_growth(0.0, 0.6, 1) == 0\nassert abs(best_grid_fraction(0.6, 1) - 0.2) < 1e-9\nassert log_growth(0.2, 0.6, 1) > log_growth(0.5, 0.6, 1)\nassert log_growth(0.9, 0.6, 1) < 0",
  "solution": "import math\n\ndef kelly_fraction(p, b):\n    return max(0.0, p - (1 - p) / b)\n\ndef log_growth(f, p, b):\n    return p * math.log(1 + b * f) + (1 - p) * math.log(1 - f)\n\ndef best_grid_fraction(p, b, steps=1000):\n    return max((i / steps for i in range(steps)), key=lambda f: log_growth(f, p, b))",
  "hints": [
    "Even-money bet ($b = 1$) with $p = 0.6$: $f^* = 0.6 - 0.4 = 0.2$.",
    "Maximize $G(f)$ over the grid; $G(0) = 0$ and it is concave in $f$."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Secretary problem. `secretary_prob(n, r)` is the exact probability (a `Fraction`) of picking the best of `n` candidates when you reject the first `r - 1` and then take the first candidate better than all seen so far: it is $1/n$ for $r = 1$, otherwise $\\frac{r-1}{n}\\sum_{i=r}^{n}\\frac{1}{i-1}$. Implement it and `best_r(n)` (the `r` with the highest probability, smallest on ties).",
  "starterCode": "from fractions import Fraction\n\ndef secretary_prob(n, r):\n    pass\n\ndef best_r(n):\n    pass\n",
  "tests": "assert secretary_prob(3, 2) == Fraction(1, 2)\nassert secretary_prob(4, 2) == Fraction(11, 24)\nassert secretary_prob(4, 3) == Fraction(5, 12)\nassert secretary_prob(5, 1) == Fraction(1, 5)\nassert best_r(4) == 2\nassert best_r(10) == 4\nassert best_r(100) == 38\nassert abs(float(secretary_prob(100, 38)) - 0.371) < 1e-3",
  "solution": "from fractions import Fraction\n\ndef secretary_prob(n, r):\n    if r == 1:\n        return Fraction(1, n)\n    return Fraction(r - 1, n) * sum((Fraction(1, i - 1) for i in range(r, n + 1)), Fraction(0))\n\ndef best_r(n):\n    best, best_p = 1, secretary_prob(n, 1)\n    for r in range(2, n + 1):\n        p = secretary_prob(n, r)\n        if p > best_p:\n            best, best_p = r, p\n    return best",
  "hints": [
    "Use `Fraction` throughout so ties compare exactly.",
    "Large $n$: the optimum is to skip about $n/e$ candidates and the success probability tends to $1/e \\approx 0.368$."
  ]
}
```

> [!TIP] Interview tips
> - State the decision rule as a threshold from the continuation value; then compute backward. Interviewers love the "one more reroll" follow-up.
> - Know the headline numbers: coupon collector $nH_n$, secretary $1/e$, Kelly $p - q/b$, St. Petersburg capped value.
> - Pitfall: maximizing expected value when the question is about risk or repeated play; mention variance and ruin. Also say when you use linearity because it avoids messy dependence.
