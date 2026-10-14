---
id: statistics-ci-for-mean-and-proportion
title: CI for mean and proportion
estimatedMinutes: 12
difficulty: medium
tags: [statistics, confidence-intervals, inference]
---

## Why it matters
"Conversion is 5.6%, how sure are we?" A confidence interval is the honest way to report any estimate, and computing one quickly is a core analyst skill.

## Concept
The general form: **estimate ± critical value × standard error**.

| Quantity | 95% interval |
|---|---|
| Mean (large n) | $\bar x \pm 1.96\, s/\sqrt{n}$ |
| Mean (small n, ~normal data) | $\bar x \pm t_{0.975,\,n-1}\, s/\sqrt{n}$ |
| Proportion (Wald) | $\hat p \pm 1.96\sqrt{\hat p(1-\hat p)/n}$ |
| Difference of proportions | $(\hat p_2 - \hat p_1) \pm 1.96\sqrt{\frac{\hat p_1(1-\hat p_1)}{n_1} + \frac{\hat p_2(1-\hat p_2)}{n_2}}$ |

The simple **Wald** interval for a proportion behaves badly when $n$ is small or $\hat p$ is near 0 or 1 (it can go below 0). The **Wilson** interval is the standard fix.

Width shrinks like $1/\sqrt{n}$: to halve the margin of error, you need 4× the sample.

## Worked example
560 conversions out of 10,000 visitors:

$$
\hat p = 0.056, \quad SE = \sqrt{\frac{0.056 \times 0.944}{10{,}000}} \approx 0.0023, \quad 95\%\text{ CI} \approx 0.056 \pm 0.0045 = [5.15\%, 6.05\%]
$$

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A survey of 400 people gives a 95% CI of ±5 points. How many people are needed for ±2.5 points?",
  "options": ["800", "1,600", "1,000", "3,200"],
  "answer": 1,
  "explanation": "Margin ∝ 1/√n, so halving it needs 4× the sample: 1,600."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `wald_ci(k, n, z=1.96)` and `wilson_ci(k, n, z=1.96)` returning `(low, high)` for a proportion. Wilson: center = (p̂ + z²/(2n)) / (1 + z²/n), half-width = z·√(p̂(1−p̂)/n + z²/(4n²)) / (1 + z²/n).",
  "starterCode": "import math\n\ndef wald_ci(k, n, z=1.96):\n    pass\n\ndef wilson_ci(k, n, z=1.96):\n    pass\n\nprint(wald_ci(560, 10000), wilson_ci(0, 20))",
  "tests": "lo, hi = wald_ci(560, 10000)\nassert abs(lo - (0.056 - 1.96 * (0.056 * 0.944 / 10000) ** 0.5)) < 1e-12\nlo, hi = wilson_ci(0, 20)\nassert lo >= 0 and abs(lo) < 1e-12 and 0.15 < hi < 0.17\nwl, wh = wald_ci(0, 20)\nassert wl == 0 and wh == 0",
  "solution": "import math\n\ndef wald_ci(k, n, z=1.96):\n    p = k / n\n    m = z * math.sqrt(p * (1 - p) / n)\n    return p - m, p + m\n\ndef wilson_ci(k, n, z=1.96):\n    p = k / n\n    denom = 1 + z * z / n\n    center = (p + z * z / (2 * n)) / denom\n    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / denom\n    return max(0.0, center - half), min(1.0, center + half)",
  "hints": ["With 0 successes, Wald collapses to [0, 0], which is clearly overconfident.", "Wilson stays inside [0, 1] and gives a sensible upper bound.", "Clamp the result to [0, 1]: floating-point rounding can make the lower bound a tiny negative number."]
}
```

> [!TIP] Interview tips
> - Report intervals, not just point estimates: "5.6% (95% CI 5.2–6.1%)".
> - For small samples or rates near 0/1, say "I'd use a Wilson interval".
> - Remember the 4× rule for halving the margin of error; it answers many sample-size questions.
