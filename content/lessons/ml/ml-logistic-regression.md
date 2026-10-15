---
id: ml-logistic-regression
title: Logistic Regression
estimatedMinutes: 15
difficulty: medium
tags: [ml, supervised, classification, linear-models]
---

## Why it matters
Logistic regression is the default baseline for classification and still runs much of credit scoring, ads and risk modeling. Expect questions on the sigmoid, log-odds interpretation, the loss function and why we don't use squared error.

## Concept
Model the probability of the positive class with the **sigmoid** of a linear score:

$$
p(x) = P(y = 1 \mid x) = \sigma(w^\top x + b) = \frac{1}{1 + e^{-(w^\top x + b)}}
$$

Equivalently, the **log-odds** are linear: $\log \frac{p}{1-p} = w^\top x + b$. So $e^{w_j}$ is the **odds ratio** for a one-unit increase in $x_j$, holding others fixed.

Training maximizes likelihood, i.e. minimizes **log loss** (binary cross-entropy):

$$
L(w) = -\frac{1}{n}\sum_i \big[y_i \log p_i + (1 - y_i)\log(1 - p_i)\big]
$$

It's convex, so gradient descent finds the global optimum. The gradient is neat: $\nabla_w L = \frac{1}{n} X^\top (p - y)$. Squared error on a sigmoid would be non-convex and give weak gradients for confident mistakes.

Practical points:
- The decision boundary $w^\top x + b = 0$ is linear; add interactions or polynomial features for curved boundaries.
- With perfectly separable data, weights grow without bound: regularize (L2 by default).
- Outputs are reasonably calibrated probabilities when the model is well specified.
- Multiclass: one-vs-rest or **softmax (multinomial) regression**.

## Worked example
A churn model has $w_{\text{support\_tickets}} = 0.4$. Each extra ticket multiplies the odds of churn by $e^{0.4} \approx 1.49$, about +49% odds. For a user with base log-odds $-2$ ($p \approx 0.12$), three tickets give log-odds $-0.8$, so $p = \sigma(-0.8) \approx 0.31$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A coefficient in logistic regression is 0.7. What does it mean?",
  "options": ["The probability increases by 0.7 per unit", "The odds multiply by e^0.7 ≈ 2.0 per unit increase, holding others fixed", "The log-loss falls by 0.7", "The feature explains 70% of the variance"],
  "answer": 1,
  "explanation": "Coefficients act on log-odds. Exponentiate to get an odds ratio."
}
```

```quiz
{
  "id": "q2",
  "question": "Why use log loss instead of mean squared error for logistic regression?",
  "options": ["MSE can't handle probabilities", "Log loss with a sigmoid is convex and is the maximum-likelihood objective; MSE with a sigmoid is non-convex and gives weak gradients for confident errors", "Log loss is faster to compute", "MSE requires normal features"],
  "answer": 1,
  "explanation": "Log loss is the Bernoulli negative log-likelihood and keeps the optimization convex."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement logistic regression with numpy. Write `sigmoid(z)`, and `fit_logreg(X, y, lr=0.1, epochs=2000)` that runs batch gradient descent on mean log loss starting from zeros and returns `(w, b)`. Then write `predict_proba(X, w, b)`.",
  "setup": "import numpy as np",
  "packages": ["numpy"],
  "starterCode": "import numpy as np\n\ndef sigmoid(z):\n    pass\n\ndef fit_logreg(X, y, lr=0.1, epochs=2000):\n    pass\n\ndef predict_proba(X, w, b):\n    pass\n\nX = np.array([[0.0], [1.0], [2.0], [3.0], [4.0], [5.0]])\ny = np.array([0, 0, 1, 0, 1, 1])\nw, b = fit_logreg(X, y)\nprint(w, b, predict_proba(X, w, b).round(2))",
  "tests": "assert abs(sigmoid(0) - 0.5) < 1e-12\nX = np.array([[0.0], [1.0], [2.0], [3.0], [4.0], [5.0]])\ny = np.array([0, 0, 1, 0, 1, 1])\nw, b = fit_logreg(X, y)\np = predict_proba(X, w, b)\nassert w[0] > 0\nassert p[0] < 0.5 < p[-1]\nassert np.all(np.diff(p) > 0)\ngrad_w = X.T @ (p - y) / len(y)\nassert np.abs(grad_w).max() < 0.05",
  "solution": "import numpy as np\n\ndef sigmoid(z):\n    return 1 / (1 + np.exp(-z))\n\ndef fit_logreg(X, y, lr=0.1, epochs=2000):\n    n, d = X.shape\n    w = np.zeros(d)\n    b = 0.0\n    for _ in range(epochs):\n        p = sigmoid(X @ w + b)\n        w -= lr * X.T @ (p - y) / n\n        b -= lr * np.mean(p - y)\n    return w, b\n\ndef predict_proba(X, w, b):\n    return sigmoid(X @ w + b)",
  "hints": ["The gradient of mean log loss w.r.t. w is X.T @ (p − y) / n.", "The bias gradient is mean(p − y)."]
}
```

> [!TIP] Interview tips
> - Interpret coefficients as odds ratios ($e^{w}$), not probability changes.
> - Be ready to derive the gradient $X^\top(p - y)$; it's a frequent whiteboard ask.
> - Mention regularization for separable data, feature scaling for faster convergence, and threshold choice for decisions.
