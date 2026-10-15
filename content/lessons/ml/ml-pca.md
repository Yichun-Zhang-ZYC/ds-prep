---
id: ml-pca
title: PCA
estimatedMinutes: 14
difficulty: medium
tags: [ml, unsupervised, dimensionality-reduction, linear-algebra]
---

## Why it matters
Principal Component Analysis is the go-to dimensionality reduction method and a favorite linear-algebra interview topic: "what are the principal components?", "how much variance is explained?", "when shouldn't you use PCA?"

## Concept
PCA finds orthogonal directions (principal components) that capture the most variance:
1. **Center** the data (and usually **standardize**, so features in large units don't dominate).
2. Compute the covariance matrix $C = \frac{1}{n-1} X^\top X$.
3. Its **eigenvectors** are the components; **eigenvalues** $\lambda_j$ are the variance along each.
4. Project onto the top $k$ components: $Z = X W_k$.

In practice it's computed with the **SVD** $X = U S V^\top$: components are the columns of $V$, and $\lambda_j = s_j^2/(n-1)$.

**Explained variance ratio** of component $j$: $\lambda_j / \sum_i \lambda_i$. Choose $k$ to keep e.g. 90–95% of variance, or from the scree-plot elbow.

Uses: compress features, remove multicollinearity, speed up downstream models, denoise, visualize in 2-D.

Limitations:
- **Linear** only; curved structure needs kernel PCA, autoencoders, or UMAP for visualization.
- Maximizes variance, not predictive power: a low-variance direction can matter most for the target (consider PLS or supervised methods).
- Components are mixtures of features, so they're harder to interpret.
- Sensitive to scaling and outliers.

## Worked example
Two standardized features with correlation 0.8. Covariance matrix $\begin{pmatrix}1 & 0.8\\0.8 & 1\end{pmatrix}$ has eigenvalues 1.8 and 0.2 with eigenvectors $(1,1)/\sqrt2$ and $(1,-1)/\sqrt2$. PC1 (the "average" direction) explains $1.8/2 = 90\%$ of the variance, so one dimension keeps most of the information.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why standardize features before PCA?",
  "options": ["PCA requires normal data", "Otherwise features with large numeric ranges dominate the variance and the components", "To make the components orthogonal", "To reduce the number of components"],
  "answer": 1,
  "explanation": "PCA is variance-driven; a feature measured in dollars would swamp one measured in ratios."
}
```

```quiz
{
  "id": "q2",
  "question": "PCA keeps the top 10 components of 200 features. A classifier on them performs worse than on raw features. A likely reason?",
  "options": ["PCA always loses accuracy", "The discarded low-variance directions contained signal relevant to the target", "PCA components are correlated", "Too few training rows"],
  "answer": 1,
  "explanation": "PCA is unsupervised: it ignores the label, so variance and predictive value can disagree."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "With numpy, write `pca(X, k)` returning `(components, explained_ratio, Z)`: center X, compute the SVD, `components` = top-k right singular vectors as rows (k × d), `explained_ratio` = variance ratio of those k components, and `Z` = projected data (n × k).",
  "setup": "import numpy as np",
  "packages": ["numpy"],
  "starterCode": "import numpy as np\n\ndef pca(X, k):\n    pass\n\nrng = np.random.default_rng(0)\nt = rng.normal(size=200)\nX = np.column_stack([t, 2 * t + 0.1 * rng.normal(size=200)])\ncomps, ratio, Z = pca(X, 1)\nprint(comps, ratio, Z.shape)",
  "tests": "rng = np.random.default_rng(0)\nt = rng.normal(size=200)\nX = np.column_stack([t, 2 * t + 0.1 * rng.normal(size=200)])\ncomps, ratio, Z = pca(X, 1)\nassert comps.shape == (1, 2) and Z.shape == (200, 1)\nassert ratio[0] > 0.99\nv = comps[0] / np.linalg.norm(comps[0])\nassert abs(abs(v @ np.array([1, 2]) / np.sqrt(5)) - 1) < 1e-2\ncomps2, ratio2, Z2 = pca(X, 2)\nassert abs(ratio2.sum() - 1) < 1e-9\nassert abs(Z2.var(axis=0, ddof=1)[0] - (np.linalg.svd(X - X.mean(0), compute_uv=False)[0] ** 2) / 199) < 1e-9",
  "solution": "import numpy as np\n\ndef pca(X, k):\n    Xc = X - X.mean(axis=0)\n    U, S, Vt = np.linalg.svd(Xc, full_matrices=False)\n    var = S ** 2\n    comps = Vt[:k]\n    ratio = var[:k] / var.sum()\n    Z = Xc @ comps.T\n    return comps, ratio, Z",
  "hints": ["np.linalg.svd(Xc, full_matrices=False) returns U, S, Vt.", "Explained variance is proportional to S²."]
}
```

> [!TIP] Interview tips
> - Describe PCA as "rotate to the directions of maximum variance, keep the top k", then mention eigenvectors / SVD.
> - Always mention centering and standardizing.
> - Know the limits: linear, unsupervised (ignores target), less interpretable.
