---
id: ml-hyperparameter-tuning
title: Hyperparameter tuning (grid, random, Bayesian)
estimatedMinutes: 12
difficulty: medium
tags: [ml, practical, tuning, model-selection]
---

## Why it matters
Tuning can turn a mediocre model into a strong one, or waste days of compute. Interviewers ask which search strategy you'd use, why random search beats grid search, and how to avoid overfitting the validation set.

## Concept
**Hyperparameters** are set before training (learning rate, tree depth, regularization strength), unlike parameters learned from data.

Search strategies:
- **Grid search**: try every combination. Exhaustive but scales exponentially, and wastes trials on unimportant dimensions.
- **Random search**: sample configurations from distributions. With the same budget it explores more distinct values of each important hyperparameter (Bergstra & Bengio). With 60 random trials, the chance that at least one lands in the top 5% of the space is $1 - 0.95^{60} \approx 95\%$.
- **Bayesian optimization** (Gaussian processes, TPE in Optuna/Hyperopt): build a surrogate model of score vs hyperparameters and pick the next trial by an acquisition function that balances exploring and exploiting. Best when each trial is expensive.
- **Early-stopping-based**: **successive halving / Hyperband / ASHA** start many configs with small budgets and keep only the best for more training.

Good practice:
- Sample scale-type parameters **log-uniformly** (learning rate in [1e-4, 1e-1], regularization strengths).
- Tune with cross-validation or a fixed validation set; evaluate the final choice **once** on the test set (or use nested CV).
- Tune the important knobs first (learning rate + n_estimators with early stopping for boosting); defaults are often close.
- Fix seeds, log every trial, and check whether gains exceed noise between seeds.

## Worked example
A grid of 5 learning rates × 5 depths × 4 min-child-weights = 100 trials tests only 5 distinct learning rates. 100 random trials test 100 distinct learning rates and 100 depths. If learning rate matters most, random search is far more likely to find a good value.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why does random search often beat grid search with the same budget?",
  "options": ["It uses gradients", "It tries more distinct values of the important hyperparameters instead of repeating values across unimportant ones", "It always finds the global optimum", "It needs no validation data"],
  "answer": 1,
  "explanation": "Usually only a few hyperparameters matter; random search covers each of them more densely."
}
```

```quiz
{
  "id": "q2",
  "question": "How should a learning rate between 0.0001 and 0.1 be sampled?",
  "options": ["Uniformly", "Log-uniformly", "Only at 0.0001 and 0.1", "Normally around 0.05"],
  "answer": 1,
  "explanation": "Its effect is multiplicative; uniform sampling would put ~90% of trials above 0.01."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `prob_hit_top(frac, n_trials)` = 1 − (1 − frac)^n, and `trials_needed(frac, target)` returning the smallest n with prob_hit_top ≥ target. Then `log_uniform_samples(lo, hi, n, seed)` returning n samples where log10 of each value is uniform between log10(lo) and log10(hi) (use `random.Random(seed).uniform`).",
  "starterCode": "import math, random\n\ndef prob_hit_top(frac, n_trials):\n    pass\n\ndef trials_needed(frac, target):\n    pass\n\ndef log_uniform_samples(lo, hi, n, seed):\n    pass\n\nprint(prob_hit_top(0.05, 60), trials_needed(0.05, 0.95))",
  "tests": "import math\nassert abs(prob_hit_top(0.05, 60) - (1 - 0.95 ** 60)) < 1e-12\nassert trials_needed(0.05, 0.95) == 59\nassert trials_needed(0.5, 0.75) == 2\ns = log_uniform_samples(1e-4, 1e-1, 2000, 0)\nassert all(1e-4 <= v <= 1e-1 for v in s)\nbelow = sum(1 for v in s if v < 1e-2) / len(s)\nassert 0.6 < below < 0.73\nassert log_uniform_samples(1e-4, 1e-1, 5, 3) == log_uniform_samples(1e-4, 1e-1, 5, 3)",
  "solution": "import math, random\n\ndef prob_hit_top(frac, n_trials):\n    return 1 - (1 - frac) ** n_trials\n\ndef trials_needed(frac, target):\n    n = 1\n    while prob_hit_top(frac, n) < target:\n        n += 1\n    return n\n\ndef log_uniform_samples(lo, hi, n, seed):\n    rng = random.Random(seed)\n    a, b = math.log10(lo), math.log10(hi)\n    return [10 ** rng.uniform(a, b) for _ in range(n)]",
  "hints": ["Count up from n = 1 until the probability reaches the target.", "Two of the three decades lie below 0.01, so about 2/3 of log-uniform samples should be below it."]
}
```

> [!TIP] Interview tips
> - Default answer: random search (or Bayesian/Optuna) over log-scaled ranges with early stopping; grid only for 1–2 parameters.
> - Mention successive halving / Hyperband when trials are expensive.
> - Guard against validation overfitting: nested CV or a final untouched test set.
