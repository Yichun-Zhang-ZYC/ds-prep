---
id: probability-practice-random-walks-and-markov-chains
title: "Practice: Random walks and Markov chains"
estimatedMinutes: 14
difficulty: hard
tags: [probability, random-walk, markov-chains, gamblers-ruin, puzzles, practice]
---

## Why it matters

Random walks and Markov chains power gambler's-ruin questions, "expected time to reach X" puzzles and PageRank-style reasoning. This set drills the three recurring computations: absorption probabilities, expected hitting times and stationary distributions. See the random walks and Markov chains lessons for definitions.

## Concept

**Gambler's ruin** (steps $+1$ w.p. $p$, $-1$ w.p. $q$, absorbing at 0 and $N$): from $i$, $P(\text{hit } N) = i/N$ if $p = q$, else $\frac{1 - r^i}{1 - r^N}$ with $r = q/p$. Expected duration: $i(N-i)$ if fair. Reaching $\pm a$ from 0 in a fair walk takes $a^2$ steps on average.

**First-step analysis** is the master tool: let $h_i$ be the quantity from state $i$ and write $h_i = c + \sum_j P_{ij}h_j$ with boundary values at absorbing states. Solve the linear system. For absorbing chains with $Q$ (transient block) and $R$: $N = (I-Q)^{-1}$, expected steps $= N\mathbf 1$, absorption probabilities $= NR$.

**Stationary distribution**: $\pi P = \pi$, $\sum\pi_i = 1$. For an irreducible, aperiodic finite chain it is unique and $P^n \to \mathbf 1\pi$. Shortcuts: detailed balance $\pi_i P_{ij} = \pi_j P_{ji}$ (reversible chains, random walks on graphs give $\pi_i \propto \deg i$); expected return time $= 1/\pi_i$ (Kac).

**Counting paths**: reflection principle for walks that touch a level; ballot theorem: if A gets $a$ votes and B gets $b < a$, A leads throughout with probability $(a-b)/(a+b)$. A symmetric 1D or 2D walk returns to the origin with probability 1 but with infinite expected time; 3D walks are transient.

**Checklist**: define states so the future depends only on the present (add memory to the state if it does not); check absorbing states; check irreducibility and periodicity before claiming convergence.

## Worked example

Start at 5 on $\{0, \dots, 10\}$ and step up with probability 0.6, down with 0.4. Find $P(\text{reach } 10 \text{ first})$ and the expected number of steps.

Here $r = q/p = 2/3$. $r^5 = 0.1317$, $r^{10} = 0.01734$. So $P = (1 - 0.1317)/(1 - 0.01734) = 0.8683/0.9827 = 0.8836$.

Duration: $q - p = -0.2$, so $D = \frac{5}{-0.2} - \frac{10}{-0.2}\cdot 0.8836 = -25 + 50\cdot 0.8836 = 19.18$ steps, shorter than the 25 steps of the fair walk because the drift pushes the walk to an end faster. Sanity check: the drift is $+0.2$ per step and the ends are 5 away on either side, so roughly $5/0.2 = 25$ upward, discounted by absorption at 0 early.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A fair $\\pm1$ random walk starts at 0. What is the probability it reaches +3 before -7?",
  "options": [
    "3/10",
    "7/10",
    "3/7",
    "1/2"
  ],
  "answer": 1,
  "explanation": "Shift to $[0, 10]$ starting at 7: the win probability is $i/N = 7/10$. The expected number of steps is $i(N - i) = 21$."
}
```

```quiz
{
  "id": "q2",
  "question": "A two-state weather chain has $P(S\\to S) = 0.9$, $P(S \\to R) = 0.1$, $P(R \\to S) = 0.5$, $P(R \\to R) = 0.5$. What fraction of days are sunny in the long run?",
  "options": [
    "0.9",
    "5/6",
    "0.5",
    "9/14"
  ],
  "answer": 1,
  "explanation": "Balance of flow between states: $\\pi_S \\cdot 0.1 = \\pi_R \\cdot 0.5$, so $\\pi_S = 5\\pi_R$ and $\\pi_S = 5/6$. Expected return time to sunny is $1/\\pi_S = 1.2$ days."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Gambler's ruin on states $0..N$ with up-probability `p` (down $q = 1-p$), starting at `i`. Implement `win_prob(i, N, p)` (probability of hitting $N$ before 0) and `expected_duration(i, N, p)`. For $p = 1/2$: $i/N$ and $i(N-i)$. Otherwise with $r = q/p$: $\\frac{1 - r^i}{1 - r^N}$ and $\\frac{i}{q-p} - \\frac{N}{q-p}\\cdot\\frac{1 - r^i}{1 - r^N}$.",
  "starterCode": "def win_prob(i, N, p):\n    pass\n\ndef expected_duration(i, N, p):\n    pass\n",
  "tests": "def brute(N, p, sweeps=4000):\n    q = 1 - p\n    u = [0.0] * (N + 1); u[N] = 1.0\n    d = [0.0] * (N + 1)\n    for _ in range(sweeps):\n        for i in range(1, N):\n            u[i] = p * u[i + 1] + q * u[i - 1]\n            d[i] = 1 + p * d[i + 1] + q * d[i - 1]\n    return u, d\nfor p in (0.5, 0.6, 0.3):\n    u, d = brute(6, p)\n    for i in range(7):\n        assert abs(win_prob(i, 6, p) - u[i]) < 1e-8, (p, i)\n        assert abs(expected_duration(i, 6, p) - d[i]) < 1e-6, (p, i)\nassert abs(win_prob(3, 10, 0.5) - 0.3) < 1e-12\nassert abs(expected_duration(3, 10, 0.5) - 21) < 1e-12\nassert abs(win_prob(5, 10, 0.6) - 0.88364) < 1e-4\nassert abs(expected_duration(5, 10, 0.6) - 19.18) < 0.01",
  "solution": "def win_prob(i, N, p):\n    if abs(p - 0.5) < 1e-12:\n        return i / N\n    r = (1 - p) / p\n    return (1 - r ** i) / (1 - r ** N)\n\ndef expected_duration(i, N, p):\n    if abs(p - 0.5) < 1e-12:\n        return i * (N - i)\n    q = 1 - p\n    r = q / p\n    return i / (q - p) - (N / (q - p)) * (1 - r ** i) / (1 - r ** N)",
  "hints": [
    "Handle the fair case separately; the biased formulas divide by $1 - r^N$ which is 0 at $r = 1$.",
    "At $i = 0$ the probability is 0 and the duration 0, at $i = N$ they are 1 and 0; the formulas already satisfy this."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Using numpy, implement `stationary(P)` for a row-stochastic matrix (solve $\\pi P = \\pi$ with $\\sum\\pi = 1$ by replacing one equation of $(P^\\top - I)\\pi = 0$ with the normalization) and `mean_return_times(P)` returning $1/\\pi_i$ for each state.",
  "setup": "import numpy as np",
  "starterCode": "def stationary(P):\n    pass\n\ndef mean_return_times(P):\n    pass\n",
  "tests": "P = np.array([[0.9, 0.1], [0.5, 0.5]])\npi = stationary(P)\nassert np.allclose(pi, [5 / 6, 1 / 6])\nassert np.allclose(mean_return_times(P), [1.2, 6.0])\nR = np.array([[0.0, 1.0, 0.0], [0.0, 0.0, 1.0], [0.5, 0.0, 0.5]])\nq = stationary(R)\nassert abs(q.sum() - 1) < 1e-12 and np.allclose(q @ R, q)\nassert np.allclose(q, [0.25, 0.25, 0.5])",
  "solution": "def stationary(P):\n    P = np.asarray(P, dtype=float)\n    n = P.shape[0]\n    A = P.T - np.eye(n)\n    A[-1, :] = 1.0\n    b = np.zeros(n)\n    b[-1] = 1.0\n    return np.linalg.solve(A, b)\n\ndef mean_return_times(P):\n    return 1.0 / stationary(P)",
  "packages": [
    "numpy"
  ],
  "hints": [
    "$(P^\\top - I)\\pi = 0$ has a one-dimensional solution space; replace the last row with all ones and the right-hand side with 1.",
    "Kac's formula: the expected return time to state $i$ is $1/\\pi_i$ for an irreducible chain."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Using numpy, implement `absorbing_stats(P, absorbing)` for a chain with transition matrix `P` and list of absorbing state indices. Order the remaining transient states by index, split $P$ into $Q$ (transient to transient) and $R$ (transient to absorbing), and return `(steps, B)` where `steps = N @ 1` and `B = N @ R` with fundamental matrix $N = (I - Q)^{-1}$: expected steps to absorption and absorption probabilities.",
  "setup": "import numpy as np",
  "starterCode": "def absorbing_stats(P, absorbing):\n    pass\n",
  "tests": "N_ = 4\nP = np.zeros((5, 5))\nP[0, 0] = P[4, 4] = 1.0\nfor i in range(1, 4):\n    P[i, i - 1] = 0.5\n    P[i, i + 1] = 0.5\nsteps, B = absorbing_stats(P, [0, 4])\nassert np.allclose(steps, [3, 4, 3])\nassert B.shape == (3, 2)\nassert np.allclose(B[:, 1], [0.25, 0.5, 0.75])\nassert np.allclose(B.sum(axis=1), 1)\nP2 = np.array([[0.5, 0.5, 0.0], [0.0, 0.0, 1.0], [0.0, 0.0, 1.0]])\ns2, B2 = absorbing_stats(P2, [2])\nassert np.allclose(s2, [3.0, 1.0])\nassert np.allclose(B2, [[1.0], [1.0]])",
  "solution": "def absorbing_stats(P, absorbing):\n    P = np.asarray(P, dtype=float)\n    n = P.shape[0]\n    trans = [i for i in range(n) if i not in set(absorbing)]\n    Q = P[np.ix_(trans, trans)]\n    R = P[np.ix_(trans, list(absorbing))]\n    Nf = np.linalg.inv(np.eye(len(trans)) - Q)\n    return Nf @ np.ones(len(trans)), Nf @ R",
  "packages": [
    "numpy"
  ],
  "hints": [
    "`np.ix_` slices sub-blocks of a matrix by index lists.",
    "$N_{ij}$ is the expected number of visits to transient state $j$ starting from $i$; summing a row gives the expected time to absorption."
  ]
}
```

> [!TIP] Interview tips
> - Say "first-step analysis" and write the equation with its boundary conditions before any algebra.
> - Know the closed forms ($i/N$, $i(N-i)$, $a^2$, $\pi \propto$ degree) and be able to derive one; mention that biased walks use $r = q/p$.
> - Pitfall: wrong state space (forgetting memory, e.g. pattern-matching needs the last few flips), and applying the stationary distribution to a periodic or reducible chain.
