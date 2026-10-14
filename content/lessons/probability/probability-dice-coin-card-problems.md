---
id: probability-dice-coin-card-problems
title: Dice, coin and card problems
estimatedMinutes: 15
difficulty: medium
tags: [probability, brain-teasers, interview-pattern]
---

## Why it matters
Quant and DS interviews love quick puzzles with dice, coins and cards. They test whether you can set up the sample space, pick the right tool (counting, complement, symmetry, conditioning) and sanity-check the answer.

## Concept
A small toolkit solves most of them:

| Tool | Use when | Example |
|---|---|---|
| Complement | "at least one" | P(at least one 6 in 4 rolls) = 1 − (5/6)⁴ |
| Symmetry | outcomes are interchangeable | P(first ace is above the first king) = 1/2 |
| Counting | equally likely outcomes | P(two-card hand is a pair) = 13·C(4,2) / C(52,2) |
| Sequential multiplication | without replacement | P(first two cards red) = (26/52)(25/51) |
| Conditioning / first step | games that repeat | expected rolls until a 6 = 6 |

Always ask: ordered or unordered? With or without replacement? Fair or biased?

## Worked example
Roll two dice. Given that the sum is 8, what is the probability that at least one die shows a 6?

Pairs summing to 8: (2,6), (3,5), (4,4), (5,3), (6,2), five equally likely outcomes. Two contain a 6, so the answer is $2/5$.

A classic symmetry trick: you and a friend each roll a die. P(yours is strictly higher) = (1 − P(tie)) / 2 = (1 − 1/6) / 2 = 5/12.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Two cards are drawn from a shuffled deck. What is the probability that they're the same suit?",
  "options": ["1/4", "12/51", "13/52", "1/16"],
  "answer": 1,
  "explanation": "Whatever the first card is, 12 of the remaining 51 cards share its suit."
}
```

```quiz
{
  "id": "q2",
  "question": "You flip a fair coin 4 times. What is the probability of getting more heads than tails?",
  "options": ["1/2", "5/16", "11/16", "3/8"],
  "answer": 1,
  "explanation": "P(tie) = C(4,2)/16 = 6/16. By symmetry the rest splits evenly: (1 − 6/16) / 2 = 5/16."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `p_higher_roll(sides)`: two players each roll a fair die with `sides` faces; return the exact probability that player 1's roll is strictly higher. Use enumeration or symmetry.",
  "starterCode": "def p_higher_roll(sides):\n    pass\n\nprint(p_higher_roll(6))",
  "tests": "assert abs(p_higher_roll(6) - 5/12) < 1e-12\nassert abs(p_higher_roll(2) - 1/4) < 1e-12\nassert abs(p_higher_roll(20) - (1 - 1/20) / 2) < 1e-12",
  "solution": "def p_higher_roll(sides):\n    return (1 - 1 / sides) / 2",
  "hints": ["P(tie) = 1/sides.", "By symmetry, 'higher' and 'lower' are equally likely."]
}
```

```reveal
{
  "prompt": "Interview classic: you roll a die and can either take the value in dollars or roll once more and take the second value. What's your strategy and the expected payout?",
  "answer": "If you roll again, the expected value is 3.5. So keep the first roll if it's 4, 5 or 6, and reroll on 1, 2 or 3.\n\nExpected payout = P(keep) × E[first | keep] + P(reroll) × 3.5 = (1/2)(5) + (1/2)(3.5) = **4.25**.\n\nThe general idea (keep if the current value beats the expected value of continuing) is backward induction; with three rolls you'd apply it twice."
}
```

> [!TIP] Interview tips
> - Talk through the sample space before computing; interviewers grade the setup more than the arithmetic.
> - Look for symmetry first. It often turns a long computation into one line.
> - Sanity-check: probabilities between 0 and 1, and a tiny case you can enumerate.
