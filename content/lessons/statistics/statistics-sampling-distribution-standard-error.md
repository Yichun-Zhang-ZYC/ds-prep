---
id: statistics-sampling-distribution-standard-error
title: Sampling distribution, standard error
estimatedMinutes: 12
difficulty: medium
tags: [statistics, standard-error, inference]
---

## Why it matters
Every confidence interval and test statistic divides by a standard error. Mixing up the standard deviation (spread of the data) with the standard error (uncertainty of an estimate) is one of the most common mistakes in interviews.

## Concept
If you repeated a study many times, each sample would give a slightly different estimate. The distribution of those estimates is the **sampling distribution**; its standard deviation is the **standard error (SE)**.

| Estimate | Standard error |
|---|---|
| Mean | $SE = s / \sqrt{n}$ |
| Proportion | $SE = \sqrt{\hat p (1 - \hat p) / n}$ |
| Difference of two independent means | $SE = \sqrt{s_1^2/n_1 + s_2^2/n_2}$ |

- SD describes individuals; it does **not** shrink with more data.
- SE describes the estimate; it shrinks like $1/\sqrt{n}$.

## Worked example
A/B test: control converts 500 / 10,000 (5.0%), treatment 560 / 10,000 (5.6%).

$$
SE_{\text{diff}} = \sqrt{\frac{0.05 \cdot 0.95}{10{,}000} + \frac{0.056 \cdot 0.944}{10{,}000}} \approx 0.0032
$$

The observed lift is 0.006, about $0.006 / 0.0032 \approx 1.9$ standard errors, borderline at the usual 95% level.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You quadruple the sample size. What happens to the SD of the data and the SE of the mean?",
  "options": ["Both halve", "SD stays about the same; SE halves", "SD halves; SE stays the same", "Both stay the same"],
  "answer": 1,
  "explanation": "SD is a property of the population. SE = SD / √n, so 4× the data halves it."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `se_mean(values)` (sample SD / √n), `se_prop(successes, n)`, and `se_diff_props(s1, n1, s2, n2)` for the difference of two independent proportions.",
  "starterCode": "import math\n\ndef se_mean(values):\n    pass\n\ndef se_prop(successes, n):\n    pass\n\ndef se_diff_props(s1, n1, s2, n2):\n    pass\n\nprint(se_diff_props(500, 10000, 560, 10000))",
  "tests": "import math, statistics\nxs = [2, 4, 4, 4, 5, 5, 7, 9]\nassert abs(se_mean(xs) - statistics.stdev(xs) / math.sqrt(8)) < 1e-12\nassert abs(se_prop(50, 100) - 0.05) < 1e-12\nexp = math.sqrt(0.05 * 0.95 / 10000 + 0.056 * 0.944 / 10000)\nassert abs(se_diff_props(500, 10000, 560, 10000) - exp) < 1e-12",
  "solution": "import math\n\ndef se_mean(values):\n    n = len(values)\n    m = sum(values) / n\n    s = math.sqrt(sum((x - m) ** 2 for x in values) / (n - 1))\n    return s / math.sqrt(n)\n\ndef se_prop(successes, n):\n    p = successes / n\n    return math.sqrt(p * (1 - p) / n)\n\ndef se_diff_props(s1, n1, s2, n2):\n    return math.sqrt(se_prop(s1, n1) ** 2 + se_prop(s2, n2) ** 2)",
  "hints": ["Variances of independent estimates add; take the square root at the end."]
}
```

> [!TIP] Interview tips
> - Say "standard error of the mean" explicitly; don't call it "the standard deviation".
> - Use SE to sanity-check results: a lift smaller than ~2 SE is within noise.
> - Mention that clustered data (many rows per user) needs adjusted SEs; naive formulas understate uncertainty.
