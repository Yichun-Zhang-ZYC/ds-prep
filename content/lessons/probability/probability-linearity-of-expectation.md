---
id: probability-linearity-of-expectation
title: Linearity of expectation
estimatedMinutes: 12
difficulty: medium
tags: [probability, expectation, indicators, brain-teasers]
---

## Why it matters
Linearity of expectation is the single most powerful trick for probability brain-teasers. Questions that look like they need a full distribution ("expected number of…") often collapse to one line once you use indicator variables.

## Concept
For any random variables, **independent or not**:

$$
E[X_1 + X_2 + \dots + X_n] = E[X_1] + E[X_2] + \dots + E[X_n]
$$

The **indicator method**: write a count as a sum of 0/1 variables $I_i$ ("did event $i$ happen?"). Since $E[I_i] = P(\text{event } i)$,

$$
E[\text{count}] = \sum_i P(\text{event } i)
$$

You never need the distribution of the count, only each event's probability.

## Worked example
$n$ people put their hats in a pile and each takes one at random. What is the expected number who get their own hat?

Let $I_i = 1$ if person $i$ gets their own hat. $P(I_i = 1) = 1/n$, so

$$
E[\text{matches}] = \sum_{i=1}^{n} \frac{1}{n} = 1
$$

The answer is 1 for any $n$, even though the $I_i$ are dependent. Computing the full distribution would be much harder.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You roll a fair die 12 times. What is the expected number of distinct faces that never appear?",
  "options": ["6 × (5/6)¹²", "(5/6)¹²", "12 × (1/6)", "0"],
  "answer": 0,
  "explanation": "Each face is missing with probability (5/6)¹², and there are 6 faces: 6 × (5/6)¹² ≈ 0.67."
}
```

```quiz
{
  "id": "q2",
  "question": "A random permutation of 1..n. What is the expected number of i with position i holding a value larger than the value at position i−1 (i from 2 to n)?",
  "options": ["(n − 1) / 2", "n / 2", "1", "log n"],
  "answer": 0,
  "explanation": "Each adjacent pair is increasing with probability 1/2, and there are n − 1 pairs."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `expected_fixed_points_sim(n, trials, seed)` that estimates the expected number of fixed points of a random permutation of size `n` by simulation (use `random.Random(seed)` and `shuffle`). Then write `expected_empty_faces(rolls)` that returns the **exact** expected number of die faces that never appear in `rolls` rolls.",
  "starterCode": "import random\n\ndef expected_fixed_points_sim(n, trials, seed):\n    pass\n\ndef expected_empty_faces(rolls):\n    pass\n\nprint(expected_fixed_points_sim(10, 20000, 0), expected_empty_faces(12))",
  "tests": "est = expected_fixed_points_sim(10, 20000, 0)\nassert abs(est - 1) < 0.05, est\nassert abs(expected_empty_faces(12) - 6 * (5/6) ** 12) < 1e-12\nassert expected_empty_faces(0) == 6",
  "solution": "import random\n\ndef expected_fixed_points_sim(n, trials, seed):\n    rng = random.Random(seed)\n    total = 0\n    for _ in range(trials):\n        perm = list(range(n))\n        rng.shuffle(perm)\n        total += sum(1 for i, v in enumerate(perm) if i == v)\n    return total / trials\n\ndef expected_empty_faces(rolls):\n    return 6 * (5 / 6) ** rolls",
  "hints": ["A fixed point is an index i where perm[i] == i.", "Each face is missing with probability (5/6)^rolls; add that up over 6 faces."]
}
```

> [!TIP] Interview tips
> - When you hear "expected number of…", immediately define indicators and say "by linearity of expectation".
> - Point out that independence is **not** required; interviewers often probe this.
> - Verify with a tiny case (n = 2 hats: matches are 0 or 2, each with probability 1/2, mean 1).
