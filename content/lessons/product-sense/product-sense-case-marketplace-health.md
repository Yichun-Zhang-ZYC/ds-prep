---
id: product-sense-case-marketplace-health
title: "Case: Marketplace health metrics"
estimatedMinutes: 13
difficulty: medium
tags: [case-study, marketplace, liquidity, metrics]
---

## Why it matters
Uber, Airbnb, DoorDash, Etsy and eBay all rely on two-sided marketplaces, and "how would you measure the health of our marketplace?" is a standard product-sense question. GMV alone hides whether one side is starving.

## Concept
**Core idea: liquidity.** A marketplace is healthy when a buyer who arrives with intent finds a good match quickly, and a supplier who joins gets enough demand to stay. Measure both sides plus the match between them.

**Demand side**: search-to-request conversion, **fill rate** (requests that end in a completed transaction), **time-to-fill** (or ETA, delivery time), repeat rate, buyer NPS.

**Supply side**: **utilisation** (share of listings, drivers or sellers with at least one transaction, or share of available hours booked), earnings per hour, new-supplier activation (first transaction within N days), supplier retention.

**Match quality**: cancellation rate (by buyer and by supplier), rating, dispute or refund rate, price dispersion.

**Marketplace-level health**:
- **Take rate** = revenue / GMV. Raising it may squeeze supply.
- **Concentration**: share of GMV from the top 10% of suppliers. High concentration is fragile and signals a hard long tail.
- **Leakage (disintermediation)**: users moving off-platform after a first match.
- **Liquidity is local**: it is defined per city, category and time slot. A global average hides dead markets.

**Diagnosing imbalance**:
- Low fill rate with high supply utilisation: **supply-constrained**. Recruit suppliers or add incentives.
- High fill rate with low supply utilisation: **demand-constrained**. Grow demand, and stop recruiting suppliers.
- Both low: **mismatch** (wrong location, price, quality or search ranking).

**Experimentation caveat**: buyers share suppliers, so an A/B test on one side violates SUTVA (interference). Use cluster, geo or switchback tests, and treat estimates as upper bounds.

## Worked example
A home-rental marketplace asks why growth stalled in one city. Last week (illustrative):

| Metric | Value |
|---|---|
| Booking requests | 5,000 |
| Completed bookings | 3,000 |
| Median time-to-confirm | 42 min |
| Active listings | 4,000 |
| Listings with ≥ 1 booking | 1,200 |
| GMV / take rate | \$150,000 / 15% |
| Bookings from the top 10% of hosts (400) | 2,100 |

- Fill rate = 3,000 / 5,000 = **60%**: low. Supply utilisation = 1,200 / 4,000 = **30%**: also low.
- Concentration: 2,100 / 3,000 = **70%** of bookings come from 10% of hosts.
- Platform revenue = 15% × \$150,000 = \$22,500.

**Diagnosis**: both sides are unhappy while there is plenty of inventory, so this is **mismatch**, not a shortage of hosts. Most listings are never booked, and demand sees few good options. Hypotheses: listings are in the wrong neighbourhoods or priced above comparable ones, search ranking fails to surface the best hosts, and slow confirmation (42 minutes) causes guests to abandon.

**Actions**: improve ranking and filters, add instant-book, coach or remove dead listings, and stop paying to recruit hosts. **Guardrails**: cancellation rate, rating, host churn. **Measure** with city-level switchback or geo tests, because guests and hosts share the same inventory.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A ride-hailing city shows a 95% fill rate but drivers are idle 60% of online hours. What is the most appropriate move?",
  "options": [
    "Recruit more drivers",
    "Stop driver recruitment and grow rider demand",
    "Raise the take rate to boost revenue",
    "Nothing: a 95% fill rate means health"
  ],
  "answer": 1,
  "explanation": "Demand is fully served and supply is under-used: the market is demand-constrained. More drivers would lower earnings and drive churn."
}
```

```quiz
{
  "id": "q2",
  "question": "Why is a user-level A/B test of a buyer-side change in a marketplace often biased?",
  "options": [
    "Sample sizes are too small",
    "Treated and control buyers compete for the same suppliers, so interference violates SUTVA",
    "Suppliers cannot be randomised",
    "Marketplace metrics are not additive"
  ],
  "answer": 1,
  "explanation": "If treated buyers take inventory away from control buyers, the measured effect overstates the true platform-level effect. Use geo, cluster or switchback designs."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `fill_metrics(requests)`. Each request is a dict `{'filled': bool, 'minutes': float or None}` (minutes to fill, None if unfilled). Return `(fill_rate, median_minutes)` where the median uses filled requests only (`None` if there are none).",
  "starterCode": "from statistics import median\n\ndef fill_metrics(requests):\n    pass\n\nreqs = [{'filled': True, 'minutes': 10}, {'filled': True, 'minutes': 50}, {'filled': False, 'minutes': None}, {'filled': True, 'minutes': 30}]\nprint(fill_metrics(reqs))",
  "tests": "reqs = [{'filled': True, 'minutes': 10}, {'filled': True, 'minutes': 50}, {'filled': False, 'minutes': None}, {'filled': True, 'minutes': 30}]\nfr, med = fill_metrics(reqs)\nassert abs(fr - 0.75) < 1e-12 and med == 30\nfr, med = fill_metrics([{'filled': False, 'minutes': None}])\nassert fr == 0 and med is None\nfr, med = fill_metrics([{'filled': True, 'minutes': 10}, {'filled': True, 'minutes': 20}])\nassert fr == 1 and abs(med - 15) < 1e-12",
  "solution": "from statistics import median\n\ndef fill_metrics(requests):\n    done = [r['minutes'] for r in requests if r['filled']]\n    fr = len(done) / len(requests)\n    return fr, (median(done) if done else None)",
  "hints": [
    "Filter to filled requests before taking the median.",
    "An unfilled request has no time-to-fill, so including it would bias the median."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Implement `supply_health(bookings_per_listing, top_frac=0.1)`. `bookings_per_listing` is a list of booking counts, one per active listing. Return `(utilisation, top_share)`: utilisation = share of listings with at least one booking; top_share = share of all bookings held by the top `ceil(top_frac * n)` listings (0 if no bookings).",
  "starterCode": "import math\n\ndef supply_health(bookings_per_listing, top_frac=0.1):\n    pass\n\nprint(supply_health([10, 5, 3, 1, 0, 0, 0, 0, 0, 0]))",
  "tests": "u, t = supply_health([10, 5, 3, 1, 0, 0, 0, 0, 0, 0])\nassert abs(u - 0.4) < 1e-12 and abs(t - 10 / 19) < 1e-12\nu, t = supply_health([0, 0, 0])\nassert u == 0 and t == 0\nu, t = supply_health([2, 2, 2, 2], top_frac=0.5)\nassert u == 1 and abs(t - 0.5) < 1e-12\nu, t = supply_health([4, 0, 0, 0, 0], top_frac=0.1)\nassert abs(u - 0.2) < 1e-12 and t == 1",
  "solution": "import math\n\ndef supply_health(bookings_per_listing, top_frac=0.1):\n    n = len(bookings_per_listing)\n    total = sum(bookings_per_listing)\n    util = sum(1 for b in bookings_per_listing if b > 0) / n\n    if total == 0:\n        return util, 0\n    k = math.ceil(top_frac * n)\n    top = sum(sorted(bookings_per_listing, reverse=True)[:k])\n    return util, top / total",
  "hints": [
    "Sort descending and sum the first k items.",
    "Guard against dividing by zero when there are no bookings."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Implement `diagnose(fill_rate, utilisation)` returning `'supply_constrained'` if fill_rate < 0.7 and utilisation > 0.7; `'demand_constrained'` if fill_rate > 0.85 and utilisation < 0.4; `'mismatch'` if fill_rate < 0.7 and utilisation < 0.4; otherwise `'balanced'`. Then implement `take_rate_revenue(gmv, take_rate, incentives)` = gmv * take_rate − incentives (net marketplace revenue).",
  "starterCode": "def diagnose(fill_rate, utilisation):\n    pass\n\ndef take_rate_revenue(gmv, take_rate, incentives):\n    pass\n\nprint(diagnose(0.6, 0.3), take_rate_revenue(150000, 0.15, 5000))",
  "tests": "assert diagnose(0.6, 0.3) == 'mismatch'\nassert diagnose(0.5, 0.9) == 'supply_constrained'\nassert diagnose(0.95, 0.2) == 'demand_constrained'\nassert diagnose(0.8, 0.6) == 'balanced'\nassert diagnose(0.7, 0.7) == 'balanced'\nassert abs(take_rate_revenue(150000, 0.15, 5000) - 17500) < 1e-9",
  "solution": "def diagnose(fill_rate, utilisation):\n    if fill_rate < 0.7 and utilisation > 0.7:\n        return 'supply_constrained'\n    if fill_rate > 0.85 and utilisation < 0.4:\n        return 'demand_constrained'\n    if fill_rate < 0.7 and utilisation < 0.4:\n        return 'mismatch'\n    return 'balanced'\n\ndef take_rate_revenue(gmv, take_rate, incentives):\n    return gmv * take_rate - incentives",
  "hints": [
    "Use strict inequalities as written; boundary values fall through to 'balanced'.",
    "Net revenue subtracts subsidies paid to either side."
  ]
}
```

> [!TIP] Interview tips
> - Lead with liquidity: measure both sides and the match between them, locally (city x category x time), not a global GMV number.
> - Diagnose with fill rate and supply utilisation: supply-constrained, demand-constrained or mismatch each imply a different fix.
> - Mention interference in experiments, leakage, concentration and the take-rate trade-off against supply health.
