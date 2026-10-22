---
id: recsys-implicit-vs-explicit-feedback
title: "Implicit vs explicit feedback"
estimatedMinutes: 11
difficulty: medium
tags: [recsys, implicit-feedback, als, confidence, negative-sampling]
---

## Why it matters

Most real signals are clicks, views and purchases, not star ratings. Interviewers test whether you know that implicit data has no true negatives, is noisy and confounded by exposure, and requires different losses than explicit ratings.

## Concept

**Explicit feedback**: ratings, thumbs up/down. Clear preference signal and has negatives, but sparse, biased toward people who bother to rate, and often user-scale dependent. **Implicit feedback**: clicks, watch time, add-to-cart, purchases, dwell time. Abundant and reflects real behaviour, but noisy and **one-sided**.

**Key issues**: (1) no true negatives: not-clicked could mean unseen, uninterested or not exposed; (2) the value is **confidence**, not preference (3 views signal more certainty than 1); (3) **position and exposure bias** inflate top-slot clicks; (4) clicks can be clickbait, so combine signals (dwell, completion, purchase) or predict multiple objectives.

**Modeling (Hu, Koren, Volinsky)**: define preference $p_{ui} = \mathbb{1}[r_{ui} > 0]$ and confidence $c_{ui} = 1 + \alpha r_{ui}$, then minimize
$$\sum_{u,i} c_{ui}\,(p_{ui} - x_u^\top y_i)^2 + \lambda(\ldots)$$
over **all** pairs, so unobserved pairs act as weak negatives (confidence 1) and heavy interactions as strong positives. Alternatives: **negative sampling** (sample unobserved items as negatives), pairwise **BPR** loss ($\log\sigma(\hat x_{ui} - \hat x_{uj})$ for observed $i$ vs unobserved $j$), and sampled-softmax retrieval.

**Evaluation** differs too: use ranking metrics (recall@k, NDCG) over held-out interactions and remember that unobserved is not negative; in the online setting measure the true goal (retention, revenue), not just clicks.

## Worked example

Ratings matrix $R = \begin{bmatrix}3&0\\0&1\end{bmatrix}$ of view counts, $\alpha = 10$. Confidence $C = \begin{bmatrix}31&1\\1&11\end{bmatrix}$, preferences $P = \begin{bmatrix}1&0\\0&1\end{bmatrix}$. With 1-d factors $x = [1, 0]$ and $y = [0.5, 1]$, predictions are $\begin{bmatrix}0.5&1\\0&0\end{bmatrix}$. The weighted loss is $31\cdot0.5^2 + 1\cdot1^2 + 1\cdot0 + 11\cdot1^2 = 7.75 + 1 + 0 + 11 = 19.75$. The error on the heavily viewed pair (user 0, item 0) costs 31 times more than an unobserved one.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why can't a non-click be treated as a hard negative in implicit feedback?",
  "options": [
    "Clicks are always accurate",
    "The user may never have seen the item or may like it but not have clicked yet",
    "Negatives make training slower",
    "Hard negatives are only for images"
  ],
  "answer": 1,
  "explanation": "Absence of interaction conflates 'not exposed', 'not interested' and 'not yet'. Use confidence weighting, negative sampling or exposure modeling."
}
```

```quiz
{
  "id": "q2",
  "question": "In the Hu-Koren-Volinsky objective, what does c_ui = 1 + alpha * r_ui express?",
  "options": [
    "The predicted rating",
    "How confident we are that p_ui = 1 reflects true preference, growing with interaction count",
    "The learning rate",
    "The regularization strength"
  ],
  "answer": 1,
  "explanation": "More interactions mean more confidence that the user prefers the item. Unobserved pairs keep confidence 1 and act as weak negatives."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "With numpy implement `implicit_loss(R, X, Y, alpha)` for the confidence-weighted objective (no regularization): preference `P = (R > 0)`, confidence `C = 1 + alpha*R`, and return `sum(C * (P - X @ Y.T) ** 2)` as a float. `X` is the (users x d) factor matrix and `Y` the (items x d) factor matrix.",
  "setup": "import numpy as np",
  "packages": [
    "numpy"
  ],
  "starterCode": "import numpy as np\n\ndef implicit_loss(R, X, Y, alpha):\n    pass\n\nR = np.array([[3, 0], [0, 1]], dtype=float)\nX = np.array([[1.0], [0.0]])\nY = np.array([[0.5], [1.0]])\nprint(implicit_loss(R, X, Y, 10))",
  "tests": "R = np.array([[3, 0], [0, 1]], dtype=float)\nX = np.array([[1.0], [0.0]])\nY = np.array([[0.5], [1.0]])\nassert abs(implicit_loss(R, X, Y, 10) - 19.75) < 1e-9\nassert abs(implicit_loss(R, X, Y, 0) - (0.25 + 1 + 0 + 1)) < 1e-9\nperfect_X = np.eye(2)\nperfect_Y = np.eye(2)\nassert abs(implicit_loss(R, perfect_X, perfect_Y, 10)) < 1e-12",
  "solution": "import numpy as np\n\ndef implicit_loss(R, X, Y, alpha):\n    P = (R > 0).astype(float)\n    C = 1.0 + alpha * R\n    return float(np.sum(C * (P - X @ Y.T) ** 2))",
  "hints": [
    "Preference is a 0/1 matrix, confidence is 1 + alpha * R everywhere (unobserved cells have confidence 1).",
    "The loss runs over every user-item pair, not only observed ones."
  ]
}
```

> [!TIP] Interview tips
> - State the three differences: no true negatives, confidence rather than preference, and exposure/position bias.
> - Name the loss families: confidence-weighted ALS, negative sampling, BPR/pairwise, sampled softmax.
> - Say you'd combine signals (dwell time, completion, purchase) and optimize for the business goal, not raw clicks.
