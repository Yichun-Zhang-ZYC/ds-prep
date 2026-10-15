---
id: ml-supervised-vs-unsupervised-vs-reinforcement-learning
title: Supervised vs unsupervised vs reinforcement learning
estimatedMinutes: 8
difficulty: easy
tags: [ml, fundamentals, problem-framing]
---

## Why it matters
"How would you frame this as an ML problem?" is the first step of almost every ML case question. Picking the right learning paradigm (and knowing what data it needs) shows you can turn a business problem into a model.

## Concept
- **Supervised learning**: learn a mapping $x \to y$ from labeled examples. **Regression** if $y$ is continuous (price, demand), **classification** if $y$ is a category (fraud / not fraud). Needs labels, which are often the expensive part.
- **Unsupervised learning**: find structure in $x$ with no labels: clustering (customer segments), dimensionality reduction (PCA), density estimation and anomaly detection.
- **Reinforcement learning (RL)**: an agent takes actions in an environment and learns a policy that maximizes cumulative reward. Feedback is delayed and depends on the agent's own actions (game playing, bidding, recommendations as sequential decisions).

In-between settings come up often:
- **Semi-supervised**: few labels plus many unlabeled examples.
- **Self-supervised**: labels created from the data itself (predict the next word, a masked patch). This is how LLMs are pre-trained.
- **Contextual bandits**: one-step RL; choose an action given context, observe reward for that action only.

## Worked example
"Reduce credit-card fraud."
- With historical chargeback labels: **supervised** binary classification.
- New fraud patterns with no labels yet: **unsupervised** anomaly detection to flag unusual transactions for review.
- Deciding when to block, challenge, or allow, while fraudsters adapt: can be framed as **sequential decision-making / bandits**.

Real systems often combine all three.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A retailer wants to group customers by purchasing behavior with no predefined segments. Which paradigm fits?",
  "options": ["Supervised classification", "Unsupervised clustering", "Reinforcement learning", "Regression"],
  "answer": 1,
  "explanation": "There's no target label; the goal is to discover structure, so it's clustering."
}
```

```quiz
{
  "id": "q2",
  "question": "What makes reinforcement learning different from supervised learning?",
  "options": ["RL uses neural networks", "RL feedback is a reward that depends on the agent's own actions and may be delayed, instead of a correct label per example", "RL never needs data", "RL only works for games"],
  "answer": 1,
  "explanation": "In RL there's no 'right answer' label per input; the agent learns from rewards produced by its actions."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `frame(has_labels, label_type, sequential)` returning `'reinforcement'` if `sequential` is True; otherwise `'regression'` if labels exist and `label_type == 'continuous'`, `'classification'` if labels exist and `label_type == 'categorical'`, and `'unsupervised'` if there are no labels.",
  "starterCode": "def frame(has_labels, label_type, sequential):\n    pass\n\nprint(frame(True, 'continuous', False))",
  "tests": "assert frame(True, 'continuous', False) == 'regression'\nassert frame(True, 'categorical', False) == 'classification'\nassert frame(False, None, False) == 'unsupervised'\nassert frame(False, None, True) == 'reinforcement'\nassert frame(True, 'categorical', True) == 'reinforcement'",
  "solution": "def frame(has_labels, label_type, sequential):\n    if sequential:\n        return 'reinforcement'\n    if not has_labels:\n        return 'unsupervised'\n    return 'regression' if label_type == 'continuous' else 'classification'",
  "hints": ["Check `sequential` first.", "Without labels, it's unsupervised regardless of label_type."]
}
```

> [!TIP] Interview tips
> - Start an ML case by stating the paradigm, the target, and where labels come from.
> - Point out label issues: delay (chargebacks arrive weeks later), noise, and selection bias (you only see outcomes for approved loans).
> - Mention that LLMs are self-supervised during pre-training; it's a common follow-up.
