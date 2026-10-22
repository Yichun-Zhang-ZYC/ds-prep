---
id: recsys-multi-objective-ranking
title: "Multi-objective ranking"
estimatedMinutes: 12
difficulty: medium
tags: [recsys, ranking, multi-task, pareto]
---

## Why it matters
Production rankers never optimize one number. A feed balances clicks, watch time, likes, hides and creator fairness; a marketplace balances conversion, margin and seller health. Interviewers ask how you combine objectives, who sets the weights, and how you avoid optimizing clickbait.

## Concept
**Typical design** (pointwise multi-task ranker; see Learning to rank and Candidate generation, ranking, re-ranking):
- A shared trunk with one **head per outcome** (click, like, share, watch-time bucket, hide, report). Architectures: shared-bottom, or **MMoE/PLE** (mixture of experts with per-task gates) to reduce negative transfer between tasks.
- **Calibrate** each head so outputs are real probabilities, then combine: $\text{score} = \sum_k w_k\, \hat p_k$ (expected value), with negative weights for bad outcomes. Variants: the product $\prod_k \hat p_k^{w_k}$ (rewards balance across heads), or a weighted sum of logs.
- **Constraints over trade-offs**: maximize the primary metric subject to guardrails (hide rate $\le c$). A Lagrangian turns the constraint into a weight $\lambda$ you tune.

**Setting weights**: start from business value (a like is worth $x$ clicks), then tune **online** with A/B tests or Bayesian optimization over a weight grid. Results trace a **Pareto front**: no variant improves one metric without hurting another, so a decision rule must be agreed up front.

**Pitfalls**:
- Optimizing short-term proxies (clicks, watch time) can hurt retention; add long-term value, survey, or delayed-reward heads.
- Weights couple to calibration: retraining one head shifts the blend. Re-fit calibrators and monitor score distributions.
- Heads trained on different sample spaces (impressions vs clicked-only, as in ESMM for conversion) are not comparable without correction.
- Re-ranking handles non-additive goals (diversity, creator fairness, freshness quotas) that a per-item score cannot.

## Worked example
Head outputs (illustrative) with weights click $=1$, like $=5$, hide $=-20$:

| Item | click | like | hide | score |
|---|---|---|---|---|
| X | 0.20 | 0.05 | 0.01 | $0.20 + 0.25 - 0.20 = 0.25$ |
| Y | 0.12 | 0.10 | 0.005 | $0.12 + 0.50 - 0.10 = 0.52$ |
| Z | 0.30 | 0.01 | 0.05 | $0.30 + 0.05 - 1.00 = -0.65$ |

Blended rank: Y, X, Z. A click-only ranker gives Z, X, Y, exactly reversed: Z is the clickbait item with a 5% hide rate. Doubling the hide weight to $-40$ gives scores $0.05$, $0.42$, $-1.65$, the same order, so this ranking is robust to that choice. Weights matter most where items score close together, and they are policy, not math: set them with an experiment and a stated guardrail.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why is a weighted sum of calibrated head probabilities usually preferred to combining raw logits or scores from different heads?",
  "options": [
    "It is differentiable",
    "Calibrated probabilities share a scale and have a meaning (expected value), so weights express business trade-offs",
    "It always gives the Pareto optimum",
    "It removes position bias"
  ],
  "answer": 1,
  "explanation": "Uncalibrated scores from different heads live on different scales, so a weight has no stable meaning and drifts whenever one head is retrained. Calibrated probabilities make the blend an expected-value computation."
}
```

```quiz
{
  "id": "q2",
  "question": "Two ranking variants: A has higher CTR but lower 7-day retention; B is the reverse. Neither dominates. What is the best next step?",
  "options": [
    "Ship A, since CTR is measured faster",
    "Pick by a pre-agreed decision rule: the north-star metric with guardrails, or a weight tuned against long-term value",
    "Average the two metrics",
    "Rerun the test until A wins"
  ],
  "answer": 1,
  "explanation": "Points on the Pareto front need an explicit preference. Decide the objective and guardrails before the test (retention or long-term value as the north star, CTR and hides as guardrails) rather than choosing after seeing results."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `blend_rank(items, weights, k)`. `items` maps item id -> dict of predicted probabilities (for example `{'click': .2, 'like': .05, 'hide': .01}`); `weights` maps head name -> weight (negative for bad outcomes). Score = sum of `weights[h] * p[h]`. Return the top-`k` ids by score descending, ties broken by id ascending.",
  "starterCode": "def blend_rank(items, weights, k):\n    pass\n\nitems = {'X': {'click': .20, 'like': .05, 'hide': .01}, 'Y': {'click': .12, 'like': .10, 'hide': .005}, 'Z': {'click': .30, 'like': .01, 'hide': .05}}\nprint(blend_rank(items, {'click': 1, 'like': 5, 'hide': -20}, 3))",
  "tests": "items = {'X': {'click': .20, 'like': .05, 'hide': .01}, 'Y': {'click': .12, 'like': .10, 'hide': .005}, 'Z': {'click': .30, 'like': .01, 'hide': .05}}\nassert blend_rank(items, {'click': 1, 'like': 5, 'hide': -20}, 3) == ['Y', 'X', 'Z']\nassert blend_rank(items, {'click': 1}, 3) == ['Z', 'X', 'Y']\nassert blend_rank(items, {'click': 1, 'like': 5, 'hide': -20}, 1) == ['Y']\nassert blend_rank({'b': {'c': 1}, 'a': {'c': 1}}, {'c': 1}, 2) == ['a', 'b']",
  "solution": "def blend_rank(items, weights, k):\n    def score(i):\n        return sum(w * items[i].get(h, 0.0) for h, w in weights.items())\n    return sorted(items, key=lambda i: (-score(i), i))[:k]",
  "hints": [
    "Sort with a key tuple (-score, id).",
    "Heads missing from an item's dict simply do not contribute."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `pareto_front(points)`. Each point is a tuple of objective values to maximize. Point `p` is dominated if another point is >= on every objective and > on at least one. Return the sorted list of indices of non-dominated points (identical points are all kept).",
  "starterCode": "def pareto_front(points):\n    pass\n\nprint(pareto_front([(1, 5), (2, 4), (2, 2), (3, 1), (1, 1)]))",
  "tests": "assert pareto_front([(1, 5), (2, 4), (2, 2), (3, 1), (1, 1)]) == [0, 1, 3]\nassert pareto_front([(1, 1), (1, 1)]) == [0, 1]\nassert pareto_front([(1, 2, 3)]) == [0]\nassert pareto_front([(1, 2), (2, 3)]) == [1]",
  "solution": "def pareto_front(points):\n    def dom(a, b):\n        return all(x >= y for x, y in zip(a, b)) and any(x > y for x, y in zip(a, b))\n    return [i for i, p in enumerate(points) if not any(dom(q, p) for j, q in enumerate(points) if j != i)]",
  "hints": [
    "Write a helper dominates(a, b) first.",
    "Equal points do not dominate each other because no objective is strictly greater."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Weight search under a guardrail. `items` maps id -> `(p_click, p_like, p_hide)`. For each candidate weight `w` in `ws`, rank by `p_click + w * p_like` (ties by id), take the top `k`, and compute the mean like and mean hide of that list. Write `pick_weight(items, ws, k, max_hide)` returning the feasible `w` (mean hide <= `max_hide`) with the highest mean like; ties go to the smaller `w`. Return `None` if none is feasible.",
  "starterCode": "def pick_weight(items, ws, k, max_hide):\n    pass\n\nitems = {'a': (0.30, 0.01, 0.040), 'b': (0.25, 0.03, 0.020), 'c': (0.20, 0.06, 0.010), 'd': (0.10, 0.09, 0.005), 'e': (0.05, 0.12, 0.004)}\nprint(pick_weight(items, [0, 1, 2, 4, 8], 2, 0.026))",
  "tests": "items = {'a': (0.30, 0.01, 0.040), 'b': (0.25, 0.03, 0.020), 'c': (0.20, 0.06, 0.010), 'd': (0.10, 0.09, 0.005), 'e': (0.05, 0.12, 0.004)}\nassert pick_weight(items, [0, 1, 2, 4, 8], 2, 0.026) == 4\nassert pick_weight(items, [0, 1, 2], 2, 0.026) == 2\nassert pick_weight(items, [0, 1], 2, 0.026) is None\nassert pick_weight(items, [0, 1], 2, 0.031) == 0",
  "solution": "def pick_weight(items, ws, k, max_hide):\n    best = None\n    best_like = -1.0\n    for w in sorted(ws):\n        top = sorted(items, key=lambda i: (-(items[i][0] + w * items[i][1]), i))[:k]\n        like = sum(items[i][1] for i in top) / k\n        hide = sum(items[i][2] for i in top) / k\n        if hide <= max_hide + 1e-12 and like > best_like + 1e-12:\n            best, best_like = w, like\n    return best",
  "hints": [
    "Iterate weights in ascending order and only replace the best when strictly better, so ties keep the smaller w.",
    "Use a tiny tolerance when comparing floats."
  ]
}
```

> [!TIP] Interview tips
> - Say "calibrated head per outcome, expected-value blend, weights tuned online under guardrails".
> - Raise Pareto fronts and decide the launch rule before the experiment.
> - Mention MMoE for negative transfer and long-term value to avoid clickbait.
