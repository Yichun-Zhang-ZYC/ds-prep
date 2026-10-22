---
id: experimentation-case-long-term-effects-and-holdouts
title: "Case: Long-term effects and holdouts"
estimatedMinutes: 13
difficulty: hard
tags: [experimentation, long-term-effects, holdouts, surrogate-metrics, case-study]
---

## Why it matters
A two-week A/B test measures the two-week effect. Ads load, notification volume, pricing and recommendation changes often have effects that decay (novelty) or reverse (users learn to ignore or leave). Senior interviews ask how you would know the *long-run* effect before it is too late.

## Concept
**Playbook** (the basics are in Holdout groups and Novelty and primacy effects; here we go deeper):
1. **Plot effect against time since exposure**, not calendar time. Use a per-user exposure-day or exposure-week view, so users who join the test later are not mixed with early ones. A decaying curve means the headline average overstates the steady state.
2. **Extrapolate carefully.** Fit a simple decay toward an asymptote and report the *steady-state* estimate (e.g. the mean of the last $k$ weeks) with its uncertainty; do not extrapolate a trend beyond the observed window.
3. **Long-running arms.** Keep a small persistent holdout (1-5%) on the old experience, or run a *holdback* after launch (e.g. 2% for 3-6 months). **Cumulative holdouts** measure the combined effect of many launches: the realization rate = holdout lift / compounded sum of individual lifts. Typical realization is well below 100% because of novelty, overlapping effects and winner's curse.
4. **Surrogate metrics.** If the true outcome (12-month retention, LTV) is too slow, use short-term metrics validated as predictors of it: build a surrogate index from historical experiments with long-term outcomes, and check that the *treatment effects* on the surrogates track the effects on the long-term outcome (not merely a correlation among users).
5. **Mechanism checks.** Ads or notifications may raise revenue now by burning user goodwill: look at return rate, ad-blocking, opt-outs and satisfaction.
6. **Costs and pitfalls**: holdout users get a worse product and old code paths cost engineering time; holdouts erode (user churn, re-randomization); holdout users may notice a difference; in marketplaces a holdout still interacts with treated users (interference).

## Worked example
**Part 1: decay.** A feed team raises ad load. Relative revenue-per-user lift by week since exposure (illustrative): $+4.0, +3.2, +2.5, +2.0, +1.6, +1.3, +1.1, +1.0\%$. The 8-week average is $2.09\%$, but the last three weeks average $1.13\%$. Reporting the average overstates the steady state by almost $2\times$ and the first-week lift by $3.5\times$. Meanwhile 28-day return rate is $-0.4$ pp (significant): the lift is being paid for with user goodwill, so extend the test and ask whether a smaller load wins long term.

**Part 2: cumulative holdout.** The team shipped 8 launches this half, each reporting +1.5% in its own test. Naive compounding: $1.015^8 - 1 = 12.6\%$. A 2% global holdout (100,000 of 5M users) that never received any launch shows +5.0%. Realization rate: $5.0/12.6 = 40\%$. Use 40% as the planning haircut for next half's roadmap, and investigate which launches overlap.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "An 8-week test shows the weekly lift falling from +4% to +1%. Which number should drive the launch decision?",
  "options": [
    "The week-1 lift, since it has the cleanest randomization",
    "The 8-week average",
    "The steady-state estimate from the late weeks, with its uncertainty",
    "The maximum weekly lift"
  ],
  "answer": 2,
  "explanation": "The effect decays, so early weeks reflect novelty. The late-week level is the best guide to what you will keep after launch."
}
```

```quiz
{
  "id": "q2",
  "question": "Your cumulative holdout shows far less lift than the sum of individual launches. Which is NOT a likely reason?",
  "options": [
    "Novelty fading after each test ended",
    "Launches overlapping on the same behaviour",
    "Winner's curse: selecting significant tests inflates their reported lifts",
    "Holdout users receive more features than treated users"
  ],
  "answer": 3,
  "explanation": "The holdout, by definition, does not receive the launched features. The other three are the standard reasons for realization below 100%."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `weekly_lift(treat, ctrl)` returning the list of relative lifts `t/c - 1` per week (as fractions), and `steady_state(lifts, last_k)` returning the mean of the last `last_k` entries.",
  "starterCode": "def weekly_lift(treat, ctrl):\n    pass\n\ndef steady_state(lifts, last_k):\n    pass\n\nprint(weekly_lift([10.4, 10.3], [10, 10]), steady_state([0.04, 0.02, 0.01], 2))",
  "tests": "l = weekly_lift([10.4, 10.3, 10.1], [10, 10, 10])\nassert all(abs(a - b) < 1e-12 for a, b in zip(l, [0.04, 0.03, 0.01]))\nassert abs(steady_state([0.04, 0.032, 0.025, 0.02, 0.016, 0.013, 0.011, 0.01], 3) - 0.0113333333333) < 1e-9\nassert abs(steady_state([0.04, 0.02], 5) - 0.03) < 1e-12",
  "solution": "def weekly_lift(treat, ctrl):\n    return [t / c - 1 for t, c in zip(treat, ctrl)]\n\ndef steady_state(lifts, last_k):\n    tail = lifts[-last_k:]\n    return sum(tail) / len(tail)",
  "hints": [
    "lifts[-k:] works even if k is larger than the list length.",
    "10.4 / 10 - 1 = 0.04."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `realization_rate(individual_lifts, holdout_lift)` returning `(compounded, rate)`: compounded = prod(1 + l) - 1 over the individual lifts (fractions) and rate = holdout_lift / compounded (return 0.0 if compounded is 0).",
  "starterCode": "def realization_rate(individual_lifts, holdout_lift):\n    pass\n\nprint(realization_rate([0.015] * 8, 0.05))",
  "tests": "c, r = realization_rate([0.015] * 8, 0.05)\nassert abs(c - (1.015 ** 8 - 1)) < 1e-12\nassert abs(r - 0.05 / (1.015 ** 8 - 1)) < 1e-12\nassert 0.39 < r < 0.40\nassert realization_rate([], 0.05) == (0.0, 0.0)",
  "solution": "def realization_rate(individual_lifts, holdout_lift):\n    prod = 1.0\n    for l in individual_lifts:\n        prod *= 1 + l\n    compounded = prod - 1\n    rate = holdout_lift / compounded if compounded != 0 else 0.0\n    return compounded, rate",
  "hints": [
    "Lifts compound multiplicatively, not additively.",
    "With no launches, compounded is 0 and the rate is defined as 0.0."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Write `holdout_se(sigma, n_holdout, n_treated)` = sigma * sqrt(1/n_holdout + 1/n_treated), and `holdout_mde(sigma, n_holdout, n_treated)` = 2.8 * se (about 80% power at alpha = 0.05). Then `min_holdout_share(sigma, total_n, target_mde)` returns the smallest holdout share from the grid [0.005, 0.01, 0.02, 0.05, 0.10] whose MDE is at most `target_mde`, or None.",
  "starterCode": "import math\n\ndef holdout_se(sigma, n_holdout, n_treated):\n    pass\n\ndef holdout_mde(sigma, n_holdout, n_treated):\n    pass\n\ndef min_holdout_share(sigma, total_n, target_mde):\n    pass\n\nprint(holdout_mde(10, 100000, 4900000))",
  "tests": "import math\nse = 10 * math.sqrt(1 / 100000 + 1 / 4900000)\nassert abs(holdout_se(10, 100000, 4900000) - se) < 1e-12\nassert abs(holdout_mde(10, 100000, 4900000) - 2.8 * se) < 1e-12\nassert min_holdout_share(10, 5000000, 0.07) == 0.05\nassert min_holdout_share(10, 5000000, 0.09) == 0.02\nassert min_holdout_share(10, 5000000, 0.0001) is None\nassert min_holdout_share(10, 5000000, 0.5) == 0.005",
  "solution": "import math\n\ndef holdout_se(sigma, n_holdout, n_treated):\n    return sigma * math.sqrt(1 / n_holdout + 1 / n_treated)\n\ndef holdout_mde(sigma, n_holdout, n_treated):\n    return 2.8 * holdout_se(sigma, n_holdout, n_treated)\n\ndef min_holdout_share(sigma, total_n, target_mde):\n    for s in [0.005, 0.01, 0.02, 0.05, 0.10]:\n        nh = total_n * s\n        if holdout_mde(sigma, nh, total_n - nh) <= target_mde:\n            return s\n    return None",
  "hints": [
    "Iterate over the shares in ascending order and return the first that works.",
    "The standard error is dominated by the small holdout arm."
  ]
}
```

```reveal
{
  "prompt": "Interview: \"Leadership wants to know whether our notification program helps long-term retention, but they will not wait a year. What do you do?\"",
  "answer": "**Set up persistent measurement now**: a randomized 3-5% no-notification holdout (see Case: Notification and email experiments), kept for at least a quarter, with cohorts defined by assignment date.\n\n**Early read**: report week-by-week retention differences by weeks since assignment. Do not average across the whole window if the curve is moving.\n\n**Surrogates for the interim**: use 14-/28-day active days and opt-out rate as surrogates, but only if historical experiments show treatment effects on these track 6- or 12-month retention. Report them as a forecast with a range, and label the assumption.\n\n**Triangulate**: a diff-in-diff using staggered rollout markets, or a quasi-experiment on users who lost push permission, to sanity-check the experimental result.\n\n**Communicate**: give a 3-month read with a forecast and an explicit \"what would change my mind\" condition (e.g. retention gap emerging after week 8)."
}
```

> [!TIP] Interview tips
> - Plot effects by time since exposure; the average of a decaying curve overstates the steady state.
> - Use cumulative holdouts to calibrate the sum of launches, and quote the realization rate.
> - If you must use surrogates, say that treatment effects on the surrogate must predict treatment effects on the long-term outcome.
