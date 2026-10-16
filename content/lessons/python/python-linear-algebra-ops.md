---
id: python-linear-algebra-ops
title: Linear algebra ops
estimatedMinutes: 12
difficulty: medium
tags: [python, numpy, linear-algebra]
---

## Why it matters
Linear regression, PCA, embeddings similarity and neural network layers are all matrix operations. Interviewers ask you to implement OLS, cosine similarity or a projection in NumPy, and to avoid numerically unstable choices like explicit inverses.

## Concept
```python
A @ B                    # matrix multiply (same as np.matmul); (n,k) @ (k,m) → (n,m)
A * B                    # ELEMENTWISE product, not matrix multiply
v @ w                    # dot product of 1-D vectors
np.linalg.norm(v)        # Euclidean length; axis=1 for row norms
np.linalg.solve(A, b)    # solve A x = b (preferred over inv(A) @ b)
np.linalg.lstsq(X, y, rcond=None)   # least squares, handles rank deficiency
np.linalg.inv(A); np.linalg.det(A)
w, V = np.linalg.eigh(S) # eigen-decomposition of a symmetric matrix
U, s, Vt = np.linalg.svd(X, full_matrices=False)
np.einsum("ij,jk->ik", A, B)   # explicit index notation
```

- Avoid computing `inv(X.T @ X)`: it's slower and less accurate than `solve` or `lstsq`, especially when features are nearly collinear (ill-conditioned; check `np.linalg.cond`).
- **Cosine similarity** of rows: normalize each row to unit length, then `A_n @ B_n.T`.
- **Batched** ops: `@` broadcasts over leading dimensions: (b, n, k) @ (b, k, m) → (b, n, m).
- Shapes must align on the inner dimension; a 1-D vector acts as a row on the left and a column on the right.

## Worked example
Cosine similarity between 3 query embeddings and 1,000 documents:

```python
Q = Q / np.linalg.norm(Q, axis=1, keepdims=True)      # (3, d)
D = D / np.linalg.norm(D, axis=1, keepdims=True)      # (1000, d)
S = Q @ D.T                                           # (3, 1000)
top5 = np.argsort(-S, axis=1)[:, :5]
```

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A is (100, 20) and B is (20, 5). What is the shape of A @ B, and is A * B valid?",
  "options": ["(100, 5); A * B is invalid (shapes don't broadcast)", "(20, 20); A * B is valid", "(100, 5); A * B is the same as A @ B", "(5, 100); A * B is invalid"],
  "answer": 0,
  "explanation": "Inner dimensions (20) match for @. Elementwise * would need broadcastable shapes, which (100, 20) and (20, 5) aren't."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `ols(X, y)` returning least-squares coefficients **with an intercept first** (prepend a column of ones; use `np.linalg.lstsq`). Write `cosine_sim_matrix(A, B)` returning the (n, m) cosine similarities between rows. Write `project(v, u)` returning the projection of vector v onto vector u.",
  "setup": "import numpy as np",
  "packages": ["numpy"],
  "starterCode": "import numpy as np\n\ndef ols(X, y):\n    pass\n\ndef cosine_sim_matrix(A, B):\n    pass\n\ndef project(v, u):\n    pass\n\nX = np.array([[1.], [2.], [3.], [4.]])\nprint(ols(X, np.array([2., 4., 5., 7.])))",
  "tests": "X = np.array([[1.], [2.], [3.], [4.]])\nassert np.allclose(ols(X, np.array([2., 4., 5., 7.])), [0.5, 1.6])\nrng = np.random.default_rng(0)\nX2 = rng.normal(size=(30, 2))\ny2 = 3 + X2 @ np.array([1.5, -2.0])\nassert np.allclose(ols(X2, y2), [3, 1.5, -2.0])\nS = cosine_sim_matrix(np.array([[1., 0.], [1., 1.]]), np.array([[2., 0.], [0., 3.]]))\nassert np.allclose(S, [[1, 0], [1 / np.sqrt(2), 1 / np.sqrt(2)]])\nassert np.allclose(project(np.array([3., 4.]), np.array([1., 0.])), [3, 0])",
  "solution": "import numpy as np\n\ndef ols(X, y):\n    Xb = np.column_stack([np.ones(len(X)), X])\n    coef, *_ = np.linalg.lstsq(Xb, y, rcond=None)\n    return coef\n\ndef cosine_sim_matrix(A, B):\n    An = A / np.linalg.norm(A, axis=1, keepdims=True)\n    Bn = B / np.linalg.norm(B, axis=1, keepdims=True)\n    return An @ Bn.T\n\ndef project(v, u):\n    return (v @ u) / (u @ u) * u",
  "hints": ["np.column_stack([np.ones(n), X]) adds the intercept column.", "Projection of v onto u = (v·u / u·u) u."]
}
```

> [!TIP] Interview tips
> - Distinguish `@` (matrix product) from `*` (elementwise).
> - Prefer `solve`/`lstsq` over `inv`, and mention conditioning with collinear features.
> - Normalize rows then matrix-multiply for cosine similarity; it's the core of vector search.
