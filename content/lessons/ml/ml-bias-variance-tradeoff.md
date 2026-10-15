---
id: ml-bias-variance-tradeoff
title: Bias-variance tradeoff
estimatedMinutes: 12
difficulty: medium
tags: [ml, fundamentals, generalization, theory]
---

## Why it matters
"Explain the bias-variance tradeoff" is one of the most asked ML interview questions. A good answer connects the math to practical choices: model complexity, regularization, more data, and ensembles.

## Concept
For squared error, the expected test error at a point $x$ decomposes as:

$$
E\big[(y - \hat f(x))^2\big] = \underbrace{\big(E[\hat f(x)] - f(x)\big)^2}_{\text{bias}^2} + \underbrace{\text{Var}\big(\hat f(x)\big)}_{\text{variance}} + \underbrace{\sigma^2}_{\text{irreducible noise}}
$$

The expectation is over different training sets drawn from the same distribution.

- **Bias**: error from wrong assumptions; the model is too simple to capture the pattern (a line fit to a curve). High bias → **underfitting**.
- **Variance**: error from sensitivity to the particular training sample; the model changes a lot if you retrain on new data. High variance → **overfitting**.
- **Noise**: can't be reduced by any model.

As complexity grows, bias falls and variance rises, so test error is U-shaped. Levers:

| To reduce variance | To reduce bias |
|---|---|
| More data, regularization, simpler model, bagging, feature selection, early stopping | More features, more complex model, less regularization, boosting |

## Worked example
Predicting house prices:
- Linear model on square footage only: train RMSE \$80k, validation \$82k. Both high and close → **high bias**. Add features or nonlinearity.
- Deep decision tree: train RMSE \$5k, validation \$95k. Big gap → **high variance**. Limit depth, use a random forest, or get more data.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Training error is 2% and validation error is 25%. Which action is most likely to help?",
  "options": ["Add more features", "Use a more complex model", "Add regularization or more training data", "Train longer"],
  "answer": 2,
  "explanation": "A large train/validation gap signals high variance (overfitting). Regularization and more data reduce variance."
}
```

```quiz
{
  "id": "q2",
  "question": "Why does bagging (e.g. random forest) improve over a single deep tree?",
  "options": ["It reduces bias a lot", "Averaging many high-variance, low-bias models reduces variance", "It removes irreducible noise", "It makes each tree shallower"],
  "answer": 1,
  "explanation": "Averaging decorrelated models lowers variance while keeping the low bias of deep trees."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "`predictions` is a list of predictions for the **same** test point from models trained on different samples, and `truth` is the true value f(x). Write `bias_variance(predictions, truth)` returning `(bias_squared, variance)`, where variance uses the population formula (divide by n).",
  "starterCode": "def bias_variance(predictions, truth):\n    pass\n\nprint(bias_variance([9, 11, 10, 12, 8], 12))",
  "tests": "b, v = bias_variance([9, 11, 10, 12, 8], 12)\nassert abs(b - 4.0) < 1e-9 and abs(v - 2.0) < 1e-9\nb, v = bias_variance([5, 5, 5], 5)\nassert b == 0 and v == 0\nb, v = bias_variance([0, 10], 5)\nassert abs(b) < 1e-9 and abs(v - 25) < 1e-9",
  "solution": "def bias_variance(predictions, truth):\n    n = len(predictions)\n    mean = sum(predictions) / n\n    bias_sq = (mean - truth) ** 2\n    var = sum((p - mean) ** 2 for p in predictions) / n\n    return bias_sq, var",
  "hints": ["Bias is about the average prediction vs the truth.", "Variance is about predictions vs their own average."]
}
```

> [!TIP] Interview tips
> - Diagnose from train vs validation error: both high → bias; big gap → variance.
> - Name concrete fixes for each side; that's what interviewers listen for.
> - Mention that modern over-parameterized deep nets can show "double descent", but the classic tradeoff still guides practical decisions.
