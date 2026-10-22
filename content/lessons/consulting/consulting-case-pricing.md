---
id: consulting-case-pricing
title: "Case: Pricing"
estimatedMinutes: 14
difficulty: medium
tags: [consulting, case, pricing, elasticity]
---

## Why it matters
Pricing cases ("Should the client raise prices? How should we price a new product?") combine economics, customer insight and numbers. They are also a staple of data-science interviews at marketplaces and SaaS companies, where you estimate elasticity, run price tests and explain the trade-off between volume and margin.

## Concept
**Three anchors**: **cost-plus** (floor: unit cost plus target margin), **competitor-based** (what substitutes charge), and **value-based** (what the customer gains, a ceiling). Good prices sit between the floor and the value ceiling, adjusted for competition and strategy (penetration vs premium).

**Playbook**: (1) clarify the product, goal (profit, share, entry), constraints; (2) understand costs and current unit economics; (3) customers: segments, willingness to pay (WTP), switching costs; (4) competitors and substitutes; (5) estimate the **price-volume trade-off** and pick a price; (6) test (A/B, geo split, conjoint, Van Westendorp survey) and monitor.

**Elasticity**: $\varepsilon = \dfrac{\%\Delta Q}{\%\Delta P}$. Demand is elastic if $|\varepsilon| > 1$. With constant elasticity $\varepsilon < -1$ and unit cost $c$, the profit-maximising price is $p^* = c\,\dfrac{\varepsilon}{1+\varepsilon}$ (a markup of $\frac{1}{|\varepsilon|-1}$ over cost). Elasticity is only reliable near the observed price, so do not extrapolate far.

**Critical loss**: a price rise of $\Delta p$ on unit margin $m$ pays off if volume falls by less than $\dfrac{\Delta p}{\Delta p + m}$.

**Segmenting** (price discrimination: tiers, versions, discounts) captures more of the WTP curve, subject to fairness and cannibalisation.

**Pitfalls**: confusing margin percentage with markup; using average elasticity for a heterogeneous base; ignoring competitor reaction; ignoring long-run effects (brand, churn) of price rises; treating a price cut as free volume.

For experiment mechanics see the A/B testing lessons.

## Worked example
**Case**: A SaaS product costs \$20 a month to serve (variable cost) and sells at \$100 to 10,000 customers. The CEO wants a 10% price rise. A past test suggests elasticity of about −1.5. (Illustrative.)

**Baseline**: profit = $(100 - 20) \times 10{,}000 = \$800{,}000$ a month.

**Critical loss**: a \$10 rise on an \$80 margin pays off only if volume falls less than $\frac{10}{10 + 80} = 11.1\%$.

**Predicted loss**: elasticity −1.5 implies $-1.5 \times 10\% = -15\%$ volume, which exceeds the 11.1% threshold. New profit: $(110 - 20) \times 8{,}500 = \$765{,}000$, **below** the baseline. Do not raise the list price across the board.

**What else?** If $|\varepsilon| = 1.5$ holds everywhere, $p^* = 20 \times \frac{-1.5}{-0.5} = \$60$, giving about 21,500 customers and \$860,000 profit. But this is a 40% cut far from the observed price, so the elasticity is not trustworthy that far out.

**Recommendation**: segment instead. Raise prices for low-elasticity customers (large accounts with high switching cost), keep the entry plan price, and test a 5% rise with a randomised price test on 10% of new sign-ups, tracking conversion and 90-day churn, before any rollout.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Unit margin is $80 and you raise price by $10. Up to what volume loss does the rise still increase profit?",
  "options": [
    "Up to 10%",
    "Up to 11.1%",
    "Up to 12.5%",
    "Up to 20%"
  ],
  "answer": 1,
  "explanation": "Critical loss = 10 / (10 + 80) = 11.1%. Beyond that, the lost units cost more margin than the extra price earns."
}
```

```quiz
{
  "id": "q2",
  "question": "Why is it risky to apply a measured elasticity to a 40% price cut?",
  "options": [
    "Elasticity is always zero",
    "Elasticity is estimated near current prices and usually changes along the demand curve",
    "Price cuts never change volume",
    "Elasticity only applies to B2B"
  ],
  "answer": 1,
  "explanation": "A local estimate does not describe demand far away, and competitors may respond. Test in small steps."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `critical_loss(price, unit_cost, pct_rise)`: the maximum fractional volume loss at which a price rise of `pct_rise` (a fraction of `price`) still leaves profit unchanged. Use `dp = price * pct_rise`, `m = price - unit_cost` and return `dp / (dp + m)`.",
  "starterCode": "def critical_loss(price, unit_cost, pct_rise):\n    pass\n\nprint(critical_loss(100, 20, 0.10))\n",
  "tests": "assert abs(critical_loss(100, 20, 0.10) - 10 / 90) < 1e-12\nassert abs(critical_loss(100, 0, 0.10) - 10 / 110) < 1e-12\nassert critical_loss(100, 90, 0.10) > 0.4\nassert critical_loss(100, 20, 0) == 0",
  "solution": "def critical_loss(price, unit_cost, pct_rise):\n    dp = price * pct_rise\n    m = price - unit_cost\n    return dp / (dp + m)",
  "hints": [
    "The extra price on retained units must offset the margin lost on departed units: (m + dp)(1 - L) = m.",
    "Solve for L = dp / (m + dp)."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `profit_after_change(price, unit_cost, qty, elasticity, pct_change)` using a linear approximation: new price = `price * (1 + pct_change)`, new quantity = `qty * (1 + elasticity * pct_change)` (floored at 0). Return the new profit `(new_price - unit_cost) * new_qty`.",
  "starterCode": "def profit_after_change(price, unit_cost, qty, elasticity, pct_change):\n    pass\n\nprint(profit_after_change(100, 20, 10000, -1.5, 0.10))\n",
  "tests": "assert abs(profit_after_change(100, 20, 10000, -1.5, 0.10) - 765000) < 1e-6\nassert abs(profit_after_change(100, 20, 10000, -1.5, 0) - 800000) < 1e-6\nassert abs(profit_after_change(100, 20, 10000, -0.5, 0.10) - 90 * 9500) < 1e-6\nassert profit_after_change(100, 20, 10000, -20, 0.10) == 0",
  "solution": "def profit_after_change(price, unit_cost, qty, elasticity, pct_change):\n    new_price = price * (1 + pct_change)\n    new_qty = max(0.0, qty * (1 + elasticity * pct_change))\n    return (new_price - unit_cost) * new_qty",
  "hints": [
    "Elasticity is negative, so a price rise reduces quantity.",
    "At elasticity -20 and +10%, quantity would go negative; the floor handles it."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Write `best_price(wtps, unit_cost)`. Each customer buys one unit if the price is at most their willingness to pay. Consider each distinct WTP value as a candidate price; profit is `(price - unit_cost) * number_of_customers_with_wtp >= price`. Return `(best_price, best_profit)`; break ties in favour of the higher price.",
  "starterCode": "def best_price(wtps, unit_cost):\n    pass\n\nprint(best_price([50, 80, 100, 120, 150], 20))\n",
  "tests": "assert best_price([50, 80, 100, 120, 150], 20) == (100, 240)\nassert best_price([10, 10, 10], 4) == (10, 18)\nassert best_price([30, 40], 35) == (40, 5)\nassert best_price([5, 6], 10) == (6, -4)",
  "solution": "def best_price(wtps, unit_cost):\n    best = None\n    for p in sorted(set(wtps)):\n        profit = (p - unit_cost) * sum(1 for w in wtps if w >= p)\n        if best is None or profit >= best[1]:\n            best = (p, profit)\n    return best",
  "hints": [
    "Iterate prices in increasing order and use >= when comparing so later (higher) prices win ties.",
    "Sample: price 80 sells to 4 customers: 60 x 4 = 240; price 100 sells to 3: 80 x 3 = 240. Tie, so 100."
  ]
}
```

> [!TIP] Interview tips
> - Name the three anchors (cost, competition, value) and the price-volume trade-off before computing.
> - Use critical loss as a fast sanity check, then recommend a segmented test rather than a blanket change.
> - Pitfall: extrapolating elasticity far from observed prices or ignoring competitor response.
