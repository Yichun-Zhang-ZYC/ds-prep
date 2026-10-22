---
id: math-svd
title: "SVD"
estimatedMinutes: 13
difficulty: medium
tags: [math, linear-algebra, svd, low-rank]
---

## Why it matters
The singular value decomposition works for any matrix and is the workhorse behind PCA, low-rank approximation, LSA, recommender factorization, pseudo-inverses and LoRA. It is the most-asked linear algebra topic in ML interviews after eigenvectors.

## Concept
**Definition**: any $A \in \mathbb{R}^{m\times n}$ factors as $A = U\Sigma V^\top$.
- $U$ ($m\times m$) and $V$ ($n\times n$) are orthogonal: columns are the **left/right singular vectors**.
- $\Sigma$ is diagonal with **singular values** $\sigma_1 \ge \sigma_2 \ge \dots \ge 0$.
- Geometry: rotate ($V^\top$), stretch axes by $\sigma_i$ ($\Sigma$), rotate ($U$). The unit sphere maps to an ellipsoid with semi-axes $\sigma_i u_i$.
- Equivalent sum form: $A = \sum_i \sigma_i u_i v_i^\top$ (a sum of rank-1 pieces). The **compact/thin SVD** keeps only the $r = \text{rank}(A)$ nonzero terms.

**Link to eigen**: $A^\top A = V\Sigma^\top\Sigma V^\top$, so the $v_i$ are eigenvectors of $A^\top A$ and $\sigma_i^2$ are its eigenvalues (and likewise $AA^\top$ for $u_i$). Unlike eigendecomposition, SVD exists for **every** (even rectangular) matrix with real, non-negative $\sigma_i$.

**Facts to know**:
- $\text{rank}(A)$ = number of non-zero $\sigma_i$. $\|A\|_2 = \sigma_1$ (spectral norm), $\|A\|_F^2 = \sum\sigma_i^2$. $|\det A| = \prod\sigma_i$ for square $A$.
- Condition number $\kappa = \sigma_1/\sigma_r$: large means ill-conditioned.
- **Eckart-Young**: the best rank-$k$ approximation (in spectral and Frobenius norm) is $A_k = \sum_{i\le k}\sigma_i u_iv_i^\top$. Errors: $\|A - A_k\|_2 = \sigma_{k+1}$, $\|A-A_k\|_F^2 = \sum_{i>k}\sigma_i^2$.
- **Pseudo-inverse**: $A^+ = V\Sigma^+U^\top$ (invert non-zero $\sigma_i$); gives the least-squares / minimum-norm solution.
- Storage for rank-$k$: $k(m+n+1)$ numbers instead of $mn$.

**ML links**:
- **PCA**: center $X$, then $X = U\Sigma V^\top$; principal directions are columns of $V$, variances are $\sigma_i^2/(n-1)$. SVD is the numerically preferred way (no need to form $X^\top X$).
- **LSA / recommenders**: truncated SVD of a term-document or user-item matrix gives low-dimensional embeddings.
- **LoRA**: updates a weight as $W + BA$ with rank $r \ll d$. **Image/embedding compression** keeps the top-$k$ components.
- **Randomized / truncated SVD** scales to huge matrices; the cost of full SVD is $O(\min(mn^2, m^2n))$.

## Worked example
Let $A = \begin{pmatrix}3&0\\4&5\end{pmatrix}$.
- $A^\top A = \begin{pmatrix}25&20\\20&25\end{pmatrix}$ with eigenvalues $45$ and $5$ (eigenvectors $(1,1)/\sqrt2$ and $(1,-1)/\sqrt2$). So $\sigma_1 = \sqrt{45} \approx 6.708$, $\sigma_2 = \sqrt5 \approx 2.236$.
- Checks: $\sigma_1\sigma_2 = \sqrt{225} = 15 = |\det A|$; $\sigma_1^2 + \sigma_2^2 = 50 = 9+0+16+25 = \|A\|_F^2$.
- Left vector for $\sigma_1$: $u_1 = Av_1/\sigma_1 = (3, 9)/\sqrt2/\sqrt{45} = (1,3)/\sqrt{10}$.
- Best rank-1 approximation: $A_1 = \sigma_1u_1v_1^\top = \begin{pmatrix}1.5&1.5\\4.5&4.5\end{pmatrix}$ (rows are scaled copies of $(1,1)$). Its error is $A - A_1 = \begin{pmatrix}1.5&-1.5\\-0.5&0.5\end{pmatrix}$ with $\|A-A_1\|_F^2 = 2.25+2.25+0.25+0.25 = 5 = \sigma_2^2$.
- Rank-1 keeps $45/50 = 90\%$ of the squared Frobenius "energy".

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which statement about SVD versus eigendecomposition is correct?",
  "options": [
    "SVD only exists for symmetric matrices",
    "Singular values can be negative",
    "SVD exists for any matrix, and sigma_i^2 are the eigenvalues of A^T A",
    "Left and right singular vectors are always equal"
  ],
  "answer": 2,
  "explanation": "SVD is defined for every real matrix; singular values are non-negative, and the right singular vectors diagonalize A^T A with eigenvalues sigma_i^2."
}
```

```quiz
{
  "id": "q2",
  "question": "A matrix has singular values 10, 5, 1, 0.1. What is the Frobenius error of its best rank-2 approximation?",
  "options": [
    "sqrt(1.01)",
    "1",
    "5",
    "sqrt(125)"
  ],
  "answer": 1,
  "explanation": "By Eckart-Young the squared Frobenius error is the sum of the discarded sigma_i^2 = 1 + 0.01 = 1.01, so the error is sqrt(1.01). The spectral-norm error would be 1."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `top_singular(A, iters=300)` for a matrix (list of lists) by running power iteration on $A^\\top A$ starting from `v = [1, 0, ..., 0]`. Return `(sigma, u, v)` with `v` a unit right singular vector, `sigma = ||A v||` and `u = A v / sigma`. Then write `rank1(A)` returning the matrix $\\sigma u v^\\top$ (the best rank-1 approximation).",
  "starterCode": "import math\n\ndef top_singular(A, iters=300):\n    pass\n\ndef rank1(A):\n    pass\n\nA = [[3, 0], [4, 5]]\nprint(top_singular(A)[0], rank1(A))",
  "tests": "import math\nA = [[3, 0], [4, 5]]\ns, u, v = top_singular(A)\nassert abs(s - math.sqrt(45)) < 1e-6\nassert abs(math.sqrt(sum(x * x for x in u)) - 1) < 1e-9\nassert abs(math.sqrt(sum(x * x for x in v)) - 1) < 1e-9\nR = rank1(A)\nexp = [[1.5, 1.5], [4.5, 4.5]]\nassert all(abs(R[i][j] - exp[i][j]) < 1e-5 for i in range(2) for j in range(2))\nerr = sum((A[i][j] - R[i][j]) ** 2 for i in range(2) for j in range(2))\nassert abs(err - 5) < 1e-4\nB = [[2, 4], [1, 2], [3, 6]]\ns, u, v = top_singular(B)\nassert abs(s - math.sqrt(70)) < 1e-6\nR = rank1(B)\nassert all(abs(R[i][j] - B[i][j]) < 1e-6 for i in range(3) for j in range(2))",
  "solution": "import math\n\ndef top_singular(A, iters=300):\n    m, n = len(A), len(A[0])\n    v = [1.0] + [0.0] * (n - 1)\n    for _ in range(iters):\n        Av = [sum(A[i][j] * v[j] for j in range(n)) for i in range(m)]\n        w = [sum(A[i][j] * Av[i] for i in range(m)) for j in range(n)]\n        nrm = math.sqrt(sum(x * x for x in w))\n        v = [x / nrm for x in w]\n    Av = [sum(A[i][j] * v[j] for j in range(n)) for i in range(m)]\n    sigma = math.sqrt(sum(x * x for x in Av))\n    u = [x / sigma for x in Av]\n    return sigma, u, v\n\ndef rank1(A):\n    s, u, v = top_singular(A)\n    return [[s * ui * vj for vj in v] for ui in u]",
  "hints": [
    "Per iteration: `w = A^T (A v)`, then normalize w to get the next v.",
    "After convergence, `sigma = ||A v||`, `u = A v / sigma`.",
    "For A = [[3,0],[4,5]] expect sigma = sqrt(45) and a squared Frobenius error of 5."
  ]
}
```

> [!TIP] Interview tips
> - Write A = U Sigma V^T and explain it as rotate, stretch, rotate; connect to PCA through the covariance eigenvectors.
> - Quote Eckart-Young: truncated SVD is the optimal low-rank approximation, with error given by the discarded singular values.
> - Mention pseudo-inverse and condition number as practical uses, and truncated/randomized SVD for scale.
