---
id: ml-decision-trees
title: Decision Trees (Gini, entropy, pruning)
estimatedMinutes: 15
difficulty: medium
tags: [ml, supervised, trees, interpretability]
---

## Why it matters
Trees are the building block of random forests and gradient boosting, which dominate tabular ML. Interviewers ask how splits are chosen, Gini vs entropy, and how to stop a tree from overfitting.

## Concept
A tree recursively splits the data on one feature at a time (`x_j ≤ t`), choosing the split that makes the child nodes **purest**. Leaves predict the majority class (classification) or the mean (regression).

Impurity for class proportions $p_k$ in a node:

$$
\text{Gini} = 1 - \sum_k p_k^2 \qquad \text{Entropy} = -\sum_k p_k \log_2 p_k
$$

The split maximizes the impurity decrease (**information gain** for entropy):

$$
\Delta = I(\text{parent}) - \frac{n_L}{n} I(L) - \frac{n_R}{n} I(R)
$$

Gini and entropy almost always choose similar splits; Gini is slightly cheaper (no log). Regression trees use variance (MSE) reduction.

Controlling overfitting (a fully grown tree memorizes the data):
- **Pre-pruning**: `max_depth`, `min_samples_leaf`, `min_samples_split`, `min_impurity_decrease`.
- **Post-pruning**: grow fully, then prune back with **cost-complexity pruning** (minimize error $+ \alpha \cdot$ number of leaves), choosing $\alpha$ by CV.

Properties: handle mixed feature types, no scaling needed, capture interactions and non-linearity, easy to explain. But single trees are **high variance** (small data changes → different tree), produce step-shaped predictions, and can't extrapolate beyond the training range.

## Worked example
Parent: 10 samples, 5 positive / 5 negative → Gini = 1 − (0.25 + 0.25) = 0.5. Split A gives left (4+, 1−) and right (1+, 4−): each child Gini = 1 − (0.64 + 0.04) = 0.32. Weighted = 0.32. Gain = 0.5 − 0.32 = **0.18**. Split B gives left (5+, 3−) and right (0+, 2−): Gini 0.469 and 0, weighted = 0.8 · 0.469 = 0.375, gain = 0.125. Choose A.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What is the Gini impurity of a node with 80% class A and 20% class B?",
  "options": ["0.20", "0.32", "0.50", "0.68"],
  "answer": 1,
  "explanation": "1 − (0.8² + 0.2²) = 1 − 0.68 = 0.32."
}
```

```quiz
{
  "id": "q2",
  "question": "A deep decision tree gets 100% training accuracy and 70% validation accuracy. Which fix is most direct?",
  "options": ["Scale the features", "Limit depth / increase min_samples_leaf, or prune", "Switch from Gini to entropy", "Add more features"],
  "answer": 1,
  "explanation": "The tree is memorizing. Constrain its size or prune it; or move to an ensemble like a random forest."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `gini(labels)`, and `best_split(xs, labels)` for a single numeric feature: try thresholds halfway between consecutive distinct sorted values, split into `x <= t` and `x > t`, and return `(threshold, gain)` with the largest weighted Gini decrease (first one wins ties).",
  "starterCode": "from collections import Counter\n\ndef gini(labels):\n    pass\n\ndef best_split(xs, labels):\n    pass\n\nprint(gini(['a', 'a', 'b', 'b']), best_split([1, 2, 3, 4, 5, 6], [0, 0, 0, 1, 1, 1]))",
  "tests": "assert abs(gini(['a', 'a', 'b', 'b']) - 0.5) < 1e-12\nassert gini(['a', 'a']) == 0\nt, g = best_split([1, 2, 3, 4, 5, 6], [0, 0, 0, 1, 1, 1])\nassert t == 3.5 and abs(g - 0.5) < 1e-12\nt, g = best_split([3, 1, 2, 10], [1, 0, 0, 1])\nassert t == 2.5 and abs(g - 0.5) < 1e-12\nt, g = best_split([1, 2, 3, 4], [0, 1, 0, 1])\nassert t == 1.5 and abs(g - (0.5 - 0.75 * (1 - (1/3) ** 2 - (2/3) ** 2))) < 1e-12",
  "solution": "from collections import Counter\n\ndef gini(labels):\n    n = len(labels)\n    return 1 - sum((c / n) ** 2 for c in Counter(labels).values())\n\ndef best_split(xs, labels):\n    n = len(xs)\n    parent = gini(labels)\n    vals = sorted(set(xs))\n    best_t, best_g = None, -1\n    for a, b in zip(vals, vals[1:]):\n        t = (a + b) / 2\n        left = [l for x, l in zip(xs, labels) if x <= t]\n        right = [l for x, l in zip(xs, labels) if x > t]\n        g = parent - len(left) / n * gini(left) - len(right) / n * gini(right)\n        if g > best_g:\n            best_t, best_g = t, g\n    return best_t, best_g",
  "hints": ["Candidate thresholds are midpoints between consecutive distinct values.", "Use strict > to keep the first threshold on ties."]
}
```

> [!TIP] Interview tips
> - Compute a Gini split by hand quickly; it's a common warm-up.
> - Say "Gini vs entropy rarely matters"; spend your time on depth limits and pruning.
> - Single trees are interpretable but high-variance; that motivates random forests and boosting.
