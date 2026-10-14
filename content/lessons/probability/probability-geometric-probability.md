---
id: probability-geometric-probability
title: Geometric probability
estimatedMinutes: 12
difficulty: hard
tags: [probability, geometry, brain-teasers, uniform]
---

## Why it matters
"Two people arrive at random between 12:00 and 1:00 and wait 15 minutes for each other; what's the chance they meet?" Questions with continuous uniform variables become area problems. They're popular because a quick sketch solves them.

## Concept
When points are chosen uniformly in a region, probability = (favorable area) / (total area). The recipe:

1. Write each random quantity as a coordinate (e.g. $X, Y \sim$ Uniform(0, 1)).
2. Draw the sample space (a square or cube).
3. Shade the region where the event holds, using lines like $|X - Y| < c$ or $X + Y < 1$.
4. Compute the shaded area, often as total minus simple triangles.

## Worked example
Two friends each arrive uniformly between 0 and 60 minutes and wait 15 minutes. They meet if $|X - Y| \le 15$.

The square is $60 \times 60$. The "no meeting" region is two triangles with legs $45$:

$$
P(\text{meet}) = 1 - \frac{2 \cdot \frac12 \cdot 45^2}{60^2} = 1 - \frac{2025}{3600} = \frac{7}{16} \approx 0.4375
$$

Another classic: break a stick at two uniform points. The three pieces form a triangle with probability $1/4$ (each piece must be shorter than half the stick).

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "X and Y are independent Uniform(0, 1). What is P(|X − Y| < 1/2)?",
  "options": ["1/2", "3/4", "1/4", "2/3"],
  "answer": 1,
  "explanation": "The complement is two corner triangles with legs 1/2: area 2 × (1/2)(1/2)² = 1/4, so the answer is 3/4."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `p_meet(total, wait)` (exact, arrivals uniform on [0, total]) and `simulate_stick_triangle(trials, seed)` that estimates the probability that two uniform break points produce three pieces forming a triangle.",
  "starterCode": "import random\n\ndef p_meet(total, wait):\n    pass\n\ndef simulate_stick_triangle(trials, seed):\n    pass\n\nprint(p_meet(60, 15), simulate_stick_triangle(50000, 0))",
  "tests": "assert abs(p_meet(60, 15) - 7/16) < 1e-12\nassert abs(p_meet(60, 60) - 1) < 1e-12\nassert abs(p_meet(1, 0.5) - 0.75) < 1e-12\nest = simulate_stick_triangle(50000, 0)\nassert abs(est - 0.25) < 0.01, est",
  "solution": "import random\n\ndef p_meet(total, wait):\n    if wait >= total:\n        return 1.0\n    return 1 - ((total - wait) / total) ** 2\n\ndef simulate_stick_triangle(trials, seed):\n    rng = random.Random(seed)\n    ok = 0\n    for _ in range(trials):\n        a, b = sorted((rng.random(), rng.random()))\n        pieces = (a, b - a, 1 - b)\n        ok += max(pieces) < 0.5\n    return ok / trials",
  "hints": ["The no-meeting triangles together have area (total − wait)².", "Three lengths summing to 1 form a triangle iff the longest is < 1/2."]
}
```

> [!TIP] Interview tips
> - Draw the square and the boundary lines first; describe the shaded region in words as you go.
> - Compute the complement when it's made of simple triangles.
> - Offer a Monte Carlo check; it shows practical instincts and catches algebra slips.
