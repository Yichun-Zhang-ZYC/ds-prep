---
id: analytics-bi-metric-x-dropped-10-why
title: '"Metric X dropped 10% — why?"'
estimatedMinutes: 12
difficulty: medium
tags: [case-study, root-cause, metrics, decomposition, simpsons-paradox]
---

## Why it matters
This is the most common analytics case question: "Daily active users dropped 10% last week. What do you do?" Interviewers want a calm, structured investigation, not a guess.

## Concept
**Step 0: clarify.** Which metric exactly (definition, numerator, denominator)? Which period, compared with what (WoW, YoY)? How big and how sudden is the drop? Who noticed and why do they care?

**Step 1: is it real?**
- **Data issues**: logging or tracking change, broken pipeline, delayed data, duplicate or missing events, changed definition.
- **Expected variation**: weekday, holiday, seasonality, normal noise (compare with historic week-over-week volatility).
- If the drop is a cliff on one day across all segments, suspect instrumentation or an outage first.

**Step 2: localise.** Slice by dimension and ask where the change is concentrated: time (when did it start?), platform/OS/app version, geography, acquisition channel, new vs returning, product area, customer segment.

**Step 3: decompose the metric.** For a ratio $R = \dfrac{\text{conversions}}{\text{sessions}}$, split the change between segments into:
- **Rate effect**: the metric within a segment changed, $s_1(r_1 - r_0)$.
- **Mix effect**: the traffic share moved toward lower or higher-rate segments, $(s_1 - s_0)\,r_0$.

$$\Delta R = \sum_i (s_{1i} - s_{0i})\,r_{0i} + \sum_i s_{1i}\,(r_{1i} - r_{0i})$$

A pure mix shift can lower the average with no real deterioration (Simpson's paradox). Also use the funnel (traffic x conversion x basket size) or revenue = users x orders x AOV.

**Step 4: hypotheses and checks.** Internal: release, experiment, pricing, outage, campaign change. External: competitor, seasonality, news, policy. Line up the dated timeline of changes against the start of the drop.

**Step 5: conclude and act.** State the cause with a confidence level, quantify impact, recommend a fix, and set up monitoring or an alert.

## Worked example
Conversion fell from 3.2% to 2.92% (about -8.8%, close to "10%"). Data:

| Segment | Sessions (before / after) | Rate (before / after) |
|---|---|---|
| desktop | 4,000 / 3,600 | 5.0% / 5.0% |
| mobile | 6,000 / 6,400 | 2.0% / 1.75% |

Shares: desktop $0.40 \to 0.36$, mobile $0.60 \to 0.64$.

- Desktop: mix $= -0.04 \times 0.05 = -0.20$ pp, rate $= 0$.
- Mobile: mix $= +0.04 \times 0.02 = +0.08$ pp, rate $= 0.64 \times (-0.25\text{ pp}) = -0.16$ pp.
- Total $= -0.20 + 0.08 - 0.16 = -0.28$ pp ✓.

Reading: the biggest piece is the traffic mix (desktop traffic shrank, and desktop converts 2.5x better). The mobile rate also fell, which deserves its own look (new app version? slower checkout?). Without decomposing, you would blame only the mobile app.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Daily orders dropped 10% starting last Tuesday in all countries, platforms and channels simultaneously. What is the most likely first suspect?",
  "options": [
    "A competitor launched in one country",
    "A data-collection or pipeline problem, or a company-wide outage",
    "Seasonality in one channel",
    "A pricing change in a single app version"
  ],
  "answer": 1,
  "explanation": "A synchronized cliff across every segment points to something common: instrumentation, the pipeline, a site-wide outage or a definition change. Confirm the drop is real before investigating business causes."
}
```

```quiz
{
  "id": "q2",
  "question": "Overall conversion drops, but conversion in every individual segment is flat. What explains it?",
  "options": [
    "A data bug is the only possible explanation",
    "A mix shift: more traffic from lower-converting segments (Simpson's paradox-style)",
    "The segments must be wrong",
    "Random noise always"
  ],
  "answer": 1,
  "explanation": "If within-segment rates are unchanged, the aggregate can still fall because the share of traffic moved to segments with lower rates. That is the mix effect."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `decompose(before, after)`. Both are dicts `{segment: (sessions, conversions)}` with the same segments. Return `{segment: (mix_effect, rate_effect)}` where, with traffic share $s$ and conversion rate $r$ per segment, `mix_effect = (s1 - s0) * r0` and `rate_effect = s1 * (r1 - r0)`. The sum of all effects must equal the change in overall conversion rate.",
  "starterCode": "def decompose(before, after):\n    # before/after: {segment: (sessions, conversions)}\n    # return {segment: (mix_effect, rate_effect)}\n    pass\n\nb = {\"desktop\": (4000, 200), \"mobile\": (6000, 120)}\na = {\"desktop\": (3600, 180), \"mobile\": (6400, 112)}\nprint(decompose(b, a))",
  "tests": "b = {\"desktop\": (4000, 200), \"mobile\": (6000, 120)}\na = {\"desktop\": (3600, 180), \"mobile\": (6400, 112)}\nd = decompose(b, a)\nassert abs(d[\"desktop\"][0] - (-0.04 * 0.05)) < 1e-12\nassert abs(d[\"desktop\"][1]) < 1e-12\nassert abs(d[\"mobile\"][0] - 0.04 * 0.02) < 1e-12\nassert abs(d[\"mobile\"][1] - 0.64 * (0.0175 - 0.02)) < 1e-12\ntotal = sum(m + r for m, r in d.values())\nassert abs(total - (0.0292 - 0.032)) < 1e-12\na2 = {\"desktop\": (4000, 200), \"mobile\": (6000, 60)}\nd2 = decompose(b, a2)\nassert all(abs(m) < 1e-12 for m, r in d2.values())\nassert abs(d2[\"mobile\"][1] - 0.6 * (0.01 - 0.02)) < 1e-12",
  "solution": "def decompose(before, after):\n    n0 = sum(s for s, _ in before.values())\n    n1 = sum(s for s, _ in after.values())\n    out = {}\n    for seg in before:\n        s0, c0 = before[seg]\n        s1, c1 = after[seg]\n        share0, share1 = s0 / n0, s1 / n1\n        r0, r1 = c0 / s0, c1 / s1\n        out[seg] = ((share1 - share0) * r0, share1 * (r1 - r0))\n    return out",
  "hints": [
    "Share = segment sessions / total sessions in that period; rate = conversions / sessions.",
    "Check your result: the effects should add up to after-rate minus before-rate overall."
  ]
}
```

```reveal
{
  "prompt": "Interview: \"Average order value (AOV) dropped 10% month over month. Walk me through it.\"",
  "answer": "**Clarify**: definition (revenue / orders, before or after returns and discounts?), exact size and dates, any recent changes.\n\n**Is it real?** Check tracking, currency conversion, refunds timing, one-off large orders (outliers) in the base month, calendar effects (month length, promo).\n\n**Decompose**: AOV = items per order x average price per item. Then slice by country, category, new vs returning, channel, device. Compute mix vs rate effects: did we sell more low-priced items (mix), or did prices within categories fall (rate)?\n\n**Hypotheses**: a discount campaign or free-shipping threshold change, a new low-priced category or a market launch, a big B2B order last month, a supply stock-out on premium items, a shift to mobile with smaller baskets.\n\n**Judge impact**: a lower AOV is not automatically bad. If orders rose 15% the revenue may have increased. Check orders, revenue, margin and customer mix together.\n\n**Conclude**: state the main driver with its share of the drop, the recommended action (revert, targeted threshold, bundles), and the monitoring you will add."
}
```

> [!TIP] Interview tips
> - Use a fixed framework out loud: clarify, check data, localise, decompose, hypothesise, quantify, recommend. Structure is what interviewers score.
> - Always check data quality and seasonality before telling a business story, and compare against normal week-to-week volatility.
> - Mention mix vs rate effects and Simpson's paradox, and end with impact and next steps, not just a cause.
