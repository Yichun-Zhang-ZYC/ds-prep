---
id: statistics-practice-choosing-the-right-test
title: "Practice: Choosing the right test"
estimatedMinutes: 14
difficulty: medium
tags: [statistics, hypothesis-testing, practice, interview]
---

## Why it matters

Interviewers rarely ask you to derive a test; they hand you a scenario and ask "which test, and why?". Picking the wrong test (a t-test on paired data, a z-test on tiny counts) is a faster way to fail than a small arithmetic slip. This set drills the decision, then the arithmetic of the two tests you are most often asked to do by hand.

## Concept

**The playbook**: answer four questions in order.

1. **What is the outcome type?** Continuous, binary, categorical, or count.
2. **How many groups?** One sample vs a benchmark, two groups, or three or more.
3. **Independent or paired?** The same user measured before/after, matched pairs and repeated measures are paired. Two separately randomized arms are independent.
4. **Are the assumptions plausible?** Roughly normal means (or large $n$), equal variance, expected counts of at least 5.

| Outcome | 1 group | 2 independent | 2 paired | 3+ groups |
|---|---|---|---|---|
| Continuous | one-sample t | Welch t (Mann-Whitney if heavy tails, small $n$) | paired t (Wilcoxon signed-rank) | ANOVA (Kruskal-Wallis) |
| Binary | exact binomial / one-proportion z | two-proportion z (Fisher if counts small) | McNemar | chi-square |
| Categorical | chi-square goodness of fit | chi-square test of independence | McNemar (2x2) / Stuart-Maxwell | chi-square |

**Formulas you should be able to write**:
- Welch: $t = \dfrac{\bar x_1 - \bar x_2}{\sqrt{s_1^2/n_1 + s_2^2/n_2}}$ with Welch-Satterthwaite $\nu = \dfrac{(a+b)^2}{a^2/(n_1-1) + b^2/(n_2-1)}$, $a = s_1^2/n_1$, $b = s_2^2/n_2$.
- Two-proportion z (pooled): $z = \dfrac{\hat p_1 - \hat p_2}{\sqrt{\hat p(1-\hat p)(1/n_1 + 1/n_2)}}$, $\hat p = \dfrac{x_1 + x_2}{n_1 + n_2}$.

**Pitfalls**: using an independent test on paired data throws away the pairing and loses power; running ANOVA then many uncorrected t-tests; testing a heavy-tailed revenue metric with a t-test at small $n$ (use a bootstrap or a transform); treating a clustered design (users within cities) as independent rows. See Z-test and t-test, Non-parametric tests and Chi-square test for the details behind each cell.

## Worked example

A product team compares several metrics. Pick the test for each case.

- **A**: Session length (minutes) for 40 users on the new design vs 45 on the old, separate users. Continuous, two independent groups, unequal spread, so **Welch t**. Summary: means 12.4 and 10.9, SDs 5.0 and 6.0. Then $a = 25/40 = 0.625$, $b = 36/45 = 0.8$, SE $= \sqrt{1.425} = 1.194$, $t = 1.5/1.194 = 1.26$, $\nu \approx 82.7$. Not significant (critical value about 1.99).
- **B**: The same 200 users' weekly spend before and after a loyalty program. Continuous and **paired**: run a paired t on the 200 differences.
- **C**: Conversion 590/5000 (treatment) vs 530/5000 (control). Binary, two independent groups: **two-proportion z**. $\hat p = 1120/10000 = 0.112$, SE $= \sqrt{0.112 \cdot 0.888 \cdot 2/5000} = 0.00631$, $z = 0.012/0.00631 = 1.90$, two-sided $p \approx 0.057$. It just misses 0.05.
- **D**: Plan type (free/pro/team) vs churned (yes/no). Two categorical variables: **chi-square test of independence**, df $= (3-1)(2-1) = 2$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You measure the same 30 drivers' weekly earnings before and after an app update. Which test fits best?",
  "options": [
    "Welch two-sample t-test",
    "Paired t-test on the 30 differences",
    "Two-proportion z-test",
    "Chi-square test of independence"
  ],
  "answer": 1,
  "explanation": "The same units measured twice are paired data; testing the within-driver differences removes between-driver variance and gives more power."
}
```

```quiz
{
  "id": "q2",
  "question": "Click-through is 1 of 30 in arm A and 7 of 30 in arm B. Which is the most defensible test?",
  "options": [
    "Two-proportion z-test, because the arms are independent",
    "Paired t-test",
    "Fisher's exact test, because expected counts are small",
    "One-sample t-test"
  ],
  "answer": 2,
  "explanation": "With 8 clicks in 60 users, the expected clicks per arm are 4, below the rule-of-thumb minimum of 5, so the normal approximation is unreliable and an exact test is safer."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `choose_test(outcome, n_groups, paired, normal_ok)` returning the name of the test as a lowercase string. `outcome` is `'continuous'`, `'binary'` or `'categorical'`. Follow the table: continuous 1 group `'one-sample t'`; 2 groups paired `'paired t'` (or `'wilcoxon signed-rank'` if not `normal_ok`); 2 independent `'welch t'` (or `'mann-whitney'`); 3+ `'anova'` (or `'kruskal-wallis'`). Binary 1 group `'binomial'`; 2 independent `'two-proportion z'`; 2 paired `'mcnemar'`; 3+ `'chi-square'`. Categorical always `'chi-square'`.",
  "starterCode": "def choose_test(outcome, n_groups, paired, normal_ok):\n    pass\n\nprint(choose_test('continuous', 2, False, True))",
  "tests": "assert choose_test('continuous', 1, False, True) == 'one-sample t'\nassert choose_test('continuous', 2, True, True) == 'paired t'\nassert choose_test('continuous', 2, True, False) == 'wilcoxon signed-rank'\nassert choose_test('continuous', 2, False, True) == 'welch t'\nassert choose_test('continuous', 2, False, False) == 'mann-whitney'\nassert choose_test('continuous', 4, False, True) == 'anova'\nassert choose_test('continuous', 3, False, False) == 'kruskal-wallis'\nassert choose_test('binary', 1, False, True) == 'binomial'\nassert choose_test('binary', 2, False, True) == 'two-proportion z'\nassert choose_test('binary', 2, True, True) == 'mcnemar'\nassert choose_test('binary', 3, False, True) == 'chi-square'\nassert choose_test('categorical', 2, False, True) == 'chi-square'",
  "solution": "def choose_test(outcome, n_groups, paired, normal_ok):\n    if outcome == 'categorical':\n        return 'chi-square'\n    if outcome == 'binary':\n        if n_groups == 1:\n            return 'binomial'\n        if n_groups == 2:\n            return 'mcnemar' if paired else 'two-proportion z'\n        return 'chi-square'\n    if n_groups == 1:\n        return 'one-sample t'\n    if n_groups == 2:\n        if paired:\n            return 'paired t' if normal_ok else 'wilcoxon signed-rank'\n        return 'welch t' if normal_ok else 'mann-whitney'\n    return 'anova' if normal_ok else 'kruskal-wallis'",
  "hints": [
    "Handle `categorical` and `binary` first, then fall through to continuous.",
    "`paired` only matters when there are exactly 2 groups."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `welch_t(m1, s1, n1, m2, s2, n2)` returning `(t, df)` where $t = (\\bar x_1 - \\bar x_2)/\\sqrt{s_1^2/n_1 + s_2^2/n_2}$ and df is the Welch-Satterthwaite approximation. Check yourself with the worked example (expect about 1.257 and 82.7).",
  "starterCode": "def welch_t(m1, s1, n1, m2, s2, n2):\n    pass\n\nprint(welch_t(12.4, 5.0, 40, 10.9, 6.0, 45))",
  "tests": "t, df = welch_t(12.4, 5.0, 40, 10.9, 6.0, 45)\nassert abs(t - 1.25656) < 1e-4\nassert abs(df - 82.675) < 1e-2\nt2, df2 = welch_t(10, 2, 30, 10, 2, 30)\nassert t2 == 0 and abs(df2 - 58) < 1e-9\nt3, _ = welch_t(5, 1, 10, 7, 1, 10)\nassert t3 < 0",
  "solution": "def welch_t(m1, s1, n1, m2, s2, n2):\n    a = s1 ** 2 / n1\n    b = s2 ** 2 / n2\n    t = (m1 - m2) / (a + b) ** 0.5\n    df = (a + b) ** 2 / (a ** 2 / (n1 - 1) + b ** 2 / (n2 - 1))\n    return t, df",
  "hints": [
    "Let a = s1²/n1 and b = s2²/n2; both the SE and the df use them.",
    "With equal sizes and variances the df collapses to n1 + n2 − 2."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Write `two_prop_z(x1, n1, x2, n2)` returning `(z, p_value)` for the pooled two-proportion z-test with $z = (\\hat p_1 - \\hat p_2)/SE$ and a two-sided p-value. Use `math.erfc`: the two-sided p is `erfc(abs(z) / sqrt(2))`. Check: 590/5000 vs 530/5000 should give z about 1.90 and p about 0.057.",
  "starterCode": "import math\n\ndef two_prop_z(x1, n1, x2, n2):\n    pass\n\nprint(two_prop_z(590, 5000, 530, 5000))",
  "tests": "z, p = two_prop_z(590, 5000, 530, 5000)\nassert abs(z - 1.9025) < 1e-3\nassert abs(p - 0.0571) < 1e-3\nz2, p2 = two_prop_z(530, 5000, 590, 5000)\nassert abs(z2 + z) < 1e-9 and abs(p2 - p) < 1e-12\nz3, p3 = two_prop_z(50, 100, 50, 100)\nassert z3 == 0 and abs(p3 - 1) < 1e-12",
  "solution": "import math\n\ndef two_prop_z(x1, n1, x2, n2):\n    p1, p2 = x1 / n1, x2 / n2\n    pooled = (x1 + x2) / (n1 + n2)\n    se = math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2))\n    z = (p1 - p2) / se\n    return z, math.erfc(abs(z) / math.sqrt(2))",
  "hints": [
    "Pool under H0: p̂ = (x1 + x2)/(n1 + n2).",
    "P(|Z| > |z|) = erfc(|z|/√2)."
  ]
}
```

> [!TIP] Interview tips
> - Say the four questions out loud (outcome, groups, paired?, assumptions) before naming a test.
> - Default to Welch over pooled-variance t; it costs almost nothing when variances are equal.
> - Always state what you would use if assumptions fail (Mann-Whitney, Fisher, bootstrap).
