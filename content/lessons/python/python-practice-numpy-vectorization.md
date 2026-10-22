---
id: python-practice-numpy-vectorization
title: "Practice: NumPy vectorization"
estimatedMinutes: 14
difficulty: medium
tags: [python, coding-interview, numpy, vectorization, practice]
---

## Why it matters

"Implement it without loops" is a standard numpy screen: pairwise distances, softmax, moving averages, one-hot encoding. The interviewer wants correct shapes, numerical stability, and an awareness of memory cost.

## Concept

**Recipe** (see the broadcasting and vectorization lessons for the rules):

1. Write the shapes of every input and the desired output first.
2. Insert axes with `[:, None]` / `[None, :]` (or `keepdims=True` in reductions) so shapes align by broadcasting; align from the **right**.
3. Reduce along the right axis (`axis=-1`), and keep dimensions when the result will be broadcast back.
4. Prefer built-ins (`np.where`, `np.clip`, `np.cumsum`, `np.add.at`, `np.bincount`, `argsort`, fancy indexing) over `np.vectorize`, which is only a loop in disguise.

**Numerical stability**: for softmax or log-sum-exp subtract the row max first; $\text{softmax}(z)_i = e^{z_i - m} / \sum_j e^{z_j - m}$ with $m = \max z$. Otherwise `np.exp(1000)` overflows to `inf`.

**Memory**: broadcasting a difference of an $(n, d)$ array against itself creates an $(n, n, d)$ temporary. For large $n$ use the identity $\|a - b\|^2 = \|a\|^2 + \|b\|^2 - 2\,a \cdot b$, which needs only an $(n, n)$ matrix product (clip tiny negatives caused by rounding before the square root).

**Windows**: a moving sum is a difference of cumulative sums: $S_i = C_{i+k} - C_i$ with $C$ the cumsum prefixed by 0. It is $O(n)$ regardless of $k$.

**Pitfall**: integer dtypes (overflow, floor division), views vs copies after slicing, and in-place `+=` that silently casts floats to ints.

## Worked example

Three points in 2-D: $(0,0)$, $(3,4)$, $(6,8)$. Pairwise Euclidean distances without loops:

```python
X = np.array([[0, 0], [3, 4], [6, 8]], dtype=float)
diff = X[:, None, :] - X[None, :, :]        # shape (3, 3, 2)
D = np.sqrt((diff ** 2).sum(axis=-1))       # shape (3, 3)
# [[ 0.  5. 10.]
#  [ 5.  0.  5.]
#  [10.  5.  0.]]
```

`X[:, None, :]` has shape $(3, 1, 2)$ and `X[None, :, :]` has shape $(1, 3, 2)$; broadcasting expands both to $(3, 3, 2)$, so `diff[i, j]` is $x_i - x_j$. Summing over the last axis gives squared distances: e.g. $(0-3)^2 + (0-4)^2 = 25$, root $5$. The temporary is $3 \cdot 3 \cdot 2 = 18$ floats here, but for $n = 10{,}000$ points in $d = 50$ it would be $5 \times 10^9$ floats (40 GB), which is exactly why the matrix-product identity matters.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Shapes are `a: (5, 1)` and `b: (3,)`. What is the shape of `a + b`?",
  "options": [
    "(5,)",
    "(5, 3)",
    "(3, 5)",
    "Error: shapes do not match"
  ],
  "answer": 1,
  "explanation": "Align from the right: `b` becomes (1, 3); both broadcast to (5, 3)."
}
```

```quiz
{
  "id": "q2",
  "question": "Why subtract the row maximum before exponentiating in softmax?",
  "options": [
    "It changes the result to a proper probability",
    "It prevents overflow without changing the output, since the factor $e^{-m}$ cancels",
    "It makes the rows sum to one",
    "It speeds up `np.exp`"
  ],
  "answer": 1,
  "explanation": "Softmax is invariant to adding a constant to all logits. Subtracting the max keeps exponents at most 0, so no overflow."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `pairwise_dist(X)` for an $(n, d)$ float array returning the $(n, n)$ matrix of Euclidean distances, with no Python loops. Use the identity $\\|a-b\\|^2 = \\|a\\|^2 + \\|b\\|^2 - 2a\\cdot b$ and clip negatives from rounding before the square root. The diagonal must be exactly 0.",
  "setup": "import numpy as np",
  "packages": [
    "numpy"
  ],
  "starterCode": "import numpy as np\n\ndef pairwise_dist(X):\n    pass",
  "tests": "X = np.array([[0, 0], [3, 4], [6, 8]], dtype=float)\nD = pairwise_dist(X)\nassert D.shape == (3, 3)\nassert np.allclose(D, [[0, 5, 10], [5, 0, 5], [10, 5, 0]])\nassert np.all(np.diag(D) == 0)\nrng = np.random.default_rng(0)\nY = rng.normal(size=(20, 4))\nref = np.sqrt(((Y[:, None, :] - Y[None, :, :]) ** 2).sum(-1))\nassert np.allclose(pairwise_dist(Y), ref, atol=1e-6)",
  "solution": "import numpy as np\n\ndef pairwise_dist(X):\n    X = np.asarray(X, dtype=float)\n    sq = (X ** 2).sum(axis=1)\n    d2 = sq[:, None] + sq[None, :] - 2 * X @ X.T\n    D = np.sqrt(np.clip(d2, 0, None))\n    np.fill_diagonal(D, 0.0)\n    return D",
  "hints": [
    "Squared norms: `sq = (X ** 2).sum(axis=1)`; combine with `sq[:, None] + sq[None, :]`.",
    "`np.clip(d2, 0, None)` removes tiny negatives; `np.fill_diagonal` zeroes the diagonal."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `softmax_rows(Z)` for an $(n, k)$ array: a numerically stable softmax over each row. It must work for logits like 1000 without producing `inf` or NaN.",
  "setup": "import numpy as np",
  "packages": [
    "numpy"
  ],
  "starterCode": "import numpy as np\n\ndef softmax_rows(Z):\n    pass",
  "tests": "Z = np.array([[1.0, 2.0, 3.0], [1000.0, 1000.0, 999.0]])\nP = softmax_rows(Z)\nassert P.shape == (2, 3)\nassert np.allclose(P.sum(axis=1), 1.0)\nassert np.allclose(P[0], np.exp([1, 2, 3]) / np.exp([1, 2, 3]).sum())\ne = np.exp([0.0, 0.0, -1.0])\nassert np.allclose(P[1], e / e.sum())\nassert np.all(np.isfinite(P))",
  "solution": "import numpy as np\n\ndef softmax_rows(Z):\n    Z = np.asarray(Z, dtype=float)\n    E = np.exp(Z - Z.max(axis=1, keepdims=True))\n    return E / E.sum(axis=1, keepdims=True)",
  "hints": [
    "Subtract `Z.max(axis=1, keepdims=True)` before `np.exp`.",
    "Keep dimensions in the sum so the division broadcasts across columns."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Write `moving_average(x, k)` returning the mean of every window of `k` consecutive values (length `len(x) - k + 1`, \"valid\" mode) using `np.cumsum`, no loops. Raise `ValueError` if `k < 1` or `k > len(x)`. Then write `one_hot(labels, n_classes)` returning an `(n, n_classes)` int array using fancy indexing.",
  "setup": "import numpy as np",
  "packages": [
    "numpy"
  ],
  "starterCode": "import numpy as np\n\ndef moving_average(x, k):\n    pass\n\ndef one_hot(labels, n_classes):\n    pass",
  "tests": "x = np.array([1.0, 2.0, 3.0, 4.0, 10.0])\nassert np.allclose(moving_average(x, 3), [2.0, 3.0, 17 / 3])\nassert np.allclose(moving_average(x, 1), x)\nassert np.allclose(moving_average(x, 5), [4.0])\nfor bad in (0, 6):\n    try:\n        moving_average(x, bad)\n        raise SystemExit(\"expected ValueError\")\n    except ValueError:\n        pass\noh = one_hot([2, 0, 1, 2], 3)\nassert oh.shape == (4, 3)\nassert oh.tolist() == [[0, 0, 1], [1, 0, 0], [0, 1, 0], [0, 0, 1]]",
  "solution": "import numpy as np\n\ndef moving_average(x, k):\n    x = np.asarray(x, dtype=float)\n    if k < 1 or k > len(x):\n        raise ValueError(\"k must be between 1 and len(x)\")\n    c = np.concatenate([[0.0], np.cumsum(x)])\n    return (c[k:] - c[:-k]) / k\n\ndef one_hot(labels, n_classes):\n    labels = np.asarray(labels)\n    out = np.zeros((len(labels), n_classes), dtype=int)\n    out[np.arange(len(labels)), labels] = 1\n    return out",
  "hints": [
    "Prefix the cumsum with 0 so that `c[k:] - c[:-k]` is the window sum.",
    "One-hot: `out[np.arange(n), labels] = 1` sets one entry per row."
  ]
}
```

> [!TIP] Interview tips
> - Write down the shapes first and say which axes broadcast; interviewers listen for this.
> - Mention numerical stability (subtract the max) and memory cost of the $(n, n, d)$ temporary.
> - Know the trick `cumsum` difference for windows and `np.add.at` / `bincount` for scatter-adds; avoid `np.vectorize`.
