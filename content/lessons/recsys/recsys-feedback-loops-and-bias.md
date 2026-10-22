---
id: recsys-feedback-loops-and-bias
title: "Feedback loops, popularity and position bias"
estimatedMinutes: 12
difficulty: medium
tags: [recsys, bias, feedback-loops, ips, position-bias]
---

## Why it matters
Recommenders train on data their own past decisions produced. Interviewers ask why a model with strong offline metrics can still narrow the catalog, entrench popular items and bury new ones, and what you would do about it. Expect to explain position bias, exposure bias and counterfactual fixes concretely.

## Concept
**Biases in logged feedback** (basics in Evaluation: offline vs online and Learning to rank):
- **Position bias**: users click top slots more regardless of relevance. Under the examination hypothesis $P(\text{click}) = P(\text{examined at slot } k)\cdot P(\text{relevant})$, so raw CTR confounds the two.
- **Exposure/selection bias**: only shown items get feedback. Unshown items are *missing not at random*, not negatives.
- **Popularity bias**: popular items collect more interactions, score higher, are shown more, and collect still more.

**Feedback loop**: the model's recommendations shape its next training set. Effects: rich-get-richer exposure, shrinking diversity (filter bubble), and a model that learns to imitate its own past policy. New items never get the data needed to escape (see Cold start).

**Mitigations**:
- **Randomized exploration**: reserve 1 to 5% of traffic for epsilon-greedy, Thompson or random slots, and log the **propensity** (probability the item was shown in that slot).
- **Inverse propensity scoring (IPS)**: weight each logged example by $1/p$ so the data mimics a uniform policy. Variance is high, so **clip** weights to $\min(w, M)$, or use self-normalized IPS (SNIPS) or doubly robust estimators.
- **Position debiasing**: train with position as a feature and set it to a constant at serving; or add a separate bias tower; or IPW with examination probabilities estimated from result-swap experiments.
- **Popularity**: logQ correction for in-batch sampled softmax, reweight popular items, re-rank for diversity and coverage, add exploration bonuses.
- **Monitor** catalog coverage, the Gini index of exposure and head/tail share over time, not only CTR.

## Worked example
Assume (illustrative) examination probabilities $\theta = (1.0, 0.5, 0.25)$ for slots 1 to 3. Item A is always shown in slot 1: 1,000 impressions, 100 clicks, raw CTR 0.10. Item B is shown in slot 3: 1,000 impressions, 50 clicks, raw CTR 0.05.

A naive model ranks A above B. IPS-adjusted relevance: A $= 0.10/1.0 = 0.10$, B $= 0.05/0.25 = 0.20$. B is twice as relevant but is buried by its slot. Retrain on raw clicks and B gets even fewer impressions next cycle: the loop locks the mistake in. The cheap fix is to randomize B's slot for a small traffic slice so examination can be separated from relevance, then train with IPW or a position feature.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A ranker is trained with position as an input feature. What do you do with that feature at serving time?",
  "options": [
    "Use the real slot the item will occupy",
    "Set it to a constant default (for example the top slot) for every candidate",
    "Drop the whole model",
    "Use the item's popularity rank"
  ],
  "answer": 1,
  "explanation": "The feature lets the model absorb the position effect during training. At serving every candidate must be scored as if shown in the same slot, otherwise the score is circular (it would depend on where you place the item)."
}
```

```quiz
{
  "id": "q2",
  "question": "Why clip or self-normalize IPS weights?",
  "options": [
    "IPS is biased upward otherwise",
    "Items with tiny logging propensity get huge weights, making the estimate very high variance",
    "To make propensities sum to 1",
    "To remove position bias"
  ],
  "answer": 1,
  "explanation": "A weight of $1/p$ with $p = 0.001$ lets a single click dominate the estimate. Clipping (or SNIPS) accepts a little bias for a large variance reduction."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `debiased_ctr(logs, exam, clip=0.0)`. `logs` is a list of `(item, position, click)` rows; `exam[position]` is the probability the user examines that position. For each item return the inverse-propensity estimate `sum(click / max(exam[pos], clip)) / n_impressions`. Return a dict item -> estimate.",
  "starterCode": "def debiased_ctr(logs, exam, clip=0.0):\n    pass\n\nlogs = [('A', 1, 1), ('A', 1, 0), ('B', 3, 1), ('B', 3, 0), ('B', 3, 0), ('B', 3, 0)]\nprint(debiased_ctr(logs, {1: 1.0, 3: 0.25}))",
  "tests": "logs = [('A', 1, 1), ('A', 1, 0), ('B', 3, 1), ('B', 3, 0), ('B', 3, 0), ('B', 3, 0)]\nexam = {1: 1.0, 3: 0.25}\nr = debiased_ctr(logs, exam)\nassert abs(r['A'] - 0.5) < 1e-12 and abs(r['B'] - 1.0) < 1e-12\nr = debiased_ctr(logs, exam, clip=0.5)\nassert abs(r['A'] - 0.5) < 1e-12 and abs(r['B'] - 0.5) < 1e-12\nassert set(debiased_ctr([], exam)) == set()",
  "solution": "def debiased_ctr(logs, exam, clip=0.0):\n    tot, n = {}, {}\n    for item, pos, click in logs:\n        tot[item] = tot.get(item, 0.0) + click / max(exam[pos], clip)\n        n[item] = n.get(item, 0) + 1\n    return {i: tot[i] / n[i] for i in tot}",
  "hints": [
    "Accumulate a weighted click sum and an impression count per item.",
    "Clipping the examination probability from below caps the weight 1/exam, trading bias for variance."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Popularity-bias metrics. Write `gini(counts)` = sum over all ordered pairs of |x_i - x_j| divided by `2 * n^2 * mean(x)` (0 = perfectly even exposure, near 1 = concentrated; return 0.0 if the total is 0), and `catalog_coverage(recs, n_items)` = number of distinct items across all recommendation lists divided by `n_items`.",
  "starterCode": "def gini(counts):\n    pass\n\ndef catalog_coverage(recs, n_items):\n    pass\n\nprint(gini([0, 0, 0, 4]), catalog_coverage([[1, 2], [2, 3]], 10))",
  "tests": "assert gini([1, 1, 1, 1]) == 0\nassert abs(gini([0, 0, 0, 4]) - 0.75) < 1e-12\nassert abs(gini([1, 2, 3]) - 2 / 9) < 1e-12\nassert gini([0, 0]) == 0.0\nassert abs(catalog_coverage([[1, 2], [2, 3]], 10) - 0.3) < 1e-12\nassert catalog_coverage([], 5) == 0",
  "solution": "def gini(counts):\n    n = len(counts)\n    total = sum(counts)\n    if n == 0 or total == 0:\n        return 0.0\n    diff = sum(abs(a - b) for a in counts for b in counts)\n    return diff / (2 * n * total)\n\ndef catalog_coverage(recs, n_items):\n    seen = set()\n    for r in recs:\n        seen.update(r)\n    return len(seen) / n_items",
  "hints": [
    "n^2 * mean = n * total, so the denominator is 2 * n * total.",
    "Check: for [1, 2, 3] the ordered-pair differences sum to 8 and the denominator is 2 * 3 * 6 = 36, giving 2/9."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Off-policy evaluation. `logs` is a list of `(action, reward, logging_prob)`; `target` maps action -> probability under the new policy. Write `ope(logs, target, cap=None)` returning `(ips, snips)`. Weight `w = target[a] / logging_prob`, capped at `cap` if given. `ips = mean(w * reward)`; `snips = sum(w * reward) / sum(w)`.",
  "starterCode": "def ope(logs, target, cap=None):\n    pass\n\nlogs = [('a', 1, 0.5), ('b', 0, 0.25), ('a', 0, 0.5), ('b', 1, 0.25)]\nprint(ope(logs, {'a': 0.2, 'b': 0.8}))",
  "tests": "logs = [('a', 1, 0.5), ('b', 0, 0.25), ('a', 0, 0.5), ('b', 1, 0.25)]\nt = {'a': 0.2, 'b': 0.8}\nips, sn = ope(logs, t)\nassert abs(ips - 0.9) < 1e-12 and abs(sn - 0.5) < 1e-12\nips, sn = ope(logs, t, cap=2)\nassert abs(ips - 0.6) < 1e-12 and abs(sn - 0.5) < 1e-12",
  "solution": "def ope(logs, target, cap=None):\n    num = den = 0.0\n    for a, r, p in logs:\n        w = target.get(a, 0.0) / p\n        if cap is not None:\n            w = min(w, cap)\n        num += w * r\n        den += w\n    return num / len(logs), num / den",
  "hints": [
    "IPS divides by the number of logged rows; SNIPS divides by the sum of weights.",
    "SNIPS is biased but has much lower variance, and stays within the reward range."
  ]
}
```

> [!TIP] Interview tips
> - Name the loop explicitly (model → exposure → data → model) and say where you break it: exploration traffic with logged propensities.
> - Separate position bias (fix with position feature or IPW) from popularity bias (fix with sampling correction, re-ranking, exploration).
> - Mention IPS variance and clipping/SNIPS; never claim IPS is free.
