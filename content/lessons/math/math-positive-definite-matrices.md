---
id: math-positive-definite-matrices
title: "Positive definite matrices"
estimatedMinutes: 11
difficulty: hard
tags: [math, linear-algebra, positive-definite, cholesky, covariance]
---

## Why it matters
Covariance matrices, kernel (Gram) matrices and Hessians of convex problems are all positive (semi-)definite. This property guarantees a unique minimum, valid Gaussians and kernels, and fast stable solvers (Cholesky). Interviewers use it to test whether you can connect algebra with convexity and covariance.

## Concept
A symmetric matrix $A$ is **positive definite (PD)** if $x^\top A x > 0$ for all $x \ne 0$; **positive semi-definite (PSD)** if $x^\top A x \ge 0$. ($x^\top A x$ is the **quadratic form**.)

**Equivalent tests for symmetric $A$**:
- All eigenvalues $> 0$ (PD) or $\ge 0$ (PSD).
- All leading principal minors $> 0$ (Sylvester's criterion), or a **Cholesky factorization** $A = LL^\top$ with $L$ lower-triangular with positive diagonal exists (PD only). Cholesky is also the standard practical test.
- $A = B^\top B$ for some $B$ with independent columns (PD) or any $B$ (PSD).
- Necessary, not sufficient: all diagonal entries $> 0$, and $|a_{ij}| < \sqrt{a_{ii}a_{jj}}$.

**Where they appear**:
- **Covariance** $\Sigma = \frac1{n-1}X_c^\top X_c$ is always PSD ($v^\top\Sigma v = $ variance of the projection $\ge 0$); PD unless features are linearly dependent. A multivariate Gaussian needs PD $\Sigma$ for a density.
- **Gram/kernel matrices** $K_{ij} = k(x_i, x_j)$ are PSD exactly when $k$ is a valid (Mercer) kernel.
- **Hessian**: PD at a critical point means a strict local minimum; PSD everywhere means convex. For a quadratic $\tfrac12x^\top Ax - b^\top x$ the unique minimizer solves $Ax = b$.
- **Ridge**: $X^\top X + \lambda I$ is PD for $\lambda>0$, so it is always invertible.

**Cholesky**: $A = LL^\top$ costs about $n^3/3$ flops (half of LU) and is stable. Uses: solving $Ax=b$ by two triangular solves, **sampling** $x = \mu + Lz$ with $z\sim N(0,I)$ gives covariance $LL^\top = \Sigma$, and Gaussian process inference. If it fails (non-positive pivot) the matrix is not PD; practitioners add **jitter** $\epsilon I$.

**Others**: indefinite = both positive and negative eigenvalues (saddle point). PD matrices define a valid inner product $\langle x,y\rangle_A = x^\top Ay$ and the Mahalanobis distance $\sqrt{(x-\mu)^\top\Sigma^{-1}(x-\mu)}$.

## Worked example
Compare $A = \begin{pmatrix}2&1\\1&2\end{pmatrix}$ and $C = \begin{pmatrix}1&2\\2&1\end{pmatrix}$.
- $A$: eigenvalues $3, 1 > 0$, so PD. Quadratic form: $x^\top Ax = 2x_1^2 + 2x_1x_2 + 2x_2^2 = x_1^2 + x_2^2 + (x_1+x_2)^2 > 0$.
- $C$: eigenvalues $3, -1$, so **indefinite**. With $x = (1,-1)$: $x^\top Cx = 1 - 2 - 2 + 1 = -2 < 0$. Leading minors: $1 > 0$ but $\det C = -3 < 0$.
- Cholesky of $\begin{pmatrix}4&2\\2&3\end{pmatrix}$: $l_{11} = \sqrt4 = 2$; $l_{21} = 2/2 = 1$; $l_{22} = \sqrt{3 - 1^2} = \sqrt2$. So $L = \begin{pmatrix}2&0\\1&\sqrt2\end{pmatrix}$ and $LL^\top = \begin{pmatrix}4&2\\2&1+2\end{pmatrix}$, as required.
- Running Cholesky on $C$: $l_{11}=1$, $l_{21}=2$, and $l_{22}^2 = 1 - 4 = -3 < 0$, so it fails, confirming $C$ is not PD.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why is a sample covariance matrix always at least positive semi-definite?",
  "options": [
    "Its diagonal entries are positive",
    "Its entries are between -1 and 1",
    "v^T Sigma v equals the variance of the data projected on v, which is >= 0",
    "It is always invertible"
  ],
  "answer": 2,
  "explanation": "For any direction v, v^T Sigma v is the variance of the 1-D projection, so it cannot be negative. It is singular (only PSD) when features are linearly dependent or n <= d."
}
```

```quiz
{
  "id": "q2",
  "question": "A Hessian at a critical point has eigenvalues 2, 5, -1. What is the point?",
  "options": [
    "A strict local minimum",
    "A saddle point",
    "A strict local maximum",
    "A global minimum"
  ],
  "answer": 1,
  "explanation": "Mixed signs mean the quadratic form curves up in some directions and down in others: a saddle point."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `quad_form(A, x)` = $x^\\top A x$, and `cholesky(A)` that returns the lower-triangular `L` (list of lists) with $A = LL^\\top$, or `None` if the matrix is not positive definite (a pivot value $\\le 10^{-12}$). Finally `is_pd(A)` = `cholesky(A) is not None`.",
  "starterCode": "import math\n\ndef quad_form(A, x):\n    pass\n\ndef cholesky(A):\n    pass\n\ndef is_pd(A):\n    pass\n\nprint(is_pd([[2, 1], [1, 2]]), is_pd([[1, 2], [2, 1]]))",
  "tests": "import math\nassert quad_form([[2, 1], [1, 2]], [1, -1]) == 2\nassert quad_form([[1, 2], [2, 1]], [1, -1]) == -2\nL = cholesky([[4, 2], [2, 3]])\nassert abs(L[0][0] - 2) < 1e-12 and abs(L[1][0] - 1) < 1e-12\nassert abs(L[1][1] - math.sqrt(2)) < 1e-12 and L[0][1] == 0\nassert is_pd([[2, 1], [1, 2]])\nassert not is_pd([[1, 2], [2, 1]])\nassert not is_pd([[1, 1], [1, 1]])\nB = [[1, 2, 0], [0, 1, 3], [1, 0, 1]]\nG = [[sum(B[k][i] * B[k][j] for k in range(3)) for j in range(3)] for i in range(3)]\nL = cholesky(G)\nassert L is not None\nfor i in range(3):\n    for j in range(3):\n        assert abs(sum(L[i][k] * L[j][k] for k in range(3)) - G[i][j]) < 1e-9\nassert not is_pd([[1, 0], [0, -1]])",
  "solution": "import math\n\ndef quad_form(A, x):\n    n = len(x)\n    return sum(x[i] * A[i][j] * x[j] for i in range(n) for j in range(n))\n\ndef cholesky(A):\n    n = len(A)\n    L = [[0.0] * n for _ in range(n)]\n    for i in range(n):\n        for j in range(i + 1):\n            s = A[i][j] - sum(L[i][k] * L[j][k] for k in range(j))\n            if i == j:\n                if s <= 1e-12:\n                    return None\n                L[i][i] = math.sqrt(s)\n            else:\n                L[i][j] = s / L[j][j]\n    return L\n\ndef is_pd(A):\n    return cholesky(A) is not None",
  "hints": [
    "For i >= j: `s = A[i][j] - sum(L[i][k]*L[j][k] for k in range(j))`; if i == j then `L[i][i] = sqrt(s)` (fail if s <= 1e-12) else `L[i][j] = s / L[j][j]`.",
    "Initialize L as an n x n matrix of zeros.",
    "The all-ones 2x2 matrix is only PSD, so it should return None."
  ]
}
```

> [!TIP] Interview tips
> - Give several equivalent tests (eigenvalues, Cholesky, quadratic form, leading minors) and say which you would use in code (Cholesky or eigenvalues).
> - Connect PSD to covariance, kernels and convexity (Hessian), these are the three places it matters in ML.
> - Mention jitter / ridge to repair a nearly singular covariance, and Cholesky for sampling Gaussians.
