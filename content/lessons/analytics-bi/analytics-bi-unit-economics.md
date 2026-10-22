---
id: analytics-bi-unit-economics
title: Unit economics
estimatedMinutes: 12
difficulty: medium
tags: [analytics, unit-economics, ltv, cac]
---

## Why it matters

"Is it worth paying \$200 to acquire a customer?" Unit economics answer whether growth creates or destroys value, and are a staple of analytics, growth and finance-flavoured interviews.

## Concept

A **unit** is one customer (or one order). Unit economics compare what a unit earns over its life with what it costs to acquire and serve.

- **ARPU**: revenue per active user in a period. **Gross margin** $GM = (\text{revenue} - \text{COGS})/\text{revenue}$.
- **Contribution margin** per order: price − discounts − COGS − shipping − payment fees. Only *variable* costs; fixed costs (rent, salaries) are excluded.
- **Lifetime**: with constant monthly churn $c$, the expected lifetime is $1/c$ months.
- **LTV** (simple): $\text{LTV} = \dfrac{\text{ARPU} \times GM}{c}$. Use margin, not revenue. For long horizons discount cash flows or cap the lifetime (e.g. 3-5 years).
- **CAC** = acquisition spend / new customers. *Blended* includes organic customers; *paid* does not. Say which one you use, and include sales salaries (*fully loaded*).
- **LTV:CAC** $\ge 3$ is the common rule of thumb. **Payback** (months) $= \dfrac{\text{CAC}}{\text{ARPU} \times GM}$; under 12 months is healthy for SaaS.

**Pitfalls**: blended CAC hides bad channels; LTV from young cohorts extrapolates churn; constant churn is false (early churn is higher), so prefer observed cohort retention curves; discounts and refunds belong in revenue.

## Worked example

A subscription has ARPU \$50/month, 70% gross margin, 5% monthly churn, CAC \$200.

- Monthly gross profit: $50 \times 0.7 = 35$ dollars. Lifetime: $1/0.05 = 20$ months.
- $\text{LTV} = 35 / 0.05 = 700$ dollars; $\text{LTV:CAC} = 700/200 = 3.5$.
- Payback: $200/35 \approx 5.7$ months.

If churn rises to 8%, LTV falls to $35/0.08 = 437.5$ dollars and LTV:CAC to about 2.2, below the 3x bar. Churn is the most sensitive input because it sits in the denominator.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "ARPU is $40/month, gross margin 80%, monthly churn 4%. What is the simple LTV?",
  "options": [
    "$160",
    "$800",
    "$1,000",
    "$32"
  ],
  "answer": 1,
  "explanation": "LTV = 40 × 0.8 / 0.04 = $800. Using revenue instead of margin would wrongly give $1,000."
}
```

```quiz
{
  "id": "q2",
  "question": "A channel shows LTV:CAC of 5 but a 30-month payback. What is the main concern?",
  "options": [
    "None, 5 is above the 3x benchmark",
    "Cash is tied up for 2.5 years and early churn may erase the LTV",
    "LTV should be computed with revenue, not margin",
    "CAC should exclude salaries"
  ],
  "answer": 1,
  "explanation": "The ratio ignores timing. A long payback strains cash and relies on customers surviving long enough; check cohort retention before scaling spend."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `contribution_margin(price, discount, cogs, shipping, fee_rate)`: net price after discount, minus COGS, shipping and a payment fee charged as `fee_rate` of the net price. Then write `unit_economics(arpu, gross_margin, monthly_churn, cac)` returning a dict with `ltv` (= ARPU × GM / churn; `float('inf')` if churn is 0), `ltv_cac` and `payback_months` (= CAC / (ARPU × GM)).",
  "starterCode": "def contribution_margin(price, discount, cogs, shipping, fee_rate):\n    pass\n\ndef unit_economics(arpu, gross_margin, monthly_churn, cac):\n    pass\n\nprint(contribution_margin(100, 10, 40, 8, 0.03))\nprint(unit_economics(50, 0.7, 0.05, 200))",
  "tests": "assert abs(contribution_margin(100, 10, 40, 8, 0.03) - 39.3) < 1e-9\nassert abs(contribution_margin(50, 0, 20, 5, 0.0) - 25) < 1e-9\nu = unit_economics(50, 0.7, 0.05, 200)\nassert abs(u['ltv'] - 700) < 1e-9\nassert abs(u['ltv_cac'] - 3.5) < 1e-9\nassert abs(u['payback_months'] - 200 / 35) < 1e-9\nu2 = unit_economics(50, 0.7, 0.08, 200)\nassert abs(u2['ltv'] - 437.5) < 1e-9\nassert unit_economics(50, 0.7, 0.0, 200)['ltv'] == float('inf')",
  "solution": "def contribution_margin(price, discount, cogs, shipping, fee_rate):\n    net = price - discount\n    return net - cogs - shipping - fee_rate * net\n\ndef unit_economics(arpu, gross_margin, monthly_churn, cac):\n    monthly_profit = arpu * gross_margin\n    ltv = monthly_profit / monthly_churn if monthly_churn > 0 else float('inf')\n    return {'ltv': ltv, 'ltv_cac': ltv / cac, 'payback_months': cac / monthly_profit}",
  "hints": [
    "Contribution margin uses only variable costs.",
    "Monthly gross profit per customer = arpu * gross_margin; LTV and payback both build on it."
  ]
}
```

> [!TIP] Interview tips
> - Always state the definitions (margin vs revenue, blended vs paid CAC) before quoting LTV:CAC.
> - Follow-up: "What if churn isn't constant?" Use cohort retention curves and a capped horizon instead of $1/c$.
> - Pitfall: celebrating a high LTV:CAC while payback is long; cash and early churn matter.
