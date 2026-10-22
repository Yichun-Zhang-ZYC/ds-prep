---
id: math-vectors-dot-product-norms
title: "Vectors, dot product, norms (L1, L2)"
estimatedMinutes: 10
difficulty: easy
tags: [math, linear-algebra, vectors, norms]
---

## Why it matters
Almost every ML object is a vector: a feature row, an embedding, a weight vector, a gradient. Dot products drive linear models, attention and similarity search; norms drive regularization (L1/L2), distance metrics and gradient clipping. Interviewers expect you to move fluently between the algebra and the geometry.

## Concept
A **vector** $x \in \mathbb{R}^n$ is an ordered list of numbers: a point, or an arrow from the origin.

**Dot product**: $x \cdot y = \sum_i x_i y_i = \|x\|_2 \|y\|_2 \cos\theta$.
- Sign tells alignment: positive (acute angle), zero (**orthogonal**), negative (obtuse).
- A linear model's score is $w \cdot x + b$; attention scores are scaled dot products of queries and keys.
- It is symmetric and linear in each argument: $x \cdot (ay + bz) = a\,x\cdot y + b\,x\cdot z$.

**Norms** measure length ($p \ge 1$): $\|x\|_p = \left(\sum_i |x_i|^p\right)^{1/p}$.
- **L2** (Euclidean): $\sqrt{\sum x_i^2} = \sqrt{x \cdot x}$. Ridge penalizes $\|w\|_2^2$, which shrinks weights smoothly.
- **L1** (Manhattan): $\sum |x_i|$. Lasso penalizes it; the diamond-shaped unit ball has corners on the axes, so solutions tend to be **sparse**.
- **L-infinity**: $\max_i |x_i|$. **L0** "norm": the number of non-zeros (not a true norm, non-convex).
- Always: $\|x\|_\infty \le \|x\|_2 \le \|x\|_1 \le \sqrt n\,\|x\|_2$.

**Cosine similarity**: $\cos\theta = \dfrac{x\cdot y}{\|x\|_2\|y\|_2}$ ignores magnitude and compares direction only. For unit vectors it equals the dot product, and $\|x-y\|_2^2 = 2 - 2\cos\theta$, so cosine ranking equals Euclidean ranking after normalization.

**Unit vector**: $\hat x = x / \|x\|_2$. **Cauchy-Schwarz**: $|x\cdot y| \le \|x\|\|y\|$, which is why cosine lies in $[-1, 1]$.

## Worked example
Let $a = (3, 4)$ and $b = (4, 3)$.
- $a \cdot b = 12 + 12 = 24$.
- $\|a\|_2 = \sqrt{9+16} = 5$, $\|b\|_2 = 5$, so $\cos\theta = 24/25 = 0.96$ (about 16 degrees apart).
- $\|a\|_1 = 7$, $\|a\|_\infty = 4$; check the ordering $4 \le 5 \le 7$.
- Euclidean distance: $\|a-b\|_2 = \|(-1, 1)\|_2 = \sqrt 2 \approx 1.414$. Normalized, $\|\hat a-\hat b\|^2 = 2 - 2(0.96) = 0.08$.
- Scaling $b$ to $10b$ changes the dot product to 240 but leaves the cosine at 0.96.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why does an L1 penalty tend to produce sparse weights while L2 does not?",
  "options": [
    "L1 is differentiable everywhere",
    "The L1 ball has corners on the axes, so the optimum often lands where some coordinates are exactly 0",
    "L1 penalizes large weights more than L2",
    "L1 only works with a linear kernel"
  ],
  "answer": 1,
  "explanation": "The L1 constraint region is a diamond with vertices on the axes; the loss contours often first touch it at a vertex. L2's round ball has no such corners, so it shrinks weights without zeroing them."
}
```

```quiz
{
  "id": "q2",
  "question": "Vectors x and y are scaled by 10 (y -> 10y). What happens?",
  "options": [
    "Cosine similarity and dot product both scale by 10",
    "Both are unchanged",
    "Dot product scales by 10; cosine is unchanged",
    "Cosine changes, dot product is unchanged"
  ],
  "answer": 2,
  "explanation": "The dot product is linear in each argument, so it scales by 10. Cosine divides by both norms, so the scale cancels. This is why cosine is preferred when magnitude (document length, popularity) is a nuisance."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement in pure Python (lists of numbers): `dot(x, y)`, `norm(x, p)` for p = 1, 2 or `'inf'`, and `cosine(x, y)` (return 0.0 if either vector has zero norm). Also `normalize(x)` returning the unit L2 vector.",
  "starterCode": "import math\n\ndef dot(x, y):\n    pass\n\ndef norm(x, p=2):\n    pass\n\ndef cosine(x, y):\n    pass\n\ndef normalize(x):\n    pass\n\na, b = [3, 4], [4, 3]\nprint(dot(a, b), norm(a, 1), norm(a, 2), norm(a, 'inf'), cosine(a, b))",
  "tests": "a, b = [3, 4], [4, 3]\nassert dot(a, b) == 24\nassert norm(a, 1) == 7 and norm(a, 'inf') == 4\nassert abs(norm(a, 2) - 5) < 1e-12\nassert abs(cosine(a, b) - 0.96) < 1e-12\nassert abs(cosine(a, [10 * v for v in b]) - 0.96) < 1e-12\nassert abs(cosine([1, 0], [0, 1])) < 1e-12\nassert cosine([0, 0], [1, 2]) == 0.0\nn = normalize([3, 4])\nassert abs(n[0] - 0.6) < 1e-12 and abs(n[1] - 0.8) < 1e-12\nassert abs(norm(normalize([1, -2, 2]), 2) - 1) < 1e-12",
  "solution": "import math\n\ndef dot(x, y):\n    return sum(a * b for a, b in zip(x, y))\n\ndef norm(x, p=2):\n    if p == 'inf':\n        return max(abs(v) for v in x)\n    if p == 1:\n        return sum(abs(v) for v in x)\n    return math.sqrt(dot(x, x))\n\ndef cosine(x, y):\n    nx, ny = norm(x, 2), norm(y, 2)\n    if nx == 0 or ny == 0:\n        return 0.0\n    return dot(x, y) / (nx * ny)\n\ndef normalize(x):\n    n = norm(x, 2)\n    return [v / n for v in x]",
  "hints": [
    "`norm(x, 2)` is `sqrt(dot(x, x))`.",
    "Handle `'inf'` with `max(abs(v) for v in x)`.",
    "Check: the normalized vector must have L2 norm 1."
  ]
}
```

> [!TIP] Interview tips
> - Know the geometry: dot product = length times length times cosine; zero means orthogonal.
> - Explain sparsity from L1 geometrically (diamond corners), not just 'L1 shrinks to zero'.
> - Cosine vs Euclidean: they agree on unit vectors, so normalize embeddings before nearest-neighbor search if you want either.
