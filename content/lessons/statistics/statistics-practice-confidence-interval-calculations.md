---
id: statistics-practice-confidence-interval-calculations
title: "Practice: Confidence interval calculations"
estimatedMinutes: 14
difficulty: medium
tags: [statistics, confidence-intervals, practice, interview]
---

## Why it matters

Confidence intervals are the most common "do the math on the whiteboard" statistics question: build a CI from summary numbers, say whether it contains zero, and decide how many users you need for a given width. Fast, correct arithmetic and a clean interpretation separate strong candidates. This set builds on Confidence intervals for a mean and a proportion and the bootstrap lesson.

## Concept

**Template**: estimate $\pm$ critical value $\times$ standard error.

| Quantity | Standard error | Critical value |
|---|---|---|
| Mean, $\sigma$ unknown | $s/\sqrt n$ | $t_{n-1,\,1-\alpha/2}$ (2.06 for $n=25$, 1.96 as $n\to\infty$) |
| Proportion (Wald) | $\sqrt{\hat p(1-\hat p)/n}$ | $z_{1-\alpha/2}$ (1.645, 1.96, 2.576 for 90/95/99%) |
| Difference of two proportions | $\sqrt{\frac{\hat p_1(1-\hat p_1)}{n_1} + \frac{\hat p_2(1-\hat p_2)}{n_2}}$ | $z$ |
| Difference of two means (Welch) | $\sqrt{s_1^2/n_1 + s_2^2/n_2}$ | $t_\nu$ |

**Wilson interval** (use it when $\hat p$ is near 0 or 1, or $n$ is small): center $\dfrac{\hat p + z^2/2n}{1 + z^2/n}$, half-width $\dfrac{z}{1+z^2/n}\sqrt{\dfrac{\hat p(1-\hat p)}{n} + \dfrac{z^2}{4n^2}}$. It never leaves $[0,1]$ and has much better coverage than Wald.

**Sample size for a margin of error** $E$ on a proportion: $n = z^2\,\hat p(1-\hat p)/E^2$; use $\hat p = 0.5$ when unknown (worst case). For a mean: $n = (z\sigma/E)^2$. Halving $E$ quadruples $n$.

**Interpretation**: "If we repeated the study many times, 95% of intervals built this way would contain the true value." It is not "95% probability the true value is in this interval". A CI for a difference that excludes 0 corresponds to a two-sided test rejecting at the same level (for unpooled SE this is approximate).

**Pitfalls**: using $z$ instead of $t$ at small $n$; using the Wald interval at $x = 0$ or $x = n$ (width zero); confusing the SE of a mean with the SD of the data; checking overlap of two separate CIs instead of building the CI of the difference (overlapping CIs can still differ significantly).

## Worked example

**(a) Mean.** $n = 25$ sessions, mean 52 minutes, SD 10. SE $= 10/5 = 2$; $t_{24} = 2.064$. CI $= 52 \pm 4.13 = (47.87,\ 56.13)$.

**(b) Small proportion.** 3 conversions out of 40, so $\hat p = 0.075$. Wald: SE $= \sqrt{0.075 \cdot 0.925/40} = 0.0416$, CI $= 0.075 \pm 0.0816 = (-0.007,\ 0.157)$, a negative lower bound, which is nonsense. Wilson with $z = 1.96$: center $= (0.075 + 0.048)/(1.096) = 0.1122$; half-width $= (1.96/1.096)\sqrt{0.001734 + 0.000600} = 0.0864$; CI $= (0.026,\ 0.199)$.

**(c) Difference.** Treatment 590/5000 (11.8%), control 530/5000 (10.6%). Difference $= 1.2$ pp, SE $= \sqrt{0.118 \cdot 0.882/5000 + 0.106 \cdot 0.894/5000} = 0.00631$, so CI $= 0.012 \pm 0.01236 = (-0.04\text{ pp},\ 2.44\text{ pp})$. It includes 0, consistent with the p of about 0.057 from the previous practice set.

**(d) Planning.** Margin of error of $\pm 3$ points on a survey proportion: $n = 1.96^2 \cdot 0.25/0.03^2 = 1067.1$, so 1,068 respondents. For $\pm 2$ points: 2,401.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A 95% CI for the lift in conversion is (-0.4 pp, +2.4 pp). What can you conclude?",
  "options": [
    "There is a 95% chance the true lift is positive",
    "The data are consistent with no change and with a modest gain; the test at the 5% level would not reject zero",
    "The treatment definitely has no effect",
    "The sample size is too large"
  ],
  "answer": 1,
  "explanation": "The interval contains 0, so a two-sided 5% test does not reject. It also does not prove zero effect; it simply cannot rule out values between -0.4 and +2.4 pp."
}
```

```quiz
{
  "id": "q2",
  "question": "You want to halve the margin of error of a survey estimate. By what factor must the sample size increase?",
  "options": [
    "2",
    "4",
    "Square root of 2",
    "8"
  ],
  "answer": 1,
  "explanation": "The margin of error scales as $1/\\sqrt n$, so halving it needs four times as many observations."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `mean_ci(xs, crit)` returning `(lo, hi)` for the mean of a list, using the sample standard deviation (divide by $n-1$) and the critical value `crit` you pass in (for example 2.776 for a 95% interval with 4 degrees of freedom).",
  "starterCode": "def mean_ci(xs, crit):\n    pass\n\nprint(mean_ci([48, 52, 55, 45, 50], 2.776))",
  "tests": "lo, hi = mean_ci([48, 52, 55, 45, 50], 2.776)\nse = (14.5 / 5) ** 0.5\nassert abs(lo - (50 - 2.776 * se)) < 1e-9\nassert abs(hi - (50 + 2.776 * se)) < 1e-9\nlo2, hi2 = mean_ci([3, 3, 3], 2.0)\nassert lo2 == 3 and hi2 == 3\nassert mean_ci([1, 2, 3, 4], 1.0)[0] < 2.5 < mean_ci([1, 2, 3, 4], 1.0)[1]",
  "solution": "def mean_ci(xs, crit):\n    n = len(xs)\n    m = sum(xs) / n\n    var = sum((x - m) ** 2 for x in xs) / (n - 1)\n    se = (var / n) ** 0.5\n    return m - crit * se, m + crit * se",
  "hints": [
    "Sample variance divides by n − 1; the SE is the SD divided by √n.",
    "Return the pair (mean − crit·SE, mean + crit·SE)."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `wald_ci(x, n, z=1.96)` and `wilson_ci(x, n, z=1.96)` for a proportion $x/n$, each returning `(lo, hi)`. Wilson: center $= (\\hat p + z^2/2n)/(1 + z^2/n)$, half-width $= \\frac{z}{1 + z^2/n}\\sqrt{\\hat p(1-\\hat p)/n + z^2/4n^2}$. For 3 out of 40, Wald has a negative lower bound while Wilson stays inside [0, 1].",
  "starterCode": "def wald_ci(x, n, z=1.96):\n    pass\n\ndef wilson_ci(x, n, z=1.96):\n    pass\n\nprint(wald_ci(3, 40), wilson_ci(3, 40))",
  "tests": "lo, hi = wald_ci(3, 40)\nassert abs(lo - (-0.006626)) < 1e-5 and abs(hi - 0.156626) < 1e-5\nlo, hi = wilson_ci(3, 40)\nassert abs(lo - 0.025836) < 1e-5 and abs(hi - 0.198645) < 1e-5\nassert wald_ci(0, 50) == (0.0, 0.0)\nlo, hi = wilson_ci(0, 50)\nassert lo >= 0 and hi > 0.05\nlo, hi = wilson_ci(50, 50)\nassert hi <= 1 + 1e-12 and lo < 1",
  "solution": "def wald_ci(x, n, z=1.96):\n    p = x / n\n    h = z * (p * (1 - p) / n) ** 0.5\n    return p - h, p + h\n\ndef wilson_ci(x, n, z=1.96):\n    p = x / n\n    denom = 1 + z * z / n\n    center = (p + z * z / (2 * n)) / denom\n    half = z / denom * (p * (1 - p) / n + z * z / (4 * n * n)) ** 0.5\n    return center - half, center + half",
  "hints": [
    "Wald is p ± z·√(p(1−p)/n); at x = 0 the width is zero.",
    "Compute denom = 1 + z²/n once and reuse it for center and half-width."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Write `diff_prop_ci(x1, n1, x2, n2, z=1.96)` returning `(lo, hi)` for $p_1 - p_2$ using the unpooled SE, and `n_for_proportion(moe, z=1.96, p=0.5)` returning the smallest integer $n$ with margin of error at most `moe` (use `math.ceil`). Check: 590/5000 vs 530/5000 gives about (-0.0004, 0.0244), and `moe=0.03` needs 1068.",
  "starterCode": "import math\n\ndef diff_prop_ci(x1, n1, x2, n2, z=1.96):\n    pass\n\ndef n_for_proportion(moe, z=1.96, p=0.5):\n    pass\n\nprint(diff_prop_ci(590, 5000, 530, 5000), n_for_proportion(0.03))",
  "tests": "lo, hi = diff_prop_ci(590, 5000, 530, 5000)\nassert abs(lo - (-0.000362)) < 1e-5 and abs(hi - 0.024362) < 1e-5\nlo, hi = diff_prop_ci(530, 5000, 590, 5000)\nassert abs(hi - 0.000362) < 1e-5\nassert n_for_proportion(0.03) == 1068\nassert n_for_proportion(0.02) == 2401\nassert n_for_proportion(0.03, p=0.1) == 385\nassert n_for_proportion(0.03, z=2.576) == 1844",
  "solution": "import math\n\ndef diff_prop_ci(x1, n1, x2, n2, z=1.96):\n    p1, p2 = x1 / n1, x2 / n2\n    se = (p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2) ** 0.5\n    d = p1 - p2\n    return d - z * se, d + z * se\n\ndef n_for_proportion(moe, z=1.96, p=0.5):\n    return math.ceil(z * z * p * (1 - p) / (moe * moe))",
  "hints": [
    "Unpooled SE adds the two variance terms p(1−p)/n.",
    "Solve moe = z·√(p(1−p)/n) for n and round up."
  ]
}
```

> [!TIP] Interview tips
> - Write the template (estimate, critical value, SE) first, then plug in; it shows structure even if arithmetic slips.
> - Mention Wilson (or exact) for small counts and rare events instead of defaulting to Wald.
> - Interpret the interval about the procedure, and compare treatments with the CI of the difference, never by eyeballing overlap.
