---
id: math-matrix-multiplication-transpose-inverse
title: "Matrix multiplication, transpose, inverse"
estimatedMinutes: 12
difficulty: easy
tags: [math, linear-algebra, matrices]
---

## Why it matters
A neural-net layer is a matrix multiply, linear regression is a matrix equation, and covariance, PCA and attention are all matrix products. Interviewers check that you know shapes, the rules for transposes and inverses, and why we almost never invert a matrix explicitly.

## Concept
**Matrix product**: if $A$ is $m \times n$ and $B$ is $n \times p$, then $C = AB$ is $m \times p$ with $C_{ij} = \sum_k A_{ik} B_{kj}$ (row $i$ of $A$ dotted with column $j$ of $B$). Inner dimensions must match; cost is $O(mnp)$.
- **Not commutative**: $AB \ne BA$ in general (often only one is even defined). **Associative**: $(AB)C = A(BC)$, so parenthesization changes cost, not the result. **Distributive**: $A(B+C) = AB + AC$.
- Views: $Ax$ is a linear combination of the **columns** of $A$ weighted by $x$; $AB$ applies $B$ first, then $A$ (composition of linear maps).

**Transpose**: $(A^\top)_{ij} = A_{ji}$. Rules: $(AB)^\top = B^\top A^\top$, $(A+B)^\top = A^\top + B^\top$, $(A^\top)^\top = A$. A matrix is **symmetric** if $A = A^\top$; $X^\top X$ and covariance matrices are always symmetric. Dot product: $x\cdot y = x^\top y$.

**Inverse**: $A^{-1}$ satisfies $AA^{-1} = A^{-1}A = I$. It exists only for **square, full-rank** matrices ($\det A \ne 0$). Rules: $(AB)^{-1} = B^{-1}A^{-1}$, $(A^\top)^{-1} = (A^{-1})^\top$. For $2\times2$: $\begin{pmatrix}a&b\\c&d\end{pmatrix}^{-1} = \frac{1}{ad-bc}\begin{pmatrix}d&-b\\-c&a\end{pmatrix}$.

**In practice**:
- To solve $Ax = b$ use a factorization (LU, QR, Cholesky), **not** $A^{-1}b$: cheaper and numerically more stable.
- Near-singular matrices (large condition number $\kappa$) amplify errors; add ridge $\lambda I$ or use the pseudo-inverse $A^+$ (SVD).
- Normal equations: $\hat\beta = (X^\top X)^{-1} X^\top y$ exist only if $X$ has full column rank.
- Identity $I$ is the neutral element; a diagonal matrix inverts by inverting its diagonal.

## Worked example
Let $A = \begin{pmatrix}1&2\\3&4\end{pmatrix}$ and $B = \begin{pmatrix}0&1\\1&0\end{pmatrix}$ (swaps columns).
- $AB = \begin{pmatrix}2&1\\4&3\end{pmatrix}$ (columns of $A$ swapped); $BA = \begin{pmatrix}3&4\\1&2\end{pmatrix}$ (rows swapped). So $AB \ne BA$.
- $A^\top = \begin{pmatrix}1&3\\2&4\end{pmatrix}$.
- $\det A = 1\cdot4 - 2\cdot3 = -2$, so $A^{-1} = \frac{1}{-2}\begin{pmatrix}4&-2\\-3&1\end{pmatrix} = \begin{pmatrix}-2&1\\1.5&-0.5\end{pmatrix}$.
- Check: first row of $A$ times first column of $A^{-1}$: $1(-2) + 2(1.5) = 1$; times second column: $1(1) + 2(-0.5) = 0$. Good.
- Solve $Ax = (5, 6)^\top$: $x = A^{-1}b = (-10 + 6,\; 7.5 - 3) = (-4, 4.5)$. Check: $-4 + 9 = 5$ and $-12 + 18 = 6$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A is 3x4 and B is 4x2. Which statement is true?",
  "options": [
    "AB is 4x4",
    "BA is defined and 2x3",
    "AB is 3x2 and BA is not defined",
    "AB and BA are both defined"
  ],
  "answer": 2,
  "explanation": "AB: (3x4)(4x2) = 3x2. BA would need B's 2 columns to equal A's 3 rows, which fails, so BA is undefined."
}
```

```quiz
{
  "id": "q2",
  "question": "What is (AB)^-1 for invertible A and B?",
  "options": [
    "A^-1 B^-1",
    "B^-1 A^-1",
    "(BA)^-1 only if AB = BA",
    "A^T B^T"
  ],
  "answer": 1,
  "explanation": "Undo the last operation first: (AB)^-1 = B^-1 A^-1, the same reversal as for the transpose, (AB)^T = B^T A^T."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement with plain nested lists: `matmul(A, B)` (raise `ValueError` if shapes don't match), `transpose(A)`, and `inverse2(A)` for a 2x2 matrix that returns the inverse, or `None` if the determinant is (near) zero (abs < 1e-12).",
  "starterCode": "def matmul(A, B):\n    pass\n\ndef transpose(A):\n    pass\n\ndef inverse2(A):\n    pass\n\nA = [[1, 2], [3, 4]]\nB = [[0, 1], [1, 0]]\nprint(matmul(A, B), transpose(A), inverse2(A))",
  "tests": "A = [[1, 2], [3, 4]]\nB = [[0, 1], [1, 0]]\nassert matmul(A, B) == [[2, 1], [4, 3]]\nassert matmul(B, A) == [[3, 4], [1, 2]]\nassert transpose([[1, 2, 3], [4, 5, 6]]) == [[1, 4], [2, 5], [3, 6]]\nassert matmul([[1, 2, 3]], [[1], [1], [1]]) == [[6]]\nAi = inverse2(A)\nexp = [[-2, 1], [1.5, -0.5]]\nassert all(abs(Ai[i][j] - exp[i][j]) < 1e-12 for i in range(2) for j in range(2))\nI = matmul(A, Ai)\nassert all(abs(I[i][j] - (1 if i == j else 0)) < 1e-12 for i in range(2) for j in range(2))\nassert inverse2([[1, 2], [2, 4]]) is None\nlhs = transpose(matmul(A, [[1, 1], [0, 1]]))\nrhs = matmul(transpose([[1, 1], [0, 1]]), transpose(A))\nassert lhs == rhs\ntry:\n    matmul([[1, 2]], [[1, 2]])\n    assert False\nexcept ValueError:\n    pass",
  "solution": "def matmul(A, B):\n    if len(A[0]) != len(B):\n        raise ValueError('shape mismatch')\n    n = len(B)\n    return [[sum(A[i][k] * B[k][j] for k in range(n)) for j in range(len(B[0]))]\n            for i in range(len(A))]\n\ndef transpose(A):\n    return [list(r) for r in zip(*A)]\n\ndef inverse2(A):\n    (a, b), (c, d) = A\n    det = a * d - b * c\n    if abs(det) < 1e-12:\n        return None\n    return [[d / det, -b / det], [-c / det, a / det]]",
  "hints": [
    "`C[i][j] = sum(A[i][k] * B[k][j] for k in range(n))`.",
    "`transpose` is `[list(r) for r in zip(*A)]`.",
    "Check your inverse: `matmul(A, inverse2(A))` should be the identity."
  ]
}
```

> [!TIP] Interview tips
> - State shape rules first: (m x n)(n x p) = (m x p); then note matrix multiplication is not commutative.
> - Say you would never compute an explicit inverse to solve a system; use a solver or factorization.
> - Link singularity to rank: a singular X^T X means perfectly collinear features.
