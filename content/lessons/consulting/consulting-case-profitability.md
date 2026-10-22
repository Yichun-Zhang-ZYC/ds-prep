---
id: consulting-case-profitability
title: "Case: Profitability"
estimatedMinutes: 14
difficulty: medium
tags: [consulting, case, profitability, profit-tree]
---

## Why it matters
Profitability cases ("a client's profit has fallen; why, and what should they do?") are the most common consulting opener. For data scientists the same skill appears as "revenue is down 8%, where do you look first?": decomposing a metric into drivers before touching any data.

## Concept
**Playbook**: (1) clarify the goal (target profit, timeframe, one company or industry-wide); (2) build the **profit tree**: profit = revenue − cost, revenue = price × volume (by product, customer segment, channel), cost = fixed + variable; (3) locate the problem top-down: *when* did it start, *where* (which segment or region), is it *internal or industry-wide*, and how do *competitors* compare; (4) quantify each branch with a **bridge** (profit last year → this year); (5) form a hypothesis for the biggest gap and test it with one more data request; (6) recommend actions sized in dollars, with risks and next steps.

**Useful splits**: revenue change = volume + price + **mix** (shifting toward lower-margin products). Margin change = **rate** (each product's margin) + mix. Fixed costs behave differently from variable costs when volume falls, so check operating leverage.

**Pitfalls**: jumping to cost cutting before checking revenue; using averages that hide a mix shift; asking for "all the data" instead of the next most informative cut; forgetting that a one-off event (a write-off, a strike) may explain the drop; proposing actions with no size.

See *Case frameworks* for the general structure; here the focus is the quantitative bridge.

## Worked example
**Case**: A regional grocery chain's operating profit fell from \$60M to \$40M in two years. (Illustrative numbers.)

**Step 1, top line**: revenue rose from \$1,000M to \$1,050M (+5%), so this is not a sales problem. Gross margin fell from 25% to 22% (gross profit \$250M to \$231M); operating expenses were flat (\$190M to \$191M).

**Step 2, bridge** (\$M): +12.5 from extra revenue at the old 25% margin, −31.5 from margin compression ($1{,}050 \times 3\%$), −1 from higher opex: $60 + 12.5 - 31.5 - 1 = 40$. The problem is gross margin.

**Step 3, drill into margin by category**: Fresh went from \$500M at 30% to \$350M at 30%; Packaged from \$500M at 20% to \$700M at 18%. At old margins, the new mix would earn $350 \times 0.30 + 700 \times 0.20 = \$245$M versus $1{,}050 \times 25\% = \$262.5$M at the old blended margin, so **mix costs \$17.5M**. The remaining shortfall, $231 - 245 = -\$14$M, is **rate** (packaged price cuts).

**Hypothesis and ask**: shoppers are moving fresh purchases elsewhere (a discounter or a quality problem) while the chain cuts packaged prices to hold traffic. Request fresh traffic by store and a competitor price scan.

**Recommendation**: fix fresh availability and quality in the worst stores (each 1 point of revenue shifted back from packaged to fresh is worth about \$1.3M of gross profit: $10.5 \times (30\% - 18\%)$), and replace blanket packaged price cuts with targeted ones. Risk: shoppers may have left for price, not quality.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A retailer's revenue is up 5% but profit is down 33%. What is the best next cut?",
  "options": [
    "Cut headcount across the board",
    "Split the profit change into volume, margin rate, mix and opex",
    "Survey customers about satisfaction",
    "Raise prices on every product"
  ],
  "answer": 1,
  "explanation": "Revenue grew, so the problem is below the top line. A bridge shows which driver explains the gap before you pick any action."
}
```

```quiz
{
  "id": "q2",
  "question": "Which finding most clearly points to a MIX effect rather than a RATE effect?",
  "options": [
    "Every product's margin fell by 2 points",
    "Total margin fell while each product's own margin was unchanged",
    "Opex rose 10%",
    "Revenue fell uniformly across products"
  ],
  "answer": 1,
  "explanation": "Mix means the blend shifted toward lower-margin products; the product-level margins (rates) stayed the same."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `profit_bridge(rev0, gm0, opex0, rev1, gm1, opex1)` where `gm` is gross margin as a fraction. Return a dict with `volume` (extra revenue at the old margin: `(rev1 - rev0) * gm0`), `margin` (`rev1 * (gm1 - gm0)`), `opex` (`-(opex1 - opex0)`) and `total` (their sum). `total` must equal the change in operating profit.",
  "starterCode": "def profit_bridge(rev0, gm0, opex0, rev1, gm1, opex1):\n    pass\n\nprint(profit_bridge(1000, 0.25, 190, 1050, 0.22, 191))\n",
  "tests": "b = profit_bridge(1000, 0.25, 190, 1050, 0.22, 191)\nassert abs(b['volume'] - 12.5) < 1e-9\nassert abs(b['margin'] + 31.5) < 1e-9\nassert abs(b['opex'] + 1) < 1e-9\nassert abs(b['total'] + 20) < 1e-9\nfor args in [(500, 0.4, 100, 450, 0.38, 90), (10, 0.5, 1, 20, 0.5, 1)]:\n    r0, g0, o0, r1, g1, o1 = args\n    assert abs(profit_bridge(*args)['total'] - ((r1 * g1 - o1) - (r0 * g0 - o0))) < 1e-9",
  "solution": "def profit_bridge(rev0, gm0, opex0, rev1, gm1, opex1):\n    volume = (rev1 - rev0) * gm0\n    margin = rev1 * (gm1 - gm0)\n    opex = -(opex1 - opex0)\n    return {'volume': volume, 'margin': margin, 'opex': opex, 'total': volume + margin + opex}",
  "hints": [
    "Profit = revenue x gm - opex. Change in profit = (rev1*gm1 - rev1*gm0) + (rev1*gm0 - rev0*gm0) - change in opex.",
    "Check your answer: total must equal profit1 - profit0 for any inputs."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `mix_rate(seg0, seg1)`. Each argument is a dict `{segment: (revenue, margin)}`. Let `m0` be the old blended margin. Return `(mix, rate)` where `mix = sum(rev1_i * m0_i) - total_rev1 * m0` and `rate = sum(rev1_i * (m1_i - m0_i))`. Their sum is the gross-profit change attributable to margin.",
  "starterCode": "def mix_rate(seg0, seg1):\n    pass\n\ns0 = {'fresh': (500, 0.30), 'packaged': (500, 0.20)}\ns1 = {'fresh': (350, 0.30), 'packaged': (700, 0.18)}\nprint(mix_rate(s0, s1))\n",
  "tests": "s0 = {'fresh': (500, 0.30), 'packaged': (500, 0.20)}\ns1 = {'fresh': (350, 0.30), 'packaged': (700, 0.18)}\nmix, rate = mix_rate(s0, s1)\nassert abs(mix + 17.5) < 1e-9 and abs(rate + 14) < 1e-9\nm, r = mix_rate(s0, s0)\nassert abs(m) < 1e-9 and abs(r) < 1e-9\nm, r = mix_rate({'a': (100, 0.5), 'b': (100, 0.1)}, {'a': (100, 0.5), 'b': (100, 0.2)})\nassert abs(m) < 1e-9 and abs(r - 10) < 1e-9",
  "solution": "def mix_rate(seg0, seg1):\n    gp0 = sum(r * m for r, m in seg0.values())\n    rev0 = sum(r for r, m in seg0.values())\n    m0 = gp0 / rev0\n    rev1 = sum(r for r, m in seg1.values())\n    at_old = sum(r * seg0[k][1] for k, (r, m) in seg1.items())\n    mix = at_old - rev1 * m0\n    rate = sum(r * (m - seg0[k][1]) for k, (r, m) in seg1.items())\n    return mix, rate",
  "hints": [
    "Blended margin m0 = old gross profit / old revenue.",
    "Mix: re-price the new revenue at each segment's old margin, then subtract new revenue at the old blended margin."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Write `required_price_rise(price, unit_cost, volume_loss)`: the smallest fractional price increase that keeps profit unchanged if volume falls by `volume_loss` (a fraction). Profit per unit is `price - unit_cost`. Solve `(price*(1+x) - unit_cost) * (1 - volume_loss) = price - unit_cost` for `x`. Return `x`.",
  "starterCode": "def required_price_rise(price, unit_cost, volume_loss):\n    pass\n\nprint(required_price_rise(100, 60, 0.10))\n",
  "tests": "assert abs(required_price_rise(100, 60, 0.10) - (40 / 0.9 - 40) / 100) < 1e-12\nassert abs(required_price_rise(100, 60, 0)) < 1e-12\nassert abs(required_price_rise(10, 0, 0.5) - 1.0) < 1e-12\nassert required_price_rise(100, 40, 0.2) > required_price_rise(100, 80, 0.2)",
  "solution": "def required_price_rise(price, unit_cost, volume_loss):\n    margin = price - unit_cost\n    new_margin = margin / (1 - volume_loss)\n    return (new_margin - margin) / price",
  "hints": [
    "Required new unit margin = old margin / (1 - volume_loss).",
    "Price rise = (new margin - old margin) / price."
  ]
}
```

> [!TIP] Interview tips
> - Open with the profit tree and the three questions: when, where, internal or industry-wide.
> - Always quantify with a bridge; separate volume, price, mix and cost effects.
> - Pitfall: recommending cost cuts before you know whether revenue or margin broke.
