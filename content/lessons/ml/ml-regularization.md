---
id: ml-regularization
title: Regularization (L1, L2, Elastic Net)
estimatedMinutes: 14
difficulty: medium
tags: [ml, fundamentals, regularization, linear-models]
---

## Why it matters
"What's the difference between L1 and L2?" and "why does L1 give sparse solutions?" are interview staples. Regularization is the main tool for controlling overfitting in linear models and neural nets.

## Concept
Add a penalty on the size of the weights to the loss:

$$
\text{Ridge (L2): } \min_w \sum_i (y_i - x_i^\top w)^2 + \lambda \lVert w \rVert_2^2
\qquad
\text{Lasso (L1): } \min_w \sum_i (y_i - x_i^\top w)^2 + \lambda \lVert w \rVert_1
$$

- **L2 (ridge)** shrinks all weights smoothly toward 0, rarely exactly 0. Handles correlated features well (spreads weight among them). Has a closed form: $w = (X^\top X + \lambda I)^{-1} X^\top y$.
- **L1 (lasso)** drives some weights **exactly to 0**: built-in feature selection. With correlated features it tends to pick one arbitrarily.
- **Elastic Net** mixes both: $\lambda\big(\alpha \lVert w \rVert_1 + (1-\alpha) \lVert w \rVert_2^2\big)$. Sparse like lasso, stable with correlated groups like ridge.

Why L1 is sparse: geometrically, the L1 constraint region is a diamond with corners on the axes, and the loss contours usually touch it at a corner, where some coordinates are 0. In gradient terms, the L1 penalty pushes with constant force no matter how small the weight is, while the L2 push shrinks as the weight shrinks.

Practical notes: **standardize features** first (the penalty depends on scale), don't penalize the intercept, and pick $\lambda$ by cross-validation. Larger $\lambda$ → more bias, less variance. Bayesian view: L2 = Gaussian prior on weights, L1 = Laplace prior.

## Worked example
One feature, no intercept, $X = [1, 2, 3]$, $y = [1, 2, 3]$. OLS gives $w = 14/14 = 1$. Ridge with $\lambda = 14$: $w = 14 / (14 + 14) = 0.5$. The penalty halves the weight.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You have 10,000 features and believe only a few matter. Which regularizer fits best?",
  "options": ["L2 (ridge)", "L1 (lasso) or Elastic Net", "No regularization", "Dropout"],
  "answer": 1,
  "explanation": "L1 zeroes out irrelevant weights, giving a sparse, interpretable model. Elastic Net helps if features come in correlated groups."
}
```

```quiz
{
  "id": "q2",
  "question": "Why must features be standardized before ridge or lasso?",
  "options": ["To speed up training only", "The penalty treats all weights equally, so features on large scales get unfairly small penalties relative to their effect", "To remove outliers", "Because regularization only works on binary features"],
  "answer": 1,
  "explanation": "A feature in dollars vs thousands of dollars would get very different weights and thus different penalties. Standardizing makes the penalty fair."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Using numpy, write `ridge(X, y, lam)` returning the ridge weights $(X^\\top X + \\lambda I)^{-1} X^\\top y$ (no intercept). Use `np.linalg.solve` instead of inverting the matrix.",
  "setup": "import numpy as np",
  "packages": ["numpy"],
  "starterCode": "import numpy as np\n\ndef ridge(X, y, lam):\n    pass\n\nX = np.array([[1.0], [2.0], [3.0]])\ny = np.array([1.0, 2.0, 3.0])\nprint(ridge(X, y, 0), ridge(X, y, 14))",
  "tests": "X = np.array([[1.0], [2.0], [3.0]])\ny = np.array([1.0, 2.0, 3.0])\nassert np.allclose(ridge(X, y, 0), [1.0])\nassert np.allclose(ridge(X, y, 14), [0.5])\nrng = np.random.default_rng(0)\nX2 = rng.normal(size=(50, 3))\ny2 = X2 @ np.array([2.0, -1.0, 0.5])\nw0 = ridge(X2, y2, 0)\nw1 = ridge(X2, y2, 100)\nassert np.allclose(w0, [2.0, -1.0, 0.5])\nassert np.linalg.norm(w1) < np.linalg.norm(w0)",
  "solution": "import numpy as np\n\ndef ridge(X, y, lam):\n    d = X.shape[1]\n    return np.linalg.solve(X.T @ X + lam * np.eye(d), X.T @ y)",
  "hints": ["Build the d×d matrix X.T @ X + lam * np.eye(d).", "np.linalg.solve(A, b) solves A w = b."]
}
```

> [!TIP] Interview tips
> - Give the one-line difference: L1 → sparse (feature selection), L2 → small but non-zero weights, stable with correlated features.
> - Explain sparsity with the diamond picture or the constant-gradient argument.
> - Mention standardization, CV for $\lambda$, and the Bayesian prior view as bonus points.
