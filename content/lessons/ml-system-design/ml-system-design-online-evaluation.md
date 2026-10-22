---
id: ml-system-design-online-evaluation
title: Online evaluation (A/B test)
estimatedMinutes: 14
difficulty: hard
tags: [ml-system-design, framework, ab-testing, experimentation]
---

## Why it matters
The A/B test is where a model's value is decided. Interviewers test whether you can design it properly: unit of randomisation, metrics and guardrails, sample size and duration, and pitfalls like sample ratio mismatch, interference and peeking.

## Concept
**Design checklist**
1. **Hypothesis and primary metric** decided in advance (e.g. conversion, revenue per user), plus **guardrails** (latency, error rate, unsubscribes, cost).
2. **Randomisation unit**: user (most common), session, device, or cluster/geo. It must match the unit of analysis; otherwise standard errors are wrong.
3. **Sample size**: from baseline rate $p$, minimum detectable effect $\delta$ (absolute), significance $\alpha$ and power $1-\beta$:
$$n_{\text{per arm}} \approx \frac{2\,\bar p(1-\bar p)\,(z_{1-\alpha/2} + z_{1-\beta})^2}{\delta^2},\quad \bar p = p + \delta/2.$$
Rule of thumb for $\alpha = 0.05$, power 0.8: $n \approx 16\,p(1-p)/\delta^2$.
4. **Duration**: at least one or two full weeks (weekday effects), long enough to see novelty effects fade and to hit $n$. Do not stop early when p < 0.05 (**peeking** inflates false positives; use fixed horizon or sequential methods).
5. **Ramp**: 1% → 5% → 50% with guardrail monitoring and a kill switch.

**Validity checks**
- **Sample ratio mismatch (SRM)**: observed split differs from the intended one (chi-square test); signals a bug in assignment or logging, so discard the result.
- **A/A tests** to validate the pipeline; **pre-experiment balance** and variance reduction (CUPED).
- **Interference**: marketplaces, social networks and shared inventory violate independence; use cluster randomisation, geo or switchback tests.
- **Multiple comparisons**: many metrics/segments need correction or a single pre-registered primary metric. Ratio metrics need the delta method or bootstrap.

**Ranking-specific**: **interleaving** merges two rankers' results in one list and counts which gets more clicks; far more sensitive than A/B, used for screening. Keep a long-term **holdout** to measure cumulative impact.

**Decision**: ship only if the primary metric is significantly positive (or non-inferior for a cost reduction) and no guardrail regresses, and the effect is practically meaningful.

## Worked example
Search ranking change. Baseline conversion $p = 10\%$; we care about a 0.5 percentage-point lift ($\delta = 0.005$).
- $\bar p = 0.1025$, $z_{0.975} + z_{0.8} = 1.96 + 0.84 = 2.80$.
- $n \approx 2 \times 0.1025 \times 0.8975 \times 2.80^2 / 0.005^2 \approx 57{,}800$ users per arm (rule of thumb: $16 \times 0.09/0.005^2 = 57{,}600$).
- With 20,000 eligible users per day split 50/50, each arm gets 10,000/day, so about 6 days; run 14 days to cover two full weeks.

SRM check: intended 50/50, observed 50,000 vs 51,200 users. Expected 50,600 each: $\chi^2 = 2 \times 600^2/50{,}400 \approx 14.3$, p $\approx 0.0002$. That is an SRM; investigate before trusting any metric.

Result: control 1,000/10,000 vs treatment 1,100/10,000 gives $z \approx 2.31$, p $\approx 0.021$: significant at 5%, effect +1 pp.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "An A/B test is planned 50/50 but the observed split is 50,000 vs 51,200 and the SRM test gives p = 0.0002. What should you do?",
  "options": ["Ship the winner anyway", "Treat results as untrustworthy and debug assignment/logging", "Remove 800 users from the larger arm at random", "Increase alpha"],
  "answer": 1,
  "explanation": "SRM indicates the randomisation or data pipeline is broken; results can be biased, so fix the cause and rerun."
}
```

```quiz
{
  "id": "q2",
  "question": "A team checks the dashboard daily and stops as soon as p < 0.05. What is the problem?",
  "options": ["Nothing, it is efficient", "Repeated looks inflate the false-positive rate; use a fixed horizon or sequential testing", "The sample is too large", "p-values only work for revenue"],
  "answer": 1,
  "explanation": "Peeking multiplies chances of a spurious significant result; commit to a horizon or use alpha-spending methods."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `sample_size_per_arm(p_base, mde_abs, alpha=0.05, power=0.8)` = ceil(2·p̄(1−p̄)(z_{1−α/2} + z_{power})² / mde²) with p̄ = p_base + mde/2 (use `statistics.NormalDist().inv_cdf`). Write `two_prop_ztest(x1, n1, x2, n2)` returning `(z, two_sided_p)` with a pooled standard error and z = (rate2 − rate1)/SE (p = erfc(|z|/√2)). Write `srm_chi2(n_a, n_b, ratio_a=0.5)`: the chi-square statistic of the observed split against the intended ratio.",
  "starterCode": "import math\nfrom statistics import NormalDist\n\ndef sample_size_per_arm(p_base, mde_abs, alpha=0.05, power=0.8):\n    pass\n\ndef two_prop_ztest(x1, n1, x2, n2):\n    pass\n\ndef srm_chi2(n_a, n_b, ratio_a=0.5):\n    pass\n",
  "tests": "assert sample_size_per_arm(0.10, 0.005) == 57764\nassert sample_size_per_arm(0.10, 0.01) < sample_size_per_arm(0.10, 0.005)\nz, p = two_prop_ztest(1000, 10000, 1100, 10000)\nassert abs(z - 2.3066) < 1e-3 and abs(p - 0.02108) < 1e-4\nz0, p0 = two_prop_ztest(500, 5000, 500, 5000)\nassert z0 == 0 and abs(p0 - 1.0) < 1e-12\nassert abs(srm_chi2(50000, 51200) - 14.229249011857707) < 1e-9\nassert abs(srm_chi2(5000, 5000)) < 1e-12\nassert abs(srm_chi2(900, 100, 0.9)) < 1e-12",
  "solution": "import math\nfrom statistics import NormalDist\n\ndef sample_size_per_arm(p_base, mde_abs, alpha=0.05, power=0.8):\n    nd = NormalDist()\n    z = nd.inv_cdf(1 - alpha / 2) + nd.inv_cdf(power)\n    pbar = p_base + mde_abs / 2\n    return math.ceil(2 * pbar * (1 - pbar) * z * z / mde_abs ** 2)\n\ndef two_prop_ztest(x1, n1, x2, n2):\n    p = (x1 + x2) / (n1 + n2)\n    se = math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2))\n    z = (x2 / n2 - x1 / n1) / se\n    return z, math.erfc(abs(z) / math.sqrt(2))\n\ndef srm_chi2(n_a, n_b, ratio_a=0.5):\n    n = n_a + n_b\n    ea, eb = n * ratio_a, n * (1 - ratio_a)\n    return (n_a - ea) ** 2 / ea + (n_b - eb) ** 2 / eb",
  "hints": ["Two-sided p-value = 2·(1 − Φ(|z|)) = erfc(|z| / sqrt(2)).", "Expected counts: n·ratio_a and n·(1 − ratio_a); sum (O−E)²/E."]
}
```

> [!TIP] Interview tips
> - State hypothesis, unit of randomisation, primary metric, guardrails, sample size and duration before the test starts.
> - Mention SRM, peeking, novelty effects and interference; they separate experienced candidates.
> - Offline gain is a gate, not proof: always plan the ramp, holdout and rollback criteria.
