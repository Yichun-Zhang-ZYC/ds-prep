---
id: analytics-bi-case-pricing-analysis
title: "Case: Pricing analysis"
estimatedMinutes: 13
difficulty: hard
tags: [case-study, pricing, elasticity, profit]
---

## Why it matters
Pricing is the highest-leverage lever a business has: a 1% price change moves profit far more than a 1% volume change. Interviewers ask "should we raise the price?" to see whether you reason about elasticity, margin and causality instead of just revenue.

## Concept
**Price elasticity** $\varepsilon = \dfrac{\%\Delta Q}{\%\Delta P}$ (usually negative). Demand is **elastic** if $|\varepsilon| > 1$ (a price rise lowers revenue) and **inelastic** if $|\varepsilon| < 1$ (a price rise raises revenue).

**Estimating it**: with a constant-elasticity (log-log) model $\ln Q = a + \varepsilon \ln P + \text{controls}$, the slope is the elasticity. Control for seasonality, promotions, competitor prices and product mix.

**Revenue vs profit**: revenue is maximised at $|\varepsilon| = 1$, but profit needs unit cost $c$. With constant elasticity $\varepsilon < -1$ the profit-maximising price is

$$P^* = c\cdot\frac{\varepsilon}{1+\varepsilon},\qquad \frac{P^*-c}{P^*} = -\frac{1}{\varepsilon}\ \text{(Lerner rule)}$$

If your current margin is below $-1/\varepsilon$ you are underpricing.

**Methods, from weakest to strongest causal evidence**:
- **Historical price changes** (regression): cheap but confounded. Prices rise in high-demand periods, which biases elasticity towards zero (endogeneity).
- **Surveys** (Van Westendorp, Gabor-Granger, conjoint): willingness to pay is stated, not revealed.
- **Price experiments**: randomise by user, store or geo (geo or time-based when users could see each other's prices). Gold standard, but watch fairness and reputation.
- **Quasi-experiments**: diff-in-diff around a price change in one market.

**Beyond one price**:
- **Cross-elasticity and cannibalisation**: a premium tier or discount may steal from other products. Measure total profit, not one SKU.
- **Reference prices and perception**: temporary discounts reset what customers think is fair.
- **Long-run effects**: churn, brand and competitor response appear weeks later. Run long enough and track retention.
- **Segmentation**: price discrimination (tiers, student plans) captures willingness to pay but must be hard to arbitrage.

## Worked example
A subscription box costs \$10 and sells 1,000 a week with unit cost \$6. A test in one region raised the price to \$11, and sales fell to 850 (illustrative).

**Elasticity**: $\varepsilon = \ln(850/1000)/\ln(11/10) = -0.1625/0.0953 \approx -1.7$. Demand is elastic, yet a price rise may still pay off because margins matter:

- At \$10: profit = 1,000 × (10 − 6) = \$4,000. Margin 40%, while $-1/\varepsilon \approx 59\%$, so we are underpriced.
- At \$11: 850 × 5 = \$4,250 (+6%) even though revenue fell from \$10,000 to \$9,350.
- Model at \$12: $Q = 1000 \times 1.2^{-1.7} \approx 733$, profit ≈ 733 × 6 = \$4,400.
- Unconstrained $P^* = 6 \times (-1.7)/(-0.7) \approx$ \$14.57, profit ≈ \$4,520.

**Recommendation**: do not jump to \$14.57. That extrapolates 46% beyond the tested range, where the constant-elasticity assumption is untested. Roll out \$11-12 in stages, running a second test at \$12 with retention as a guardrail, since a subscription's long-run churn may be higher than week-one sales suggest. Note that the single test also confounds price with region and season, so repeat it with randomisation.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Estimated elasticity is -0.6 for a product with a 50% margin. What does the model say about a 5% price increase?",
  "options": [
    "Revenue and profit both fall",
    "Revenue rises (inelastic) and profit rises too, since fewer units are sold at higher margin",
    "Revenue falls but profit rises",
    "Cannot tell without competitor prices"
  ],
  "answer": 1,
  "explanation": "With |ε| < 1 revenue rises. Selling fewer units also lowers variable cost, so profit rises even more. Check long-run effects before acting."
}
```

```quiz
{
  "id": "q2",
  "question": "Historical data show higher prices coincide with higher sales. What is the most likely explanation?",
  "options": [
    "Giffen goods are common",
    "Endogeneity: the firm raises prices when demand is already high (holidays, launches)",
    "The log-log model is wrong",
    "Elasticity is positive for most products"
  ],
  "answer": 1,
  "explanation": "Price is set in response to demand, so the regression picks up demand shifts. Use experiments, instruments or controls for seasonality and promotions."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `fit_elasticity(prices, qty)`: the OLS slope of `ln(qty)` on `ln(price)` (pure Python, no numpy).",
  "starterCode": "import math\n\ndef fit_elasticity(prices, qty):\n    pass\n\nprint(fit_elasticity([10, 11, 12], [1000, 850, 733]))",
  "tests": "prices = [8, 9, 10, 11, 12.5]\nqty = [1000 * (p / 10) ** -1.5 for p in prices]\nassert abs(fit_elasticity(prices, qty) + 1.5) < 1e-9\nassert abs(fit_elasticity([10, 11], [1000, 850]) - (math.log(0.85) / math.log(1.1))) < 1e-9\nassert abs(fit_elasticity([5, 10, 20], [100, 100, 100])) < 1e-9",
  "solution": "import math\n\ndef fit_elasticity(prices, qty):\n    x = [math.log(p) for p in prices]\n    y = [math.log(q) for q in qty]\n    n = len(x)\n    mx, my = sum(x) / n, sum(y) / n\n    sxy = sum((a - mx) * (b - my) for a, b in zip(x, y))\n    sxx = sum((a - mx) ** 2 for a in x)\n    return sxy / sxx",
  "hints": [
    "slope = Σ(x − x̄)(y − ȳ) / Σ(x − x̄)² with x = ln p and y = ln q.",
    "Two points give exactly ln(q1/q0) / ln(p1/p0)."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Implement `revenue_change(dp, e)`: with constant elasticity `e`, a fractional price change `dp` (0.10 = +10%) changes revenue by `(1 + dp) ** (1 + e) - 1`. Then implement `profit(price, base_price, base_qty, e, cost)` returning `Q * (price - cost)` where `Q = base_qty * (price / base_price) ** e`.",
  "starterCode": "def revenue_change(dp, e):\n    pass\n\ndef profit(price, base_price, base_qty, e, cost):\n    pass\n\nprint(revenue_change(0.1, -1.7), profit(12, 10, 1000, -1.7, 6))",
  "tests": "assert abs(revenue_change(0.1, -1.0)) < 1e-12\nassert abs(revenue_change(0.1, -2.0) - (1 / 1.1 - 1)) < 1e-12\nassert abs(revenue_change(0.1, -1.7) - (-0.0645)) < 5e-4\nassert revenue_change(0.1, -0.5) > 0\nassert abs(profit(10, 10, 1000, -1.7, 6) - 4000) < 1e-9\nassert abs(profit(12, 10, 1000, -1.7, 6) - 4400) < 2",
  "solution": "def revenue_change(dp, e):\n    return (1 + dp) ** (1 + e) - 1\n\ndef profit(price, base_price, base_qty, e, cost):\n    q = base_qty * (price / base_price) ** e\n    return q * (price - cost)",
  "hints": [
    "Revenue = P·Q ∝ P^(1+e) under constant elasticity.",
    "At the base price the quantity multiplier is exactly 1."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Implement `best_price(cost, e, grid)`: return the price from `grid` (a list of candidate prices) that maximises profit under constant elasticity, using `(p - cost) * p ** e` (the constant factor can be dropped). Also implement `optimal_price(cost, e)` returning the closed form `cost * e / (1 + e)` when `e < -1`, else `None`.",
  "starterCode": "def best_price(cost, e, grid):\n    pass\n\ndef optimal_price(cost, e):\n    pass\n\nprint(optimal_price(6, -1.7), best_price(6, -1.7, [10, 11, 12, 13, 14, 15, 16]))",
  "tests": "assert abs(optimal_price(6, -1.7) - 6 * 1.7 / 0.7) < 1e-9\nassert optimal_price(6, -0.8) is None\nassert optimal_price(6, -1.0) is None\nassert best_price(6, -1.7, [10, 11, 12, 13, 14, 15, 16]) == 15\nassert best_price(6, -3.0, [8, 9, 10, 11, 12]) == 9\nassert best_price(6, -1.7, [10]) == 10",
  "solution": "def best_price(cost, e, grid):\n    return max(grid, key=lambda p: (p - cost) * p ** e)\n\ndef optimal_price(cost, e):\n    if e >= -1:\n        return None\n    return cost * e / (1 + e)",
  "hints": [
    "Use `max(grid, key=...)`.",
    "At e = -1 the formula divides by zero: no finite optimum."
  ]
}
```

> [!TIP] Interview tips
> - Frame the answer in profit, not revenue: margin and elasticity together decide direction (Lerner rule).
> - Name the causal problem (prices are set in response to demand) and propose a randomised price test with retention as a guardrail.
> - Warn against extrapolating a constant-elasticity fit far outside tested prices; roll out in stages.
