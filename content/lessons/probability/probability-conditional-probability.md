---
id: probability-conditional-probability
title: Conditional probability
estimatedMinutes: 12
difficulty: easy
tags: [probability, conditional, basics]
---

## Why it matters
"Given that a user clicked, what's the chance they buy?" Conditional probability is the language of funnels, A/B tests and Bayes. The classic interview trap is confusing $P(A \mid B)$ with $P(B \mid A)$.

## Concept
The probability of $A$ given that $B$ happened:

$$
P(A \mid B) = \frac{P(A \cap B)}{P(B)}, \qquad P(B) > 0
$$

Conditioning shrinks the sample space to $B$, then asks how much of $B$ is also $A$. Rearranged, it gives the **multiplication rule**: $P(A \cap B) = P(B)\,P(A \mid B)$.

In general $P(A \mid B) \ne P(B \mid A)$. Most buyers clicked an ad ($P(\text{click} \mid \text{buy})$ is high), but few clickers buy ($P(\text{buy} \mid \text{click})$ is low).

## Worked example
A family has two children. Given that at least one is a girl, what is the probability both are girls?

The sample space is {GG, GB, BG, BB}. Conditioning on "at least one girl" removes BB:

$$
P(\text{GG} \mid \text{at least one G}) = \frac{1/4}{3/4} = \frac{1}{3}
$$

If instead you know **the older child** is a girl, the space is {GG, GB} and the answer is 1/2. The exact wording of the condition matters.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "30% of users click an ad. 6% of all users click and then buy. What is P(buy | click)?",
  "options": ["6%", "18%", "20%", "36%"],
  "answer": 2,
  "explanation": "P(buy | click) = P(buy ∩ click) / P(click) = 0.06 / 0.30 = 0.20."
}
```

```quiz
{
  "id": "q2",
  "question": "You draw two cards without replacement. What is P(second is an ace | first is an ace)?",
  "options": ["4/52", "3/51", "4/51", "1/13 × 1/13"],
  "answer": 1,
  "explanation": "After one ace is gone, 3 aces remain among 51 cards."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Each tuple in `events` is `(clicked, bought)` with booleans. Write `p_buy_given_click(events)` that returns P(bought | clicked), or `None` if nobody clicked.",
  "starterCode": "def p_buy_given_click(events):\n    pass\n\nprint(p_buy_given_click([(True, True), (True, False), (False, False), (True, False)]))",
  "tests": "assert abs(p_buy_given_click([(True, True), (True, False), (False, False), (True, False)]) - 1/3) < 1e-12\nassert p_buy_given_click([(False, False), (False, True)]) is None\nassert p_buy_given_click([(True, True), (True, True)]) == 1.0",
  "solution": "def p_buy_given_click(events):\n    clicked = [bought for c, bought in events if c]\n    if not clicked:\n        return None\n    return sum(clicked) / len(clicked)",
  "hints": ["Restrict to the rows where clicked is True: that's the new sample space.", "Among those, compute the share that bought."]
}
```

> [!TIP] Interview tips
> - Read the condition aloud and write it as $P(\text{target} \mid \text{given})$ before computing.
> - When in doubt, draw a 2×2 table of counts; conditional probability is "row share" or "column share".
> - Watch the wording: "at least one" vs "a specific one" changes the answer (the two-children puzzle).
