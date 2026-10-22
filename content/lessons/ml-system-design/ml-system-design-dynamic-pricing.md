---
id: ml-system-design-dynamic-pricing
title: "Design: Dynamic pricing"
estimatedMinutes: 13
difficulty: hard
tags: [ml-system-design, pricing, causal-inference, elasticity]
---

## Why it matters
Pricing questions (ride-hailing surge, hotels, airlines, e-commerce) look like prediction problems but are really causal decision problems. Interviewers want to hear that you need the demand curve, not just a demand forecast, and that you know how to estimate it without being fooled by confounded history.

## Concept
**Framing**: choose a price per item (or ride, room, seat) and time to maximize profit, subject to inventory, fairness and business constraints. Compare with *Demand forecasting*: forecasting predicts demand at the prices you already set; pricing needs $q(p)$, how demand *changes* when you change $p$.

**Core idea**: with demand $q(p)$ and unit cost $c$, profit is $(p-c)\,q(p)$. For constant elasticity $q=q_0(p/p_0)^{-\epsilon}$ with $\epsilon>1$ the optimum is the Lerner markup rule
$$p^*=c\cdot\frac{\epsilon}{\epsilon-1}$$
The more elastic the demand, the thinner the margin. With limited inventory (seats, rooms, drivers) replace $c$ by the **opportunity cost** (shadow price) of a unit; perishable inventory is solved with dynamic programming or a learned value function.

**Pipeline**:
1. *Demand model*: predict conversion/units from price, item, user segment, time, competitor prices, stock, seasonality. Use GBDT or a neural net with a **monotonic constraint** (demand does not increase with price) or an explicit log-log form so the optimizer sees a sensible curve.
2. *Optimizer*: evaluate profit on a grid of candidate prices (or solve in closed form), subject to constraints.
3. *Guardrails*: floor/ceiling, max change per day, price consistency across channels, caps during emergencies (price-gouging laws), no use of protected attributes.
4. *Exploration*: a bandit (Thompson sampling) over a few price points, or small random price perturbations, to keep the elasticity estimates alive.

**The causal trap**: in historical data, prices were high *because* demand was high (peak season, events), so a naive regression finds a flat or even positive price coefficient and the "optimal" move is to raise prices forever. Fixes: randomized price experiments (best), instruments such as cost shocks or quasi-random promotions, double machine learning with rich controls, and always checking elasticity signs on randomized data.

**Evaluation**: offline predictive metrics (MAPE, calibration of conversion) are necessary but not sufficient; the elasticity itself needs validation on randomized data. Online: A/B on profit per visitor, with conversion, units and long-run retention as guardrails. When units share supply (drivers, inventory) or compete, randomizing by user leaks interference, so use **switchback** (alternate by time window) or geo experiments.

**Risks**: price discrimination that looks unfair, loss of trust (users compare prices), competitor reaction and algorithmic collusion concerns, and feedback loops where your price changes your own training data.

## Worked example
Illustrative numbers. Cost c = \$20, reference price \$30 ($p_0=30$) selling $q_0=1000$ units/day, elasticity $\epsilon=2.5$.

Profit at \$30: (30 − 20) × 1000 = \$10,000.

Optimal price: $p^*=20\times\frac{2.5}{1.5}\approx 33.33$, i.e. \$33.33. Demand falls to $1000\times(33.33/30)^{-2.5}\approx768$ units, profit = 13.33 × 768 ≈ \$10,246 (+2.5%). Going further hurts: at \$36 profit is about \$10,143 and at \$40 about \$9,743. The profit curve is flat near the optimum, so a rough elasticity is enough but a wrong *sign* is catastrophic.

Confounding: suppose weekends have both higher prices and more demand. A regression of units on price over history yields a positive slope. Within weekends only, or on randomized prices, the slope is negative. Always control for or randomize around the confounder.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Historical data show that on days with higher prices, more units were sold. What is the most likely explanation and the right response?",
  "options": [
    "Customers prefer expensive products, so raise prices",
    "Prices were set higher when demand was already high (confounding); estimate elasticity from randomized price variation or with proper controls",
    "The data are too small to use",
    "Switch to a classification model"
  ],
  "answer": 1,
  "explanation": "Price is endogenous in logged data. Randomized experiments or causal methods recover the true demand curve."
}
```

```quiz
{
  "id": "q2",
  "question": "You test a new pricing policy for a ride-hailing marketplace by randomizing riders between policies. Why can the result be misleading?",
  "options": [
    "Riders cannot be randomized",
    "Treated and control riders compete for the same drivers, so interference biases the estimate; use switchback or geo experiments",
    "Prices cannot be logged",
    "A/B tests only work for clicks"
  ],
  "answer": 1,
  "explanation": "Shared supply creates spillovers between arms. Time- or region-level randomization contains the interference."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `estimate_elasticity(prices, qty)` returning the OLS slope of $\\ln q$ on $\\ln p$ (so a demand curve $q=q_0p^{-\\epsilon}$ gives $-\\epsilon$). Use plain Python.",
  "starterCode": "import math\n\ndef estimate_elasticity(prices, qty):\n    pass\n\nprint(estimate_elasticity([10, 20, 40], [400, 100, 25]))",
  "tests": "p = [10, 15, 20, 30, 40]\nq = [1000 * x ** -2.0 for x in p]\nassert abs(estimate_elasticity(p, q) + 2.0) < 1e-9\nq2 = [50 * x ** -0.5 for x in p]\nassert abs(estimate_elasticity(p, q2) + 0.5) < 1e-9\nassert abs(estimate_elasticity([10, 20, 40], [400, 100, 25]) + 2.0) < 1e-9",
  "solution": "import math\n\ndef estimate_elasticity(prices, qty):\n    xs = [math.log(p) for p in prices]\n    ys = [math.log(q) for q in qty]\n    mx = sum(xs) / len(xs)\n    my = sum(ys) / len(ys)\n    num = sum((x - mx) * (y - my) for x, y in zip(xs, ys))\n    den = sum((x - mx) ** 2 for x in xs)\n    return num / den",
  "hints": [
    "Take natural logs of both lists, then slope = sum((x-mx)(y-my)) / sum((x-mx)^2).",
    "No intercept handling needed beyond centering by the means."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `optimal_price(cost, elasticity)` returning $c\\epsilon/(\\epsilon-1)$ for $\\epsilon>1$ and `None` otherwise. Then write `best_grid_price(q0, p0, eps, cost, grid)` that evaluates profit $(p-c)q_0(p/p_0)^{-\\epsilon}$ on each price in `grid` and returns `(price, profit)` for the best one (the lower price on ties).",
  "starterCode": "def optimal_price(cost, elasticity):\n    pass\n\ndef best_grid_price(q0, p0, eps, cost, grid):\n    pass\n\nprint(optimal_price(20, 2.5), best_grid_price(1000, 30, 2.5, 20, [30, 33, 36, 40]))",
  "tests": "assert abs(optimal_price(20, 2.5) - 33.3333333333) < 1e-6\nassert optimal_price(20, 1.0) is None\nassert optimal_price(20, 0.8) is None\nprice, profit = best_grid_price(1000, 30, 2.5, 20, [40, 30, 36, 33])\nassert price == 33\nassert abs(profit - 13 * 1000 * (33 / 30) ** -2.5) < 1e-6\nprice, profit = best_grid_price(1000, 30, 2.5, 20, [30])\nassert price == 30 and abs(profit - 10000) < 1e-6",
  "solution": "def optimal_price(cost, elasticity):\n    if elasticity <= 1:\n        return None\n    return cost * elasticity / (elasticity - 1)\n\ndef best_grid_price(q0, p0, eps, cost, grid):\n    best = None\n    for p in sorted(grid):\n        profit = (p - cost) * q0 * (p / p0) ** (-eps)\n        if best is None or profit > best[1]:\n            best = (p, profit)\n    return best",
  "hints": [
    "Closed form only exists when elasticity is greater than 1.",
    "Iterate over the sorted grid and replace the best only on strictly higher profit."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Write `apply_guardrails(p_new, p_current, max_change, floor, ceiling)` that clamps the proposed price so it moves at most `max_change` (a fraction, e.g. 0.1 = 10%) from the current price in either direction and then stays within `[floor, ceiling]`. Return the final price.",
  "starterCode": "def apply_guardrails(p_new, p_current, max_change, floor, ceiling):\n    pass\n\nprint(apply_guardrails(40, 30, 0.1, 20, 50))",
  "tests": "assert abs(apply_guardrails(40, 30, 0.1, 20, 50) - 33.0) < 1e-9\nassert abs(apply_guardrails(20, 30, 0.1, 20, 50) - 27.0) < 1e-9\nassert abs(apply_guardrails(31, 30, 0.1, 20, 50) - 31.0) < 1e-9\nassert abs(apply_guardrails(22, 22.5, 0.1, 22.4, 50) - 22.4) < 1e-9\nassert abs(apply_guardrails(60, 49, 0.2, 20, 50) - 50.0) < 1e-9",
  "solution": "def apply_guardrails(p_new, p_current, max_change, floor, ceiling):\n    lo = p_current * (1 - max_change)\n    hi = p_current * (1 + max_change)\n    p = min(max(p_new, lo), hi)\n    return min(max(p, floor), ceiling)",
  "hints": [
    "Compute lo = p_current*(1-max_change) and hi = p_current*(1+max_change).",
    "Clamp to [lo, hi] first, then to [floor, ceiling]."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Design a dynamic pricing system for a ride-hailing app.' Outline your answer.",
  "answer": "**Requirements**: price per trip request at quote time (< 100 ms), objective = marketplace efficiency (completed trips, rider wait, driver earnings) subject to profit, with fairness and regulatory limits.\n\n**Approach**: model supply and demand per geo cell (H3 hexagons) in short windows (1-5 min): features = open requests, available drivers, recent conversion, ETA, events, weather, time of day. Demand model: P(rider accepts | price multiplier, ETA, route) with a monotonic constraint; supply model: driver response to multipliers. The optimizer chooses a multiplier per cell that clears the market (balance supply and demand) while maximizing the objective, smoothed spatially and over time to avoid flicker.\n\n**Causal estimation**: randomize multipliers within bands (small exploration budget), or use switchback experiments; estimate elasticity on this data.\n\n**Guardrails**: cap multipliers, max change per interval, emergency caps, price consistency between quote and charge, no protected attributes or sensitive proxies, transparent messaging.\n\n**Evaluation and monitoring**: switchback A/B on completed trips, wait time, driver earnings, and cancellations as guardrails; long-term retention holdout; monitor elasticity drift, competitor effects, and complaint rates."
}
```

> [!TIP] Interview tips
> - Open with: pricing needs the causal demand curve, and logged prices are confounded.
> - State the markup rule $p^*=c\epsilon/(\epsilon-1)$ and when it breaks (inventory, non-constant elasticity).
> - Mention randomization, switchbacks for interference, and monotonic constraints.
> - Raise fairness, legality and trust before the interviewer does.
