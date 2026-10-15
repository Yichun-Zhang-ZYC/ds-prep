---
id: experimentation-synthetic-control
title: Synthetic control
estimatedMinutes: 12
difficulty: hard
tags: [causal-inference, synthetic-control, geo-experiments]
---

## Why it matters
"We launched a TV campaign in one country. What did it do?" With one (or a few) treated units and no natural twin, synthetic control builds a custom comparison from a weighted mix of untreated units. It's common in marketing and policy evaluation.

## Concept
1. Pick **donor** units that weren't treated (other countries, cities, stores).
2. Find non-negative weights (summing to 1) so the weighted donors **match the treated unit's pre-period outcomes** as closely as possible.
3. After treatment, the weighted donors form the **synthetic control**: an estimate of what the treated unit would have done. The gap is the effect.

Compared with DiD, synthetic control doesn't need one control group with parallel trends; it constructs one. It works best with a long, well-fitted pre-period.

Checks:
- **Pre-period fit**: a poor fit means the synthetic unit isn't a credible counterfactual.
- **Placebo tests**: apply the method to each donor as if it were treated; the real effect should stand out from the placebo gaps.
- Donors must not be affected by the treatment (spillovers).

## Worked example
A city launches a bike-share subsidy. Donor cities A, B, C. The best pre-period fit is 0.5·A + 0.3·B + 0.2·C, which tracks the city's weekly rides within 2% for a year. After launch, the city averages 12,000 rides/week vs 10,000 for the synthetic city: an estimated +2,000 rides/week (+20%). Placebo gaps for donors are within ±5%, so the effect stands out.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why are placebo tests important in synthetic control?",
  "options": ["They increase the sample size", "They show whether the treated unit's gap is unusually large compared with gaps produced by chance in untreated units", "They replace pre-period fitting", "They remove spillovers"],
  "answer": 1,
  "explanation": "With one treated unit, placebo runs on donors provide the reference distribution for inference."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `best_two_donor_weight(treated_pre, donor_a_pre, donor_b_pre)`: search w in {0.00, 0.01, …, 1.00} for the weight that minimizes the sum of squared errors between treated_pre and w·A + (1 − w)·B. Return w (rounded to 2 decimals). Then write `effect(treated_post, a_post, b_post, w)` = mean gap between treated and the synthetic series in the post-period.",
  "starterCode": "def best_two_donor_weight(treated_pre, donor_a_pre, donor_b_pre):\n    pass\n\ndef effect(treated_post, a_post, b_post, w):\n    pass\n\nA = [100, 102, 104, 106]\nB = [50, 52, 51, 53]\nT = [0.6 * a + 0.4 * b for a, b in zip(A, B)]\nprint(best_two_donor_weight(T, A, B))",
  "tests": "A = [100, 102, 104, 106]\nB = [50, 52, 51, 53]\nT = [0.6 * a + 0.4 * b for a, b in zip(A, B)]\nw = best_two_donor_weight(T, A, B)\nassert abs(w - 0.6) < 1e-9\nAp, Bp = [108, 110], [54, 55]\nTp = [0.6 * a + 0.4 * b + 5 for a, b in zip(Ap, Bp)]\nassert abs(effect(Tp, Ap, Bp, w) - 5) < 1e-9",
  "solution": "def best_two_donor_weight(treated_pre, donor_a_pre, donor_b_pre):\n    best_w, best_err = 0.0, float('inf')\n    for i in range(101):\n        w = i / 100\n        err = sum((t - (w * a + (1 - w) * b)) ** 2 for t, a, b in zip(treated_pre, donor_a_pre, donor_b_pre))\n        if err < best_err:\n            best_w, best_err = w, err\n    return round(best_w, 2)\n\ndef effect(treated_post, a_post, b_post, w):\n    gaps = [t - (w * a + (1 - w) * b) for t, a, b in zip(treated_post, a_post, b_post)]\n    return sum(gaps) / len(gaps)",
  "hints": ["A simple grid search over w is enough for two donors.", "The effect is the average post-period gap between the treated series and the synthetic one."]
}
```

> [!TIP] Interview tips
> - Use synthetic control for one or a few treated regions with a long pre-period.
> - Show the pre-period fit and placebo tests before claiming an effect.
> - Mention spillover risks (neighboring donors affected by the campaign).
