---
id: ml-practice-model-explainability-shap-lime
title: "Model explainability: SHAP and LIME"
estimatedMinutes: 13
difficulty: hard
tags: [ml, practice, interpretability, shap, lime]
---

## Why it matters
Regulators, product teams and skeptical stakeholders ask "why did the model say that?". Interviewers expect you to explain what a SHAP value actually is, how LIME differs, and what neither can tell you. See Model interpretability for global tools (permutation importance, partial dependence); this lesson covers local, per-prediction explanations.

## Concept
**Shapley values** come from cooperative game theory. Treat features as players and the prediction as the payout. For feature $i$:

$$\phi_i = \sum_{S \subseteq N\setminus\{i\}} \frac{|S|!\,(n-|S|-1)!}{n!}\,\big[v(S\cup\{i\}) - v(S)\big]$$

where $v(S)$ is the model output when only the features in $S$ are "known" (the others are averaged over a background dataset). It is the average marginal contribution of $i$ over all feature orderings. Properties:
- **Efficiency**: $\sum_i \phi_i = f(x) - E[f(X)]$ (contributions add up to prediction minus baseline).
- Symmetry, dummy (a feature that never changes the output gets 0) and additivity. It is the only attribution satisfying these.

**Computing it**: exact cost is $2^n$. **TreeSHAP** is exact and polynomial for tree ensembles; **KernelSHAP** estimates it by weighted regression on sampled coalitions; **DeepSHAP**/integrated gradients for networks. SHAP values are usually in log-odds for classifiers. Global importance: $\text{mean}|\phi_i|$ across rows.

**LIME**: sample perturbations around $x$, query the black box, weight samples by proximity (e.g. $e^{-d^2/2\sigma^2}$), fit a sparse weighted linear model, and read its coefficients. It gives **local fidelity** only.

| | SHAP | LIME |
|---|---|---|
| Guarantees | Additive, consistent, sums to $f(x)-$baseline | None; local linear approximation |
| Stability | Deterministic for trees | Varies with sampling and kernel width |
| Cost | Fast for trees, heavy for kernel | Cheap per instance |

**Pitfalls**:
- Explains the **model**, not the world: a large $\phi$ is not a causal effect.
- **Correlated features**: marginal (interventional) SHAP evaluates unrealistic combinations; credit is split arbitrarily among correlated features.
- The baseline matters: "vs the average customer" may not be the comparison users want.
- Explanations can expose leakage (a suspicious top feature) but can also be gamed or misread; validate with permutation importance and domain checks.

## Worked example
A credit model predicts default probability 0.35 for an applicant; the average prediction is 0.10. Illustrative SHAP values (probability scale): `debt_to_income` +0.18, `credit_score` +0.08, `age` +0.03, `income` −0.04. Sum $= 0.25 = 0.35 - 0.10$ (efficiency holds). The adverse-action reason is mainly high debt-to-income.

Exact toy computation with 2 features: $v(\varnothing)=0.10$, $v(\{1\})=0.20$, $v(\{2\})=0.25$, $v(\{1,2\})=0.40$. Feature 1 is added first or second with equal weight $1/2$:
$\phi_1 = \tfrac12(0.20-0.10) + \tfrac12(0.40-0.25) = 0.05 + 0.075 = 0.125$,
$\phi_2 = \tfrac12(0.25-0.10) + \tfrac12(0.40-0.20) = 0.075 + 0.10 = 0.175$.
Check: $0.125 + 0.175 = 0.30 = 0.40 - 0.10$. For a linear model $f = w\cdot x + b$ with independent features this reduces to $\phi_i = w_i(x_i - E[x_i])$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "For one prediction, the SHAP values of all features sum to which quantity?",
  "options": [
    "The model's prediction",
    "The prediction minus the average prediction over the background data",
    "Zero",
    "The mean absolute error"
  ],
  "answer": 1,
  "explanation": "Efficiency: sum of phi_i = f(x) - E[f(X)]. Add the base value back to recover the prediction."
}
```

```quiz
{
  "id": "q2",
  "question": "Two runs of LIME on the same instance give different top features. What is the most likely cause?",
  "options": [
    "The black-box model changed",
    "Random perturbation sampling and sensitivity to the kernel width",
    "LIME requires categorical features",
    "LIME is deterministic, so this cannot happen"
  ],
  "answer": 1,
  "explanation": "LIME fits a surrogate on randomly sampled neighbors weighted by a kernel; small samples or a poorly chosen width produce unstable coefficients. Fix the seed, increase samples, or use SHAP for trees."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `shapley_values(v, n)` computing exact Shapley values for players `0..n-1`. `v` is a function taking a `frozenset` of players and returning a number. Use the permutation form: average the marginal contribution of each player over all orderings (`itertools.permutations`). Return a list of n floats.",
  "starterCode": "from itertools import permutations\n\ndef shapley_values(v, n):\n    pass\n\ntable = {frozenset(): 0.10, frozenset([0]): 0.20, frozenset([1]): 0.25, frozenset([0, 1]): 0.40}\nprint(shapley_values(lambda S: table[S], 2))",
  "tests": "table = {frozenset(): 0.10, frozenset([0]): 0.20, frozenset([1]): 0.25, frozenset([0, 1]): 0.40}\nphi = shapley_values(lambda S: table[S], 2)\nassert abs(phi[0] - 0.125) < 1e-12 and abs(phi[1] - 0.175) < 1e-12\nw = [3.0, -2.0, 0.5]\nphi = shapley_values(lambda S: sum(w[i] for i in S), 3)\nassert all(abs(a - b) < 1e-12 for a, b in zip(phi, w))\nphi = shapley_values(lambda S: 10.0 if {0, 1} <= S else 0.0, 3)\nassert abs(phi[0] - 5) < 1e-12 and abs(phi[1] - 5) < 1e-12 and abs(phi[2]) < 1e-12",
  "solution": "from itertools import permutations\n\ndef shapley_values(v, n):\n    totals = [0.0] * n\n    count = 0\n    for order in permutations(range(n)):\n        count += 1\n        S = frozenset()\n        for i in order:\n            T = S | {i}\n            totals[i] += v(T) - v(S)\n            S = T\n    return [t / count for t in totals]",
  "hints": [
    "Build each permutation's coalition incrementally: the marginal contribution of i is v(S + i) - v(S) where S holds earlier players.",
    "Divide the totals by n! (the number of permutations)."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `make_value_fn(f, x, background)` returning `v(S)`: the average over background rows `b` of `f(z)` where `z[j] = x[j]` if `j in S` else `b[j]`. Then the tests check that with a linear `f` the Shapley values equal `w_i * (x_i - mean_i)` and sum to `f(x) - mean prediction`.",
  "starterCode": "def make_value_fn(f, x, background):\n    def v(S):\n        pass\n    return v\n\nf = lambda z: 2 * z[0] + 3 * z[1]\nv = make_value_fn(f, [1.0, 2.0], [[0.0, 0.0], [2.0, 4.0]])\nprint(v(frozenset()), v(frozenset([0, 1])))",
  "tests": "from itertools import permutations\n\ndef _shap(v, n):\n    tot = [0.0] * n\n    c = 0\n    for order in permutations(range(n)):\n        c += 1\n        S = frozenset()\n        for i in order:\n            T = S | {i}\n            tot[i] += v(T) - v(S)\n            S = T\n    return [t / c for t in tot]\n\nw = [2.0, 3.0]\nf = lambda z: w[0] * z[0] + w[1] * z[1]\nbg = [[0.0, 0.0], [2.0, 4.0], [1.0, 2.0]]\nx = [3.0, 1.0]\nv = make_value_fn(f, x, bg)\nassert abs(v(frozenset()) - sum(f(b) for b in bg) / 3) < 1e-12\nassert abs(v(frozenset([0, 1])) - f(x)) < 1e-12\nphi = _shap(v, 2)\nmeans = [sum(b[j] for b in bg) / 3 for j in range(2)]\nfor j in range(2):\n    assert abs(phi[j] - w[j] * (x[j] - means[j])) < 1e-12\nassert abs(sum(phi) - (f(x) - sum(f(b) for b in bg) / 3)) < 1e-12",
  "solution": "def make_value_fn(f, x, background):\n    def v(S):\n        total = 0.0\n        for b in background:\n            z = [x[j] if j in S else b[j] for j in range(len(x))]\n            total += f(z)\n        return total / len(background)\n    return v",
  "hints": [
    "Features in S keep their value from x; the rest are filled from each background row.",
    "Average f over all background rows; v(empty) is the mean prediction and v(all) is f(x)."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "LIME-style local surrogate in 1-D. Write `lime_slope(f, x0, sigma, offsets)`: perturb `x_k = x0 + d_k` for each offset, give weight `exp(-d_k**2 / (2 * sigma**2))`, and return the slope of the weighted least-squares line through `(x_k, f(x_k))`.",
  "starterCode": "import math\n\ndef lime_slope(f, x0, sigma, offsets):\n    pass\n\nprint(lime_slope(lambda x: 3 * x + 1, 2.0, 1.0, [-1, -0.5, 0.5, 1.0]))",
  "tests": "offs = [-1, -0.5, 0.5, 1.0]\nassert abs(lime_slope(lambda x: 3 * x + 1, 2.0, 1.0, offs) - 3.0) < 1e-9\nassert abs(lime_slope(lambda x: x * x, 1.0, 0.5, offs) - 2.0) < 1e-9\nassert abs(lime_slope(lambda x: x * x, 3.0, 0.5, offs) - 6.0) < 1e-9\ns = lime_slope(lambda x: x ** 3, 0.0, 0.2, [-1, -0.5, 0.5, 1.0])\nassert 0 < s < 0.5",
  "solution": "import math\n\ndef lime_slope(f, x0, sigma, offsets):\n    xs = [x0 + d for d in offsets]\n    ys = [f(x) for x in xs]\n    ws = [math.exp(-d * d / (2 * sigma ** 2)) for d in offsets]\n    sw = sum(ws)\n    xb = sum(w * x for w, x in zip(ws, xs)) / sw\n    yb = sum(w * y for w, y in zip(ws, ys)) / sw\n    num = sum(w * (x - xb) * (y - yb) for w, x, y in zip(ws, xs, ys))\n    den = sum(w * (x - xb) ** 2 for w, x in zip(ws, xs))\n    return num / den",
  "hints": [
    "Weighted slope = sum w (x - xbar)(y - ybar) / sum w (x - xbar)^2, with weighted means.",
    "Narrow sigma makes the surrogate follow the function near x0; wide sigma smooths it."
  ]
}
```

> [!TIP] Interview tips
> - State the efficiency property and the baseline: SHAP values sum to prediction minus the mean prediction.
> - Contrast: SHAP is axiomatic and additive; LIME is a local surrogate that can be unstable.
> - Warn about correlated features and causal over-reading; offer permutation importance as a cross-check.
