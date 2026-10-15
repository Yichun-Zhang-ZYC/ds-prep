---
id: ml-xgboost-lightgbm-catboost
title: XGBoost / LightGBM / CatBoost
estimatedMinutes: 12
difficulty: medium
tags: [ml, supervised, boosting, libraries, tabular]
---

## Why it matters
In practice "gradient boosting" means one of these three libraries. Interviewers ask what makes them fast and accurate, how they differ, and which hyperparameters you'd tune first.

## Concept
All three are gradient-boosted decision trees with engineering and regularization improvements.

**XGBoost**
- Uses a **second-order** (Newton) approximation of the loss: gradients $g_i$ and Hessians $h_i$.
- Regularized objective: penalty $\gamma T + \tfrac{1}{2}\lambda \sum_j w_j^2$ on number of leaves $T$ and leaf weights. Optimal leaf weight: $w^* = -\dfrac{\sum g_i}{\sum h_i + \lambda}$.
- Sparsity-aware splits: learns a default direction for missing values.
- Level-wise tree growth; histogram mode for speed.

**LightGBM**
- **Histogram-based** splits (bins features) and **leaf-wise** growth: always split the leaf with the largest gain. Faster and often more accurate, but can overfit small data; control with `num_leaves`, `min_data_in_leaf`.
- GOSS (keep large-gradient rows, sample small ones) and EFB (bundle mutually exclusive sparse features) for speed.
- Native categorical support.

**CatBoost**
- Designed for **categorical features**: **ordered target statistics** (encode each row using only "earlier" rows in a random permutation) to avoid target leakage.
- **Ordered boosting** to reduce prediction shift; **symmetric (oblivious) trees** that use the same split at each level: fast inference, strong regularization.
- Good defaults; little tuning needed.

Tuning order (any library): learning rate + number of trees with early stopping → tree size (`max_depth` / `num_leaves`, `min_child_weight` / `min_data_in_leaf`) → subsampling (`subsample`, `colsample_bytree`) → regularization (`lambda`, `alpha`, `gamma`).

## Worked example
A leaf contains three rows with gradients $g = [0.4, -0.2, 0.6]$ and Hessians $h = [0.24, 0.16, 0.24]$ (log loss). With $\lambda = 1$: $w^* = -(0.8)/(0.64 + 1) \approx -0.488$. Larger $\lambda$ shrinks the leaf value toward 0.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What's the main difference between LightGBM's tree growth and XGBoost's default?",
  "options": ["LightGBM grows level-wise; XGBoost grows leaf-wise", "LightGBM grows leaf-wise (split the best leaf anywhere), XGBoost grows level-wise by default", "LightGBM doesn't use trees", "They grow trees identically"],
  "answer": 1,
  "explanation": "Leaf-wise growth reduces loss faster but can produce deep, unbalanced trees that overfit small data."
}
```

```quiz
{
  "id": "q2",
  "question": "You have many high-cardinality categorical features and little time to tune. Which library is the natural first try?",
  "options": ["XGBoost with one-hot encoding", "CatBoost", "A linear model", "k-NN"],
  "answer": 1,
  "explanation": "CatBoost's ordered target statistics handle categoricals natively without leakage, and its defaults are strong."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `leaf_weight(g, h, lam)` returning XGBoost's optimal leaf weight −Σg / (Σh + λ), and `split_gain(gL, hL, gR, hR, lam, gamma)` returning ½ · [GL²/(HL+λ) + GR²/(HR+λ) − (GL+GR)²/(HL+HR+λ)] − γ, where G and H are sums of the given lists.",
  "starterCode": "def leaf_weight(g, h, lam):\n    pass\n\ndef split_gain(gL, hL, gR, hR, lam, gamma):\n    pass\n\nprint(leaf_weight([0.4, -0.2, 0.6], [0.24, 0.16, 0.24], 1.0))",
  "tests": "assert abs(leaf_weight([0.4, -0.2, 0.6], [0.24, 0.16, 0.24], 1.0) + 0.8 / 1.64) < 1e-12\nassert abs(leaf_weight([1, 1], [1, 1], 0) + 1) < 1e-12\ng = split_gain([2.0], [1.0], [-2.0], [1.0], 0.0, 0.0)\nassert abs(g - 4.0) < 1e-12\nassert abs(split_gain([2.0], [1.0], [-2.0], [1.0], 0.0, 5.0) + 1.0) < 1e-12\nassert abs(split_gain([1.0], [1.0], [1.0], [1.0], 0.0, 0.0)) < 1e-12",
  "solution": "def leaf_weight(g, h, lam):\n    return -sum(g) / (sum(h) + lam)\n\ndef split_gain(gL, hL, gR, hR, lam, gamma):\n    GL, HL, GR, HR = sum(gL), sum(hL), sum(gR), sum(hR)\n    score = lambda G, H: G * G / (H + lam)\n    return 0.5 * (score(GL, HL) + score(GR, HR) - score(GL + GR, HL + HR)) - gamma",
  "hints": ["Sum the gradient and Hessian lists first.", "A negative gain (after γ) means the split isn't worth making."]
}
```

> [!TIP] Interview tips
> - One distinguishing feature each: XGBoost = second-order + regularized objective; LightGBM = histograms + leaf-wise; CatBoost = ordered target statistics for categoricals.
> - Give a tuning order, starting with learning rate and early stopping.
> - Mention that on tabular data these usually beat deep learning; that's a common follow-up.
