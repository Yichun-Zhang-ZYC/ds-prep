---
id: product-sense-diagnose-a-metric-change
title: "Diagnose a metric change"
estimatedMinutes: 13
difficulty: medium
tags: [product-sense, metrics, root-cause, product-case]
---

## Why it matters
"Metric X dropped 8% last week. What do you do?" tests structured debugging under ambiguity. Interviewers look for a disciplined order of checks (is it real, then where, then why) and for quantitative segmentation, not guesses.

## Concept
Work top-down, cheapest checks first:
1. **Clarify**: which metric exactly (definition, numerator/denominator), how big, since when, sudden step or gradual drift, which time comparison (WoW, YoY).
2. **Is it real?** Data and logging: pipeline delay or late data, instrumentation change, bot filtering, a dashboard bug, a changed definition. Cross-check with a second source (server logs, finance numbers).
3. **Expected variation**: seasonality, day-of-week, holidays, events, weather; compare to the same period last year and to normal week-to-week noise.
4. **Localize by segment**: platform, app version, country, new vs returning, acquisition channel, device, user tier. Find the segment(s) that explain most of the change.
5. **Localize in the funnel / metric tree**: decompose into factors (traffic x conversion x basket size) and find which moved.
6. **Hypotheses**: internal (releases, experiments, config, outages, pricing, policy, notification changes) vs external (competitor launch, press, platform or OS change, regulation, ad-spend change). Match timing to the step change.
7. **Verify and act**: confirm with data, quantify impact, propose fix or rollback, and add monitoring.

Two quantitative tools:
- **Contribution**: segment $i$ contributes $\Delta_i / \sum_j \Delta_j$ of the total change.
- **Mix shift vs rate change** (Simpson-style): for a rate metric with segment weights $w$ and rates $r$, $\Delta = \underbrace{\sum_i w_i^{b}(r_i^{a}-r_i^{b})}_{\text{rate effect}} + \underbrace{\sum_i (w_i^{a}-w_i^{b})\,r_i^{a}}_{\text{mix effect}}$. An overall rate can fall even when every segment improves.

## Worked example
Daily active users fall from 1,000,000 to 920,000 week over week (-8%, -80,000).

Step 1-3: same definition, dashboards agree with server-side request logs (not a logging bug), and last year had no dip in this week, so it is not seasonal.

Step 4, split by platform:

| Platform | Before | After | Change | Share of drop |
|---|---|---|---|---|
| iOS | 400,000 | 398,000 | -2,000 | 2.5% |
| Android | 450,000 | 372,000 | -78,000 | **97.5%** |
| Web | 150,000 | 150,000 | 0 | 0% |

Android explains 97.5% of the decline. Split Android by app version: v7.3, staged to 50% of users on Tuesday, shows crash-free sessions down from 99.5% to 94% and login errors up 5x; v7.2 users are flat. The step change lines up with the rollout date.

Hypothesis confirmed: the v7.3 release has a startup/login regression. Action: halt the rollout and ship a hotfix; estimate recovery (about 78,000 DAU at stake), then add a crash-rate alert on staged rollouts.

Mix-shift illustration for a conversion metric: segment A (800 users, 10% conversion) and B (200 users, 30%) give 14%. Next week A is 500 users at 11% and B is 500 at 31%, so overall conversion is 21%. Rate effect = +1.0 pp, mix effect = +6.0 pp: most of the rise is a change in who visited, not better conversion.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Weekly signups drop 12%. What should you check first?",
  "options": [
    "Launch a redesign to win users back",
    "Whether the drop is a data or tracking issue and whether it is expected seasonality",
    "Competitor pricing",
    "Revenue per user"
  ],
  "answer": 1,
  "explanation": "Rule out cheap, non-real explanations first (instrumentation, pipeline delay, seasonality) before spending effort on product or competitive hypotheses."
}
```

```quiz
{
  "id": "q2",
  "question": "Overall conversion rises from 14% to 21% although each segment improved by only 1 pp. What explains most of the change?",
  "options": [
    "A tracking bug",
    "Mix shift: a larger share of traffic comes from the higher-converting segment",
    "Regression to the mean",
    "Seasonality"
  ],
  "answer": 1,
  "explanation": "Rate effect is about 1 pp; the remaining ~6 pp comes from the traffic mix moving toward the higher-converting segment."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `contributions(before, after)` taking two dicts segment->value and returning a list of `(segment, delta, share)` sorted by absolute delta descending (ties by segment name), where `share = delta / total_delta` (0 if the total is 0). Then write `mix_rate_decomp(before, after)` taking dicts segment->`(users, conversion)` and returning `(rate_effect, mix_effect)` as defined in the Concept section; they should sum to the change in overall conversion.",
  "starterCode": "def contributions(before, after):\n    pass\n\ndef mix_rate_decomp(before, after):\n    pass\n\nb = {'ios': 400000, 'android': 450000, 'web': 150000}\na = {'ios': 398000, 'android': 372000, 'web': 150000}\nprint(contributions(b, a))",
  "tests": "b = {'ios': 400000, 'android': 450000, 'web': 150000}\na = {'ios': 398000, 'android': 372000, 'web': 150000}\nc = contributions(b, a)\nassert [x[0] for x in c] == ['android', 'ios', 'web']\nassert c[0][1] == -78000 and abs(c[0][2] - 0.975) < 1e-9\nassert abs(c[1][2] - 0.025) < 1e-9 and c[2][2] == 0\nassert contributions({'x': 1}, {'x': 1}) == [('x', 0, 0)]\nbb = {'A': (800, 0.10), 'B': (200, 0.30)}\naa = {'A': (500, 0.11), 'B': (500, 0.31)}\nr, m = mix_rate_decomp(bb, aa)\nassert abs(r - 0.01) < 1e-9 and abs(m - 0.06) < 1e-9\nassert abs((r + m) - (0.21 - 0.14)) < 1e-9",
  "solution": "def contributions(before, after):\n    deltas = {k: after[k] - before[k] for k in before}\n    total = sum(deltas.values())\n    out = [(k, d, (d / total if total else 0)) for k, d in deltas.items()]\n    return sorted(out, key=lambda t: (-abs(t[1]), t[0]))\n\ndef mix_rate_decomp(before, after):\n    nb = sum(u for u, _ in before.values())\n    na = sum(u for u, _ in after.values())\n    rate = mix = 0.0\n    for k in before:\n        wb, rb = before[k][0] / nb, before[k][1]\n        wa, ra = after[k][0] / na, after[k][1]\n        rate += wb * (ra - rb)\n        mix += (wa - wb) * ra\n    return rate, mix",
  "hints": [
    "delta = after - before per segment; share = delta / sum of deltas.",
    "Weights are users / total users in each period; rate effect uses before-weights, mix effect uses after-rates."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Instagram Stories views per user dropped 5% over the last two weeks. How do you investigate?'",
  "answer": "**Clarify**: definition (views per DAU or per story viewer?), sudden vs gradual, global vs regional, which platforms.\n\n**Is it real?** Check logging changes (view event firing, client versions), pipeline delays, definition changes; confirm with an independent source such as server-side impressions.\n\n**Expected?** Seasonality (holidays, school terms), big events, compare to last year; also the denominator: a surge of new low-engagement users (for example after a growth campaign) lowers the average with no decline in any segment (mix shift).\n\n**Segment**: platform, OS and app version, country, tenure (new vs existing), creator vs viewer, connection type; compute each segment's contribution to the drop.\n\n**Funnel**: opens of the app, tray impressions, taps on stories, completion per story, stories posted per creator (supply). A drop in posts by creators reduces views downstream.\n\n**Hypotheses**: internal (ranking change, UI change moving the tray, notification changes, an experiment ramp, latency regression) vs external (competitor trend, outage, OS update).\n\n**Resolve**: align the step date with launches and experiments; verify with a holdout or rollback; quantify impact; set an alert."
}
```

> [!TIP] Interview tips
> - Always say: definition and data validity first, then external/seasonal, then segment, then funnel, then hypotheses.
> - Quantify: use each segment's share of the change to prioritize; watch for mix shift when the metric is a rate.
> - End with an action: fix or rollback, communicate impact, add monitoring.
