---
id: probability-counting-permutations-and-combinations
title: "Counting: permutations and combinations"
estimatedMinutes: 12
difficulty: easy
tags: [probability, combinatorics, counting]
---

## Why it matters
Card hands, committee selections and "how many ways can…" questions all reduce to counting. Interviewers watch whether you decide upfront if order matters and if repetition is allowed.

## Concept
| Order matters? | Repetition? | Count | Example |
|---|---|---|---|
| yes | no | $\dfrac{n!}{(n-k)!}$ (permutations) | podium of 3 from 10 runners |
| no | no | $\dbinom{n}{k} = \dfrac{n!}{k!\,(n-k)!}$ (combinations) | 3-person committee from 10 |
| yes | yes | $n^k$ | 4-digit PIN |
| no | yes | $\dbinom{n+k-1}{k}$ (stars and bars) | 3 scoops from 5 flavors |

Probability with counting: P(event) = favorable outcomes / total outcomes, counted **the same way** (both ordered or both unordered).

## Worked example
Probability of a full house in 5-card poker:

$$
\frac{\binom{13}{1}\binom{4}{3}\cdot\binom{12}{1}\binom{4}{2}}{\binom{52}{5}} = \frac{13 \cdot 4 \cdot 12 \cdot 6}{2{,}598{,}960} \approx 0.00144
$$

Pick the rank for the three of a kind, 3 of its 4 suits, then a different rank for the pair and 2 of its suits.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "How many ways can you choose a president, vice-president and treasurer from 8 people?",
  "options": ["56", "336", "512", "24"],
  "answer": 1,
  "explanation": "Order matters (the roles differ): 8 × 7 × 6 = 336. Choosing an unordered committee of 3 would be C(8, 3) = 56."
}
```

```quiz
{
  "id": "q2",
  "question": "A bag has 5 red and 3 blue balls. You draw 2 without replacement. What is P(both red)?",
  "options": ["25/64", "5/14", "5/8", "1/4"],
  "answer": 1,
  "explanation": "C(5,2) / C(8,2) = 10 / 28 = 5/14. Equivalently (5/8) × (4/7). 25/64 would be the answer with replacement."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `p_all_same_color(red, blue, k)`: you draw `k` balls without replacement from a bag with `red` red and `blue` blue balls. Return the probability that **all `k` drawn balls are the same color**.",
  "starterCode": "from math import comb\n\ndef p_all_same_color(red, blue, k):\n    pass\n\nprint(p_all_same_color(5, 3, 2))",
  "tests": "from math import comb\nassert abs(p_all_same_color(5, 3, 2) - 13/28) < 1e-12\nassert abs(p_all_same_color(2, 2, 3) - 0) < 1e-12\nassert abs(p_all_same_color(4, 4, 1) - 1) < 1e-12",
  "solution": "from math import comb\n\ndef p_all_same_color(red, blue, k):\n    total = comb(red + blue, k)\n    return (comb(red, k) + comb(blue, k)) / total",
  "hints": ["All red or all blue: these are disjoint, so add them.", "math.comb(n, k) returns 0 when k > n."]
}
```

> [!TIP] Interview tips
> - Say "order matters / doesn't" and "with / without replacement" before writing any formula.
> - Sanity-check with a tiny case you can enumerate by hand.
> - When counting gets messy, switch to sequential probabilities: (5/8) × (4/7) is often faster than combinations.
