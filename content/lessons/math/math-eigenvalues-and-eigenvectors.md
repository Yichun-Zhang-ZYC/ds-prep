---
id: math-eigenvalues-and-eigenvectors
title: "Eigenvalues & eigenvectors"
estimatedMinutes: 13
difficulty: medium
tags: [math, linear-algebra, eigenvalues, pca]
---

## Why it matters
Eigenvectors are the directions a linear map only stretches. They underlie PCA, spectral clustering, PageRank, stability of dynamical systems and the analysis of gradient descent. Expect questions on what they mean, how to compute them for a small matrix, and how they connect to PCA.

## Concept
**Definition**: $Av = \lambda v$ with $v \ne 0$. The vector $v$ keeps its direction; $\lambda$ is the stretch factor (negative flips it). Eigenvectors are defined up to scale.

**Finding them**: solve the characteristic equation $\det(A - \lambda I) = 0$ for $\lambda$, then solve $(A - \lambda I)v = 0$ for $v$. An $n\times n$ matrix has $n$ eigenvalues counted with multiplicity (possibly complex).

**Key identities**:
- $\text{tr}(A) = \sum \lambda_i$ and $\det(A) = \prod \lambda_i$. So $\det A = 0 \iff$ some eigenvalue is 0 (singular).
- $A^k$ has eigenvalues $\lambda^k$; $A^{-1}$ has $1/\lambda$; $A + cI$ has $\lambda + c$ (same eigenvectors).
- **Eigendecomposition**: if $A$ has $n$ independent eigenvectors, $A = Q\Lambda Q^{-1}$.
- **Symmetric matrices** (covariance, $X^\top X$, Hessians): eigenvalues are **real**, eigenvectors can be chosen **orthonormal**, so $A = Q\Lambda Q^\top$ (spectral theorem). Not every matrix is diagonalizable (e.g. a shear).

**Power iteration** finds the dominant eigenpair: repeat $v \leftarrow Av / \|Av\|$. It converges to the eigenvector of the largest $|\lambda|$ at rate $|\lambda_2/\lambda_1|$ per step (needs a gap and a start vector with a component along $v_1$). The eigenvalue is the **Rayleigh quotient** $\lambda = v^\top A v / v^\top v$. Variants: inverse iteration (smallest), Lanczos/Arnoldi (large sparse), used in PageRank and spectral methods.

**ML links**:
- **PCA**: eigenvectors of the covariance matrix are the principal directions; eigenvalues are the variance along them. Explained variance ratio $= \lambda_i / \sum\lambda$.
- **Markov chains / PageRank**: the stationary distribution is the eigenvector of the transition matrix with $\lambda = 1$.
- **Optimization**: for a quadratic, gradient descent is stable iff $\eta < 2/\lambda_{\max}$ and its speed depends on the condition number $\lambda_{\max}/\lambda_{\min}$.
- **Spectral clustering** uses eigenvectors of the graph Laplacian.

## Worked example
Let $A = \begin{pmatrix}2&1\\1&2\end{pmatrix}$ (symmetric).
- Characteristic polynomial: $\det\begin{pmatrix}2-\lambda&1\\1&2-\lambda\end{pmatrix} = (2-\lambda)^2 - 1 = \lambda^2 - 4\lambda + 3 = (\lambda-3)(\lambda-1)$. So $\lambda = 3, 1$.
- Check: trace $= 4 = 3+1$; det $= 3 = 3\cdot1$.
- $\lambda = 3$: $(A-3I)v = 0 \Rightarrow v = (1,1)/\sqrt2$. $\lambda=1$: $v = (1,-1)/\sqrt2$. They are orthogonal, as the spectral theorem promises.
- Power iteration from $(1, 0)$: $A(1,0) = (2,1)$, then $A(2,1) = (5,4)$, then $A(5,4) = (14,13)$. Direction $\to (1,1)$, and the ratio of the second to first eigenvalue is $1/3$, so error shrinks about 3x per step. Rayleigh quotient at $(14,13)$: $v^\top Av/v^\top v = (14\cdot41 + 13\cdot40)/(14^2+13^2) = 1094/365 \approx 2.997$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A 2x2 symmetric matrix has trace 10 and determinant 24. What are its eigenvalues?",
  "options": [
    "5 and 5",
    "4 and 6",
    "2 and 12",
    "3 and 8"
  ],
  "answer": 1,
  "explanation": "Sum = 10, product = 24, so the roots of lambda^2 - 10 lambda + 24 = 0 are 4 and 6."
}
```

```quiz
{
  "id": "q2",
  "question": "In PCA, what do the eigenvalues of the covariance matrix represent?",
  "options": [
    "The mean of each feature",
    "The correlation between samples",
    "The variance of the data along each principal direction",
    "The number of clusters"
  ],
  "answer": 2,
  "explanation": "Each eigenvector is a principal axis and its eigenvalue is the variance of the projected data along that axis; ratios give explained variance."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `power_iteration(A, iters=200)` for a square matrix given as a list of lists. Start from `v = [1.0, 0.0, 0.0, ...]` (the first basis vector), repeat `v = A v / ||A v||` and return `(lam, v)` where `lam` is the Rayleigh quotient of the final unit `v`. Also write `matvec(A, v)`.",
  "starterCode": "import math\n\ndef matvec(A, v):\n    pass\n\ndef power_iteration(A, iters=200):\n    pass\n\nA = [[2, 1], [1, 2]]\nprint(power_iteration(A))",
  "tests": "import math\nA = [[2, 1], [1, 2]]\nlam, v = power_iteration(A)\nassert abs(lam - 3) < 1e-6\nassert abs(math.sqrt(sum(x * x for x in v)) - 1) < 1e-9\nassert abs(abs(v[0]) - math.sqrt(0.5)) < 1e-6 and abs(v[0] - v[1]) < 1e-6\nAv = matvec(A, v)\nassert all(abs(Av[i] - lam * v[i]) < 1e-5 for i in range(2))\nB = [[4, 1, 0], [1, 3, 1], [0, 1, 2]]\nlam, v = power_iteration(B, 500)\nBv = matvec(B, v)\nassert all(abs(Bv[i] - lam * v[i]) < 1e-6 for i in range(3))\nassert lam > 4.5\nD = [[5, 0], [0, 1]]\nassert abs(power_iteration(D, 50)[0] - 5) < 1e-9",
  "solution": "import math\n\ndef matvec(A, v):\n    return [sum(a * b for a, b in zip(row, v)) for row in A]\n\ndef power_iteration(A, iters=200):\n    n = len(A)\n    v = [1.0] + [0.0] * (n - 1)\n    for _ in range(iters):\n        w = matvec(A, v)\n        nrm = math.sqrt(sum(x * x for x in w))\n        v = [x / nrm for x in w]\n    Av = matvec(A, v)\n    lam = sum(a * b for a, b in zip(v, Av))\n    return lam, v",
  "hints": [
    "Rayleigh quotient with a unit v: `lam = dot(v, matvec(A, v))`.",
    "Normalize with the L2 norm each iteration so values don't overflow.",
    "Verify on [[2,1],[1,2]]: you should get 3 and a vector close to (0.707, 0.707)."
  ]
}
```

> [!TIP] Interview tips
> - Define eigenvectors as directions only stretched by A; mention trace = sum and det = product of eigenvalues as quick checks.
> - For symmetric matrices, say the eigenvalues are real and eigenvectors orthogonal (spectral theorem), the reason PCA is well behaved.
> - Know power iteration and when it fails (no spectral gap or a start vector orthogonal to the dominant eigenvector).
