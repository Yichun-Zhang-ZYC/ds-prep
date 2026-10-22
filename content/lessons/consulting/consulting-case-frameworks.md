---
id: consulting-case-frameworks
title: Case frameworks (profitability, market entry, growth)
estimatedMinutes: 12
difficulty: medium
tags: [consulting, case-interview, frameworks, profitability]
---

## Why it matters
Business-case rounds (for data scientists as well as consultants) test whether you can pick a structure in 60 seconds and drive to a recommendation. Three archetypes (profitability, market entry, growth) cover most prompts.

## Concept
**Never recite a framework; tailor it.** Clarify the objective and constraints, state a MECE structure (mutually exclusive, collectively exhaustive), open with a hypothesis, then test the most promising branch first.

**Profitability**: $\text{Profit} = \text{Revenue} - \text{Costs} = pq - (vq + F)$ with price $p$, volume $q$, variable cost $v$, fixed cost $F$. Ask: is the problem revenue or cost, which product/segment/channel, and is the cause internal (mix, pricing, efficiency) or external (competitors, demand, input prices)? Breakeven volume is $F/(p - v)$.

**Market entry**: (1) Market: size, growth, profit pools; (2) Company: capabilities, brand, fit; (3) Competition: concentration, likely reactions, barriers; (4) Entry mode: build, buy or partner; then financials (investment, payback) and risks.

**Growth**: split into organic vs inorganic. Organic follows the Ansoff matrix: market penetration (more share of existing customers), new products, new markets, diversification. Within penetration: acquire, retain, upsell. Prioritise by impact, feasibility and time.

**Flow**: clarify, structure, hypothesise, quantify, synthesise. Close with answer first, 2-3 supporting reasons, risks and next steps.

## Worked example
A 40-store coffee chain's annual profit fell from \$1.92M to \$0.70M. Per store before: 120,000 cups at \$4.00, variable cost \$1.60/cup, fixed cost \$240,000, so profit = $120{,}000 \cdot 2.40 - 240{,}000 = \$48{,}000$. After: 112,000 cups, same price, variable cost \$1.70, same fixed cost, so profit = $112{,}000 \cdot 2.30 - 240{,}000 = \$17{,}600$.

Decompose the per-store drop of \$30,400. Volume effect: $(112{,}000 - 120{,}000) \cdot 2.40 = -\$19{,}200$ (63%). Cost effect: $-112{,}000 \cdot 0.10 = -\$11{,}200$ (37%). Price and fixed cost contribute nothing. Breakeven rose from 100,000 to about 104,350 cups, leaving little margin of safety.

Hypothesis: foot traffic is the main driver (a local issue such as new competitors or a nearby office closure), and milk prices are second. Next: split the traffic decline by store, daypart and ticket count vs average ticket, then check whether the worst stores share a competitor opening.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Profit fell 25% while revenue was flat. What is the best first move?",
  "options": [
    "Cut prices to boost volume",
    "Split costs into fixed and variable and find which line grew",
    "Enter a new market",
    "Ask for more data about competitors' revenue"
  ],
  "answer": 1,
  "explanation": "Flat revenue means the problem is on the cost side, so locate the cost line that changed before proposing solutions."
}
```

```quiz
{
  "id": "q2",
  "question": "Price is USD 10, variable cost USD 6 and fixed cost USD 80,000. What is the breakeven volume?",
  "options": [
    "8,000",
    "13,333",
    "20,000",
    "40,000"
  ],
  "answer": 2,
  "explanation": "Breakeven = F / (p - v) = 80,000 / 4 = 20,000 units."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `profit_tree(price, volume, var_cost, fixed)` returning a dict with keys `revenue`, `variable`, `profit`, `breakeven` (= fixed / (price - var_cost)). Then write `drivers(before, after)` where each argument is a tuple `(price, volume, var_cost, fixed)`; return a dict with `volume`, `price`, `var_cost`, `fixed` effects on profit using: volume = (q1 - q0)(p0 - v0); price = (p1 - p0) q1; var_cost = -(v1 - v0) q1; fixed = -(f1 - f0). The four effects must sum to the profit change.",
  "starterCode": "def profit_tree(price, volume, var_cost, fixed):\n    pass\n\ndef drivers(before, after):\n    pass\n\nprint(profit_tree(4.0, 120000, 1.6, 240000))\nprint(drivers((4.0, 120000, 1.6, 240000), (4.0, 112000, 1.7, 240000)))\n",
  "tests": "t = profit_tree(4.0, 120000, 1.6, 240000)\nassert abs(t['revenue'] - 480000) < 1e-6 and abs(t['variable'] - 192000) < 1e-6\nassert abs(t['profit'] - 48000) < 1e-6 and abs(t['breakeven'] - 100000) < 1e-6\nb = (4.0, 120000, 1.6, 240000)\na = (4.0, 112000, 1.7, 240000)\nd = drivers(b, a)\nassert abs(d['volume'] + 19200) < 1e-6 and abs(d['var_cost'] + 11200) < 1e-6\nassert abs(d['price']) < 1e-9 and abs(d['fixed']) < 1e-9\ndelta = profit_tree(*a)['profit'] - profit_tree(*b)['profit']\nassert abs(sum(d.values()) - delta) < 1e-6\nd2 = drivers((5.0, 100, 2.0, 50), (6.0, 100, 2.0, 80))\nassert abs(d2['price'] - 100) < 1e-9 and abs(d2['fixed'] + 30) < 1e-9",
  "solution": "def profit_tree(price, volume, var_cost, fixed):\n    revenue = price * volume\n    variable = var_cost * volume\n    return {'revenue': revenue, 'variable': variable,\n            'profit': revenue - variable - fixed,\n            'breakeven': fixed / (price - var_cost)}\n\ndef drivers(before, after):\n    p0, q0, v0, f0 = before\n    p1, q1, v1, f1 = after\n    return {'volume': (q1 - q0) * (p0 - v0),\n            'price': (p1 - p0) * q1,\n            'var_cost': -(v1 - v0) * q1,\n            'fixed': -(f1 - f0)}",
  "hints": [
    "Profit = (price - var_cost) * volume - fixed.",
    "Change volume first at the old unit margin, then change price and cost at the new volume; this makes the effects add up exactly."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'A regional airline's profit has fallen 30% over two years. What would you do?'",
  "answer": "**Clarify**: profit in absolute or margin terms? Industry-wide or airline-specific? Any recent route, fleet or fuel-hedging changes? Goal: restore profit, by when?\n\n**Structure**: Profit = Revenue - Cost.\n- Revenue = passengers x yield (fare) + ancillary + cargo. Split by route, cabin, channel; load factor and average fare separately.\n- Cost = fuel, labour, aircraft (lease/maintenance), airport fees, distribution; compare cost per available seat-km (CASK) with peers.\n\n**Hypothesis**: yield fell on competitive routes because a low-cost carrier entered, while fuel and labour costs rose. Test: route-level load factor and yield trend vs CASK trend.\n\n**Quantify**: if profit fell USD 30M on USD 500M revenue, find the route cohort explaining >60% of the drop.\n\n**Recommend**: reprice or cut the worst routes, redeploy aircraft to profitable ones, renegotiate fuel hedges; risks are network effects (feeder routes) and union constraints; next step is a route-by-route P&L."
}
```

> [!TIP] Interview tips
> - Clarify first, then state your structure out loud with 3-4 buckets and a hypothesis.
> - Use numbers early: even a rough breakeven or decomposition shows judgement.
> - Pitfall: forcing a memorised framework that does not fit the prompt; adapt the buckets to the industry.
