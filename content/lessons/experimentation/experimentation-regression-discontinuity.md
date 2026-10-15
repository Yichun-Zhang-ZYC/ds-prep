---
id: experimentation-regression-discontinuity
title: Regression discontinuity
estimatedMinutes: 12
difficulty: hard
tags: [causal-inference, rdd, thresholds, quasi-experiment]
---

## Why it matters
Many business rules use cutoffs: free shipping above \$50, loyalty tier at 1,000 points, credit approval above a score. Regression discontinuity (RDD) exploits these thresholds for causal estimates without an experiment.

## Concept
Treatment is assigned by whether a **running variable** $X$ crosses a cutoff $c$. Units just above and just below $c$ are nearly identical except for treatment, so the **jump** in the outcome at $c$ estimates the causal effect there:

$$
\tau = \lim_{x \downarrow c} E[Y \mid X = x] - \lim_{x \uparrow c} E[Y \mid X = x]
$$

How to estimate: fit separate (local linear) regressions on each side within a **bandwidth** around $c$, and take the difference of their predictions at $c$.

Checks and pitfalls:
- **Manipulation**: if people can sort themselves across the cutoff (adding items to reach \$50), the groups differ. Check the density of $X$ near $c$ for bunching.
- The estimate is **local**: it applies to units near the cutoff.
- Bandwidth choice trades bias (wide) for variance (narrow).

## Worked example
A loyalty program gives Gold status at 1,000 points. Next-year spend for members with 950–1,000 points averages \$410 (trend line predicts \$412 at 1,000 from the left). Members with 1,000–1,050 points average \$470 (trend predicts \$462 at 1,000 from the right). Estimated effect of Gold status at the threshold: about \$462 − \$412 = **\$50**.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Customers bunch just above the $50 free-shipping threshold by adding cheap items. Why is that a problem for RDD?",
  "options": ["It increases the sample size", "Units above the cutoff self-selected, so they may differ from those below beyond the treatment", "RDD requires a continuous outcome", "It makes the bandwidth too small"],
  "answer": 1,
  "explanation": "Manipulation of the running variable breaks the 'as good as random near the cutoff' logic."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `rdd_estimate(points, cutoff, bandwidth)`: `points` is a list of `(x, y)`. Fit a simple OLS line on each side using only points within `bandwidth` of the cutoff (left: cutoff − bandwidth ≤ x < cutoff; right: cutoff ≤ x ≤ cutoff + bandwidth), predict at the cutoff, and return right − left.",
  "starterCode": "def rdd_estimate(points, cutoff, bandwidth):\n    pass\n\npts = [(x, 2 * x + (50 if x >= 1000 else 0)) for x in range(900, 1101, 10)]\nprint(rdd_estimate(pts, 1000, 100))",
  "tests": "pts = [(x, 2 * x + (50 if x >= 1000 else 0)) for x in range(900, 1101, 10)]\nassert abs(rdd_estimate(pts, 1000, 100) - 50) < 1e-6\nflat = [(x, 0.5 * x) for x in range(0, 101, 5)]\nassert abs(rdd_estimate(flat, 50, 30)) < 1e-9",
  "solution": "def _fit(pts):\n    n = len(pts)\n    mx = sum(x for x, _ in pts) / n\n    my = sum(y for _, y in pts) / n\n    sxy = sum((x - mx) * (y - my) for x, y in pts)\n    sxx = sum((x - mx) ** 2 for x, _ in pts)\n    b = sxy / sxx\n    return my - b * mx, b\n\ndef rdd_estimate(points, cutoff, bandwidth):\n    left = [(x, y) for x, y in points if cutoff - bandwidth <= x < cutoff]\n    right = [(x, y) for x, y in points if cutoff <= x <= cutoff + bandwidth]\n    a0, b0 = _fit(left)\n    a1, b1 = _fit(right)\n    return (a1 + b1 * cutoff) - (a0 + b0 * cutoff)",
  "hints": ["Fit y = a + b·x separately on each side.", "Evaluate both lines at x = cutoff and subtract."]
}
```

> [!TIP] Interview tips
> - Look for thresholds in business rules; they're natural experiments.
> - Mention the manipulation (bunching) check and that the effect is local to the cutoff.
> - Show robustness across several bandwidths.
