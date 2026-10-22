---
id: statistics-practice-bootstrap-and-permutation
title: "Practice: Bootstrap and permutation tests"
estimatedMinutes: 14
difficulty: hard
tags: [statistics, bootstrap, permutation-test, resampling, practice]
---

## Why it matters

When the metric is a median, a ratio, a percentile or heavily skewed revenue, there is no tidy formula. Interviewers then ask "how would you get a confidence interval or p-value without distributional assumptions?" The answer is resampling, and the follow-up is to code it. This set builds on Bootstrap confidence intervals and Non-parametric tests.

## Concept

**Bootstrap (estimation)**: resample the data **with replacement**, same size $n$, $B$ times; compute the statistic each time; the spread of those values approximates the sampling distribution.
- **Percentile CI**: the $\alpha/2$ and $1-\alpha/2$ quantiles of the bootstrap statistics. $B \approx 2{,}000$ to $10{,}000$.
- **Standard error**: the SD of the bootstrap statistics.
- Works for medians, ratios, correlations, AUC, differences in quantiles. Fails for extremes (max/min), tiny $n$, and dependent data unless you resample blocks or clusters.

**Permutation test (testing)**: under $H_0$ of "no difference between groups", group labels are exchangeable. Shuffle the labels, recompute the statistic, repeat; the p-value is the fraction of shuffled statistics at least as extreme as the observed one.
- With $N$ total points and group sizes $n_1, n_2$ there are $\binom{N}{n_1}$ distinct splits; enumerate them if small, otherwise sample $B$ random shuffles.
- **Monte Carlo p-value**: $\dfrac{1 + \#\{|T^*| \ge |T_{obs}|\}}{B + 1}$. The $+1$ counts the observed arrangement and keeps $p > 0$.

| | Bootstrap | Permutation |
|---|---|---|
| Resamples | with replacement from pooled-or-group data | without replacement, shuffling labels |
| Answers | how uncertain is the estimate? | is the observed difference compatible with exchangeability? |
| Output | CI / SE | p-value |

**Pitfalls**: bootstrapping when observations are not independent (users with many sessions: resample users, not rows); using a permutation test when the groups differ in variance or shape and the question is about means (exchangeability then fails); too few resamples for tail probabilities; forgetting a random seed in reports; bootstrapping a statistic that is not smooth (min, max) or when $n$ is under about 20.

## Worked example

Time on page (seconds) for two page versions, 5 users each (illustrative):

- A: 12, 15, 9, 14, 11 (mean 12.2)
- B: 8, 10, 7, 13, 6 (mean 8.8)

Observed difference $= 3.4$. Under $H_0$ the 10 values can be split into two groups of 5 in $\binom{10}{5} = 252$ ways. Enumerating all of them: 12 splits give a mean difference of at least 3.4, so the **one-sided exact p $= 12/252 = 0.048$**. Counting splits with $|{\rm diff}| \ge 3.4$ gives 24, so the **two-sided p $= 24/252 = 0.095$**. The conclusion flips with the choice of alternative, which is why you fix it before looking.

**Bootstrap on the same data**: resampling each group with replacement 5,000 times and taking the 2.5% and 97.5% quantiles of the difference in means gives roughly $(0.4, 6.2)$ (it varies slightly by seed). That interval excludes 0, while the two-sided permutation p is 0.095. With 5 per group the percentile bootstrap is known to be too narrow, so you would say the sample is too small to trust either result and ask for more data.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You run a permutation test with 999 random shuffles and observe 0 shuffled statistics as extreme as the observed one. What p-value do you report?",
  "options": [
    "0",
    "1/1000 = 0.001 (at most)",
    "0.05",
    "1/999"
  ],
  "answer": 1,
  "explanation": "Use (1 + 0) / (999 + 1) = 0.001. The observed arrangement is itself one valid permutation, so a Monte Carlo p-value can never be exactly 0."
}
```

```quiz
{
  "id": "q2",
  "question": "Each of 1,000 users has many page views and you want a CI for the overall click-through rate (total clicks / total views). What should you resample?",
  "options": [
    "Individual page views with replacement",
    "Users with replacement, keeping each user's views together",
    "Nothing; use the binomial formula",
    "Only users with at least one click"
  ],
  "answer": 1,
  "explanation": "Views from the same user are correlated. Resampling users (the independent unit) preserves that dependence and gives an honest interval for the ratio."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `exact_perm_test(a, b, alternative='greater')` that enumerates every way to choose `len(a)` of the pooled values (use `itertools.combinations` over indices) and returns the p-value for the statistic mean(a) − mean(b). `'greater'` counts splits with difference ≥ observed; `'two-sided'` counts splits with |difference| ≥ |observed|. Use a tolerance of 1e-9 when comparing. For the worked example expect 12/252 and 24/252.",
  "starterCode": "from itertools import combinations\n\ndef exact_perm_test(a, b, alternative='greater'):\n    pass\n\nA = [12, 15, 9, 14, 11]\nB = [8, 10, 7, 13, 6]\nprint(exact_perm_test(A, B), exact_perm_test(A, B, 'two-sided'))",
  "tests": "A = [12, 15, 9, 14, 11]\nB = [8, 10, 7, 13, 6]\nassert abs(exact_perm_test(A, B) - 12 / 252) < 1e-12\nassert abs(exact_perm_test(A, B, 'two-sided') - 24 / 252) < 1e-12\n# tiny case: 2 vs 2, perfectly separated -> 1/6 one-sided, 2/6 two-sided\nassert abs(exact_perm_test([10, 11], [1, 2]) - 1 / 6) < 1e-12\nassert abs(exact_perm_test([10, 11], [1, 2], 'two-sided') - 2 / 6) < 1e-12\nassert exact_perm_test([1, 2], [10, 11]) == 1.0",
  "solution": "from itertools import combinations\n\ndef exact_perm_test(a, b, alternative='greater'):\n    pooled = list(a) + list(b)\n    n1, total = len(a), sum(pooled)\n    n2 = len(b)\n    obs = sum(a) / n1 - sum(b) / n2\n    count = n_splits = 0\n    for idx in combinations(range(len(pooled)), n1):\n        s = sum(pooled[i] for i in idx)\n        d = s / n1 - (total - s) / n2\n        n_splits += 1\n        if alternative == 'two-sided':\n            hit = abs(d) >= abs(obs) - 1e-9\n        else:\n            hit = d >= obs - 1e-9\n        count += hit\n    return count / n_splits",
  "hints": [
    "For each index subset, group 'a' is that subset and group 'b' is the rest; the group-b sum is total − subset sum.",
    "Compare with a small tolerance so floating-point means that equal the observed value are counted."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `bootstrap_ci(data, stat, n_boot=2000, alpha=0.05, seed=0)` that draws `n_boot` resamples with replacement using `random.Random(seed)`, computes `stat` on each, sorts the results and returns `(lo, hi)` as `boots[int(n_boot * alpha / 2)]` and `boots[int(n_boot * (1 - alpha / 2)) - 1]`. The same seed must give the same answer.",
  "starterCode": "import random\n\ndef bootstrap_ci(data, stat, n_boot=2000, alpha=0.05, seed=0):\n    pass\n\ndef mean(xs):\n    return sum(xs) / len(xs)\n\nprint(bootstrap_ci(list(range(1, 101)), mean))",
  "tests": "def mean(xs):\n    return sum(xs) / len(xs)\n\ndef median(xs):\n    s = sorted(xs)\n    n = len(s)\n    return s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2\n\ndata = list(range(1, 101))\nlo, hi = bootstrap_ci(data, mean)\nassert 43 < lo < 48 and 53 < hi < 58 and lo < 50.5 < hi\nassert bootstrap_ci(data, mean, seed=3) == bootstrap_ci(data, mean, seed=3)\nlo2, hi2 = bootstrap_ci(data, median, n_boot=1000)\nassert lo2 < 50.5 < hi2\nlo3, hi3 = bootstrap_ci([5, 5, 5, 5], mean)\nassert lo3 == 5 and hi3 == 5\nassert bootstrap_ci(data, mean, alpha=0.2)[1] - bootstrap_ci(data, mean, alpha=0.2)[0] < hi - lo",
  "solution": "import random\n\ndef bootstrap_ci(data, stat, n_boot=2000, alpha=0.05, seed=0):\n    rng = random.Random(seed)\n    n = len(data)\n    boots = []\n    for _ in range(n_boot):\n        sample = [data[rng.randrange(n)] for _ in range(n)]\n        boots.append(stat(sample))\n    boots.sort()\n    return boots[int(n_boot * alpha / 2)], boots[int(n_boot * (1 - alpha / 2)) - 1]",
  "hints": [
    "Draw n indices with rng.randrange(n) (or rng.choices) per resample, so the resample has the original size.",
    "A 95% interval is the 2.5th and 97.5th percentiles of the sorted bootstrap statistics."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Write `perm_test_mc(a, b, n_perm=5000, seed=0)` returning a two-sided Monte Carlo p-value for the difference in means. Shuffle the pooled list with `random.Random(seed).shuffle`, split into the first `len(a)` and the rest, and count shuffles with |difference| ≥ |observed| (tolerance 1e-9). Return `(count + 1) / (n_perm + 1)`.",
  "starterCode": "import random\n\ndef perm_test_mc(a, b, n_perm=5000, seed=0):\n    pass\n\nA = [12, 15, 9, 14, 11]\nB = [8, 10, 7, 13, 6]\nprint(perm_test_mc(A, B))",
  "tests": "A = [12, 15, 9, 14, 11]\nB = [8, 10, 7, 13, 6]\np = perm_test_mc(A, B)\nassert abs(p - 24 / 252) < 0.03\nassert perm_test_mc(A, B, seed=7) == perm_test_mc(A, B, seed=7)\np_sep = perm_test_mc(list(range(100, 130)), list(range(0, 30)), n_perm=999)\nassert abs(p_sep - 1 / 1000) < 1e-12\np_same = perm_test_mc([1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6])\nassert p_same > 0.9",
  "solution": "import random\n\ndef perm_test_mc(a, b, n_perm=5000, seed=0):\n    rng = random.Random(seed)\n    pooled = list(a) + list(b)\n    n1, n2 = len(a), len(b)\n    obs = sum(a) / n1 - sum(b) / n2\n    count = 0\n    for _ in range(n_perm):\n        rng.shuffle(pooled)\n        d = sum(pooled[:n1]) / n1 - sum(pooled[n1:]) / n2\n        if abs(d) >= abs(obs) - 1e-9:\n            count += 1\n    return (count + 1) / (n_perm + 1)",
  "hints": [
    "Shuffle in place each iteration; the first n1 values are group a, the rest group b.",
    "The +1 in both numerator and denominator counts the observed split itself."
  ]
}
```

> [!TIP] Interview tips
> - Explain the logic in one sentence each: bootstrap = resample with replacement to get uncertainty; permutation = shuffle labels to build the null.
> - Say what the unit of resampling is (users, not events) and why.
> - Mention the +1 in Monte Carlo p-values, how many resamples you used, and the seed.
