---
id: python-broadcasting
title: Broadcasting
estimatedMinutes: 12
difficulty: medium
tags: [python, numpy, broadcasting, vectorization]
---

## Why it matters
Broadcasting lets you combine arrays of different shapes without loops or copies: standardizing columns, pairwise distances, adding biases in neural nets. Getting it wrong produces errors or, worse, silently wrong shapes.

## Concept
When operating on two arrays, NumPy compares shapes **from the right**. Two dimensions are compatible if they're **equal or one of them is 1**. Missing leading dimensions are treated as 1. Size-1 dimensions are stretched (virtually, without copying).

| A shape | B shape | Result |
|---|---|---|
| (3, 4) | (4,) | (3, 4): B applied to every row |
| (3, 4) | (3, 1) | (3, 4): B applied to every column |
| (3, 1) | (1, 4) | (3, 4): outer combination |
| (3, 4) | (3,) | **Error**: 4 vs 3 |

Common patterns:
```python
X_std = (X - X.mean(axis=0)) / X.std(axis=0)            # (n, d) with (d,)
row_norm = X / X.sum(axis=1, keepdims=True)              # (n, d) with (n, 1)
D = np.sqrt(((A[:, None, :] - B[None, :, :]) ** 2).sum(-1))   # (n, m) pairwise distances
```

- `keepdims=True` keeps the reduced axis as size 1, so the result broadcasts back.
- `x[:, None]` (or `np.newaxis`) inserts an axis to control orientation.
- Watch memory: the pairwise trick builds an (n, m, d) intermediate.
- Silent bug: `y_true` of shape (n,) minus `y_pred` of shape (n, 1) gives an (n, n) matrix, not n residuals.

## Worked example
```python
y_true = np.array([1., 2., 3.])
y_pred = np.array([[1.], [2.], [4.]])      # shape (3, 1) from a model
(y_true - y_pred).shape                     # (3, 3)!  wrong
(y_true - y_pred.ravel()).shape             # (3,)     right
```

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What is the shape of `np.ones((5, 1)) + np.ones((1, 3))`?",
  "options": ["(5, 1)", "(1, 3)", "(5, 3)", "Error"],
  "answer": 2,
  "explanation": "Each size-1 dimension stretches to match: (5, 3)."
}
```

```quiz
{
  "id": "q2",
  "question": "Which pair of shapes can NOT be broadcast together?",
  "options": ["(8, 1, 6) and (7, 1)", "(4, 3) and (3,)", "(4, 3) and (4,)", "(2, 1) and (1, 5)"],
  "answer": 2,
  "explanation": "Aligned from the right, 3 vs 4 differ and neither is 1."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Using broadcasting only (no Python loops), write `standardize(X)` (column-wise z-scores with population std), `row_normalize(X)` (each row divided by its sum), and `pairwise_dist(A, B)` returning the (n, m) matrix of Euclidean distances between rows of A (n×d) and B (m×d).",
  "setup": "import numpy as np",
  "packages": ["numpy"],
  "starterCode": "import numpy as np\n\ndef standardize(X):\n    pass\n\ndef row_normalize(X):\n    pass\n\ndef pairwise_dist(A, B):\n    pass\n\nprint(pairwise_dist(np.array([[0, 0], [3, 4]]), np.array([[0, 0]])))",
  "tests": "X = np.array([[1., 10.], [2., 20.], [3., 30.]])\nZ = standardize(X)\nassert np.allclose(Z.mean(axis=0), 0) and np.allclose(Z.std(axis=0), 1)\nR = row_normalize(np.array([[1., 3.], [2., 2.]]))\nassert np.allclose(R, [[0.25, 0.75], [0.5, 0.5]])\nD = pairwise_dist(np.array([[0., 0.], [3., 4.]]), np.array([[0., 0.], [0., 4.]]))\nassert D.shape == (2, 2) and np.allclose(D, [[0, 4], [5, 3]])",
  "solution": "import numpy as np\n\ndef standardize(X):\n    return (X - X.mean(axis=0)) / X.std(axis=0)\n\ndef row_normalize(X):\n    return X / X.sum(axis=1, keepdims=True)\n\ndef pairwise_dist(A, B):\n    diff = A[:, None, :] - B[None, :, :]\n    return np.sqrt((diff ** 2).sum(axis=-1))",
  "hints": ["keepdims=True keeps the row sums as an (n, 1) column.", "A[:, None, :] is (n, 1, d) and B[None, :, :] is (1, m, d)."]
}
```

> [!TIP] Interview tips
> - State the rule: align from the right; dims must match or be 1.
> - Use keepdims and None/newaxis deliberately, and print shapes when unsure.
> - Mention the (n,) vs (n, 1) residual bug; it's a classic silent error.
