---
id: mlops-feature-drift-case-study
title: "Case: Investigating feature drift in production"
estimatedMinutes: 13
difficulty: medium
tags: [mlops, drift, monitoring, debugging, case-study]
---

## Why it matters
"A drift alert fired on a key feature. What do you do?" is a common ML-ops and applied DS scenario. Interviewers want a repeatable investigation, not a guess: confirm, localize, find the root cause, quantify the impact, then choose between fixing the pipeline, retraining or accepting. Detection methods are in Data drift and concept drift; here we focus on the investigation.

## Concept
**Playbook**:
1. **Triage**: which feature, which metric (PSI, KS, null rate), how large, since when, is it still ongoing? Do prediction distribution and business metrics move too?
2. **Is it real?** Rule out monitoring bugs (reference window, bin edges, small samples) and data bugs: schema change, **unit or encoding change**, new default or sentinel value, null/zero filling, timezone shift, duplicate or backfilled data, upstream deploy or contract break. Check lineage and the deploy/change log at the change time.
3. **Localize in time**: plot the daily mean, quantiles and null rate; a **step** points to a deploy, a **ramp** to gradual change or rollout, a **cycle** to seasonality.
4. **Localize in space**: slice by segment (country, platform, app version, source system, partition). A shift concentrated in one slice is usually a pipeline issue; broad shifts suggest real behaviour change. Compute each segment's contribution to the overall change.
5. **Training-serving skew check**: compare the online feature value with the offline recomputation for the same entity and time.
6. **Impact**: feature importance, prediction drift, performance on labelled data (delayed labels), and shadow-score with a corrected feature.
7. **Decide**: fix and backfill the source (if a bug); patch with a transform (if a safe, known unit change); retrain on recent data (if real, persistent drift); add a guardrail or fallback; otherwise accept and adjust the threshold.
8. **Prevent**: data contracts with units and ranges, schema and range tests at ingestion, alerts on null rate and cardinality, a post-mortem.

**Remember**: drift is not damage. Combine feature drift with importance and performance evidence before paying for a retrain.

## Worked example
Alert (illustrative): PSI of `order_value` $=0.42$ since Tuesday, prediction mean score up 9%, AUC on labelled data not yet available.

- **Time**: daily mean was about 50 for two weeks, then 792 from Tuesday: a **step**, not a ramp. The global median is still about 50.
- **Cause hunt**: the change log shows the order-ingest service deployed Tuesday 02:00.
- **Segment**: by country, only `JP` moved: 15% of rows, mean 50 to 5,000 (ratio 100, a dollars-vs-cents style unit change). Contribution of JP: $0.15 \times 5000 - 0.15 \times 50 = 742.5$, the entire shift in the overall mean ($792.5 - 50$). Other segments contribute 0.
- **Confirm**: recomputing the feature offline from the raw orders table gives about 50 for JP, so the online value is wrong (training-serving skew), not customer behaviour.
- **Impact**: the model sees JP basket values 100x too large, inflating scores for 15% of traffic. Score distribution moved +9%, consistent.
- **Action**: roll back or patch the ingest change; backfill the feature store for the affected window; re-score affected decisions if needed; do **not** retrain. Add a data contract (currency, unit, range) and a per-segment range alert. Post-mortem owner and date recorded.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A PSI alert fires on one feature. What do you do first?",
  "options": [
    "Retrain the model immediately",
    "Check whether the data is correct: pipeline change, schema or unit change, null rates, upstream deploys, then localize in time and by segment",
    "Remove the feature",
    "Raise the PSI threshold"
  ],
  "answer": 1,
  "explanation": "Most sudden drift in production is a data bug, not a real-world change. Retraining on corrupted data bakes the bug in. Verify, localize, then decide."
}
```

```quiz
{
  "id": "q2",
  "question": "The global median of a feature is unchanged but the mean jumped 16x. What does this suggest?",
  "options": [
    "No drift",
    "A minority segment or a tail changed (for example a unit change affecting 15% of rows); segment the data",
    "The model is overfit",
    "Sampling noise"
  ],
  "answer": 1,
  "explanation": "The median ignores a minority of extreme values, the mean does not. When mean and median disagree, slice by segment, source and time to find the affected rows."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Find when it started. Write `change_point(series)` returning the index `t` (1 <= t < len) that splits the series into `series[:t]` and `series[t:]` with the smallest total sum of squared deviations from each part's own mean. `t` is the first index of the new regime. Ties go to the smaller `t`.",
  "starterCode": "def change_point(series):\n    pass\n\nprint(change_point([10, 11, 10, 12, 30, 31, 29, 30]))",
  "tests": "assert change_point([10, 11, 10, 12, 30, 31, 29, 30]) == 4\nassert change_point([1, 2, 3, 4, 100, 101]) == 4\nassert change_point([5, 5, 5, 5]) == 1\nassert change_point([50, 50, 50, 5, 5]) == 3",
  "solution": "def change_point(series):\n    def sse(x):\n        m = sum(x) / len(x)\n        return sum((v - m) ** 2 for v in x)\n    best_t, best = None, None\n    for t in range(1, len(series)):\n        c = sse(series[:t]) + sse(series[t:])\n        if best is None or c < best - 1e-12:\n            best_t, best = t, c\n    return best_t",
  "hints": [
    "Try every split point and compare the combined squared error.",
    "Use strict less-than (with a tiny tolerance) so ties keep the earlier index."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Which segment caused it? `ref` and `cur` are lists of `(segment, value)`. The overall mean is `sum(share_s * mean_s)`. Write `segment_attribution(ref, cur)` returning a list of `(segment, contribution)` sorted by absolute contribution descending (ties by segment name), where contribution = `share_cur * mean_cur - share_ref * mean_ref` (use 0 for a segment missing in a period). The contributions sum to the change in the overall mean.",
  "starterCode": "def segment_attribution(ref, cur):\n    pass\n\nref = [('US', 50)] * 8 + [('UK', 40)] * 2\ncur = [('US', 50)] * 8 + [('UK', 4000)] * 2\nprint(segment_attribution(ref, cur))",
  "tests": "ref = [('US', 50)] * 8 + [('UK', 40)] * 2\ncur = [('US', 50)] * 8 + [('UK', 4000)] * 2\nr = segment_attribution(ref, cur)\nassert [s for s, _ in r] == ['UK', 'US']\nassert abs(r[0][1] - 792) < 1e-9 and abs(r[1][1]) < 1e-9\nm = lambda rows: sum(v for _, v in rows) / len(rows)\nassert abs(sum(c for _, c in r) - (m(cur) - m(ref))) < 1e-9\nr2 = segment_attribution([('a', 1)], [('b', 3)])\nassert dict(r2) == {'a': -1, 'b': 3}",
  "solution": "def segment_attribution(ref, cur):\n    def stats(rows):\n        n = len(rows)\n        tot, cnt = {}, {}\n        for s, v in rows:\n            tot[s] = tot.get(s, 0.0) + v\n            cnt[s] = cnt.get(s, 0) + 1\n        return {s: tot[s] / n for s in tot}\n    a, b = stats(ref), stats(cur)\n    out = [(s, b.get(s, 0.0) - a.get(s, 0.0)) for s in set(a) | set(b)]\n    return sorted(out, key=lambda x: (-abs(x[1]), x[0]))",
  "hints": [
    "share * mean = (sum of the segment's values) / (total rows), so you can skip computing shares separately.",
    "Take the union of segment names from both periods."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Spot a unit change. Write `unit_shift(ref, cur)` for two lists of numbers. Let `ratio = median(cur) / median(ref)` and `k = round(log10(ratio))`. If `k != 0` and `ratio` is within 20% of `10**k`, return `10**k` (the likely unit factor, e.g. 100 for dollars vs cents); otherwise return `None`. Return `None` if either median is 0 or ratio is not positive.",
  "starterCode": "import math\nimport statistics\n\ndef unit_shift(ref, cur):\n    pass\n\nprint(unit_shift([40, 50, 60], [4100, 5000, 5900]))",
  "tests": "assert unit_shift([40, 50, 60], [4100, 5000, 5900]) == 100\nassert unit_shift([40, 50, 60], [41, 52, 60]) is None\nassert abs(unit_shift([4000, 5000, 6000], [40, 50, 60]) - 0.01) < 1e-12\nassert unit_shift([40, 50, 60], [150, 160, 170]) is None\nassert unit_shift([0, 0, 1], [5, 6, 7]) is None",
  "solution": "import math\nimport statistics\n\ndef unit_shift(ref, cur):\n    a, b = statistics.median(ref), statistics.median(cur)\n    if a == 0 or b == 0:\n        return None\n    ratio = b / a\n    if ratio <= 0:\n        return None\n    k = round(math.log10(ratio))\n    if k == 0:\n        return None\n    f = 10 ** k\n    return f if abs(ratio / f - 1) <= 0.2 else None",
  "hints": [
    "10**k for negative k is a float (0.01), which is fine.",
    "A ratio like 3.2 rounds to k = 1 but is 68% away from 10, so it is not a unit change."
  ]
}
```

> [!TIP] Interview tips
> - Lead with "verify the data before touching the model"; list the usual suspects (unit, schema, null fill, upstream deploy).
> - Localize in time (step vs ramp vs cycle) and in space (segment contribution) before theorizing.
> - Separate drift from damage, and say what evidence would justify retraining.
