---
id: ml-feature-interactions
title: Feature interactions
estimatedMinutes: 10
difficulty: medium
tags: [ml, feature-engineering, interactions, linear-models]
---

## Why it matters
Many effects only exist in combination: a discount works on mobile but not desktop; a drug works for one age group. Interviewers ask how to capture interactions in linear models and why trees get them "for free".

## Concept
An **interaction** means the effect of one feature depends on another's value. In a linear model you must add it explicitly:

$$
y = \beta_0 + \beta_1 x_1 + \beta_2 x_2 + \beta_3 \, x_1 x_2
$$

Now the slope of $x_1$ is $\beta_1 + \beta_3 x_2$: it changes with $x_2$.

Ways to create interactions:
- **Products** of numeric features ($x_1 x_2$), **polynomial features** (all degree-2 terms: $d$ features → $d(d+3)/2$ terms, which grows fast).
- **Crossed categoricals**: `country × device` as one categorical (then encode it).
- **Ratios and differences** from domain knowledge: price per square foot, debt-to-income, time since last purchase. Often more useful than blind products.

Models that learn interactions automatically: **trees and boosting** (a split on $x_2$ followed by a split on $x_1$ is an interaction; depth limits the interaction order), **neural nets**, factorization machines (pairwise interactions via embeddings, good for sparse data).

Cautions: explicit interactions multiply features (overfitting, need regularization); keep the main effects when adding an interaction term; center variables before multiplying to reduce collinearity and make main effects interpretable.

## Worked example
Conversion model: $\hat y = 0.05 + 0.02\,\text{discount} + 0.01\,\text{mobile} + 0.03\,\text{discount}\times\text{mobile}$. Discount effect on desktop (mobile = 0): +0.02. On mobile: 0.02 + 0.03 = +0.05. Without the interaction term, the model would report one averaged effect and miss that mobile responds 2.5× more.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "With y = 1 + 2x₁ + 3x₂ + 4x₁x₂, what is the effect of a one-unit increase in x₁ when x₂ = 2?",
  "options": ["2", "6", "10", "14"],
  "answer": 2,
  "explanation": "∂y/∂x₁ = 2 + 4x₂ = 2 + 8 = 10."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `poly2(row)` that takes a list of numeric features and returns the original features followed by all degree-2 terms in this order: for i ≤ j, `row[i] * row[j]` (squares included). Then write `n_poly2_terms(d)` returning the total number of output features for d inputs.",
  "starterCode": "def poly2(row):\n    pass\n\ndef n_poly2_terms(d):\n    pass\n\nprint(poly2([2, 3]), n_poly2_terms(10))",
  "tests": "assert poly2([2, 3]) == [2, 3, 4, 6, 9]\nassert poly2([1, 2, 3]) == [1, 2, 3, 1, 2, 3, 4, 6, 9]\nassert n_poly2_terms(2) == 5 and n_poly2_terms(10) == 65\nassert all(len(poly2(list(range(d)))) == n_poly2_terms(d) for d in range(1, 8))",
  "solution": "def poly2(row):\n    d = len(row)\n    out = list(row)\n    for i in range(d):\n        for j in range(i, d):\n            out.append(row[i] * row[j])\n    return out\n\ndef n_poly2_terms(d):\n    return d + d * (d + 1) // 2",
  "hints": ["Loop i from 0..d−1 and j from i..d−1.", "d originals plus d(d+1)/2 products."]
}
```

> [!TIP] Interview tips
> - Define an interaction as "the effect of A depends on B" and write the product term.
> - Mention that trees capture interactions automatically; linear models need them added (with regularization).
> - Prefer domain-driven ratios and crosses over blindly generating all polynomial terms.
