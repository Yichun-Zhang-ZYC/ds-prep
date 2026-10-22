---
id: analytics-bi-case-marketing-attribution
title: "Case: Marketing attribution"
estimatedMinutes: 13
difficulty: medium
tags: [case-study, marketing, attribution, incrementality]
---

## Why it matters
Marketing and growth teams spend millions and ask "which channels actually work?" Attribution questions test whether you understand that credit-splitting rules are conventions, not causal truth, and that incrementality tests are the real answer.

## Concept
**Rule-based (heuristic) models** split credit for one conversion across the touchpoints on the customer's path:
- **Last touch**: all credit to the final touch. Easy, but over-rewards bottom-funnel channels (brand search, direct, retargeting).
- **First touch**: all credit to the first touch. Rewards discovery channels, ignores what closed the sale.
- **Linear**: equal credit to every touch.
- **Position-based (U-shaped)**: 40% first, 40% last, 20% split among the middle.
- **Time decay**: weight $w_i = 0.5^{d_i/h}$ where $d_i$ is days before conversion and $h$ the half-life, normalised to sum to 1.

**Data-driven attribution** (Shapley values, Markov removal effect) estimates each channel's marginal contribution from observed paths. Better, but still **observational**: people who see ads are often people already likely to buy.

**The core problem is causality.** Attribution answers "who gets credit?", not "what would have happened without the ad?". Measure the latter with **incrementality tests**: user-level holdouts, geo experiments, or ghost ads. Then

$$\text{incrementality} = \frac{\text{conv}_{T} - \text{conv}_{C}\cdot n_T/n_C}{\text{conv}_{T}},\qquad \text{iROAS} = \frac{\text{incremental revenue}}{\text{spend}}$$

**Pitfalls**:
- Cookie loss, privacy changes (ATT, consent) and cross-device journeys truncate paths. Many conversions look "direct".
- Platforms self-report with generous windows (e.g. 28-day view-through) and each claims the same sale, so totals exceed 100%.
- Retargeting and brand search harvest existing demand: high attributed ROAS, low iROAS.
- Lookback window choice changes results; fix it and report it.

**Practical stack**: use MTA or platform data for day-to-day optimisation, calibrate with periodic holdouts, and use media-mix modelling (MMM) for budget allocation across channels and offline media.

## Worked example
One conversion worth \$100 follows the path **Paid search → Email → Direct** (illustrative):

| Model | Paid search | Email | Direct |
|---|---|---|---|
| Last touch | 0 | 0 | \$100 |
| First touch | \$100 | 0 | 0 |
| Linear | \$33.33 | \$33.33 | \$33.33 |
| Position (40/20/40) | \$40 | \$20 | \$40 |

The same data makes Direct look like the star or like a bystander, depending on the rule.

Now test one channel causally. A retargeting campaign spent \$10,000 on 100,000 exposed users, who produced 500 attributed purchases at \$100 each: attributed ROAS = 50,000 / 10,000 = 5.0. A holdout of 100,000 similar users saw no ads and still made 200 purchases.

- Incremental purchases = 500 − 200 = 300, so incrementality = 300 / 500 = 60%.
- iROAS = 300 × \$100 / \$10,000 = **3.0**, not 5.0.

Whether 3.0 is good depends on gross margin: at a 40% margin, each \$1 of spend returns only \$1.20 of gross profit, so it is only marginally profitable. Recommendation: cap retargeting spend, shift budget to the channel with the best iROAS, and re-test.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which channel is most likely to be over-credited by last-touch attribution?",
  "options": [
    "Display prospecting",
    "Brand search and direct traffic",
    "Podcast sponsorships",
    "Organic social discovery"
  ],
  "answer": 1,
  "explanation": "Last touch rewards whoever is closest to the purchase. Brand search and direct usually capture demand created earlier by other channels."
}
```

```quiz
{
  "id": "q2",
  "question": "Attributed ROAS for a retargeting campaign is 5.0, but a holdout shows only 60% of attributed purchases were incremental. What is the better number to optimise on?",
  "options": [
    "5.0, since it is observed",
    "3.0 (iROAS), since it measures causal revenue per dollar",
    "Whichever is higher",
    "Neither; use CTR"
  ],
  "answer": 1,
  "explanation": "Holdouts estimate the counterfactual. 5.0 × 0.6 = 3.0 counts only revenue that would not have happened anyway."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `attribute(touches, model, value=1.0)`. `touches` is an ordered list of channel names (repeats allowed). `model` is one of `'first'`, `'last'`, `'linear'`, `'position'`. Return a dict `{channel: credit}` summing to `value` (credits for repeated channels are added). Position-based = 40% first, 40% last, 20% split equally among the middle touches; with 1 touch it gets everything, with 2 touches 50/50.",
  "starterCode": "def attribute(touches, model, value=1.0):\n    pass\n\nprint(attribute(['search', 'email', 'direct'], 'position', 100))",
  "tests": "r = attribute(['search', 'email', 'direct'], 'position', 100)\nassert abs(r['search'] - 40) < 1e-9 and abs(r['email'] - 20) < 1e-9 and abs(r['direct'] - 40) < 1e-9\nr = attribute(['a', 'b', 'a'], 'linear', 90)\nassert abs(r['a'] - 60) < 1e-9 and abs(r['b'] - 30) < 1e-9\nassert attribute(['a', 'b'], 'first', 10) == {'a': 10}\nassert attribute(['a', 'b'], 'last', 10) == {'b': 10}\nr = attribute(['a', 'b'], 'position', 10)\nassert abs(r['a'] - 5) < 1e-9 and abs(r['b'] - 5) < 1e-9\nassert abs(attribute(['a'], 'position', 7)['a'] - 7) < 1e-9\nr = attribute(['a', 'b', 'c', 'd'], 'position', 100)\nassert abs(r['b'] - 10) < 1e-9 and abs(r['c'] - 10) < 1e-9 and abs(sum(r.values()) - 100) < 1e-9",
  "solution": "def attribute(touches, model, value=1.0):\n    n = len(touches)\n    if model == 'first':\n        w = [1.0] + [0.0] * (n - 1)\n    elif model == 'last':\n        w = [0.0] * (n - 1) + [1.0]\n    elif model == 'linear':\n        w = [1.0 / n] * n\n    elif n == 1:\n        w = [1.0]\n    elif n == 2:\n        w = [0.5, 0.5]\n    else:\n        w = [0.4] + [0.2 / (n - 2)] * (n - 2) + [0.4]\n    out = {}\n    for t, wi in zip(touches, w):\n        if wi > 0:\n            out[t] = out.get(t, 0.0) + wi * value\n    return out",
  "hints": [
    "Build a list of weights, one per touch, then accumulate into a dict.",
    "Skip zero-weight touches so `first`/`last` return a single key."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Implement `incrementality(spend, n_t, conv_t, n_c, conv_c, value)` for a holdout test. Scale the control conversions to the treated group size, then return a tuple `(incremental_conversions, incrementality_share, iroas)`, where share = incremental / conv_t and iROAS = incremental * value / spend.",
  "starterCode": "def incrementality(spend, n_t, conv_t, n_c, conv_c, value):\n    pass\n\nprint(incrementality(10000, 100000, 500, 100000, 200, 100))",
  "tests": "inc, share, roas = incrementality(10000, 100000, 500, 100000, 200, 100)\nassert abs(inc - 300) < 1e-9 and abs(share - 0.6) < 1e-9 and abs(roas - 3.0) < 1e-9\ninc, share, roas = incrementality(5000, 100000, 400, 50000, 100, 50)\nassert abs(inc - 200) < 1e-9 and abs(share - 0.5) < 1e-9 and abs(roas - 2.0) < 1e-9",
  "solution": "def incrementality(spend, n_t, conv_t, n_c, conv_c, value):\n    inc = conv_t - conv_c * n_t / n_c\n    return inc, inc / conv_t, inc * value / spend",
  "hints": [
    "Expected conversions without ads in the treated group = conv_c * n_t / n_c.",
    "Unequal group sizes are why scaling matters."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Implement `time_decay(touches, half_life, value=1.0)`. `touches` is a list of `(channel, days_before_conversion)`. Weight each touch by `0.5 ** (days / half_life)`, normalise so weights sum to 1, multiply by `value`, and return `{channel: credit}` (add repeated channels).",
  "starterCode": "def time_decay(touches, half_life, value=1.0):\n    pass\n\nprint(time_decay([('search', 14), ('email', 7), ('direct', 0)], 7, 100))",
  "tests": "r = time_decay([('search', 14), ('email', 7), ('direct', 0)], 7, 100)\nassert abs(r['search'] - 100 * 0.25 / 1.75) < 1e-9\nassert abs(r['email'] - 100 * 0.5 / 1.75) < 1e-9\nassert abs(r['direct'] - 100 * 1.0 / 1.75) < 1e-9\nr = time_decay([('a', 3), ('a', 3), ('b', 3)], 5)\nassert abs(r['a'] - 2 / 3) < 1e-9 and abs(sum(r.values()) - 1) < 1e-9",
  "solution": "def time_decay(touches, half_life, value=1.0):\n    w = [0.5 ** (d / half_life) for _, d in touches]\n    total = sum(w)\n    out = {}\n    for (ch, _), wi in zip(touches, w):\n        out[ch] = out.get(ch, 0.0) + value * wi / total\n    return out",
  "hints": [
    "With half-life 7: a touch 14 days back gets 0.25, 7 days back 0.5, same day 1.0.",
    "Normalise by the sum of raw weights."
  ]
}
```

> [!TIP] Interview tips
> - Say up front that attribution splits credit, not causation; propose a holdout or geo test to validate any model.
> - Show how the same path gets different credit under first, last, linear and position-based rules, then explain which bias each has.
> - Watch for platforms double-counting, short cookie windows and retargeting inflating ROAS; report iROAS and margin, not just ROAS.
