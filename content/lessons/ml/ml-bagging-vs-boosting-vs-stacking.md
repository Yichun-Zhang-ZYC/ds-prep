---
id: ml-bagging-vs-boosting-vs-stacking
title: Bagging vs boosting vs stacking
estimatedMinutes: 10
difficulty: medium
tags: [ml, supervised, ensembles]
---

## Why it matters
"Compare bagging, boosting and stacking" is a standard comparison question. A crisp answer shows you understand which error each method attacks and how to build ensembles without leakage.

## Concept

| | Bagging | Boosting | Stacking |
|---|---|---|---|
| How models are trained | In parallel on bootstrap samples | Sequentially, each fixing the previous errors | Diverse base models, then a meta-model on their predictions |
| Base learners | Low-bias, high-variance (deep trees) | High-bias, weak (shallow trees) | Any, ideally different families |
| Mainly reduces | Variance | Bias (and some variance) | Both, by combining different strengths |
| Overfitting risk | Low; more models don't hurt | Can overfit with too many rounds | Meta-model can overfit if trained on in-sample predictions |
| Example | Random forest | AdaBoost, XGBoost | Kaggle blends: GBM + NN + linear → logistic regression |

**Stacking done right**: train the meta-model on **out-of-fold** predictions. For each fold, fit base models on the other folds and predict on this fold; the meta-model learns from these honest predictions. Using in-sample predictions leaks, because base models look better on data they trained on.

Simpler variants: **voting / averaging** (hard or soft vote), **weighted blending** on a holdout set.

Ensembles help most when base models are **accurate and diverse** (low error correlation). Costs: latency, complexity, harder to explain and maintain.

## Worked example
Three classifiers each 70% accurate with independent errors. Majority vote is right when at least 2 of 3 are right: $3(0.7^2)(0.3) + 0.7^3 = 0.441 + 0.343 = 0.784$. With perfectly correlated errors, the vote stays at 70%. Diversity is the source of the gain.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why must a stacking meta-model be trained on out-of-fold predictions?",
  "options": ["To save compute", "In-sample base predictions are overly optimistic, so the meta-model would learn to trust overfit models", "Meta-models can't use the full training set", "To make the base models independent"],
  "answer": 1,
  "explanation": "Out-of-fold predictions mimic how base models behave on unseen data."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `majority_vote_accuracy(p, m)`: the probability that a majority of `m` (odd) independent classifiers, each correct with probability `p`, is correct. Then write `soft_vote(prob_lists)`: given a list of models' predicted probability lists (same length), return the averaged probabilities.",
  "starterCode": "from math import comb\n\ndef majority_vote_accuracy(p, m):\n    pass\n\ndef soft_vote(prob_lists):\n    pass\n\nprint(majority_vote_accuracy(0.7, 3), soft_vote([[0.9, 0.2], [0.6, 0.4], [0.3, 0.3]]))",
  "tests": "assert abs(majority_vote_accuracy(0.7, 3) - 0.784) < 1e-12\nassert abs(majority_vote_accuracy(0.7, 1) - 0.7) < 1e-12\nassert majority_vote_accuracy(0.7, 25) > 0.95\nassert majority_vote_accuracy(0.4, 25) < 0.4\nsv = soft_vote([[0.9, 0.2], [0.6, 0.4], [0.3, 0.3]])\nassert all(abs(a - b) < 1e-12 for a, b in zip(sv, [0.6, 0.3]))",
  "solution": "from math import comb\n\ndef majority_vote_accuracy(p, m):\n    need = m // 2 + 1\n    return sum(comb(m, k) * p ** k * (1 - p) ** (m - k) for k in range(need, m + 1))\n\ndef soft_vote(prob_lists):\n    n = len(prob_lists)\n    return [sum(col) / n for col in zip(*prob_lists)]",
  "hints": ["Sum binomial probabilities for k = m//2 + 1 … m correct votes.", "If p < 0.5, more voters make things worse."]
}
```

> [!TIP] Interview tips
> - One line each: bagging → variance, boosting → bias, stacking → learn how to combine diverse models.
> - Always mention out-of-fold predictions for stacking.
> - Bring up production cost: an ensemble of 5 models may not be worth 0.3% AUC.
