---
id: statistics-practice-multiple-testing
title: "Practice: Multiple testing corrections"
estimatedMinutes: 14
difficulty: hard
tags: [statistics, multiple-comparisons, fdr, ab-testing, practice]
---

## Why it matters

Every dashboard with many metrics, segments or variants invites false positives, so "you tested 20 metrics and one is significant: do you ship?" is a staple. You need to compute the inflation, apply Bonferroni, Holm and Benjamini-Hochberg by hand, and choose between controlling FWER and FDR. This set drills those mechanics and builds on Multiple testing.

## Concept

**Error rates**: with $m$ tests at level $\alpha$ and all nulls true, $P(\text{at least one false positive}) = 1-(1-\alpha)^m$ (independent tests). **FWER** is that probability; **FDR** is the expected share of rejections that are false, $E[V/\max(R,1)]$.

| Procedure | Rule (sorted $p_{(1)} \le \dots \le p_{(m)}$) | Controls | Notes |
|---|---|---|---|
| Bonferroni | reject $p_i \le \alpha/m$ | FWER, any dependence | simplest, most conservative |
| Holm | step down: reject $p_{(i)}$ while $p_{(i)} \le \alpha/(m-i+1)$; stop at the first failure | FWER, any dependence | never worse than Bonferroni |
| Benjamini-Hochberg | find the largest $k$ with $p_{(k)} \le \frac{k}{m}\alpha$; reject ranks $1..k$ | FDR (independent or positively dependent tests) | much more power |

**Adjusted p-values** (compare to $\alpha$ directly): Bonferroni $\min(1, m\,p_i)$; BH $q_{(i)} = \min_{j \ge i}\ \min\!\left(1, \tfrac{m}{j}p_{(j)}\right)$, a running minimum from the largest p-value downward so adjusted values stay monotone.

**Choosing**: FWER when a single false claim is costly (launch decision, confirmatory trial); FDR when screening many candidates and you can tolerate a known share of false leads (feature or segment discovery, genomics). Design beats correction: one pre-registered primary metric, a short list of guardrails, and everything else exploratory.

**Pitfalls**: counting only the tests you reported (the family includes every comparison you looked at, including segments); correcting after peeking at which p-values are small; applying BH to strongly negatively correlated tests (use Benjamini-Yekutieli); treating "FDR 5%" as "each discovery has a 5% chance to be false"; forgetting that correction trades false positives for lower power.

## Worked example

Eight p-values from an experiment's metrics, $\alpha = 0.05$: 0.001, 0.004, 0.012, 0.019, 0.030, 0.041, 0.20, 0.62.

- **Uncorrected**: 6 are below 0.05. If all nulls were true you would expect $8 \times 0.05 = 0.4$ false positives and $P(\ge 1) = 1 - 0.95^8 = 34\%$.
- **Bonferroni**: threshold $0.05/8 = 0.00625$ rejects the first 2 (0.001, 0.004).
- **Holm**: thresholds $0.05/8, 0.05/7, 0.05/6 = 0.00625, 0.00714, 0.00833$. 0.001 and 0.004 pass; 0.012 fails the third threshold, so stop. Same 2 rejections here.
- **BH**: thresholds $k \cdot 0.05/8$ for $k = 1..8$: 0.00625, 0.0125, 0.01875, 0.025, 0.03125, 0.0375, 0.04375, 0.05. Compare: 0.012 ≤ 0.01875 yes, 0.019 ≤ 0.025 yes, 0.030 ≤ 0.03125 yes, 0.041 ≤ 0.0375 no. The largest passing rank is $k = 5$, so reject the first 5.
- **BH adjusted p-values**: $0.008, 0.016, 0.032, 0.038, 0.048, 0.0547, 0.229, 0.62$. The first five are $\le 0.05$, matching the rejections.

FWER methods keep 2 findings, FDR keeps 5. Expect about $5 \times 0.05 = 0.25$ false discoveries among those 5 in the long run, so "ship the 2, follow up on the other 3".

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You test 20 independent true-null hypotheses at alpha = 0.05 with no correction. About how likely is at least one false positive?",
  "options": [
    "5%",
    "25%",
    "64%",
    "95%"
  ],
  "answer": 2,
  "explanation": "$1 - 0.95^{20} \\approx 0.64$."
}
```

```quiz
{
  "id": "q2",
  "question": "A genomics screen tests 10,000 genes and wants to follow up on a list in which at most about 5% of entries are false leads. Which approach fits?",
  "options": [
    "Bonferroni at alpha = 0.05",
    "Benjamini-Hochberg at q = 0.05",
    "No correction",
    "Holm at alpha = 0.05"
  ],
  "answer": 1,
  "explanation": "BH controls the false discovery rate, the expected share of false entries in the discovery list. Bonferroni and Holm control the chance of any false positive and would reject very few genes."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `holm(pvals, alpha=0.05)` returning a list of booleans (reject or not) in the **original order**. Sort the p-values ascending; for rank `i` (0-based) compare to `alpha / (m - i)`; reject while the comparison holds and stop at the first failure (all later ones are not rejected).",
  "starterCode": "def holm(pvals, alpha=0.05):\n    pass\n\nps = [0.20, 0.001, 0.62, 0.012, 0.004, 0.019, 0.030, 0.041]\nprint(holm(ps))",
  "tests": "ps = [0.20, 0.001, 0.62, 0.012, 0.004, 0.019, 0.030, 0.041]\nassert holm(ps) == [False, True, False, False, True, False, False, False]\n# Holm beats Bonferroni here: 0.01 and 0.02 vs m=2 -> thresholds 0.025 then 0.05\nassert holm([0.02, 0.01], alpha=0.05) == [True, True]\n# stops at first failure even if a later p-value would pass its own threshold\nassert holm([0.03, 0.04, 0.001], alpha=0.05) == [False, False, True]\nassert holm([0.5]) == [False] and holm([0.04]) == [True]",
  "solution": "def holm(pvals, alpha=0.05):\n    m = len(pvals)\n    order = sorted(range(m), key=lambda i: pvals[i])\n    reject = [False] * m\n    for rank, i in enumerate(order):\n        if pvals[i] <= alpha / (m - rank):\n            reject[i] = True\n        else:\n            break\n    return reject",
  "hints": [
    "Thresholds step up: alpha/m, alpha/(m−1), …, alpha/1 as the p-values get larger.",
    "Use break at the first failure; sorted order guarantees later p-values are larger anyway."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `bh_adjust(pvals)` returning the Benjamini-Hochberg adjusted p-values (q-values) in the **original order**: for sorted ranks $i = 1..m$ compute $\\min(1, m\\,p_{(i)}/i)$, then take a running minimum from the largest rank downward. A hypothesis is rejected at FDR level $q$ when its adjusted value is $\\le q$.",
  "starterCode": "def bh_adjust(pvals):\n    pass\n\nps = [0.20, 0.001, 0.62, 0.012, 0.004, 0.019, 0.030, 0.041]\nprint(bh_adjust(ps))",
  "tests": "ps = [0.20, 0.001, 0.62, 0.012, 0.004, 0.019, 0.030, 0.041]\nq = bh_adjust(ps)\nexp = {0.001: 0.008, 0.004: 0.016, 0.012: 0.032, 0.019: 0.038, 0.030: 0.048, 0.041: 0.0546666667, 0.20: 0.2285714286, 0.62: 0.62}\nfor p, qi in zip(ps, q):\n    assert abs(qi - exp[p]) < 1e-9\nassert [x <= 0.05 for x in q].count(True) == 5\nassert bh_adjust([0.04]) == [0.04]\nassert max(bh_adjust([0.9, 0.95, 0.99])) <= 1.0\nr = bh_adjust([0.01, 0.04, 0.03])\nassert abs(r[0] - 0.03) < 1e-12 and abs(r[1] - 0.04) < 1e-12 and abs(r[2] - 0.04) < 1e-12",
  "solution": "def bh_adjust(pvals):\n    m = len(pvals)\n    order = sorted(range(m), key=lambda i: pvals[i])\n    adj = [0.0] * m\n    running = 1.0\n    for rank in range(m, 0, -1):\n        i = order[rank - 1]\n        running = min(running, pvals[i] * m / rank)\n        adj[i] = running\n    return adj",
  "hints": [
    "Walk ranks from m down to 1, carrying the minimum of m·p/rank seen so far.",
    "Start the running minimum at 1.0 so adjusted values never exceed 1."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Simulate the problem. Write `sim_fwer(m, n_sims, method, alpha=0.05, seed=0)`: in each of `n_sims` experiments draw `m` independent uniform p-values (all nulls true) with `random.Random(seed)`, and count the experiment as a false positive if any p-value is rejected. `method='none'` rejects `p <= alpha`; `method='bonferroni'` rejects `p <= alpha / m`. Return the fraction of experiments with at least one rejection. For m = 20 expect about 0.64 and 0.049.",
  "starterCode": "import random\n\ndef sim_fwer(m, n_sims, method, alpha=0.05, seed=0):\n    pass\n\nprint(sim_fwer(20, 2000, 'none'), sim_fwer(20, 2000, 'bonferroni'))",
  "tests": "none = sim_fwer(20, 2000, 'none')\nbonf = sim_fwer(20, 2000, 'bonferroni')\nassert abs(none - (1 - 0.95 ** 20)) < 0.05\nassert abs(bonf - 0.0488) < 0.02\nassert sim_fwer(1, 2000, 'none', seed=1) < 0.09\nassert sim_fwer(20, 500, 'none', seed=5) == sim_fwer(20, 500, 'none', seed=5)\nassert sim_fwer(5, 100, 'none', alpha=1.0) == 1.0",
  "solution": "import random\n\ndef sim_fwer(m, n_sims, method, alpha=0.05, seed=0):\n    rng = random.Random(seed)\n    threshold = alpha if method == 'none' else alpha / m\n    hits = 0\n    for _ in range(n_sims):\n        if any(rng.random() <= threshold for _ in range(m)):\n            hits += 1\n    return hits / n_sims",
  "hints": [
    "Under a true null, a p-value is Uniform(0, 1), so rng.random() is a valid draw.",
    "The analytic answers are 1 − 0.95^20 ≈ 0.642 and 1 − (1 − 0.0025)^20 ≈ 0.049."
  ]
}
```

> [!TIP] Interview tips
> - Start with the inflation formula 1 - (1 - alpha)^m; it shows you understand why correction exists.
> - Know when to use FWER (confirmatory, costly errors) and FDR (screening), and name Holm as free improvement over Bonferroni.
> - Say that the best fix is design: a pre-registered primary metric and a short guardrail list.
