---
id: ml-support-vector-machines
title: Support Vector Machines (kernel trick)
estimatedMinutes: 15
difficulty: hard
tags: [ml, supervised, classification, kernels, margins]
---

## Why it matters
SVMs are less common in production now, but "explain the margin, support vectors and the kernel trick" remains a classic theory question. The kernel idea also appears in Gaussian processes and attention.

## Concept
For labels $y_i \in \{-1, +1\}$, a linear SVM finds the hyperplane $w^\top x + b = 0$ with the **largest margin** (distance to the closest points, which equals $1/\lVert w \rVert$ in the canonical scaling).

**Soft-margin** SVM allows violations with slack, controlled by $C$:

$$
\min_{w,b}\ \tfrac{1}{2}\lVert w \rVert^2 + C \sum_i \max\big(0,\ 1 - y_i(w^\top x_i + b)\big)
$$

The second term is the **hinge loss**. Large $C$ → fewer violations, narrower margin (low bias, high variance). Small $C$ → wider margin, more regularization.

**Support vectors** are the points on or inside the margin; only they determine the solution. Moving other points doesn't change the boundary.

**Kernel trick**: the dual problem uses data only through dot products $x_i^\top x_j$. Replace them with a kernel $K(x_i, x_j) = \phi(x_i)^\top \phi(x_j)$ to get a linear boundary in a high- (even infinite-) dimensional feature space without computing $\phi$. Common kernels:
- Polynomial: $(x^\top z + c)^p$
- RBF / Gaussian: $\exp(-\gamma \lVert x - z \rVert^2)$; larger $\gamma$ → more wiggly boundary.

Practical: scale features; tune $C$ and $\gamma$ by CV; training is roughly $O(n^2)$ to $O(n^3)$, so kernel SVMs struggle beyond ~100k rows; outputs are scores, not probabilities (use Platt scaling).

## Worked example
$w = (2, 1)$, $b = -4$. Point $x = (1, 1)$ with $y = +1$: score $= 2 + 1 - 4 = -1$, so $y \cdot \text{score} = -1$ and hinge loss $= \max(0, 1 - (-1)) = 2$ (misclassified). Point $(3, 1)$ with $y = +1$: score $= 3$, margin $3 \ge 1$, hinge loss 0. Margin width $= 2/\lVert w \rVert = 2/\sqrt{5} \approx 0.89$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What does the kernel trick let an SVM do?",
  "options": ["Train faster on large datasets", "Learn non-linear boundaries by computing dot products in a high-dimensional feature space implicitly", "Output calibrated probabilities", "Handle missing values"],
  "answer": 1,
  "explanation": "The kernel computes φ(x)·φ(z) directly, so the SVM is linear in feature space but non-linear in the original space."
}
```

```quiz
{
  "id": "q2",
  "question": "An RBF SVM overfits badly. Which change helps?",
  "options": ["Increase C and γ", "Decrease C and/or γ", "Remove feature scaling", "Use more support vectors"],
  "answer": 1,
  "explanation": "Smaller C allows more margin violations (more regularization); smaller γ makes the kernel smoother."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `hinge_loss(w, b, X, y)` returning the average hinge loss (labels are ±1), `margin_width(w)` returning 2 / ||w||, and `rbf(x, z, gamma)` returning exp(−gamma · ||x − z||²). Use plain Python lists.",
  "starterCode": "import math\n\ndef hinge_loss(w, b, X, y):\n    pass\n\ndef margin_width(w):\n    pass\n\ndef rbf(x, z, gamma):\n    pass\n\nprint(hinge_loss([2, 1], -4, [[1, 1], [3, 1]], [1, 1]), margin_width([2, 1]), rbf([0, 0], [1, 1], 0.5))",
  "tests": "import math\nassert abs(hinge_loss([2, 1], -4, [[1, 1], [3, 1]], [1, 1]) - 1.0) < 1e-12\nassert abs(hinge_loss([1, 0], 0, [[2, 0], [-2, 0]], [1, -1])) < 1e-12\nassert abs(margin_width([2, 1]) - 2 / math.sqrt(5)) < 1e-12\nassert abs(rbf([0, 0], [1, 1], 0.5) - math.exp(-1)) < 1e-12\nassert rbf([1, 2], [1, 2], 3) == 1.0",
  "solution": "import math\n\ndef hinge_loss(w, b, X, y):\n    total = 0.0\n    for xi, yi in zip(X, y):\n        score = sum(wj * xj for wj, xj in zip(w, xi)) + b\n        total += max(0.0, 1 - yi * score)\n    return total / len(X)\n\ndef margin_width(w):\n    return 2 / math.sqrt(sum(v * v for v in w))\n\ndef rbf(x, z, gamma):\n    return math.exp(-gamma * sum((a - c) ** 2 for a, c in zip(x, z)))",
  "hints": ["Hinge per point: max(0, 1 − y·(w·x + b)).", "In the example the two losses are 2 and 0, so the average is 1."]
}
```

> [!TIP] Interview tips
> - Explain three ideas: maximum margin, support vectors, kernel trick. Draw the margin.
> - Know what $C$ and $\gamma$ do to bias and variance.
> - Be honest about practice: boosted trees usually beat SVMs on tabular data, and kernel SVMs scale poorly.
