---
id: ml-q-learning
title: Q-learning
estimatedMinutes: 12
difficulty: medium
tags: [ml, reinforcement-learning, q-learning, temporal-difference]
---

## Why it matters
Q-learning is the canonical model-free RL algorithm and the basis of DQN. Interviewers ask for the update rule, what "off-policy" means, and how it differs from SARSA.

## Concept
Learn $Q(s, a)$ directly from experience $(s, a, r, s')$ without knowing the transition model. After each step:

$$
Q(s, a) \leftarrow Q(s, a) + \alpha \Big[\, \underbrace{r + \gamma \max_{a'} Q(s', a')}_{\text{TD target}} - Q(s, a) \Big]
$$

- $\alpha$: learning rate. The bracket is the **temporal-difference (TD) error**.
- For terminal $s'$, the target is just $r$.
- Act with an exploration policy (e.g. **ε-greedy**), but the target uses the **max**, i.e. the greedy policy. So Q-learning is **off-policy**: it learns the optimal policy while following a different, exploratory one.
- **SARSA** (on-policy) uses the action actually taken next: target $= r + \gamma Q(s', a')$. It learns the value of the exploring policy and tends to be more cautious near hazards.

Converges to $Q^*$ in the tabular case if every state-action pair is visited infinitely often and $\alpha$ decays appropriately.

**Deep Q-Networks (DQN)** approximate Q with a neural net and stabilize training with **experience replay** (sample past transitions randomly to break correlations) and a **target network** (a slowly updated copy used for the TD target). Max-based targets overestimate values; Double DQN reduces this.

## Worked example
$Q(s, \text{right}) = 2$, $\alpha = 0.5$, $\gamma = 0.9$. Take "right", get $r = 1$, land in $s'$ where $\max_{a'} Q(s', a') = 4$. TD target $= 1 + 0.9 \cdot 4 = 4.6$; TD error $= 2.6$; new $Q = 2 + 0.5 \cdot 2.6 = 3.3$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why is Q-learning called off-policy?",
  "options": ["It doesn't use a policy", "Its update target uses the greedy (max) action regardless of which action the exploratory behavior policy takes next", "It only learns offline", "It requires a model of the environment"],
  "answer": 1,
  "explanation": "It learns about the greedy policy while acting with, e.g., ε-greedy exploration."
}
```

```quiz
{
  "id": "q2",
  "question": "What problem does experience replay solve in DQN?",
  "options": ["It reduces the action space", "Consecutive transitions are highly correlated; sampling randomly from a buffer decorrelates updates and reuses data", "It removes the need for rewards", "It makes Q-values exact"],
  "answer": 1,
  "explanation": "Random minibatches from a replay buffer make SGD more stable and data-efficient."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `q_update(Q, s, a, r, s_next, alpha, gamma, terminal)` that updates the nested dict `Q[s][a]` in place and returns the new value. Then train on a 1-D corridor: `train_corridor(episodes, alpha, gamma, seed)` with states 0..4, start at 0, actions 'L'/'R' (clipped at 0), reward 1 and episode end on reaching 4, else reward 0. Use ε-greedy with ε = 0.2 via `random.Random(seed)` (break greedy ties randomly) and cap episodes at 100 steps. Return Q.",
  "starterCode": "import random\n\ndef q_update(Q, s, a, r, s_next, alpha, gamma, terminal):\n    pass\n\ndef train_corridor(episodes, alpha, gamma, seed):\n    pass\n\nQ = {'s': {'right': 2.0}, 'n': {'a': 4.0, 'b': 1.0}}\nprint(q_update(Q, 's', 'right', 1, 'n', 0.5, 0.9, False))",
  "tests": "Q = {'s': {'right': 2.0}, 'n': {'a': 4.0, 'b': 1.0}}\nassert abs(q_update(Q, 's', 'right', 1, 'n', 0.5, 0.9, False) - 3.3) < 1e-12\nassert abs(Q['s']['right'] - 3.3) < 1e-12\nQ2 = {'s': {'x': 0.0}}\nassert q_update(Q2, 's', 'x', 5, None, 1.0, 0.9, True) == 5\nQ = train_corridor(300, 0.5, 0.9, 0)\nassert all(Q[s]['R'] > Q[s]['L'] for s in range(4))\nassert abs(Q[3]['R'] - 1.0) < 0.05\nassert abs(Q[2]['R'] - 0.9) < 0.05",
  "solution": "import random\n\ndef q_update(Q, s, a, r, s_next, alpha, gamma, terminal):\n    target = r if terminal else r + gamma * max(Q[s_next].values())\n    Q[s][a] += alpha * (target - Q[s][a])\n    return Q[s][a]\n\ndef train_corridor(episodes, alpha, gamma, seed):\n    rng = random.Random(seed)\n    Q = {s: {'L': 0.0, 'R': 0.0} for s in range(5)}\n    for _ in range(episodes):\n        s = 0\n        for _ in range(100):\n            if rng.random() < 0.2:\n                a = rng.choice(['L', 'R'])\n            else:\n                best = max(Q[s].values())\n                a = rng.choice([k for k, v in Q[s].items() if v == best])\n            s2 = max(0, s - 1) if a == 'L' else s + 1\n            done = s2 == 4\n            q_update(Q, s, a, 1 if done else 0, s2, alpha, gamma, done)\n            s = s2\n            if done:\n                break\n    return Q",
  "hints": ["Terminal target = r; otherwise r + γ · max Q[s'].", "Q*(3, R) = 1, Q*(2, R) = γ = 0.9, and so on down the corridor."]
}
```

> [!TIP] Interview tips
> - Write the update rule and name each part (learning rate, TD target, TD error).
> - Contrast off-policy Q-learning with on-policy SARSA.
> - For deep RL, mention experience replay, target networks, and overestimation (Double DQN).
