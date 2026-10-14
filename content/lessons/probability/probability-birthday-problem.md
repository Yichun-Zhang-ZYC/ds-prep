---
id: probability-birthday-problem
title: Birthday problem
estimatedMinutes: 10
difficulty: medium
tags: [probability, brain-teasers, collisions]
---

## Why it matters
"How many people for a 50% chance that two share a birthday?" is a classic, and its real lesson matters in practice: collisions (duplicate IDs, hash collisions, A/B bucketing overlaps) happen far sooner than intuition suggests.

## Concept
With $n$ people and 365 equally likely birthdays, use the complement (all birthdays different):

$$
P(\text{no match}) = \frac{365}{365} \cdot \frac{364}{365} \cdots \frac{365 - n + 1}{365}, \qquad P(\text{match}) = 1 - P(\text{no match})
$$

The answer crosses 50% at **n = 23**. The intuition gap: there are $\binom{23}{2} = 253$ pairs, each with a 1/365 chance to match.

Useful approximation for $d$ "days" and $n$ items:

$$
P(\text{collision}) \approx 1 - e^{-n(n-1)/(2d)}
$$

A 50% collision chance needs about $1.18\sqrt{d}$ items.

## Worked example
You assign random 6-digit codes (d = 1,000,000) to 1,000 users. Chance of at least one duplicate:

$$
1 - e^{-1000 \cdot 999 / 2{,}000{,}000} \approx 1 - e^{-0.4995} \approx 0.39
$$

Almost 40% with only 0.1% of the code space used, which is why systems use much longer random IDs or check for collisions.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "In a room of 23 people, what is the probability that someone shares **your** birthday?",
  "options": ["About 50%", "About 6%", "About 23%", "About 1/365"],
  "answer": 1,
  "explanation": "1 − (364/365)²² ≈ 0.06. The 50% figure is for any pair, not for a match with one specific person."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `p_shared_birthday(n, days=365)` (exact) and `min_people_for(p, days=365)` returning the smallest n with P(match) ≥ p.",
  "starterCode": "def p_shared_birthday(n, days=365):\n    pass\n\ndef min_people_for(p, days=365):\n    pass\n\nprint(p_shared_birthday(23), min_people_for(0.5))",
  "tests": "assert abs(p_shared_birthday(23) - 0.5072972343) < 1e-9\nassert p_shared_birthday(1) == 0\nassert p_shared_birthday(366) == 1\nassert min_people_for(0.5) == 23\nassert min_people_for(0.99) == 57",
  "solution": "def p_shared_birthday(n, days=365):\n    if n > days:\n        return 1\n    no_match = 1.0\n    for i in range(n):\n        no_match *= (days - i) / days\n    return 1 - no_match\n\ndef min_people_for(p, days=365):\n    n = 1\n    while p_shared_birthday(n, days) < p:\n        n += 1\n    return n",
  "hints": ["Multiply (days − i)/days for i = 0..n−1 to get P(no match).", "With more people than days, a match is certain (pigeonhole principle)."]
}
```

> [!TIP] Interview tips
> - Explain the "number of pairs grows like n²" intuition; it's what interviewers want to hear.
> - Distinguish "any pair matches" from "someone matches me".
> - Connect it to engineering: ID length, hash collisions and sample overlaps in experiments.
