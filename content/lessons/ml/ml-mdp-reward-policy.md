---
id: ml-mdp-reward-policy
title: MDP, reward, policy
estimatedMinutes: 12
difficulty: medium
tags: [ml, reinforcement-learning, mdp, theory]
---

## Why it matters
RL questions in DS/ML interviews usually start with the vocabulary: states, actions, rewards, policies, value functions and the Bellman equation. RL ideas also underpin RLHF for LLMs and sequential recommendation.

## Concept
A **Markov Decision Process (MDP)** is $(S, A, P, R, \gamma)$:
- states $S$, actions $A$,
- transition probabilities $P(s' \mid s, a)$,
- reward $R(s, a)$ (or $R(s, a, s')$),
- discount factor $\gamma \in [0, 1)$.

**Markov property**: the next state depends only on the current state and action, not the full history.

A **policy** $\pi(a \mid s)$ maps states to (probabilities over) actions. The agent maximizes the expected **return** $G_t = \sum_{k \ge 0} \gamma^k r_{t+k+1}$. Smaller $\gamma$ → more short-sighted.

Value functions:
- $V^\pi(s)$: expected return starting in $s$ and following $\pi$.
- $Q^\pi(s, a)$: expected return after taking $a$ in $s$, then following $\pi$.

**Bellman optimality equation**:

$$
V^*(s) = \max_a \Big[ R(s, a) + \gamma \sum_{s'} P(s' \mid s, a)\, V^*(s') \Big]
$$

When $P$ and $R$ are known, solve with dynamic programming: **value iteration** (repeat the Bellman update until convergence) or **policy iteration** (evaluate a policy, then improve it greedily). When they're unknown, learn from experience (Q-learning, policy gradients).

Reward design matters: agents optimize exactly what you reward, so proxy rewards (clicks) can lead to unwanted behavior (clickbait), a problem known as reward hacking.

## Worked example
Two states, one action each: from A you get reward 1 and move to B; from B you get reward 2 and stay in B. With $\gamma = 0.9$: $V(B) = 2 + 0.9 V(B) \Rightarrow V(B) = 20$. $V(A) = 1 + 0.9 \cdot 20 = 19$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What does the discount factor γ control?",
  "options": ["The learning rate", "How much future rewards count relative to immediate ones", "The number of actions", "The exploration rate"],
  "answer": 1,
  "explanation": "γ near 0 makes the agent myopic; γ near 1 makes it value long-term rewards."
}
```

```quiz
{
  "id": "q2",
  "question": "What's the difference between V(s) and Q(s, a)?",
  "options": ["They're identical", "V is the value of a state under a policy; Q is the value of taking a specific action in that state and then following the policy", "Q only applies to continuous actions", "V includes the discount, Q doesn't"],
  "answer": 1,
  "explanation": "V^π(s) = Σ_a π(a|s) Q^π(s, a)."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement value iteration. `P[s][a]` is a list of `(prob, next_state, reward)` tuples. Write `value_iteration(P, gamma, tol=1e-9)` returning a dict of state values, and `greedy_policy(P, V, gamma)` returning a dict state → best action (ties: first action in iteration order).",
  "starterCode": "def value_iteration(P, gamma, tol=1e-9):\n    pass\n\ndef greedy_policy(P, V, gamma):\n    pass\n\nP = {\n    'A': {'go': [(1.0, 'B', 1)]},\n    'B': {'stay': [(1.0, 'B', 2)]},\n}\nprint(value_iteration(P, 0.9))",
  "tests": "P = {'A': {'go': [(1.0, 'B', 1)]}, 'B': {'stay': [(1.0, 'B', 2)]}}\nV = value_iteration(P, 0.9)\nassert abs(V['B'] - 20) < 1e-6 and abs(V['A'] - 19) < 1e-6\nP2 = {\n    'S': {'safe': [(1.0, 'S', 1)], 'risky': [(0.5, 'S', 4), (0.5, 'END', 0)]},\n    'END': {'none': [(1.0, 'END', 0)]},\n}\nV2 = value_iteration(P2, 0.5)\nassert abs(V2['S'] - 8 / 3) < 1e-6\npi = greedy_policy(P2, V2, 0.5)\nassert pi['S'] == 'risky'\nV3 = value_iteration(P2, 0.9)\nassert greedy_policy(P2, V3, 0.9)['S'] == 'safe'",
  "solution": "def _q(P, V, gamma, s, a):\n    return sum(p * (r + gamma * V[s2]) for p, s2, r in P[s][a])\n\ndef value_iteration(P, gamma, tol=1e-9):\n    V = {s: 0.0 for s in P}\n    while True:\n        delta = 0.0\n        for s in P:\n            best = max(_q(P, V, gamma, s, a) for a in P[s])\n            delta = max(delta, abs(best - V[s]))\n            V[s] = best\n        if delta < tol:\n            return V\n\ndef greedy_policy(P, V, gamma):\n    pi = {}\n    for s in P:\n        best_a, best_q = None, None\n        for a in P[s]:\n            q = _q(P, V, gamma, s, a)\n            if best_q is None or q > best_q + 1e-12:\n                best_a, best_q = a, q\n        pi[s] = best_a\n    return pi",
  "hints": ["Q(s, a) = Σ prob · (reward + γ · V[next]).", "Repeat V[s] = max_a Q(s, a) until the largest change is below tol."]
}
```

> [!TIP] Interview tips
> - Define the MDP tuple and the Markov property crisply.
> - Write the Bellman equation for V* or Q*; it's the most common RL whiteboard item.
> - Mention reward hacking and how product rewards (clicks vs long-term satisfaction) shape behavior.
