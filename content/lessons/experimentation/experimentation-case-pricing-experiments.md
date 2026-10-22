---
id: experimentation-case-pricing-experiments
title: "Case: Pricing experiments"
estimatedMinutes: 13
difficulty: hard
tags: [experimentation, pricing, elasticity, case-study]
---

## Why it matters
Price is the highest-leverage and riskiest lever in a business. Conversion alone is the wrong metric (a lower price always converts better), customers compare prices, and long-run effects such as churn and reference prices matter. Pricing cases test whether you think in margin and elasticity, not CTR.

## Concept
**Playbook**:
1. **Pick the right metric.** Not conversion. Use **revenue per visitor** ($\text{RPV} = \text{conversion} \times \text{price}$) and, better, **margin per visitor** $= \text{conversion} \times (\text{price} - \text{unit cost})$. For subscriptions add retention/renewal and LTV.
2. **Elasticity**: $\varepsilon = \dfrac{\%\Delta Q}{\%\Delta P}$. If $|\varepsilon| < 1$ (inelastic), raising price raises revenue; if $> 1$, it lowers revenue. Margin breaks even at a larger drop than revenue does.
3. **Break-even rule**: raising price from $p_0$ to $p_1$ with unit cost $c$ keeps margin if conversion falls by at most $1 - \dfrac{p_0 - c}{p_1 - c}$.
4. **Design options**
   - *User-level randomization*: cleanest statistics, but users compare prices (screenshots, shared accounts), and it raises **fairness and legal** concerns. Often limited to discounts/promos, or to new customers.
   - *Geo or market-level / time switchbacks*: avoid visible price discrimination; fewer units.
   - *Item-level (diff-in-diff)*: change prices on a subset of SKUs and compare with matched SKUs; watch cross-item cannibalization.
   - *Surveys (Van Westendorp, conjoint)* for willingness to pay *before* testing; they are inputs, not proof.
5. **Long-term effects**: subscription churn at the first renewal, reference-price anchoring (a later price cut feels like a sale), brand trust. Keep a holdout on the old price or follow cohorts through renewal.
6. **Pitfalls**: novelty (price changes get noticed), stock-outs, competitor reaction, and short tests that miss the renewal.

## Worked example
A subscription box raises its price from \$10 to \$12 in a two-arm test (illustrative numbers). Unit cost is \$4.

- Conversion: control 5.0%, treatment 4.4%, a relative drop of 12%.
- Elasticity: $\varepsilon = (-12\%) / (+20\%) = -0.6$, inelastic.
- RPV: $0.050 \times 10 = 0.500$ vs $0.044 \times 12 = 0.528$, **+5.6%**.
- Margin per visitor: $0.050 \times 6 = 0.300$ vs $0.044 \times 8 = 0.352$, **+17.3%**.
- Break-even conversion drop: $1 - 6/8 = 25\%$; we observed 12%, so there is headroom.

Not done yet: the first renewal is at month 2. If treated subscribers churn at 40% instead of 30%, retained value falls by a third, and the win may vanish. The recommendation is to ship to a small share of traffic, keep a 10% holdout at \$10, and read the renewal cohort before rolling out everywhere.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A price increase test shows conversion down 8% and price up 25%. What can you conclude about revenue per visitor?",
  "options": [
    "It fell, because conversion fell",
    "It rose about 15%: 0.92 × 1.25 = 1.15",
    "It is unchanged",
    "Cannot be determined without a p-value"
  ],
  "answer": 1,
  "explanation": "RPV scales with conversion × price: 0.92 × 1.25 = 1.15, a 15% rise (demand is inelastic: elasticity −0.32). Significance still needs the usual test, and margin and retention need checking."
}
```

```quiz
{
  "id": "q2",
  "question": "Why is user-level price randomization often avoided in consumer products?",
  "options": [
    "It has too little power",
    "Users can see and compare different prices, causing trust, fairness and legal problems and contaminating the control",
    "Prices are not measurable",
    "It requires a holdout"
  ],
  "answer": 1,
  "explanation": "Price discrimination is visible, so it can break SUTVA (shared accounts, social posts) and harm the brand; geo, time or item-level designs are common substitutes."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `rpv_and_margin(price, conversion, unit_cost)` returning `(rpv, margin_per_visitor)` where rpv = conversion*price and margin = conversion*(price - unit_cost).",
  "starterCode": "def rpv_and_margin(price, conversion, unit_cost):\n    pass\n\nprint(rpv_and_margin(12, 0.044, 4))",
  "tests": "r, m = rpv_and_margin(12, 0.044, 4)\nassert abs(r - 0.528) < 1e-12 and abs(m - 0.352) < 1e-12\nr, m = rpv_and_margin(10, 0.05, 4)\nassert abs(r - 0.5) < 1e-12 and abs(m - 0.3) < 1e-12",
  "solution": "def rpv_and_margin(price, conversion, unit_cost):\n    return conversion * price, conversion * (price - unit_cost)",
  "hints": [
    "Margin uses the unit margin (price - unit cost), not the price.",
    "0.044 * 8 = 0.352."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `price_elasticity(p0, p1, q0, q1)` = ((q1 - q0)/q0) / ((p1 - p0)/p0), and `breakeven_drop(p0, p1, cost)` = the maximum relative conversion drop that keeps margin per visitor unchanged = 1 - (p0 - cost)/(p1 - cost).",
  "starterCode": "def price_elasticity(p0, p1, q0, q1):\n    pass\n\ndef breakeven_drop(p0, p1, cost):\n    pass\n\nprint(price_elasticity(10, 12, 0.05, 0.044), breakeven_drop(10, 12, 4))",
  "tests": "assert abs(price_elasticity(10, 12, 0.05, 0.044) - (-0.6)) < 1e-9\nassert abs(breakeven_drop(10, 12, 4) - 0.25) < 1e-12\nassert abs(breakeven_drop(10, 10, 4)) < 1e-12\nassert abs(breakeven_drop(10, 12, 0) - (1 - 10 / 12)) < 1e-12",
  "solution": "def price_elasticity(p0, p1, q0, q1):\n    return ((q1 - q0) / q0) / ((p1 - p0) / p0)\n\ndef breakeven_drop(p0, p1, cost):\n    return 1 - (p0 - cost) / (p1 - cost)",
  "hints": [
    "Margin is break-even when conv1*(p1-c) = conv0*(p0-c).",
    "With zero cost the break-even drop equals the revenue break-even, 1 - p0/p1."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Write `best_price(prices, conversions, unit_cost)` returning the price with the highest margin per visitor from a multi-arm test. Write `ltv_adjusted_margin(price, conversion, unit_cost, renewal_rate, months)` = conversion*(price - unit_cost) * (1 + r + r^2 + ... + r^(months-1)), with r = renewal_rate. Then show in the tests that the best arm can change once renewal is considered.",
  "starterCode": "def best_price(prices, conversions, unit_cost):\n    pass\n\ndef ltv_adjusted_margin(price, conversion, unit_cost, renewal_rate, months):\n    pass\n\nprint(best_price([10, 12, 14], [0.05, 0.044, 0.03], 4))",
  "tests": "assert best_price([10, 12, 14], [0.05, 0.044, 0.03], 4) == 12\nassert abs(ltv_adjusted_margin(10, 0.05, 4, 0.7, 3) - 0.05 * 6 * (1 + 0.7 + 0.49)) < 1e-12\nassert abs(ltv_adjusted_margin(10, 0.05, 4, 0.9, 1) - 0.3) < 1e-12\n# with weaker renewal at the higher price, the ranking flips\na = ltv_adjusted_margin(12, 0.044, 4, 0.6, 6)\nb = ltv_adjusted_margin(10, 0.05, 4, 0.8, 6)\nassert b > a",
  "solution": "def best_price(prices, conversions, unit_cost):\n    return max(zip(prices, conversions), key=lambda pc: pc[1] * (pc[0] - unit_cost))[0]\n\ndef ltv_adjusted_margin(price, conversion, unit_cost, renewal_rate, months):\n    r = renewal_rate\n    return conversion * (price - unit_cost) * sum(r ** k for k in range(months))",
  "hints": [
    "Margins per visitor: 0.30, 0.352 and 0.30, so 12 wins.",
    "The geometric sum is sum(r**k for k in range(months))."
  ]
}
```

```reveal
{
  "prompt": "Interview: \"We want to raise the price of our premium subscription. How would you test it?\"",
  "answer": "**Goal and metric**: maximize long-run margin, not conversion. Primary: margin per visitor and 3-6 month LTV (conversion × margin × expected retention). Guardrails: churn at first renewal, support tickets, downgrade rate, brand/NPS.\n\n**Design**: randomize **new visitors** to 2-3 price points (e.g. $10, $12, $14) so existing customers are not surprised; or run by market/country if cross-user visibility is a concern. Keep a persistent holdout at the current price. Legal/ethics: do not price on sensitive attributes, and honor previously quoted prices.\n\n**Duration**: at least 2 full weekly cycles for conversion, but the decision needs the first-renewal cohort, so read an early proxy (conversion, margin per visitor) then confirm retention.\n\n**Existing customers**: grandfather them, or test with a staged rollout and a holdout, since churn is the main risk.\n\n**Decision rule**: compute break-even conversion drop and compare with the observed drop and its CI; pick the arm that maximizes LTV-adjusted margin, then roll out gradually."
}
```

> [!TIP] Interview tips
> - Lead with margin per visitor and elasticity; say conversion alone always favors the lower price.
> - State the break-even conversion drop as a decision rule before looking at results.
> - Raise fairness/legal visibility of price tests and the long-term renewal and reference-price effects.
