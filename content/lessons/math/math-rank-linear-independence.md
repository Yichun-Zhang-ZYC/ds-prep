---
id: math-rank-linear-independence
title: "Rank, linear independence"
estimatedMinutes: 10
difficulty: medium
tags: [math, linear-algebra, rank, multicollinearity]
---

## Why it matters
Rank tells you how much independent information a matrix carries. It explains why regression fails with collinear features, why low-rank factorization compresses data, and why a system of equations has zero, one or infinitely many solutions. It is a favorite conceptual interview question.

## Concept
**Linear independence**: vectors $v_1,\dots,v_k$ are independent if $c_1v_1 + \dots + c_kv_k = 0$ only for $c_1=\dots=c_k=0$. Otherwise one vector is a combination of the others (redundant).
- More than $n$ vectors in $\mathbb{R}^n$ are always dependent.
- A **basis** of a space is a set of independent vectors that span it; its size is the **dimension**.

**Rank**: $\text{rank}(A)$ = the number of independent columns = the number of independent rows (column rank = row rank) = the number of non-zero singular values = the dimension of the column space. Always $\text{rank}(A) \le \min(m, n)$.
- **Full rank**: rank $= \min(m,n)$. A square matrix is invertible iff full rank.
- **Rank-nullity**: $\text{rank}(A) + \text{nullity}(A) = n$ (number of columns), where the null space is $\{x : Ax = 0\}$.
- $\text{rank}(AB) \le \min(\text{rank}A, \text{rank}B)$; $\text{rank}(X^\top X) = \text{rank}(X)$.
- A rank-1 matrix is an outer product $uv^\top$.

**Compute it**: Gaussian elimination to row echelon form; rank = number of pivots. Numerically use SVD and count singular values above a tolerance, since floating-point noise makes "exactly zero" unreliable.

**Linear systems** $Ax = b$ ($A$ is $m\times n$): solvable iff $b$ is in the column space ($\text{rank}[A\,|\,b] = \text{rank}A$). Unique iff rank $= n$; otherwise infinitely many solutions (shifts along the null space).

**ML links**:
- **Multicollinearity**: if one feature is a linear combination of others (e.g. dummy variables for every category plus an intercept), $X^\top X$ is singular and OLS coefficients are not unique. Drop a column, use ridge, or use the pseudo-inverse.
- With $n < d$ (fewer samples than features), $\text{rank}(X) \le n < d$ so $X^\top X$ is always singular.
- Low-rank structure: matrix factorization and LoRA approximate a big matrix by a product of thin ones with rank $r \ll \min(m,n)$.

## Worked example
Rows of $M = \begin{pmatrix}1&2&3\\2&4&6\\1&0&1\end{pmatrix}$.
- Row 2 $= 2\times$ row 1, so the rows are dependent. Eliminate: $R_2 - 2R_1 = (0,0,0)$, $R_3 - R_1 = (0,-2,-2)$.
- Pivots: column 1 (from $R_1$) and column 2 (from $R_3 - R_1$). That is **2 pivots**, so $\text{rank}(M) = 2$ and $\det M = 0$.
- Nullity $= 3 - 2 = 1$; a null vector is $(1, 1, -1)$: $1+2-3 = 0$, $2+4-6 = 0$, $1+0-1 = 0$.
- Feature-engineering view: a table with columns $x$, $2x$, $x+1$ (and a constant) has rank 2 not 4; $X^\top X$ cannot be inverted, so OLS has infinitely many equivalent solutions.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A design matrix X has 100 rows and 5 columns, and the 5th column equals the sum of columns 1 and 2. What is the maximum rank of X and what happens to OLS?",
  "options": [
    "5; OLS is fine",
    "4; X^T X is singular so the coefficients are not unique",
    "100; OLS is fine",
    "4; OLS gives a unique solution anyway"
  ],
  "answer": 1,
  "explanation": "A redundant column removes one dimension, so rank is at most 4 < 5 columns. X^T X is then singular and infinitely many coefficient vectors give the same fit."
}
```

```quiz
{
  "id": "q2",
  "question": "A 4x6 matrix has rank 3. What is its null space dimension (Ax = 0 with x in R^6)?",
  "options": [
    "1",
    "2",
    "3",
    "6"
  ],
  "answer": 2,
  "explanation": "Rank-nullity: nullity = number of columns - rank = 6 - 3 = 3."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `rank(M, tol=1e-9)` using Gaussian elimination with partial pivoting on a copy of the matrix (list of lists of numbers); count a column as a pivot only if its largest remaining absolute entry exceeds `tol`. Then write `nullity(M)` and `independent(vectors)` (True if the given vectors are linearly independent).",
  "starterCode": "def rank(M, tol=1e-9):\n    pass\n\ndef nullity(M):\n    pass\n\ndef independent(vectors):\n    pass\n\nM = [[1, 2, 3], [2, 4, 6], [1, 0, 1]]\nprint(rank(M), nullity(M), independent([[1, 0], [0, 1]]))",
  "tests": "M = [[1, 2, 3], [2, 4, 6], [1, 0, 1]]\nassert rank(M) == 2\nassert nullity(M) == 1\nassert rank([[1, 0], [0, 1]]) == 2\nassert rank([[0, 0], [0, 0]]) == 0\nassert rank([[1, 2], [3, 4], [5, 6]]) == 2\nassert rank([[1, 2, 3, 4], [2, 4, 6, 8]]) == 1\nassert independent([[1, 0, 0], [0, 1, 0]])\nassert not independent([[1, 2], [2, 4]])\nassert not independent([[1, 0], [0, 1], [1, 1]])\nx = [1.0, 2.0, 3.0]\nX = [[v, 2 * v, v + 1, 1.0] for v in x]\nassert rank(X) == 2\norig = [row[:] for row in M]\nrank(M)\nassert M == orig",
  "solution": "def rank(M, tol=1e-9):\n    A = [list(map(float, r)) for r in M]\n    rows, cols = len(A), len(A[0])\n    r = 0\n    for c in range(cols):\n        if r >= rows:\n            break\n        p = max(range(r, rows), key=lambda i: abs(A[i][c]))\n        if abs(A[p][c]) <= tol:\n            continue\n        A[r], A[p] = A[p], A[r]\n        for i in range(r + 1, rows):\n            f = A[i][c] / A[r][c]\n            for j in range(c, cols):\n                A[i][j] -= f * A[r][j]\n        r += 1\n    return r\n\ndef nullity(M):\n    return len(M[0]) - rank(M)\n\ndef independent(vectors):\n    return rank(vectors) == len(vectors)",
  "hints": [
    "For each column, pick the row at or below the current pivot row with the largest absolute value; if it is <= tol, skip the column.",
    "After picking a pivot, swap rows, then subtract multiples from the rows below.",
    "`nullity = number_of_columns - rank`; vectors are independent iff `rank(vectors) == len(vectors)`."
  ]
}
```

> [!TIP] Interview tips
> - Give the four equivalent views: independent columns, independent rows, non-zero singular values, dimension of the column space.
> - Tie rank deficiency to the dummy-variable trap and to n < d regression.
> - Mention that numerical rank uses a tolerance on singular values, not an exact zero test.
