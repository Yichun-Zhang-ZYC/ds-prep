---
id: ml-parametric-vs-non-parametric
title: Parametric vs non-parametric
estimatedMinutes: 8
difficulty: easy
tags: [ml, fundamentals, model-families]
---

## Why it matters
"Is k-NN parametric?" "Is a decision tree?" These quick questions test whether you understand how model capacity relates to data size, which drives choices about speed, memory and data needs.

## Concept
- **Parametric models** assume a fixed functional form with a fixed number of parameters, regardless of training size. Examples: linear and logistic regression, Naive Bayes, a neural net with a fixed architecture. After training, the data can be discarded.
  - Pros: fast prediction, little data needed, interpretable (often).
  - Cons: strong assumptions; high bias if the form is wrong.
- **Non-parametric models** don't fix the form; their complexity grows with the data. Examples: k-NN (stores all training points), kernel density estimation, kernel SVMs (support vectors can grow with $n$), Gaussian processes, decision trees grown without depth limits.
  - Pros: flexible, few assumptions.
  - Cons: need more data, can be slow at prediction time, more prone to overfitting without controls.

"Non-parametric" doesn't mean "no parameters": it means the number of effective parameters isn't fixed in advance. Trees and random forests are usually called non-parametric because their size grows with the data (unless depth is capped).

## Worked example
Predicting delivery time from distance with 200 samples: linear regression (2 parameters) is fine if the relationship is roughly linear. With 2 million samples and a curvy, interaction-heavy relationship, gradient-boosted trees or k-NN can capture shapes the line can't, because more data supports more capacity.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which model is non-parametric?",
  "options": ["Logistic regression", "Gaussian Naive Bayes", "k-nearest neighbors", "Linear regression with 10 features"],
  "answer": 2,
  "explanation": "k-NN keeps the whole training set; its 'model' grows with the data."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `n_params_linear(d)` returning the number of parameters of a linear regression with `d` features plus an intercept, and `n_stored_knn(n, d)` returning how many numbers a k-NN classifier stores for `n` training rows with `d` features plus one label each. Then write `grows_with_data(model)` returning True for `'knn'`, `'kde'`, `'gaussian_process'` and False for `'linear'`, `'logistic'`, `'naive_bayes'`.",
  "starterCode": "def n_params_linear(d):\n    pass\n\ndef n_stored_knn(n, d):\n    pass\n\ndef grows_with_data(model):\n    pass\n\nprint(n_params_linear(10), n_stored_knn(1000, 10), grows_with_data('knn'))",
  "tests": "assert n_params_linear(10) == 11\nassert n_stored_knn(1000, 10) == 11000\nassert n_stored_knn(2000, 10) == 2 * n_stored_knn(1000, 10)\nassert grows_with_data('knn') and grows_with_data('kde') and grows_with_data('gaussian_process')\nassert not grows_with_data('linear') and not grows_with_data('logistic') and not grows_with_data('naive_bayes')",
  "solution": "def n_params_linear(d):\n    return d + 1\n\ndef n_stored_knn(n, d):\n    return n * (d + 1)\n\ndef grows_with_data(model):\n    return model in {'knn', 'kde', 'gaussian_process'}",
  "hints": ["The linear model's size doesn't depend on n at all.", "k-NN stores every row: d features plus a label."]
}
```

> [!TIP] Interview tips
> - Define by whether model size is fixed or grows with data, not by "has parameters or not".
> - Tie it to tradeoffs: data needs, prediction latency, memory, and bias vs variance.
> - Trees are a common trick question: call them non-parametric, and note that capped depth makes their size bounded.
