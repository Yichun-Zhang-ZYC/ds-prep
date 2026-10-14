---
id: probability-sample-space-events-axioms
title: Sample space, events, axioms
estimatedMinutes: 10
difficulty: easy
tags: [probability, basics, set-operations]
---

## Why it matters
Most probability mistakes in interviews come from a fuzzy sample space: counting outcomes that aren't equally likely, or double-counting overlaps. Setting up Ω and the events precisely makes the rest of the problem mechanical.

## Concept
- The **sample space** $\Omega$ is the set of all possible outcomes (e.g. two dice: 36 ordered pairs).
- An **event** is a subset of $\Omega$ ("sum is 7").
- If outcomes are equally likely, $P(A) = |A| / |\Omega|$.

The three **axioms** (Kolmogorov): $P(A) \ge 0$; $P(\Omega) = 1$; for disjoint events, $P(A \cup B) = P(A) + P(B)$.

Useful consequences:

$$
P(A^c) = 1 - P(A) \qquad P(A \cup B) = P(A) + P(B) - P(A \cap B)
$$

The complement rule is the most useful trick in interviews: "at least one" is usually easiest as 1 − P(none).

## Worked example
Roll two fair dice. What is the probability that at least one shows a 6?

Directly you'd have to count overlaps; with the complement it's one line:

$$
P(\text{at least one 6}) = 1 - P(\text{no 6}) = 1 - \left(\tfrac{5}{6}\right)^2 = \tfrac{11}{36} \approx 0.306
$$

Check by inclusion–exclusion: $\tfrac{6}{36} + \tfrac{6}{36} - \tfrac{1}{36} = \tfrac{11}{36}$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Two fair dice are rolled. What is the probability that the sum is 7?",
  "options": ["1/12", "1/6", "7/36", "1/11"],
  "answer": 1,
  "explanation": "6 ordered pairs out of 36: (1,6), (2,5), (3,4), (4,3), (5,2), (6,1). Treating sums 2–12 as equally likely (1/11) is the classic mistake."
}
```

```quiz
{
  "id": "q2",
  "question": "P(A) = 0.5, P(B) = 0.4, P(A ∩ B) = 0.2. What is P(A ∪ B)?",
  "options": ["0.9", "0.7", "0.2", "0.5"],
  "answer": 1,
  "explanation": "0.5 + 0.4 − 0.2 = 0.7. Adding without subtracting the overlap counts it twice."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `p_at_least_one(p, n)` that returns the probability that an event with probability `p` happens **at least once** in `n` independent trials.",
  "starterCode": "def p_at_least_one(p, n):\n    pass\n\nprint(p_at_least_one(1/6, 2))  # two dice, at least one six",
  "tests": "assert abs(p_at_least_one(1/6, 2) - 11/36) < 1e-12\nassert abs(p_at_least_one(0.5, 3) - 0.875) < 1e-12\nassert p_at_least_one(0.3, 0) == 0",
  "solution": "def p_at_least_one(p, n):\n    return 1 - (1 - p) ** n",
  "hints": ["Use the complement: P(at least one) = 1 − P(none).", "P(none) for independent trials is (1 − p)^n."]
}
```

> [!TIP] Interview tips
> - Write down Ω explicitly for small problems ("36 ordered pairs"); it prevents the "sums are equally likely" mistake.
> - Reach for the complement whenever you see "at least one".
> - Say whether order matters before counting; it decides between ordered pairs and combinations.
