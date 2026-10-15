---
id: ml-model-interpretability
title: Model interpretability (feature importance, SHAP, LIME)
estimatedMinutes: 14
difficulty: medium
tags: [ml, practical, interpretability, shap]
---

## Why it matters
Stakeholders ask "why did the model decide this?", regulators require explanations for credit decisions, and debugging needs to know what the model relies on. Interviewers test whether you know the tools and their pitfalls.

## Concept
**Global** explanations (how the model behaves overall):
- **Coefficients** of linear / logistic models (on standardized features).
- **Impurity-based importance** (trees): fast, but biased toward high-cardinality and continuous features, and computed on training data.
- **Permutation importance**: shuffle one feature in the validation set and measure the drop in score. Model-agnostic and reflects generalization; misleading with correlated features (the model can fall back on the copy).
- **Partial dependence plots (PDP)**: average prediction as one feature varies. **ICE** curves show it per instance (reveals heterogeneity and interactions).

**Local** explanations (one prediction):
- **SHAP**: based on Shapley values from game theory. Each feature's value is its average marginal contribution over all orderings of features. Properties: contributions **sum to prediction − baseline** (local accuracy), consistent, and aggregatable into global importance. **TreeSHAP** computes exact values fast for tree ensembles; KernelSHAP approximates for any model.
- **LIME**: perturb the input around the instance, fit a simple weighted linear model locally, and read its coefficients. Model-agnostic but can be unstable (different runs, different explanations).
- **Counterfactuals**: "if income were \$5k higher, the loan would be approved" — actionable for users.

Caveats: explanations describe the **model**, not causality in the world. Correlated features split or swap credit. Explanations can be manipulated and should be validated (e.g. sanity-check against known drivers).

## Worked example
Shapley values for a two-feature model, $f(\varnothing) = 10$, $f(\{A\}) = 30$, $f(\{B\}) = 20$, $f(\{A, B\}) = 50$:
- A's marginal contribution: first in order → 30 − 10 = 20; after B → 50 − 20 = 30. Average φ_A = 25.
- B: first → 20 − 10 = 10; after A → 50 − 30 = 20. φ_B = 15.
- Check: 25 + 15 = 40 = f(A,B) − f(∅).

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What property guarantees that SHAP values for one prediction add up to the prediction minus the baseline?",
  "options": ["Sparsity", "Local accuracy (efficiency)", "Monotonicity of the model", "Calibration"],
  "answer": 1,
  "explanation": "Shapley values distribute the full difference between the prediction and the expected value across features."
}
```

```quiz
{
  "id": "q2",
  "question": "Two features are near-duplicates. What happens to their permutation importance?",
  "options": ["Both appear highly important", "Both can appear unimportant because the model relies on the other when one is shuffled", "Importance becomes exactly 50/50", "Permutation importance can't be computed"],
  "answer": 1,
  "explanation": "Correlated features substitute for each other; group them before computing importance."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Compute exact Shapley values. `value` is a function that takes a frozenset of feature names and returns the model output with only those features \"present\". Write `shapley(features, value)` returning a dict feature → Shapley value, averaging marginal contributions over all orderings (use `itertools.permutations`).",
  "starterCode": "from itertools import permutations\n\ndef shapley(features, value):\n    pass\n\ntable = {frozenset(): 10, frozenset('A'): 30, frozenset('B'): 20, frozenset('AB'): 50}\nprint(shapley(['A', 'B'], lambda s: table[s]))",
  "tests": "table = {frozenset(): 10, frozenset('A'): 30, frozenset('B'): 20, frozenset('AB'): 50}\nphi = shapley(['A', 'B'], lambda s: table[s])\nassert abs(phi['A'] - 25) < 1e-12 and abs(phi['B'] - 15) < 1e-12\nw = {'x': 2.0, 'y': -1.0, 'z': 0.5}\nlin = lambda s: 1 + sum(w[f] for f in s)\nphi = shapley(['x', 'y', 'z'], lin)\nassert all(abs(phi[f] - w[f]) < 1e-12 for f in w)\nassert abs(sum(phi.values()) - (lin(frozenset(w)) - lin(frozenset()))) < 1e-12",
  "solution": "from itertools import permutations\n\ndef shapley(features, value):\n    phi = {f: 0.0 for f in features}\n    orders = list(permutations(features))\n    for order in orders:\n        present = frozenset()\n        for f in order:\n            with_f = present | {f}\n            phi[f] += value(with_f) - value(present)\n            present = with_f\n    return {f: v / len(orders) for f, v in phi.items()}",
  "hints": ["For each ordering, add features one at a time and record each one's marginal gain.", "For an additive model, each feature's Shapley value equals its own term."]
}
```

> [!TIP] Interview tips
> - Separate global (permutation importance, PDP) from local (SHAP, LIME, counterfactuals) explanations.
> - Explain SHAP in one line: average marginal contribution over feature orderings; contributions sum to the prediction.
> - Warn that explanations aren't causal and are distorted by correlated features.
