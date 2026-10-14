---
id: probability-independence
title: Independence
estimatedMinutes: 10
difficulty: easy
tags: [probability, independence, basics]
---

## Why it matters
Many shortcuts (multiplying probabilities, adding variances) are only valid under independence. Interviewers check whether you state the assumption, and whether you can tell independence from mutual exclusivity.

## Concept
$A$ and $B$ are **independent** if knowing one doesn't change the probability of the other:

$$
P(A \cap B) = P(A)\,P(B) \quad\Longleftrightarrow\quad P(A \mid B) = P(A)
$$

Common confusions:
- **Disjoint is not independent.** If $A$ and $B$ can't both happen and both have positive probability, then $P(A \cap B) = 0 \ne P(A)P(B)$: they're strongly *dependent* (one happening rules out the other).
- **Pairwise independence isn't mutual independence.** Three events can be independent in every pair but not as a triple.
- **Conditional independence**: $A$ and $B$ may be dependent overall but independent given $C$ (e.g. two symptoms given the disease).

## Worked example
Two fair coins. Let $A$ = first is heads, $B$ = second is heads, $C$ = the coins match.

- $P(A) = P(B) = P(C) = 1/2$, and each pair has probability 1/4 of both happening, so the events are **pairwise independent**.
- But $P(A \cap B \cap C) = P(\text{HH}) = 1/4 \ne 1/8$, so they are **not mutually independent**: knowing $A$ and $B$ determines $C$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "P(A) = 0.3, P(B) = 0.5 and A and B are mutually exclusive. Are they independent?",
  "options": ["Yes, because they don't overlap", "No: P(A ∩ B) = 0 but P(A)P(B) = 0.15", "Only if P(A ∪ B) = 0.8", "Can't tell"],
  "answer": 1,
  "explanation": "Mutually exclusive events with positive probabilities are always dependent."
}
```

```quiz
{
  "id": "q2",
  "question": "A server fails on a given day with probability 0.01, independently of other servers. What is the probability that all 3 servers fail on the same day?",
  "options": ["0.03", "0.000001", "0.01", "0.0003"],
  "answer": 1,
  "explanation": "0.01³ = 10⁻⁶, but only under independence. In practice failures are often correlated (same data center), which is why the assumption matters."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `is_independent(p_a, p_b, p_ab, tol=1e-9)` that returns `True` if events A and B are independent given P(A), P(B) and P(A ∩ B).",
  "starterCode": "def is_independent(p_a, p_b, p_ab, tol=1e-9):\n    pass\n\nprint(is_independent(0.5, 0.5, 0.25))",
  "tests": "assert is_independent(0.5, 0.5, 0.25) is True\nassert is_independent(0.3, 0.5, 0.0) is False\nassert is_independent(0.2, 0.4, 0.08) is True\nassert is_independent(0.2, 0.4, 0.1) is False",
  "solution": "def is_independent(p_a, p_b, p_ab, tol=1e-9):\n    return abs(p_ab - p_a * p_b) <= tol",
  "hints": ["Independence means P(A ∩ B) = P(A) × P(B).", "Compare floats with a tolerance, not ==."]
}
```

> [!TIP] Interview tips
> - Say "assuming independence" out loud whenever you multiply probabilities, and mention when it might fail.
> - Keep "mutually exclusive" and "independent" clearly separate; mixing them up is a red flag.
> - In ML terms, Naive Bayes is exactly a conditional-independence assumption.
