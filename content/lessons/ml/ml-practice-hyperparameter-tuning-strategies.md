---
id: ml-practice-hyperparameter-tuning-strategies
title: "Practice: Hyperparameter tuning strategies"
estimatedMinutes: 12
difficulty: medium
tags: [ml, practice, hyperparameters, tuning]
---

## Why it matters
Interviewers ask "how would you tune this model with a limited budget?" to see whether you reason about search-space design, compute and evaluation noise instead of saying "grid search". See Hyperparameter tuning for the basics; this lesson goes deeper on strategies, budgets and pitfalls.

## Concept
**Decide what to tune and on what scale.** Order by impact. For gradient-boosted trees: learning rate and number of trees (use early stopping), then depth / leaves and min child weight, then subsampling and regularization. Search rates, regularization strengths and C on a **log scale**; integers (depth) on a linear scale; do not tune what the data cannot support.

**Strategies**:
- **Grid search**: exhaustive, cost grows as $m^d$, and it wastes trials by repeating the same few values of the important parameter.
- **Random search**: with only a few influential parameters, random sampling tests many distinct values of each. If a fraction $q$ of the space is "good", $n$ random trials hit it with probability $1-(1-q)^n$; for $q = 5\%$ and 95% confidence, $n \ge \ln 0.05 / \ln 0.95 \approx 59$.
- **Bayesian optimization / TPE** (Optuna, Hyperopt): model score vs hyperparameters and sample promising regions; best when each trial is expensive and the space is low-dimensional.
- **Successive halving / Hyperband**: start many configs on a small budget (epochs, trees, data fraction), keep the top $1/\eta$, multiply the budget by $\eta$. Cheap and effective when early performance predicts final performance.
- **Early stopping** inside each trial for iterative models.

**Evaluation hygiene**:
- Tuning on the same CV score you report is **optimistically biased** (selection bias). Use a held-out test set, or **nested CV** (inner loop to tune, outer loop to estimate).
- Fold-to-fold noise can exceed differences between configs; prefer the simplest config within 1 standard error of the best.
- Fix seeds and folds across trials so comparisons are paired; respect time or group structure in the folds.
- Cap the budget, log every trial, and stop when gains are below noise.

## Worked example
Tune a GBM with 5 hyperparameters; one full training run takes 81 time units (illustrative).

- **Grid** with 3 values per parameter: $3^5 = 243$ runs, but only 3 distinct values of the learning rate were ever tried.
- **Random search** with 60 runs: each parameter gets 60 distinct values; $P(\text{at least one run in the top 5\%}) = 1 - 0.95^{60} \approx 95.4\%$.
- **Successive halving** with 81 candidates and $\eta = 3$, starting at budget 1: rung sizes 81, 27, 9, 3 evaluated at budgets 1, 3, 9, 27. Each rung costs $81 \times 1 = 27 \times 3 = 9 \times 9 = 3 \times 27 = 81$, so 324 units for the search and one survivor, versus $81 \times 81 = 6{,}561$ for training every candidate to completion: about 20x cheaper. The risk: a slow starter (heavily regularized or low learning rate) is cut early, so give the first rung a meaningful budget.

Finally refit the winner on train+validation and report one score on the untouched test set.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why does random search often beat grid search for the same budget?",
  "options": [
    "Random sampling is more accurate per trial",
    "Only a few hyperparameters matter, and random search tries many distinct values of each while a grid repeats a few",
    "Grid search cannot handle categorical values",
    "Random search needs no validation set"
  ],
  "answer": 1,
  "explanation": "With low effective dimensionality, a grid wastes trials re-testing the same values of the important parameters; random search covers each axis densely."
}
```

```quiz
{
  "id": "q2",
  "question": "You tuned 200 configs with 5-fold CV and report the best CV score as expected performance. What is wrong?",
  "options": [
    "Nothing, CV is unbiased",
    "The maximum over many noisy estimates is optimistically biased; use nested CV or an untouched test set",
    "You should have used 10 folds",
    "Best score should be the median instead"
  ],
  "answer": 1,
  "explanation": "Selecting the winner of many noisy scores inflates the reported value (winner's curse). Estimate performance on data not used for selection."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `log_uniform(lo, hi, u)` mapping `u` in [0, 1] to a log-uniformly distributed value in [lo, hi]: `lo * (hi / lo) ** u`. Then write `log_grid(lo, hi, n)` returning `n` evenly spaced values on the log scale (including both ends; `n >= 2`).",
  "starterCode": "def log_uniform(lo, hi, u):\n    pass\n\ndef log_grid(lo, hi, n):\n    pass\n\nprint(log_uniform(1e-4, 1e-1, 0.5), log_grid(1e-4, 1e-1, 4))",
  "tests": "assert abs(log_uniform(1e-4, 1e-1, 0) - 1e-4) < 1e-18\nassert abs(log_uniform(1e-4, 1e-1, 1) - 1e-1) < 1e-15\nassert abs(log_uniform(1e-4, 1e-2, 0.5) - 1e-3) < 1e-12\ng = log_grid(1e-4, 1e-1, 4)\nassert len(g) == 4\nfor a, b in zip(g, [1e-4, 1e-3, 1e-2, 1e-1]):\n    assert abs(a - b) / b < 1e-9",
  "solution": "def log_uniform(lo, hi, u):\n    return lo * (hi / lo) ** u\n\ndef log_grid(lo, hi, n):\n    return [log_uniform(lo, hi, i / (n - 1)) for i in range(n)]",
  "hints": [
    "Uniform in log space means log(x) = log(lo) + u * (log(hi) - log(lo)).",
    "A grid is just u = i / (n - 1) for i = 0..n-1."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `trials_needed(top_frac, confidence)`: the smallest integer n such that `1 - (1 - top_frac) ** n >= confidence`. Then `hit_prob(top_frac, n)` returning `1 - (1 - top_frac) ** n`.",
  "starterCode": "import math\n\ndef trials_needed(top_frac, confidence):\n    pass\n\ndef hit_prob(top_frac, n):\n    pass\n\nprint(trials_needed(0.05, 0.95), hit_prob(0.05, 60))",
  "tests": "assert trials_needed(0.05, 0.95) == 59\nassert trials_needed(0.1, 0.9) == 22\nassert trials_needed(0.5, 0.5) == 1\nassert abs(hit_prob(0.05, 60) - (1 - 0.95 ** 60)) < 1e-12\nassert hit_prob(0.05, 0) == 0",
  "solution": "import math\n\ndef trials_needed(top_frac, confidence):\n    n = math.ceil(math.log(1 - confidence) / math.log(1 - top_frac))\n    while 1 - (1 - top_frac) ** n < confidence:\n        n += 1\n    while n > 1 and 1 - (1 - top_frac) ** (n - 1) >= confidence:\n        n -= 1\n    return n\n\ndef hit_prob(top_frac, n):\n    return 1 - (1 - top_frac) ** n",
  "hints": [
    "Solve (1 - q)^n <= 1 - c: n >= log(1 - c) / log(1 - q); take the ceiling.",
    "Floating-point rounding can be off by one at exact boundaries, so verify the result with the inequality."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Write `successive_halving(configs, score_fn, min_budget, eta)`. While more than one config remains: evaluate every config with `score_fn(config, budget)`, add `budget` per evaluation to the total cost, keep the best `len(configs) // eta` (higher score is better; ties broken by earlier position), then multiply the budget by `eta`. Return `(survivor, total_cost)`.",
  "starterCode": "def successive_halving(configs, score_fn, min_budget, eta):\n    pass\n\nprint(successive_halving(list(range(9)), lambda c, b: c, 1, 3))",
  "tests": "best, cost = successive_halving(list(range(81)), lambda c, b: c, 1, 3)\nassert best == 80 and cost == 4 * 81\nbest, cost = successive_halving(list(range(9)), lambda c, b: -(c - 4) ** 2, 1, 3)\nassert best == 4 and cost == 9 * 1 + 3 * 3\nbest, cost = successive_halving(['a'], lambda c, b: 0, 1, 3)\nassert best == 'a' and cost == 0\nseen = []\nsuccessive_halving(list(range(9)), lambda c, b: seen.append(b) or c, 2, 3)\nassert seen == [2] * 9 + [6] * 3",
  "solution": "def successive_halving(configs, score_fn, min_budget, eta):\n    cur = list(configs)\n    budget = min_budget\n    cost = 0\n    while len(cur) > 1:\n        scored = []\n        for i, c in enumerate(cur):\n            scored.append((-score_fn(c, budget), i, c))\n            cost += budget\n        scored.sort(key=lambda t: (t[0], t[1]))\n        keep = max(1, len(cur) // eta)\n        cur = [c for _, _, c in scored[:keep]]\n        budget *= eta\n    return cur[0], cost",
  "hints": [
    "Each rung: score everything, sort by (-score, original position), keep the first len // eta.",
    "Cost per rung = number of configs in the rung × budget; the loop ends when one config is left."
  ]
}
```

> [!TIP] Interview tips
> - Prefer random search or Bayesian optimization over grid; justify with effective dimensionality and $1-(1-q)^n$.
> - Mention log-scale sampling, early stopping, and successive halving or Hyperband for expensive models.
> - Call out selection bias: the tuned CV score is optimistic, so use nested CV or a final held-out test.
