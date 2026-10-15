---
id: ml-missing-value-imputation
title: Missing value imputation
estimatedMinutes: 12
difficulty: medium
tags: [ml, feature-engineering, missing-data, preprocessing]
---

## Why it matters
Real data always has gaps. Interviewers want to hear that you first ask **why** values are missing, then pick a strategy that doesn't bias the model or leak information.

## Concept
Missingness mechanisms:
- **MCAR** (missing completely at random): unrelated to anything. Dropping rows loses data but doesn't bias.
- **MAR** (missing at random): depends on observed variables (older users skip the income field). Model-based imputation using those variables works.
- **MNAR** (missing not at random): depends on the missing value itself (high earners hide income). Hardest; missingness is itself informative.

Strategies:
- **Drop** rows (if few and MCAR) or columns (if mostly empty and unimportant).
- **Simple imputation**: mean (sensitive to skew), **median** (robust), mode for categoricals, or a constant like "Unknown".
- **Add a missing indicator** column: lets the model learn that "missing" carries signal (often the biggest win, especially for MNAR).
- **Model-based**: k-NN imputation, iterative imputation (MICE: regress each feature on the others in rounds).
- **Time series**: forward-fill, interpolation, but never fill using future values.
- **Native handling**: XGBoost / LightGBM learn a default split direction for missing values.

Rules: fit imputers on **training data only**; mean imputation shrinks variance and weakens correlations, so be careful in inferential analyses (multiple imputation is the rigorous option there).

## Worked example
Income column: [40, 55, missing, 60, 1,000, missing] (thousands). Mean of observed = 288.75, distorted by the 1,000 outlier; median = 57.5. Impute 57.5 and add `income_missing = [0, 0, 1, 0, 0, 1]`, so the model can still detect if non-reporters behave differently.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Users with high debt tend to leave the 'debt' field blank. What type of missingness is this, and what helps?",
  "options": ["MCAR; drop the rows", "MNAR; add a missing indicator so the model can use the missingness as a signal", "MAR; mean imputation is enough", "Not missingness; ignore it"],
  "answer": 1,
  "explanation": "Missingness depends on the unobserved value itself. The indicator captures that information."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `fit_median(xs)` returning the median of non-`None` values, and `impute(xs, fill)` returning `(filled_values, indicator)` where `indicator[i]` is 1 if `xs[i]` was `None`. Then write `forward_fill(xs)` that replaces each `None` with the last seen non-`None` value (leading `None`s stay `None`).",
  "starterCode": "import statistics\n\ndef fit_median(xs):\n    pass\n\ndef impute(xs, fill):\n    pass\n\ndef forward_fill(xs):\n    pass\n\ndata = [40, 55, None, 60, 1000, None]\nprint(impute(data, fit_median(data)), forward_fill([None, 1, None, None, 3, None]))",
  "tests": "data = [40, 55, None, 60, 1000, None]\nm = fit_median(data)\nassert m == 57.5\nvals, ind = impute(data, m)\nassert vals == [40, 55, 57.5, 60, 1000, 57.5] and ind == [0, 0, 1, 0, 0, 1]\nassert forward_fill([None, 1, None, None, 3, None]) == [None, 1, 1, 1, 3, 3]\nassert forward_fill([]) == []",
  "solution": "import statistics\n\ndef fit_median(xs):\n    return statistics.median(x for x in xs if x is not None)\n\ndef impute(xs, fill):\n    vals = [fill if x is None else x for x in xs]\n    ind = [1 if x is None else 0 for x in xs]\n    return vals, ind\n\ndef forward_fill(xs):\n    out, last = [], None\n    for x in xs:\n        if x is not None:\n            last = x\n        out.append(last if x is None else x)\n    return out",
  "hints": ["Filter out None before computing the median.", "Forward fill: remember the most recent non-None value."]
}
```

> [!TIP] Interview tips
> - Start with "why is it missing?" and name MCAR / MAR / MNAR.
> - Median + missing indicator is a strong, simple default; mention that boosted trees handle NaNs natively.
> - Fit imputers on training data only, and never forward-fill with future data.
