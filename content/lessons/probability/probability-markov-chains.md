---
id: probability-markov-chains
title: Markov chains
estimatedMinutes: 15
difficulty: hard
tags: [probability, markov-chains, stationary-distribution]
---

## Why it matters
User journeys between app screens, subscription states (free → paid → churned), and PageRank are Markov chains. Interviewers ask for transition matrices, long-run (stationary) shares and expected steps to absorption.

## Concept
A **Markov chain** moves between states where the next state depends only on the current one. It's described by a transition matrix $P$ with $P_{ij}$ = probability of moving from $i$ to $j$ (each row sums to 1).

- Distribution after one step: $\pi_{t+1} = \pi_t P$ (row vector times matrix).
- **Stationary distribution** $\pi$: $\pi = \pi P$, $\sum \pi_i = 1$. For a well-behaved (irreducible, aperiodic) chain, the long-run share of time in each state converges to $\pi$ from any start.
- **Absorbing states** (e.g. "churned") are never left; first-step analysis gives absorption probabilities and expected steps.

## Worked example
Users are Active (A) or Dormant (D) each week. Active stay active with probability 0.8; dormant reactivate with probability 0.3.

$$
P = \begin{pmatrix} 0.8 & 0.2 \\ 0.3 & 0.7 \end{pmatrix}
$$

Stationary: $\pi_A = 0.8\pi_A + 0.3\pi_D$ with $\pi_A + \pi_D = 1$ gives $0.2\pi_A = 0.3\pi_D$, so $\pi_A = 0.6$, $\pi_D = 0.4$. In the long run, 60% of users are active in a given week, whatever the starting mix.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "With the matrix above, a user is Active this week. What is the probability they are Active two weeks from now?",
  "options": ["0.64", "0.70", "0.80", "0.60"],
  "answer": 1,
  "explanation": "A→A→A: 0.8 × 0.8 = 0.64; A→D→A: 0.2 × 0.3 = 0.06. Total 0.70."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `step(dist, P)` that returns the next distribution (dist is a list, P a list of rows), and `stationary(P, iters=1000)` that finds the stationary distribution by repeatedly stepping from a uniform start.",
  "starterCode": "def step(dist, P):\n    pass\n\ndef stationary(P, iters=1000):\n    pass\n\nP = [[0.8, 0.2], [0.3, 0.7]]\nprint(step([1, 0], P), stationary(P))",
  "tests": "P = [[0.8, 0.2], [0.3, 0.7]]\nd = step([1, 0], P)\nassert abs(d[0] - 0.8) < 1e-12 and abs(d[1] - 0.2) < 1e-12\nd2 = step(d, P)\nassert abs(d2[0] - 0.7) < 1e-12\npi = stationary(P)\nassert abs(pi[0] - 0.6) < 1e-9 and abs(pi[1] - 0.4) < 1e-9\nQ = [[0.5, 0.5, 0], [0.25, 0.5, 0.25], [0, 0.5, 0.5]]\npi3 = stationary(Q)\nassert abs(pi3[1] - 0.5) < 1e-9 and abs(pi3[0] - 0.25) < 1e-9",
  "solution": "def step(dist, P):\n    n = len(P)\n    return [sum(dist[i] * P[i][j] for i in range(n)) for j in range(n)]\n\ndef stationary(P, iters=1000):\n    n = len(P)\n    dist = [1 / n] * n\n    for _ in range(iters):\n        dist = step(dist, P)\n    return dist",
  "hints": ["New probability of state j = sum over i of dist[i] × P[i][j].", "Power iteration: apply step many times; it converges for well-behaved chains."]
}
```

> [!TIP] Interview tips
> - Draw the states and arrows first; writing the matrix from the picture avoids row/column mix-ups.
> - Solve $\pi = \pi P$ by hand for 2–3 states; mention power iteration or eigenvectors for larger chains.
> - Connect to products: churn modeling, customer lifetime, and PageRank are all stationary-distribution problems.
