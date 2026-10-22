---
id: consulting-case-market-entry
title: "Case: Market entry"
estimatedMinutes: 14
difficulty: medium
tags: [consulting, case, market-entry, economics]
---

## Why it matters
Market-entry cases ("Should our client enter country X / launch product Y?") test whether you can weigh attractiveness, capability and economics into a clear go / no-go. The same logic drives data roles: sizing the prize, estimating payback and naming the risks before committing a team to a new product or market.

## Concept
**Playbook**: (1) clarify objective (growth? diversification?), geography, time horizon and what "success" means; (2) **market attractiveness**: size, growth, profitability, customer needs, regulation, competitive intensity; (3) **company fit**: capabilities, brand, supply chain, what transfers and what must be built; (4) **entry mode**: build, buy (acquire) or partner (joint venture, licence, franchise), judged on speed, cost, control and risk; (5) **economics**: revenue ramp, contribution margin, fixed costs, upfront investment, payback and NPV; (6) **risks and mitigations**: competitor response, regulation, execution; then a clear recommendation and next steps.

**Revenue build**: market size × growth × *achievable* share by year. Share should be anchored on comparable entrants or the client's share in similar markets, not on hope.

**Break-even thinking**: $\text{break-even share} = \dfrac{\text{fixed cost}}{\text{contribution margin} \times \text{market size}}$. If the required share is above what comparable entrants reach, the answer leans no-go unless the fixed cost can fall.

**Pitfalls**: judging the market attractive without checking client fit; assuming a share with no benchmark; ignoring competitor response; presenting a single point estimate with no downside case; forgetting the investment must be recovered, not just break even on annual profit.

See *Market sizing* for sizing and *Case frameworks* for the top-level structure.

## Worked example
**Case**: A US online-grocery company asks whether to enter Canada. (Illustrative numbers, \$M.)

**Attractiveness**: online grocery is \$2,000M today and growing 10% a year; two incumbents hold most of it, but delivery is expensive and customer satisfaction is mediocre. Moderately attractive.

**Fit**: the client's picking technology and brand transfer; it needs new fulfilment centres and French-language support in Quebec. Entry mode: build in two metros first (a partner would be slower and dilute margin).

**Economics** (assumptions: share ramps 1%, 3%, 5%, 7%, 8%; contribution margin 12%; fixed cost \$10M a year; upfront investment \$30M):

| Year | Market | Revenue | Profit (12% × rev − 10) | Cumulative (after −30) |
|---|---|---|---|---|
| 1 | 2,200 | 22.0 | −7.4 | −37.4 |
| 2 | 2,420 | 72.6 | −1.3 | −38.7 |
| 3 | 2,662 | 133.1 | +6.0 | −32.7 |
| 4 | 2,928 | 205.0 | +14.6 | −18.1 |
| 5 | 3,221 | 257.7 | +20.9 | +2.8 |

Payback arrives in **year 5**. Annual break-even share in year 3 is $\frac{10}{0.12 \times 2{,}662} = 3.1\%$: the business covers its fixed cost once it passes about 3% share, which is below the 5% year-3 assumption.

**Recommendation**: a conditional go. Enter two metros, with a stage gate at month 18 (share at least 3%, contribution margin at least 10%). Key risk: incumbents cut delivery fees. Downside check: at a 5% peak share, payback slips beyond year 6, so the share assumption must be validated first.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A market is large and growing fast. What else must you check before recommending entry?",
  "options": [
    "Nothing; size and growth are enough",
    "Client fit, competitive intensity, entry economics and risks",
    "Only the client's current revenue",
    "Only the number of competitors"
  ],
  "answer": 1,
  "explanation": "Attractiveness is only one pillar. A big market the client cannot serve profitably is not a good entry."
}
```

```quiz
{
  "id": "q2",
  "question": "Fixed cost is $10M, contribution margin 12%, market $2,662M. What share breaks even on annual profit?",
  "options": [
    "1.2%",
    "3.1%",
    "12%",
    "31%"
  ],
  "answer": 1,
  "explanation": "Share = 10 / (0.12 x 2,662) = 3.1%. Remember this ignores recovering the upfront investment."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `revenue_path(market0, growth, shares)`: the market grows by `growth` each year, and in year `t` (1-indexed) the company wins `shares[t-1]` of it. Return the list of yearly revenues.",
  "starterCode": "def revenue_path(market0, growth, shares):\n    pass\n\nprint(revenue_path(2000, 0.10, [0.01, 0.03, 0.05]))\n",
  "tests": "r = revenue_path(2000, 0.10, [0.01, 0.03, 0.05])\nassert len(r) == 3\nassert abs(r[0] - 22.0) < 1e-9 and abs(r[1] - 72.6) < 1e-9 and abs(r[2] - 133.1) < 1e-9\nassert revenue_path(100, 0, [0.5, 0.5]) == [50.0, 50.0]\nassert revenue_path(100, 0.1, []) == []",
  "solution": "def revenue_path(market0, growth, shares):\n    return [market0 * (1 + growth) ** t * s for t, s in enumerate(shares, start=1)]",
  "hints": [
    "Year 1 market = market0 * (1 + growth), not market0.",
    "enumerate(shares, start=1) gives t."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `payback_year(revenues, cm, fixed, investment)`: yearly profit is `cm * revenue - fixed`; cumulative cash starts at `-investment`. Return the first year (1-indexed) in which cumulative cash is `>= 0`, or `None` if it never is.",
  "starterCode": "def payback_year(revenues, cm, fixed, investment):\n    pass\n\nprint(payback_year([22.0, 72.6, 133.1, 205.0, 257.7], 0.12, 10, 30))\n",
  "tests": "rev = [22.0, 72.6, 133.1, 204.98, 257.7]\nassert payback_year(rev, 0.12, 10, 30) == 5\nassert payback_year(rev[:4], 0.12, 10, 30) is None\nassert payback_year([100], 0.5, 10, 30) == 1\nassert payback_year([], 0.5, 10, 30) is None",
  "solution": "def payback_year(revenues, cm, fixed, investment):\n    cash = -investment\n    for t, r in enumerate(revenues, start=1):\n        cash += cm * r - fixed\n        if cash >= 0:\n            return t\n    return None",
  "hints": [
    "Update cash each year, then test the sign.",
    "Return None after the loop if payback never happens."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Write `entry_verdict(fixed, cm, market, benchmark_share)` returning a tuple `(break_even_share, verdict)`. `break_even_share = fixed / (cm * market)`. `verdict` is `'go'` if `break_even_share <= 0.5 * benchmark_share` (a 2x safety margin), `'conditional'` if it is at most `benchmark_share`, otherwise `'no-go'`.",
  "starterCode": "def entry_verdict(fixed, cm, market, benchmark_share):\n    pass\n\nprint(entry_verdict(10, 0.12, 2662, 0.05))\n",
  "tests": "s, v = entry_verdict(10, 0.12, 2662, 0.05)\nassert abs(s - 10 / (0.12 * 2662)) < 1e-12 and v == 'conditional'\nassert entry_verdict(10, 0.12, 2662, 0.07)[1] == 'go'\nassert entry_verdict(10, 0.12, 2662, 0.02)[1] == 'no-go'\nassert entry_verdict(5, 0.1, 5000, 0.04)[1] == 'go'",
  "solution": "def entry_verdict(fixed, cm, market, benchmark_share):\n    s = fixed / (cm * market)\n    if s <= 0.5 * benchmark_share:\n        return s, 'go'\n    if s <= benchmark_share:\n        return s, 'conditional'\n    return s, 'no-go'",
  "hints": [
    "Compute the share first, then compare against two thresholds in order.",
    "For the example: 3.13% vs benchmark 5% is above 2.5% but below 5%."
  ]
}
```

> [!TIP] Interview tips
> - Cover attractiveness, fit, entry mode, economics and risks, then commit to a go / no-go with conditions.
> - Anchor share assumptions on comparable entrants and show a downside case.
> - Pitfall: stopping at annual break-even; the upfront investment must be paid back too.
