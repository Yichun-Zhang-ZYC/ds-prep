---
id: experimentation-debugging-unexpected-results
title: Debugging unexpected results
estimatedMinutes: 15
difficulty: hard
tags: [experimentation, debugging, trustworthiness, case-interview]
---

## Why it matters
"The test shows a +20% lift from a tiny button change" or "the metric dropped and nobody knows why" are classic interview prompts. A surprising result is more likely a bug than a breakthrough (Twyman's law: any figure that looks interesting or different is usually wrong). Interviewers want to see a systematic debugging process.

## Concept
Go from the most likely and cheapest-to-check causes to the least:

1. **Data and pipeline**: logging changes, missing events in one variant, bot traffic, duplicate events, metric definition changes, timezone or date-boundary bugs.
2. **Assignment**: **sample ratio mismatch** (SRM) overall and **within segments**; users switching variants; triggering applied differently in each arm.
3. **Analysis**: wrong unit of analysis (sessions vs users), outliers driving a mean, peeking, multiple comparisons, ratio metrics with mismatched denominators.
4. **Time effects**: novelty or primacy effects, holidays, a concurrent launch or marketing campaign, an outage in one region.
5. **Composition (Simpson's paradox)**: the overall result can point one way while every segment points the other way when the segment mix differs between arms.
6. **Real effect**: only after the above, look for a genuine mechanism, and try to replicate.

For a metric drop outside an experiment, segment by **time** (sudden vs gradual), **platform / app version**, **geography**, **traffic source**, and **new vs returning users**, and split the metric into its components (e.g. conversion = visits × visit-to-cart × cart-to-purchase).

## Worked example
A checkout test shows conversion of 8% in control vs 13% in treatment. Splitting by device:

| Segment | Control | Treatment |
|---|---|---|
| Mobile | 48 / 800 = 6% | 10 / 200 = 5% |
| Desktop | 32 / 200 = 16% | 120 / 800 = 15% |
| **Overall** | 80 / 1000 = 8% | 130 / 1000 = 13% |

Treatment is **worse** in both segments, but it got mostly desktop users, who convert more. That's Simpson's paradox, and the 80/20 vs 20/80 split within segments is itself a red flag: an assignment bug (for example a redirect that drops mobile users) is likely. Fix assignment before reading any result.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A test of a small copy change shows a +25% lift in purchases. What should you do first?",
  "options": ["Launch immediately", "Check for SRM, logging changes and outliers before trusting the number", "Increase the traffic to 100%", "Report the lift to leadership"],
  "answer": 1,
  "explanation": "Twyman's law: surprisingly large effects from small changes are usually bugs. Validate the data and assignment first."
}
```

```quiz
{
  "id": "q2",
  "question": "Daily active users dropped 10% overnight. Which segmentation is most likely to localize the cause quickly?",
  "options": ["By user age", "By platform and app version", "By account creation month", "By favorite content category"],
  "answer": 1,
  "explanation": "Sudden drops are usually caused by releases, logging changes or outages, which show up when you split by platform, app version, or region."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Rows are `(segment, group, users, conversions)` with group `'control'` or `'treatment'`. Write `lifts(rows)` returning a dict with `'overall'` (treatment rate − control rate over all segments) and one entry per segment. Then write `is_simpsons(rows)` returning True if every segment's lift has the opposite sign from the overall lift.",
  "starterCode": "def lifts(rows):\n    pass\n\ndef is_simpsons(rows):\n    pass\n\nrows = [\n    ('mobile', 'control', 800, 48), ('mobile', 'treatment', 200, 10),\n    ('desktop', 'control', 200, 32), ('desktop', 'treatment', 800, 120),\n]\nprint(lifts(rows), is_simpsons(rows))",
  "tests": "rows = [('mobile', 'control', 800, 48), ('mobile', 'treatment', 200, 10), ('desktop', 'control', 200, 32), ('desktop', 'treatment', 800, 120)]\nL = lifts(rows)\nassert abs(L['overall'] - 0.05) < 1e-9\nassert abs(L['mobile'] + 0.01) < 1e-9\nassert abs(L['desktop'] + 0.01) < 1e-9\nassert is_simpsons(rows) is True\nok = [('a', 'control', 100, 10), ('a', 'treatment', 100, 12), ('b', 'control', 100, 20), ('b', 'treatment', 100, 22)]\nassert is_simpsons(ok) is False",
  "solution": "def lifts(rows):\n    seg = {}\n    tot = {'control': [0, 0], 'treatment': [0, 0]}\n    for s, g, n, c in rows:\n        seg.setdefault(s, {})[g] = c / n\n        tot[g][0] += n\n        tot[g][1] += c\n    out = {'overall': tot['treatment'][1] / tot['treatment'][0] - tot['control'][1] / tot['control'][0]}\n    for s, r in seg.items():\n        out[s] = r['treatment'] - r['control']\n    return out\n\ndef is_simpsons(rows):\n    L = lifts(rows)\n    o = L.pop('overall')\n    return all(v * o < 0 for v in L.values())",
  "hints": ["Sum users and conversions per group for the overall rate.", "Opposite signs means the product of the two lifts is negative."]
}
```

```reveal
{
  "prompt": "Case: an experiment shows treatment increased average revenue per user by 15%, but the median is unchanged and the conversion rate is flat. What do you investigate?",
  "answer": "A mean moving while the median and conversion stay flat points to a few extreme values.\n\n1. **Outliers**: look at the top revenue users per arm. One whale or a bulk/B2B buyer in treatment can move the mean. Re-run with winsorized or capped revenue, or a trimmed mean.\n2. **Bots / fraud / test accounts**: unusual order sizes or patterns; check whether they are excluded consistently.\n3. **Logging**: duplicated purchase events or currency conversion bugs in one variant.\n4. **Assignment**: SRM check; make sure high-value users weren't routed to treatment (e.g. via a targeting rule).\n5. **Real effect?** If the lift remains after capping and is spread across many users (e.g. higher basket size for buyers), it may be genuine; test revenue per buyer and replicate.\n\nConclusion to give: don't report +15% until it survives outlier-robust analysis."
}
```

> [!TIP] Interview tips
> - Quote Twyman's law: surprising results are usually bugs; check data and assignment before celebrating.
> - Give an ordered checklist (pipeline → assignment → analysis → time → composition → real effect) rather than random guesses.
> - For metric drops, say "sudden or gradual?" first, then segment and decompose the metric into its funnel components.
