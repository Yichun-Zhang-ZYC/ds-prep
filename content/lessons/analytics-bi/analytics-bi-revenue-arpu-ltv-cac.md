---
id: analytics-bi-revenue-arpu-ltv-cac
title: Revenue, ARPU, LTV, CAC
estimatedMinutes: 12
difficulty: medium
tags: [business-metrics, unit-economics, ltv, cac, interview-pattern]
---

## Why it matters
Unit economics decide whether growth is healthy. Interviewers ask you to define these metrics, compute LTV:CAC and payback from a few numbers, and explain when the simple formulas break.

## Concept
**Definitions**:
- **Revenue**: recognized income. Know **gross vs net** (after refunds, discounts), **MRR/ARR** for subscriptions, and bookings vs revenue.
- **ARPU** (average revenue per user) $= \dfrac{\text{revenue}}{\text{active users}}$ over a period. **ARPPU** divides by *paying* users only, so it is higher and ignores conversion.
- **CAC** (customer acquisition cost) $= \dfrac{\text{sales and marketing spend}}{\text{new customers acquired}}$. **Blended** CAC includes organic customers; **paid** CAC divides paid spend by paid customers only.
- **LTV** (lifetime value): expected gross profit from a customer. Simple subscription form with constant monthly churn $c$:
$$\text{LTV} = \frac{\text{ARPU} \times \text{gross margin}}{c}, \qquad \text{expected lifetime} = \frac{1}{c} \text{ months}$$
- **LTV:CAC**: rule of thumb $\ge 3$. **CAC payback** $= \dfrac{\text{CAC}}{\text{ARPU} \times \text{margin}}$ months, often targeted under 12.

**When the simple formulas break**:
- Churn isn't constant: early churn is higher, so use cohort retention curves and sum margin over months, with discounting.
- New cohorts differ from old ones (channel mix); LTV from mature cohorts overstates it.
- Use **gross profit**, not revenue; otherwise LTV is inflated.
- LTV is only observed for old customers, so you predict the rest. Cap the horizon (e.g. 3 years).
- Segment: LTV and CAC by channel; blended numbers hide unprofitable channels.

## Worked example
A subscription app: ARPU \$20 per month, gross margin 70%, monthly churn 5%. In a month it spent \$45,000 on marketing and acquired 500 customers.

- CAC $= 45{,}000 / 500 = \$90$.
- Monthly gross profit per user $= 20 \times 0.7 = \$14$.
- Expected lifetime $= 1 / 0.05 = 20$ months.
- LTV $= 14 / 0.05 = \$280$.
- LTV:CAC $= 280 / 90 \approx 3.1$, at the usual threshold.
- Payback $= 90 / 14 \approx 6.4$ months.

If churn rose to 8%, LTV $= 14 / 0.08 = \$175$ and LTV:CAC $\approx 1.9$: a three-point churn rise nearly halves the unit economics' margin of safety.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A product has 10,000 monthly active users, of whom 1,000 pay $30 each. What are ARPU and ARPPU?",
  "options": [
    "ARPU $3, ARPPU $30",
    "ARPU $30, ARPPU $3",
    "Both $30",
    "ARPU $0.3, ARPPU $30"
  ],
  "answer": 0,
  "explanation": "Revenue is $30,000. ARPU divides by all 10,000 active users ($3); ARPPU divides by the 1,000 payers ($30)."
}
```

```quiz
{
  "id": "q2",
  "question": "Why is LTV computed from revenue (instead of gross profit) misleading?",
  "options": [
    "Revenue is always smaller than profit",
    "It ignores the cost of serving the customer, so LTV:CAC looks better than the real economics",
    "Revenue cannot be forecast",
    "It double counts churned users"
  ],
  "answer": 1,
  "explanation": "CAC is paid out of margin. Use gross profit (revenue × gross margin, or contribution margin) in LTV to compare like with like."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement unit-economics helpers: `arpu(revenue, active_users)`, `cac(spend, new_customers)`, `ltv(arpu, margin, monthly_churn)` = arpu × margin / churn, `payback_months(cac, arpu, margin)` = cac / (arpu × margin), and `ltv_cac(arpu, margin, churn, cac)`. Then write `verdict(ratio, payback)` returning 'healthy' if ratio >= 3 and payback <= 12, 'unprofitable' if ratio < 1, otherwise 'watch'.",
  "starterCode": "def arpu(revenue, active_users):\n    pass\n\ndef cac(spend, new_customers):\n    pass\n\ndef ltv(arpu_value, margin, monthly_churn):\n    pass\n\ndef payback_months(cac_value, arpu_value, margin):\n    pass\n\ndef ltv_cac(arpu_value, margin, monthly_churn, cac_value):\n    pass\n\ndef verdict(ratio, payback):\n    pass\n",
  "tests": "assert abs(arpu(30000, 10000) - 3.0) < 1e-12\nassert abs(cac(45000, 500) - 90.0) < 1e-12\nassert abs(ltv(20, 0.7, 0.05) - 280.0) < 1e-9\nassert abs(payback_months(90, 20, 0.7) - 90 / 14) < 1e-12\nassert abs(ltv_cac(20, 0.7, 0.05, 90) - 280 / 90) < 1e-9\nassert abs(ltv_cac(20, 0.7, 0.08, 90) - 175 / 90) < 1e-9\nassert verdict(3.1, 6.4) == 'healthy'\nassert verdict(3.5, 20) == 'watch'\nassert verdict(0.8, 5) == 'unprofitable'\nassert verdict(1.9, 6.4) == 'watch'",
  "solution": "def arpu(revenue, active_users):\n    return revenue / active_users\n\ndef cac(spend, new_customers):\n    return spend / new_customers\n\ndef ltv(arpu_value, margin, monthly_churn):\n    return arpu_value * margin / monthly_churn\n\ndef payback_months(cac_value, arpu_value, margin):\n    return cac_value / (arpu_value * margin)\n\ndef ltv_cac(arpu_value, margin, monthly_churn, cac_value):\n    return ltv(arpu_value, margin, monthly_churn) / cac_value\n\ndef verdict(ratio, payback):\n    if ratio < 1:\n        return 'unprofitable'\n    if ratio >= 3 and payback <= 12:\n        return 'healthy'\n    return 'watch'",
  "hints": [
    "Check the `ratio < 1` case first so it never falls through to 'watch'.",
    "LTV uses monthly gross profit per user (arpu × margin) divided by monthly churn."
  ]
}
```

> [!TIP] Interview tips
> - Define every term with numerator and denominator; distinguish ARPU from ARPPU and blended from paid CAC.
> - Use gross profit in LTV, state the churn assumption, and mention cohort-based LTV when churn is not constant.
> - Quote both LTV:CAC (about 3) and payback (under 12 months); the ratio alone ignores cash timing.
