---
id: experimentation-conflicting-metrics
title: Conflicting metrics
estimatedMinutes: 14
difficulty: hard
tags: [experimentation, metrics, trade-offs, case-interview]
---

## Why it matters
Real tests rarely move every metric the same way: revenue goes up while engagement goes down, or clicks rise while satisfaction falls. "Metric A is up, metric B is down, what do you do?" is one of the most common product-analytics interview questions.

## Concept
A structured approach:

1. **Rule out artifacts first.** Is each movement statistically real (CI, multiple testing)? Is one metric noisy or affected by a logging change? Many "conflicts" are one real effect plus noise.
2. **Understand the mechanism.** Why would the change move them in opposite directions? A story that explains both (e.g. a bigger paywall raises revenue but blocks casual users) tells you which effect lasts.
3. **Find the metric closest to long-term value.** Short-term proxies (clicks, revenue this week) can trade against long-term health (retention, satisfaction). Prefer the one that predicts lifetime value.
4. **Put them in the same units.** Translate each effect into a common currency, e.g. dollars of lifetime value: $\Delta\text{value} = \sum_m w_m \cdot \Delta m$. This is the idea behind an **Overall Evaluation Criterion (OEC)**: a single pre-agreed weighted score.
5. **Segment.** Often one segment drives the gain and another the loss. A targeted launch can keep the gain and avoid the loss.

Set the rules **before** the test: one primary metric (or OEC), guardrails with acceptable floors, and the weights. Choosing weights after seeing results is a form of p-hacking.

## Worked example
A subscription upsell banner: revenue per user +2.0% (CI [+1.2%, +2.8%]), monthly retention −0.4 percentage points (CI [−0.7, −0.1]).

Translate both into lifetime value. Today a user brings \$10/month and monthly churn is 5%, so expected lifetime ≈ 1/0.05 = 20 months and LTV ≈ \$200. With the banner: \$10.20/month and churn 5.4%, so lifetime ≈ 18.5 months and LTV ≈ \$189. Net: about **−\$11 per user**, even though revenue "won". Segmenting shows the retention loss is concentrated in users in their first week. Recommendation: show the banner only to users past their first month, then re-test.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why should metric weights in an OEC be agreed on before the experiment?",
  "options": ["Because weights can't be computed afterwards", "Choosing weights after seeing results lets you make any variant win, which is a form of p-hacking", "Because the OEC must be a single metric from the logs", "Pre-agreed weights increase statistical power"],
  "answer": 1,
  "explanation": "Post-hoc weighting gives you enough freedom to justify any decision. Agreeing upfront keeps the decision honest."
}
```

```quiz
{
  "id": "q2",
  "type": "multi",
  "question": "Clicks are up 8% but time spent is down 3%. Which are reasonable next steps? Select all that apply.",
  "options": ["Check whether both effects are statistically real", "Look at downstream actions per click to see whether clicks are lower quality", "Launch, because clicks are the primary metric and won", "Segment by user type to see who drives each effect"],
  "answer": [0, 1, 3],
  "explanation": "Confirm the effects, understand the mechanism (low-quality clicks?), and segment. Declaring victory on the proxy ignores the conflict."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `pick_variant(variants, weights, floors)`. `variants` maps a name to a dict of metric → lift. A variant is **eligible** only if, for every metric in `floors`, its lift is ≥ the floor. Score = Σ weights[m] · lift[m] over metrics in `weights`. Return the eligible variant with the highest score, or `None` if none is eligible.",
  "starterCode": "def pick_variant(variants, weights, floors):\n    pass\n\nvariants = {\n    'A': {'revenue': 2.0, 'retention': -0.5},\n    'B': {'revenue': 1.0, 'retention': 0.2},\n    'C': {'revenue': 3.0, 'retention': -1.5},\n}\nprint(pick_variant(variants, {'revenue': 1, 'retention': 3}, {'retention': -1.0}))",
  "tests": "v = {'A': {'revenue': 2.0, 'retention': -0.5}, 'B': {'revenue': 1.0, 'retention': 0.2}, 'C': {'revenue': 3.0, 'retention': -1.5}}\nassert pick_variant(v, {'revenue': 1, 'retention': 3}, {'retention': -1.0}) == 'B'\nassert pick_variant(v, {'revenue': 1, 'retention': 0.5}, {'retention': -1.0}) == 'A'\nassert pick_variant(v, {'revenue': 1, 'retention': 0.5}, {}) == 'C'\nassert pick_variant(v, {'revenue': 1}, {'retention': 1.0}) is None",
  "solution": "def pick_variant(variants, weights, floors):\n    best, best_score = None, None\n    for name, lifts in variants.items():\n        if any(lifts[m] < f for m, f in floors.items()):\n            continue\n        score = sum(w * lifts[m] for m, w in weights.items())\n        if best_score is None or score > best_score:\n            best, best_score = name, score\n    return best",
  "hints": ["Filter by floors first, then score what's left.", "With weights revenue 1, retention 3: A = 0.5, B = 1.6, C = −1.5."]
}
```

```reveal
{
  "prompt": "Case: a new ranking model raises marketplace GMV by +1.5% but seller-side metrics show the share of sales going to new sellers dropped from 12% to 9%. How do you advise the team?",
  "answer": "1. **Confirm**: both effects significant? Ran long enough? Any logging change in seller attribution?\n2. **Mechanism**: the model likely favors sellers with more history (more reviews, better-estimated conversion), a rich-get-richer loop.\n3. **Long-term value**: new-seller success drives future supply. If new sellers get fewer sales they churn, and selection and prices worsen over time; this cost won't show up in a 2-week GMV readout.\n4. **Common units**: estimate the GMV that lost new sellers would have produced over a year (new-seller churn rate × their expected future GMV) and compare with the +1.5%.\n5. **Options**: add an exploration boost or cold-start prior for new sellers, set a guardrail (e.g. new-seller share ≥ 11%), and re-test. Consider a long-running holdout to measure supply effects.\n\nRecommendation: don't ship as is; ship a version that keeps most of the GMV gain while holding the new-seller guardrail."
}
```

> [!TIP] Interview tips
> - Don't pick a side immediately. First confirm both movements are real, then explain the mechanism.
> - Convert effects to a common unit (usually long-term dollars) and name your assumptions.
> - Mention segmentation and targeted launches as a way to keep the win without the loss.
