---
id: math-mutual-information
title: Mutual information
estimatedMinutes: 12
difficulty: medium
tags: [information-theory, mutual-information, feature-selection]
---

## Why it matters
Mutual information (MI) measures how much knowing one variable reduces uncertainty about another. Unlike correlation it captures any dependence, so it appears in feature selection, decision-tree information gain, clustering evaluation (NMI) and representation learning (InfoNCE).

## Concept
$$I(X; Y) = \sum_{x,y} p(x,y) \log \frac{p(x,y)}{p(x)\,p(y)} = D_{KL}\big(p(x,y) \,\|\, p(x)p(y)\big)$$

**Equivalent forms**: $I(X;Y) = H(X) - H(X \mid Y) = H(Y) - H(Y \mid X) = H(X) + H(Y) - H(X, Y)$.

**Properties**:
- $I(X;Y) \ge 0$, and $= 0$ **iff** $X$ and $Y$ are independent. It is symmetric.
- $I(X;Y) \le \min(H(X), H(Y))$; $I(X;X) = H(X)$.
- Captures **non-linear** dependence: $Y = X^2$ with symmetric $X$ has zero correlation but high MI.
- Data processing inequality: for a chain $X \to Y \to Z$, $I(X;Z) \le I(X;Y)$. Processing can't create information.

**In practice**: feature selection ranks features by $I(\text{feature}; \text{label})$ (`mutual_info_classif`); decision-tree information gain is the MI between a split and the label; for continuous variables MI is harder to estimate (binning, kNN estimators), and plug-in estimates from small samples are biased upward. **Normalized MI** rescales to $[0, 1]$ for comparing clusterings.

## Worked example
Joint distribution of two binary variables (rows $X$, columns $Y$): $\begin{bmatrix} 0.4 & 0.1 \\ 0.1 & 0.4 \end{bmatrix}$. Both marginals are $(0.5, 0.5)$, so $p(x)p(y) = 0.25$ everywhere.

$I = 2 \cdot 0.4 \log_2\frac{0.4}{0.25} + 2 \cdot 0.1 \log_2\frac{0.1}{0.25} = 0.8(0.678) + 0.2(-1.322) = 0.542 - 0.264 = 0.278$ bits.

Check via entropies: $H(X) = H(Y) = 1$, $H(X,Y) = -(2 \cdot 0.4 \log_2 0.4 + 2 \cdot 0.1 \log_2 0.1) = 1.722$, so $I = 1 + 1 - 1.722 = 0.278$. Boundary cases: independent $\begin{bmatrix}0.25 & 0.25\\0.25&0.25\end{bmatrix}$ gives 0; perfectly dependent $\begin{bmatrix}0.5 & 0\\0&0.5\end{bmatrix}$ gives 1 bit $= H(X)$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "$X$ is uniform on $\\{-1, 0, 1\\}$ and $Y = X^2$. What is true?",
  "options": [
    "Correlation is nonzero and MI is zero",
    "Correlation is zero but MI is positive",
    "Both are zero",
    "Both are positive"
  ],
  "answer": 1,
  "explanation": "$\\text{Cov}(X, X^2) = E[X^3] - E[X]E[X^2] = 0$, but $Y$ is a deterministic function of $X$, so $I(X;Y) = H(Y) > 0$."
}
```

```quiz
{
  "id": "q2",
  "question": "Which expression equals $I(X;Y)$?",
  "options": [
    "$H(X) + H(Y) + H(X,Y)$",
    "$H(X) - H(X \\mid Y)$",
    "$H(X \\mid Y) - H(Y \\mid X)$",
    "$H(X,Y) - H(X)$"
  ],
  "answer": 1,
  "explanation": "MI is the reduction in uncertainty about $X$ from observing $Y$. Also $H(X)+H(Y)-H(X,Y)$; the last option is $H(Y \\mid X)$."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `mutual_information(joint, base=2)` for a joint probability table given as a list of lists (rows $X$, columns $Y$, summing to 1). Compute the marginals, then $\\sum p(x,y)\\log\\frac{p(x,y)}{p(x)p(y)}$, skipping zero cells. Also implement `info_gain(parent_counts, children_counts)`: entropy (bits) of the parent class counts minus the size-weighted entropy of each child's class counts.",
  "starterCode": "import math\n\ndef mutual_information(joint, base=2):\n    pass\n\ndef info_gain(parent_counts, children_counts):\n    pass\n\nprint(mutual_information([[0.4, 0.1], [0.1, 0.4]]))",
  "tests": "import math\nassert abs(mutual_information([[0.4, 0.1], [0.1, 0.4]]) - 0.2780719051126377) < 1e-9\nassert abs(mutual_information([[0.25, 0.25], [0.25, 0.25]])) < 1e-12\nassert abs(mutual_information([[0.5, 0.0], [0.0, 0.5]]) - 1.0) < 1e-12\nassert abs(mutual_information([[0.5, 0.0], [0.0, 0.5]], base=math.e) - math.log(2)) < 1e-12\n# non-square table, independent -> 0\nassert abs(mutual_information([[1 / 9, 2 / 9], [1 / 9, 2 / 9], [1 / 9, 2 / 9]])) < 1e-12\n# 10 positives, 10 negatives split into two pure children: gain = 1 bit\nassert abs(info_gain([10, 10], [[10, 0], [0, 10]]) - 1.0) < 1e-12\nassert abs(info_gain([10, 10], [[5, 5], [5, 5]])) < 1e-12\nh = -(0.8 * math.log2(0.8) + 0.2 * math.log2(0.2))\nassert abs(info_gain([10, 10], [[8, 2], [2, 8]]) - (1 - h)) < 1e-12",
  "solution": "import math\n\ndef mutual_information(joint, base=2):\n    px = [sum(row) for row in joint]\n    py = [sum(col) for col in zip(*joint)]\n    total = 0.0\n    for i, row in enumerate(joint):\n        for j, pxy in enumerate(row):\n            if pxy > 0:\n                total += pxy * math.log(pxy / (px[i] * py[j]), base)\n    return total\n\ndef _entropy(counts):\n    n = sum(counts)\n    return -sum(c / n * math.log2(c / n) for c in counts if c > 0)\n\ndef info_gain(parent_counts, children_counts):\n    n = sum(parent_counts)\n    weighted = sum(sum(ch) / n * _entropy(ch) for ch in children_counts)\n    return _entropy(parent_counts) - weighted",
  "hints": [
    "Marginals: row sums give p(x), column sums (`zip(*joint)`) give p(y).",
    "Info gain is MI between the split and the label: parent entropy minus weighted child entropy."
  ]
}
```

> [!TIP] Interview tips
> - Define MI as $D_{KL}(p(x,y)\|p(x)p(y))$ and as entropy reduction, and note it is symmetric and zero iff independent.
> - Contrast with correlation: MI detects non-linear dependence but is harder to estimate for continuous data and says nothing about direction.
> - Pitfall: MI feature ranking ignores redundancy between features (use mRMR or model-based selection) and is biased for high-cardinality features.
