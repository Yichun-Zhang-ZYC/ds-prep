---
id: math-projections
title: "Projections"
estimatedMinutes: 11
difficulty: medium
tags: [math, linear-algebra, projections, least-squares]
---

## Why it matters
Least-squares regression is an orthogonal projection, and so are PCA reconstruction and Gram-Schmidt/QR. Seeing OLS as "project y onto the column space of X" gives the cleanest explanation of residuals, the hat matrix and why residuals are uncorrelated with features.

## Concept
**Projection onto a vector** $a$: $\text{proj}_a(b) = \dfrac{a\cdot b}{a\cdot a}\,a = \dfrac{aa^\top}{a^\top a}\,b$. The residual $b - \text{proj}_a(b)$ is **orthogonal** to $a$ (Pythagoras: $\|b\|^2 = \|\text{proj}\|^2 + \|\text{resid}\|^2$). The scalar coefficient $\frac{a\cdot b}{a\cdot a}$ is the 1-D least-squares slope without intercept.

**Projection onto a subspace** spanned by the columns of $A$ (full column rank): $p = A\hat x$ where $\hat x$ solves the **normal equations** $A^\top A\hat x = A^\top b$, so
$$P = A(A^\top A)^{-1}A^\top, \qquad p = Pb.$$
- $P$ is **symmetric** and **idempotent**: $P^2 = P$ (projecting twice changes nothing). Eigenvalues are 0 or 1; $\text{rank}(P) = \text{tr}(P) = $ dimension of the subspace.
- $I - P$ projects onto the orthogonal complement; the residual $e = (I-P)b$ satisfies $A^\top e = 0$.
- With an **orthonormal basis** $Q$ (columns), it simplifies to $P = QQ^\top$: $p = \sum_i (q_i\cdot b)\,q_i$, no inverse needed.
- **Gram-Schmidt** builds an orthonormal basis: subtract from each new vector its projections onto the previous ones, then normalize. This is the QR decomposition, the stable way to solve least squares.

**Least squares = projection**: $\hat y = X\hat\beta = Py$ with hat matrix $H = X(X^\top X)^{-1}X^\top$. Residuals satisfy $X^\top e = 0$ (orthogonal to every feature, including the intercept column, so residuals sum to 0). $\text{tr}(H) = $ number of parameters; the diagonal $h_{ii}$ is the **leverage** of point $i$.

**PCA as projection**: project centered data onto the top-$k$ eigenvectors $V_k$: $\hat X = XV_kV_k^\top$. This minimizes squared reconstruction error among all rank-$k$ projections (equivalently, maximizes retained variance).

Pitfalls: the projection is **orthogonal** only in the standard inner product; weighted least squares uses a different inner product. If $A$ is rank-deficient, $A^\top A$ is singular (use the pseudo-inverse).

## Worked example
**1-D**: project $b = (2,3)$ onto $a = (1,1)$.
- $\dfrac{a\cdot b}{a\cdot a} = \dfrac{5}{2}$, so $p = (2.5, 2.5)$ and the residual is $(-0.5, 0.5)$.
- Orthogonality: $(-0.5)(1) + (0.5)(1) = 0$. Pythagoras: $\|b\|^2 = 13 = \|p\|^2 + \|e\|^2 = 12.5 + 0.5$.

**Regression through the origin**: points $x = (1,2,3)$, $y = (1,3,2)$. Project $y$ onto $x$: $\hat\beta = \dfrac{x\cdot y}{x\cdot x} = \dfrac{1+6+6}{1+4+9} = \dfrac{13}{14} \approx 0.929$. Fitted $\hat y = \beta x \approx (0.93, 1.86, 2.79)$; residuals $\approx (0.07, 1.14, -0.79)$; check $x\cdot e = 0.07 + 2.29 - 2.36 \approx 0$.

**Subspace**: project $b = (1,2,3)$ onto the plane spanned by $(1,0,0)$ and $(1,1,0)$ (the xy-plane). That basis is not orthogonal, so first orthonormalize: $q_1 = (1,0,0)$, $q_2 = (0,1,0)$. Then $p = 1\cdot q_1 + 2\cdot q_2 = (1,2,0)$ and the residual $(0,0,3)$ is orthogonal to the plane.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "For a projection matrix P onto a 3-dimensional subspace of R^10, what is trace(P)?",
  "options": [
    "10",
    "3",
    "7",
    "1"
  ],
  "answer": 1,
  "explanation": "P has eigenvalue 1 on the subspace (3 directions) and 0 elsewhere, so trace = rank = 3. In regression, trace of the hat matrix = number of fitted parameters."
}
```

```quiz
{
  "id": "q2",
  "question": "In OLS with an intercept, which statement about residuals e = y - X beta_hat is true?",
  "options": [
    "They are orthogonal to y",
    "They have positive mean",
    "They sum to zero and are orthogonal to every column of X",
    "They are independent of the noise"
  ],
  "answer": 2,
  "explanation": "The fitted values are the orthogonal projection of y onto the column space of X, so X^T e = 0. With an intercept column of ones, this implies the residuals sum to 0."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `project(b, a)` (projection of b onto vector a), `gram_schmidt(vectors)` returning an orthonormal basis of the span (skip vectors whose residual norm is < 1e-9), and `project_subspace(b, vectors)` that projects b onto the span of the given vectors using the orthonormal basis.",
  "starterCode": "import math\n\ndef dot(x, y):\n    return sum(a * b for a, b in zip(x, y))\n\ndef project(b, a):\n    pass\n\ndef gram_schmidt(vectors):\n    pass\n\ndef project_subspace(b, vectors):\n    pass\n\nprint(project([2, 3], [1, 1]))",
  "tests": "import math\np = project([2, 3], [1, 1])\nassert abs(p[0] - 2.5) < 1e-12 and abs(p[1] - 2.5) < 1e-12\nx, y = [1, 2, 3], [1, 3, 2]\nbeta = dot(x, y) / dot(x, x)\nassert abs(beta - 13 / 14) < 1e-12\npy = project(y, x)\nassert all(abs(py[i] - beta * x[i]) < 1e-12 for i in range(3))\ne = [y[i] - py[i] for i in range(3)]\nassert abs(dot(e, x)) < 1e-12\nQ = gram_schmidt([[1, 0, 0], [1, 1, 0], [2, 1, 0]])\nassert len(Q) == 2\nfor i in range(len(Q)):\n    assert abs(dot(Q[i], Q[i]) - 1) < 1e-9\n    for j in range(i):\n        assert abs(dot(Q[i], Q[j])) < 1e-9\nps = project_subspace([1, 2, 3], [[1, 0, 0], [1, 1, 0]])\nassert all(abs(ps[i] - [1, 2, 0][i]) < 1e-9 for i in range(3))\nps2 = project_subspace(ps, [[1, 0, 0], [1, 1, 0]])\nassert all(abs(ps2[i] - ps[i]) < 1e-9 for i in range(3))\npp = project_subspace([1, 2, 3], [[1, 1, 0], [0, 1, 1]])\nr = [a - b for a, b in zip([1, 2, 3], pp)]\nassert abs(dot(r, [1, 1, 0])) < 1e-9 and abs(dot(r, [0, 1, 1])) < 1e-9",
  "solution": "import math\n\ndef dot(x, y):\n    return sum(a * b for a, b in zip(x, y))\n\ndef project(b, a):\n    c = dot(a, b) / dot(a, a)\n    return [c * v for v in a]\n\ndef gram_schmidt(vectors):\n    basis = []\n    for v in vectors:\n        w = list(map(float, v))\n        for q in basis:\n            c = dot(q, v)\n            w = [wi - c * qi for wi, qi in zip(w, q)]\n        n = math.sqrt(dot(w, w))\n        if n > 1e-9:\n            basis.append([wi / n for wi in w])\n    return basis\n\ndef project_subspace(b, vectors):\n    out = [0.0] * len(b)\n    for q in gram_schmidt(vectors):\n        c = dot(q, b)\n        out = [o + c * qi for o, qi in zip(out, q)]\n    return out",
  "hints": [
    "`project(b, a) = (a.b / a.a) * a`.",
    "Gram-Schmidt: `w = v - sum((q.v) q for q in basis)`; if `||w||` is large enough, append `w / ||w||`.",
    "With an orthonormal basis, `project_subspace = sum((q.b) q)`."
  ]
}
```

> [!TIP] Interview tips
> - Describe OLS as an orthogonal projection of y onto the column space of X: residual orthogonal to features, hat matrix symmetric and idempotent.
> - Know trace(H) = number of parameters and h_ii as leverage, which shows up in regression diagnostics.
> - Mention QR (Gram-Schmidt) for solving least squares stably instead of the normal equations.
