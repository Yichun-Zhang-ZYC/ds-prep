---
id: time-series-hierarchical-forecasting
title: Hierarchical forecasting and reconciliation
estimatedMinutes: 13
difficulty: hard
tags: [time-series, hierarchical, reconciliation, mint, forecasting]
---

## Why it matters
Retail, finance and telecom forecasts live in hierarchies: SKU, category, store, region, total. Independent forecasts at each level will not add up, and planners need numbers that do. Interviewers ask how you make forecasts coherent and whether reconciliation actually improves accuracy.

## Concept
**Setup**: bottom-level series $b_t \in \mathbb{R}^m$ and aggregates $a_t = A b_t$. All $n$ series stack as $y_t = S b_t$ with the **summing matrix** $S = \begin{bmatrix} A \\ I_m \end{bmatrix}$. Forecasts $\hat y$ are **coherent** if $\hat y = S \hat b$ (each parent equals the sum of its children). Grouped (non-nested) structures, e.g. region x product, are handled by the same $S$.

**Classic strategies**
- **Bottom-up**: forecast the bottom, sum up. Unbiased in aggregates, no information lost, but the bottom is noisy or sparse (see *Intermittent demand forecasting*).
- **Top-down**: forecast the total, split by proportions (historical proportions, or forecast proportions). Smooth and stable at the top but loses bottom-level dynamics and is biased for individual series.
- **Middle-out**: pick a level with a good signal-to-noise ratio, go up by summing and down by proportions.

**Optimal reconciliation**: forecast **every** series independently (base forecasts $\hat y$, incoherent) and then project onto the coherent subspace:
$$\tilde y = S G \hat y,\quad G = (S^\top W^{-1} S)^{-1} S^\top W^{-1}.$$
- $W = I$: **OLS** (all series treated equally).
- $W = \text{diag}(\hat\sigma_i^2)$: **WLS** (variance scaling: noisy series move more).
- $W = \hat\Sigma_h$ (covariance of $h$-step base errors, shrunk toward its diagonal): **MinT** (Wickramasuriya et al.). Among reconciliations that keep unbiased base forecasts unbiased ($SGS = S$), it minimizes the trace of the reconciled error covariance, i.e. the sum of forecast variances, so it is the default when you have enough history.

Because the projection uses information from all levels, it can **improve accuracy at every level**, not just make numbers add up. Caveats: the base forecasts must be roughly unbiased; reconciliation can push small series **negative** (add a non-negative constraint or a final clipping-and-re-aggregation step); and for **probabilistic** forecasts you reconcile samples or use distribution-aware methods rather than just the means. **Temporal hierarchies** (daily, weekly, monthly) reconcile across time with the same machinery.

**Practical notes**: use any base model (ETS, ARIMA, global GBMs per level); evaluate with rolling-origin backtests at **every level** with a scale-free metric (see *Forecast evaluation and backtesting*); with thousands of series, estimate $W$ with the diagonal or a structural variant rather than a full covariance.

## Worked example
Two products A and B with total T. $S = \begin{bmatrix}1&1\\1&0\\0&1\end{bmatrix}$ (rows: T, A, B). Illustrative base forecasts: $\hat T = 100,\ \hat A = 45,\ \hat B = 50$ (A + B = 95, so the incoherence is 5).

Bottom-up: T = 95. Top-down with historical shares 45%/55%: A = 45, B = 55, T = 100.

OLS: $S^\top S = \begin{bmatrix}2&1\\1&2\end{bmatrix}$, $S^\top \hat y = [145, 150]^\top$, so $\tilde b = \frac13\begin{bmatrix}2&-1\\-1&2\end{bmatrix}[145,150]^\top = [46.67,\ 51.67]$ and $\tilde T = 98.33$. The gap of 5 was split equally across the three series: T down 1.67, A and B each up 1.67. With WLS, if A's forecast were much less noisy than the others, it would move less and the gap would be absorbed mainly by T and B.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why can forecast reconciliation improve accuracy even at the bottom level?",
  "options": [
    "It removes seasonality from the data",
    "It only changes the totals, never the bottom",
    "It combines information from forecasts at all levels, like an ensemble that also enforces the aggregation constraint",
    "It increases the sample size of the bottom series"
  ],
  "answer": 1,
  "explanation": "Base forecasts at different levels carry partly independent errors. Projecting onto the coherent subspace averages them in a variance-aware way (MinT/WLS)."
}
```

```quiz
{
  "id": "q2",
  "question": "Which is a known weakness of pure top-down forecasting?",
  "options": [
    "Aggregates do not add up",
    "It cannot be computed for the total",
    "It loses bottom-level dynamics and is biased for individual series whose share changes",
    "It needs the covariance matrix of all series"
  ],
  "answer": 2,
  "explanation": "A fixed proportion cannot follow series that grow or shrink at different rates, so individual series are biased even though the total is well forecast."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Build `summing_matrix(group_sizes)` for a 2-level hierarchy: bottom series are numbered consecutively and `group_sizes` gives how many belong to each middle node. Rows in order: the total, one row per group, then the identity for the bottom series. Return a numpy array.",
  "setup": "import numpy as np",
  "starterCode": "def summing_matrix(group_sizes):\n    pass\n\nprint(summing_matrix([2, 1]))",
  "tests": "S = summing_matrix([2, 1])\nassert S.shape == (6, 3)\nassert S[0].tolist() == [1, 1, 1]\nassert S[1].tolist() == [1, 1, 0] and S[2].tolist() == [0, 0, 1]\nassert (S[3:] == np.eye(3)).all()\nassert summing_matrix([1]).shape == (3, 1)\nassert (S @ np.array([5, 6, 7])).tolist() == [18, 11, 7, 5, 6, 7]",
  "solution": "def summing_matrix(group_sizes):\n    n = sum(group_sizes)\n    rows = [np.ones(n)]\n    start = 0\n    for g in group_sizes:\n        r = np.zeros(n)\n        r[start:start + g] = 1\n        rows.append(r)\n        start += g\n    return np.vstack(rows + [np.eye(n)])",
  "packages": [
    "numpy"
  ],
  "hints": [
    "The total row is all ones; each group row is ones over that group's slice.",
    "Stack with np.vstack, ending with np.eye(n_bottom)."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Implement `ols_reconcile(S, base, weights=None)` returning $S (S^\\top W^{-1} S)^{-1} S^\\top W^{-1} \\hat y$ with $W = \\text{diag}(\\text{weights})$ (identity when `weights` is None, giving OLS; larger weight means a noisier series that moves more).",
  "setup": "import numpy as np",
  "starterCode": "def ols_reconcile(S, base):\n    pass\n\nS = np.array([[1, 1], [1, 0], [0, 1]], dtype=float)\nprint(ols_reconcile(S, [100, 45, 50]))",
  "tests": "S = np.array([[1, 1], [1, 0], [0, 1]], dtype=float)\nr = ols_reconcile(S, [100, 45, 50])\nassert np.allclose(r, [295 / 3, 140 / 3, 155 / 3])\nassert abs(r[0] - r[1] - r[2]) < 1e-9\ncoh = np.array([60.0, 25.0, 35.0])\nassert np.allclose(ols_reconcile(S, coh), coh)\nr2 = ols_reconcile(S, [100, 45, 50], weights=[1.0, 1.0, 1e-9])\nassert abs(r2[2] - 50) < 1e-3",
  "solution": "def ols_reconcile(S, base, weights=None):\n    S = np.asarray(S, dtype=float)\n    y = np.asarray(base, dtype=float)\n    w = np.ones(S.shape[0]) if weights is None else np.asarray(weights, dtype=float)\n    Winv = np.diag(1.0 / w)\n    G = np.linalg.solve(S.T @ Winv @ S, S.T @ Winv)\n    return S @ (G @ y)",
  "packages": [
    "numpy"
  ],
  "hints": [
    "Use np.linalg.solve rather than an explicit inverse.",
    "With W = I this is the OLS projection onto the columns of S."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Implement `top_down(total_fc, hist_bottom)`: allocate `total_fc` to bottom series proportionally to the sum of each series' history (`hist_bottom` is a list of lists). Then implement `incoherence(S, y)`: the largest absolute gap between each forecast in `y` and the value implied by summing the last `n_bottom` entries (the bottom forecasts) with `S`.",
  "setup": "import numpy as np",
  "starterCode": "def top_down(total_fc, hist_bottom):\n    pass\n\ndef incoherence(S, y):\n    pass\n\nprint(top_down(100, [[10, 10], [30, 30]]))",
  "tests": "assert np.allclose(top_down(100, [[10, 10], [30, 30]]), [25, 75])\nassert abs(sum(top_down(80, [[1, 2], [3, 4], [5, 6]])) - 80) < 1e-9\nS = np.array([[1, 1], [1, 0], [0, 1]], dtype=float)\nassert abs(incoherence(S, [100, 45, 50]) - 5) < 1e-12\nassert incoherence(S, [95, 45, 50]) == 0\nassert abs(incoherence(S, [90, 45, 50]) - 5) < 1e-12",
  "solution": "def top_down(total_fc, hist_bottom):\n    sums = np.array([float(np.sum(h)) for h in hist_bottom])\n    return total_fc * sums / sums.sum()\n\ndef incoherence(S, y):\n    S = np.asarray(S, dtype=float)\n    y = np.asarray(y, dtype=float)\n    n_b = S.shape[1]\n    return float(np.abs(S @ y[-n_b:] - y).max())",
  "packages": [
    "numpy"
  ],
  "hints": [
    "Proportion_i = sum(history_i) / sum of all history.",
    "Bottom forecasts are the last S.shape[1] entries of y; compare S @ bottom to y."
  ]
}
```

> [!TIP] Interview tips
> - Define the summing matrix and coherence, then lay out bottom-up, top-down, middle-out and their trade-offs.
> - State the reconciliation formula $\tilde y = SG\hat y$ and that MinT picks $G$ to minimize reconciled error variance.
> - Note that reconciliation can improve accuracy at all levels, but needs unbiased base forecasts and may need a non-negativity fix.
> - Evaluate at every level with scale-free metrics and mention probabilistic and temporal reconciliation.
