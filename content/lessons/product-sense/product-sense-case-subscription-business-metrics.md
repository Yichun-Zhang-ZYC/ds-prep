---
id: product-sense-case-subscription-business-metrics
title: "Case: Subscription business metrics"
estimatedMinutes: 13
difficulty: medium
tags: [case-study, subscription, saas, mrr, retention, ltv]
---

## Why it matters
Netflix, Spotify, Duolingo and every SaaS company run on subscriptions. "What metrics would you track for our subscription product?" tests whether you can build the revenue waterfall, separate growth from retention, and judge unit economics. See also Revenue, ARPU, LTV and CAC and Retention and churn for the basic definitions.

## Concept
**The MRR waterfall** explains every change in monthly recurring revenue (normalise annual plans to monthly):

$$MRR_{end} = MRR_{start} + \text{New} + \text{Expansion} - \text{Contraction} - \text{Churned}$$

**Retention on a revenue basis** (same cohort of customers that existed at the start):
- **Gross revenue retention (GRR)** = (Start − Contraction − Churned) / Start. Capped at 100%, it measures leakage.
- **Net revenue retention (NRR)** = (Start + Expansion − Contraction − Churned) / Start. Above 100% means the base grows by itself. Best-in-class B2B SaaS often sits above 110%.
- **Logo churn** counts customers, **revenue churn** counts dollars. They diverge when big customers behave differently.

**Growth efficiency**:
- **SaaS quick ratio** = (New + Expansion) / (Contraction + Churned). Rule of thumb: above 4 is excellent, below 1 means shrinking.
- **LTV** with a constant monthly churn $c$: $LTV = \dfrac{ARPA \times GM}{c}$, with expected lifetime $1/c$ months.
- **CAC payback (months)** = CAC / (ARPA × GM). **LTV:CAC** around 3 or more is a common target.

**Consumer subscription funnel**: visitor → trial start → trial-to-paid conversion → month-1, month-3 retention → renewal rate (annual plans have a single big renewal cliff). Split **voluntary churn** (cancel) from **involuntary churn** (failed payments, typically 20-40% of churn, recoverable with dunning and card updaters).

**Pitfalls**:
- The simple LTV formula assumes constant churn, but churn is highest early (cohort curves flatten), so estimate with cohorts.
- Discounts and free trials inflate sign-ups but lower quality; compare cohorts by acquisition source and offer.
- Growing the top line by lowering price while hurting ARPA and churn.
- Pause, downgrade and reactivation flows muddy "churn": define each state precisely.

## Worked example
A B2B tool with 2,000 customers at \$50 ARPA (illustrative) reports for the month:

| Component | MRR |
|---|---|
| Start | \$100,000 |
| New | + \$12,000 |
| Expansion | + \$5,000 |
| Contraction | − \$2,000 |
| Churned (60 customers) | − \$3,000 |
| **End** | **\$112,000** |

- **GRR** = (100 − 2 − 3) / 100 = **95%**. **NRR** = (100 + 5 − 2 − 3) / 100 = **100%**. The base holds steady; all net growth (+12%) comes from new logos.
- **Quick ratio** = (12 + 5) / (2 + 3) = **3.4**: healthy but reliant on acquisition.
- Logo churn = 60 / 2,000 = 3% a month. With gross margin 80%: $LTV = 50 \times 0.8 / 0.03 \approx$ \$1,333.
- If CAC is \$400: LTV:CAC ≈ **3.3**, payback = 400 / (50 × 0.8) = **10 months**.

**Reading**: unit economics are acceptable, but NRR of only 100% means growth depends on spend. Priorities: raise expansion (seat or usage upsell), cut the 3% monthly churn (a 3% to 2% drop lifts LTV by 50%), and check how much of the churn is involuntary. Guardrail: do not buy expansion with discounts that cut ARPA.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A SaaS company has 3% monthly logo churn but NRR of 112%. How is that possible?",
  "options": [
    "It is impossible; NRR cannot exceed 100% with churn",
    "Expansion revenue from surviving customers outweighs the revenue lost to churn and downgrades",
    "NRR includes new customers",
    "Logo churn is measured on annual plans only"
  ],
  "answer": 1,
  "explanation": "NRR is measured on the starting cohort only (no new logos). Upsell, seat growth or price increases can exceed the revenue churned."
}
```

```quiz
{
  "id": "q2",
  "question": "Monthly churn is 5% and ARPA × gross margin is $20. What is the simple LTV?",
  "options": [
    "$100",
    "$400",
    "$1",
    "$200"
  ],
  "answer": 1,
  "explanation": "Expected lifetime = 1 / 0.05 = 20 months, so LTV = 20 × $20 = $400."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `mrr_waterfall(before, after)`. Both arguments are dicts `{customer: mrr}`; a customer missing from a dict has 0 MRR. Return a dict with keys `new` (customers absent before), `expansion` (existing customers with higher MRR, sum of increases), `contraction` (existing customers with lower but non-zero MRR, sum of decreases as a positive number), `churned` (customers whose MRR went to zero or who disappeared, positive number) and `end` (total MRR after).",
  "starterCode": "def mrr_waterfall(before, after):\n    pass\n\nb = {'a': 100, 'b': 50, 'c': 80, 'd': 40}\na = {'a': 120, 'b': 30, 'c': 0, 'e': 60}\nprint(mrr_waterfall(b, a))",
  "tests": "b = {'a': 100, 'b': 50, 'c': 80, 'd': 40}\na = {'a': 120, 'b': 30, 'c': 0, 'e': 60}\nr = mrr_waterfall(b, a)\nassert r == {'new': 60, 'expansion': 20, 'contraction': 20, 'churned': 120, 'end': 210}\nassert r['end'] == sum(b.values()) + r['new'] + r['expansion'] - r['contraction'] - r['churned']\nr2 = mrr_waterfall({'x': 10}, {'x': 10})\nassert r2 == {'new': 0, 'expansion': 0, 'contraction': 0, 'churned': 0, 'end': 10}",
  "solution": "def mrr_waterfall(before, after):\n    new = exp = con = churn = 0\n    for c in set(before) | set(after):\n        b = before.get(c, 0)\n        a = after.get(c, 0)\n        if b == 0 and a > 0:\n            new += a\n        elif b > 0 and a == 0:\n            churn += b\n        elif a > b:\n            exp += a - b\n        elif a < b:\n            con += b - a\n    return {'new': new, 'expansion': exp, 'contraction': con, 'churned': churn, 'end': sum(after.values())}",
  "hints": [
    "Loop over the union of customers and classify each by (before, after).",
    "Reconcile: end = start + new + expansion − contraction − churned."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Implement `retention(start, expansion, contraction, churned)` returning `(grr, nrr)` and `quick_ratio(new, expansion, contraction, churned)` = (new + expansion) / (contraction + churned) (return `float('inf')` if the denominator is 0).",
  "starterCode": "def retention(start, expansion, contraction, churned):\n    pass\n\ndef quick_ratio(new, expansion, contraction, churned):\n    pass\n\nprint(retention(100000, 5000, 2000, 3000), quick_ratio(12000, 5000, 2000, 3000))",
  "tests": "g, n = retention(100000, 5000, 2000, 3000)\nassert abs(g - 0.95) < 1e-12 and abs(n - 1.0) < 1e-12\ng, n = retention(100, 30, 0, 0)\nassert abs(g - 1.0) < 1e-12 and abs(n - 1.3) < 1e-12\nassert abs(quick_ratio(12000, 5000, 2000, 3000) - 3.4) < 1e-12\nassert quick_ratio(5, 0, 0, 0) == float('inf')",
  "solution": "def retention(start, expansion, contraction, churned):\n    grr = (start - contraction - churned) / start\n    nrr = (start + expansion - contraction - churned) / start\n    return grr, nrr\n\ndef quick_ratio(new, expansion, contraction, churned):\n    loss = contraction + churned\n    if loss == 0:\n        return float('inf')\n    return (new + expansion) / loss",
  "hints": [
    "GRR excludes expansion; NRR includes it. Neither includes new customers.",
    "Guard the quick ratio against a zero denominator."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Implement `unit_economics(arpa, gm, monthly_churn, cac)` returning a dict with `ltv` = arpa * gm / monthly_churn, `ltv_cac` = ltv / cac, and `payback_months` = cac / (arpa * gm). Then implement `churn_needed(arpa, gm, cac, target_ltv_cac)`: the maximum monthly churn that still achieves the target LTV:CAC.",
  "starterCode": "def unit_economics(arpa, gm, monthly_churn, cac):\n    pass\n\ndef churn_needed(arpa, gm, cac, target_ltv_cac):\n    pass\n\nprint(unit_economics(50, 0.8, 0.03, 400), churn_needed(50, 0.8, 400, 3))",
  "tests": "u = unit_economics(50, 0.8, 0.03, 400)\nassert abs(u['ltv'] - 40 / 0.03) < 1e-9\nassert abs(u['ltv_cac'] - 40 / 0.03 / 400) < 1e-9\nassert abs(u['payback_months'] - 10) < 1e-9\nassert abs(churn_needed(50, 0.8, 400, 3) - 40 / 1200) < 1e-12\nu2 = unit_economics(50, 0.8, churn_needed(50, 0.8, 400, 3), 400)\nassert abs(u2['ltv_cac'] - 3) < 1e-9",
  "solution": "def unit_economics(arpa, gm, monthly_churn, cac):\n    ltv = arpa * gm / monthly_churn\n    return {'ltv': ltv, 'ltv_cac': ltv / cac, 'payback_months': cac / (arpa * gm)}\n\ndef churn_needed(arpa, gm, cac, target_ltv_cac):\n    return arpa * gm / (target_ltv_cac * cac)",
  "hints": [
    "Solve arpa·gm / (churn · cac) = target for churn.",
    "With $40 monthly gross profit and CAC $400, a 3x target needs churn ≤ 3.33%."
  ]
}
```

> [!TIP] Interview tips
> - Start with the MRR waterfall: new, expansion, contraction and churn tell you where growth comes from and where it leaks.
> - Distinguish GRR from NRR, logo churn from revenue churn, voluntary from involuntary churn.
> - State LTV assumptions (constant churn, gross margin) and prefer cohort curves; tie the metric to a decision such as which lever to pull first.
