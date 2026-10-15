---
id: ml-boosting-adaboost-gradient-boosting
title: "Boosting: AdaBoost, Gradient Boosting"
estimatedMinutes: 15
difficulty: hard
tags: [ml, supervised, ensembles, boosting, trees]
---

## Why it matters
Gradient-boosted trees win most tabular ML problems, so "explain how gradient boosting works" is a near-certain question for DS and MLE roles. You should be able to describe residual fitting, the learning rate, and how it differs from AdaBoost and random forests.

## Concept
**Boosting** builds an additive model sequentially; each new weak learner (usually a shallow tree) focuses on what the current ensemble gets wrong:

$$
F_m(x) = F_{m-1}(x) + \eta \, h_m(x)
$$

**AdaBoost** (classification, labels ±1): after each round, **reweight** samples, increasing weights on misclassified points. A learner with weighted error $\varepsilon$ gets vote $\alpha = \tfrac{1}{2}\ln\frac{1-\varepsilon}{\varepsilon}$. Equivalent to minimizing exponential loss; sensitive to label noise and outliers.

**Gradient boosting**: fit each new tree to the **negative gradient** of the loss w.r.t. the current predictions (the "pseudo-residuals"):

$$
r_i = -\frac{\partial L(y_i, F(x_i))}{\partial F(x_i)}
$$

- Squared loss → $r_i = y_i - F(x_i)$, the ordinary residuals.
- Log loss → $r_i = y_i - p_i$.

So it's gradient descent in function space, and any differentiable loss works (Huber, quantile, ranking losses).

Key hyperparameters: **learning rate** $\eta$ (shrinkage; smaller needs more trees but generalizes better), **number of trees** (use early stopping), **tree depth** (3–8 typical; controls interaction order), **subsampling** rows/columns (stochastic gradient boosting adds variance reduction).

Unlike random forests, boosting **can overfit** as trees are added, so watch validation loss.

## Worked example
Targets $y = [3, 5, 10]$, start with $F_0 = \bar y = 6$. Residuals: $[-3, -1, 4]$. Suppose the first tree splits so that it predicts $-2$ for the first two points and $4$ for the third. With $\eta = 0.5$: $F_1 = [6 - 1, 6 - 1, 6 + 2] = [5, 5, 8]$. New residuals $[-2, 0, 2]$: squared error fell from 26 to 8.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "In gradient boosting with squared-error loss, what does each new tree fit?",
  "options": ["The original targets", "The residuals y − F(x) of the current ensemble", "Reweighted samples only", "Random noise"],
  "answer": 1,
  "explanation": "The negative gradient of squared error is the residual, so each tree corrects the remaining error."
}
```

```quiz
{
  "id": "q2",
  "question": "You halve the learning rate. What else should you typically change?",
  "options": ["Halve the number of trees", "Roughly double the number of trees (or let early stopping pick it)", "Increase tree depth a lot", "Nothing"],
  "answer": 1,
  "explanation": "Smaller steps need more of them. Lower learning rate + more trees usually generalizes better."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement gradient boosting for squared loss on one feature using **decision stumps**. `fit_stump(xs, rs)` tries midpoint thresholds and returns `(t, left_value, right_value)` minimizing squared error, where values are the mean residual on each side. `boost(xs, ys, n_rounds, lr)` starts from the mean of `ys` and returns the final training predictions as a list.",
  "starterCode": "def fit_stump(xs, rs):\n    pass\n\ndef boost(xs, ys, n_rounds, lr):\n    pass\n\nxs = [1, 2, 3, 4, 5, 6]\nys = [1.0, 1.2, 0.9, 3.0, 3.1, 2.9]\nprint([round(p, 2) for p in boost(xs, ys, 20, 0.3)])",
  "tests": "t, l, r = fit_stump([1, 2, 3, 4], [-1, -1, 1, 1])\nassert t == 2.5 and l == -1 and r == 1\nxs = [1, 2, 3, 4, 5, 6]\nys = [1.0, 1.2, 0.9, 3.0, 3.1, 2.9]\nsse = lambda p: sum((a - b) ** 2 for a, b in zip(p, ys))\np0 = boost(xs, ys, 0, 0.3)\nassert all(abs(v - sum(ys) / 6) < 1e-12 for v in p0)\np5, p50 = boost(xs, ys, 5, 0.3), boost(xs, ys, 50, 0.3)\nassert sse(p50) < sse(p5) < sse(p0)\nassert sse(p50) < 0.1",
  "solution": "def fit_stump(xs, rs):\n    vals = sorted(set(xs))\n    best = None\n    for a, b in zip(vals, vals[1:]):\n        t = (a + b) / 2\n        left = [r for x, r in zip(xs, rs) if x <= t]\n        right = [r for x, r in zip(xs, rs) if x > t]\n        lv, rv = sum(left) / len(left), sum(right) / len(right)\n        err = sum((r - lv) ** 2 for r in left) + sum((r - rv) ** 2 for r in right)\n        if best is None or err < best[0]:\n            best = (err, t, lv, rv)\n    return best[1], best[2], best[3]\n\ndef boost(xs, ys, n_rounds, lr):\n    pred = [sum(ys) / len(ys)] * len(ys)\n    for _ in range(n_rounds):\n        rs = [y - p for y, p in zip(ys, pred)]\n        t, lv, rv = fit_stump(xs, rs)\n        pred = [p + lr * (lv if x <= t else rv) for x, p in zip(xs, pred)]\n    return pred",
  "hints": ["Each round: residuals = y − pred, fit a stump to them, add lr × stump output.", "A stump's leaf value is the mean residual in that leaf."]
}
```

> [!TIP] Interview tips
> - Describe gradient boosting as "fit trees to residuals (negative gradients), add them with a small learning rate".
> - Contrast: random forest = parallel, deep trees, variance reduction; boosting = sequential, shallow trees, bias reduction, can overfit.
> - Mention early stopping, learning rate vs number of trees, and that AdaBoost is sensitive to label noise.
