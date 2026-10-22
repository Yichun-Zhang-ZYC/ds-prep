---
id: experimentation-case-two-sided-marketplace
title: "Case: Two-sided marketplace experiments"
estimatedMinutes: 14
difficulty: hard
tags: [experimentation, marketplaces, interference, case-study]
---

## Why it matters
Ride-hailing, delivery, lodging and e-commerce marketplaces share a fixed pool of supply (drivers, listings, inventory) between buyers. A user-level A/B test on a buyer-side promotion can show a big win that disappears at launch. "How would you test this in a marketplace?" is a standard senior-DS case.

## Concept
**Playbook** (see Network effects and interference, and Cluster and switchback experiments for the theory):
1. **Name the shared resource.** Supply (drivers, listings), demand (buyers), or a budget (ad auctions). Interference flows through it.
2. **Predict the bias direction.** If supply is the bottleneck, treated buyers take supply from control buyers, so a user-level test **overstates** the effect (the control group is "robbed"). Ask: is this a zero-sum reallocation or real new value?
3. **Pick the design that matches the interference.**
   - Buyer-side change, scarce supply: randomize **markets** (geo clusters) or **time windows** (switchback).
   - Seller-side change (fees, ranking of listings): randomize sellers, but measure **buyer-side** outcomes too.
   - Few large markets: **two-sided / budget-split** designs, where both sides are randomized and the estimates are combined.
4. **Measure the market, not just the user.** Primary: market-level bookings or GMV per capita. Also match rate, wait time, cancellation rate, and **both sides' welfare** (buyer conversion and seller earnings).
5. **Pitfalls**: spillover through a shared pricing algorithm, carryover between windows, too few markets (low power), and reading a per-user lift as a per-market lift.

## Worked example
A lodging marketplace tests a 10% guest discount (illustrative numbers). One city has 1,000 searching guests and only **300** available nights. A control guest requests a booking with probability 0.40; with the discount, 0.50. Requests beyond supply are filled at random.

- **All control**: 400 requests, 300 fulfilled, so 0.30 bookings per guest.
- **All treated**: 500 requests, still only 300 fulfilled, so 0.30. **True effect = 0.**
- **50/50 user-level test**: 450 requests, fill rate $300/450 = 0.667$. Control $0.40 \times 0.667 = 0.267$; treated $0.50 \times 0.667 = 0.333$. The naive test reports **+0.067 bookings per guest (+25%)** for a discount that adds zero bookings.

The discount only reallocated scarce nights, and cost margin. A switchback or city-level test measures the market outcome (0.30 vs 0.30) and would also reveal the lost revenue per night.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A user-level A/B test of a rider promotion shows +12% completed trips in a city where drivers are scarce at peak. What is the most likely issue?",
  "options": [
    "Treated riders take scarce drivers from control riders, so the lift is overstated",
    "The sample is too large",
    "Riders in control got the promotion",
    "The p-value is too small"
  ],
  "answer": 0,
  "explanation": "Under a supply constraint the arms compete for the same drivers, so the difference between arms overstates the market-wide effect (SUTVA is violated)."
}
```

```quiz
{
  "id": "q2",
  "question": "You can only run the test in 6 cities for 4 weeks. Which design is most appropriate for a buyer-side pricing algorithm change?",
  "options": [
    "User-level randomization within each city",
    "City-level switchback with randomized time windows and a buffer after each switch",
    "Compare treated cities with last month",
    "Randomize by user ID parity"
  ],
  "answer": 1,
  "explanation": "Everyone in a window sees the same algorithm, so shared supply is not split; many windows give far more power than 6 city-level units, and the buffer handles carryover."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `market_rates(n_c, n_t, q_c, q_t, supply)`. Control users request with probability `q_c`, treated with `q_t`. Total requests = n_c*q_c + n_t*q_t. If requests exceed `supply`, every request is filled with probability supply/requests; otherwise all are filled. Return `(rate_c, rate_t)`: bookings per user in each group.",
  "starterCode": "def market_rates(n_c, n_t, q_c, q_t, supply):\n    pass\n\nprint(market_rates(500, 500, 0.4, 0.5, 300))",
  "tests": "rc, rt = market_rates(500, 500, 0.4, 0.5, 300)\nassert abs(rc - 0.4 * 300 / 450) < 1e-12\nassert abs(rt - 0.5 * 300 / 450) < 1e-12\nrc, rt = market_rates(500, 500, 0.4, 0.5, 10000)\nassert abs(rc - 0.4) < 1e-12 and abs(rt - 0.5) < 1e-12",
  "solution": "def market_rates(n_c, n_t, q_c, q_t, supply):\n    requests = n_c * q_c + n_t * q_t\n    fill = 1.0 if requests <= supply else supply / requests\n    return q_c * fill, q_t * fill",
  "hints": [
    "Compute the fill rate first: min(1, supply / requests).",
    "Each group's rate is its request probability times the fill rate."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `interference_bias(n, share_t, q_c, q_t, supply)`. The test has `n` users with a fraction `share_t` treated. Return `(naive, truth)`: `naive` = treated rate minus control rate in the split test; `truth` = per-user rate when everyone is treated minus the rate when everyone is control (same fill-rate logic as before).",
  "starterCode": "def interference_bias(n, share_t, q_c, q_t, supply):\n    pass\n\nprint(interference_bias(1000, 0.5, 0.4, 0.5, 300))",
  "tests": "nv, tr = interference_bias(1000, 0.5, 0.4, 0.5, 300)\nassert abs(nv - (0.5 - 0.4) * 300 / 450) < 1e-12\nassert abs(tr) < 1e-12\nnv, tr = interference_bias(1000, 0.5, 0.4, 0.5, 10000)\nassert abs(nv - 0.1) < 1e-12 and abs(tr - 0.1) < 1e-12\nnv, tr = interference_bias(1000, 0.1, 0.4, 0.5, 300)\nassert 0.0667 < nv < 0.1 and abs(tr) < 1e-12",
  "solution": "def _rates(n_c, n_t, q_c, q_t, supply):\n    requests = n_c * q_c + n_t * q_t\n    fill = 1.0 if requests <= supply else supply / requests\n    return q_c * fill, q_t * fill\n\ndef interference_bias(n, share_t, q_c, q_t, supply):\n    n_t = n * share_t\n    n_c = n - n_t\n    rc, rt = _rates(n_c, n_t, q_c, q_t, supply)\n    naive = rt - rc\n    _, all_t = _rates(0, n, q_c, q_t, supply)\n    all_c, _ = _rates(n, 0, q_c, q_t, supply)\n    return naive, all_t - all_c",
  "hints": [
    "The truth compares two separate worlds: all treated (n_c = 0) and all control (n_t = 0).",
    "With ample supply (no constraint) naive and truth agree."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Write `switchback_diff(arms, outcomes, drop_after_switch)` where `arms` is a list of 'T'/'C' per time window and `outcomes` the metric per window. If `drop_after_switch` is True, drop any window whose previous window had a different arm (carryover buffer; the first window is kept). Return the mean outcome of kept T windows minus the mean of kept C windows.",
  "starterCode": "def switchback_diff(arms, outcomes, drop_after_switch):\n    pass\n\nprint(switchback_diff(list('TTCCTC'), [5, 6, 4, 3, 7, 3], True))",
  "tests": "arms = list('TTCCTC')\nout = [5, 6, 4, 3, 7, 3]\nassert abs(switchback_diff(arms, out, True) - 2.5) < 1e-12\nassert abs(switchback_diff(arms, out, False) - (6 - 10 / 3)) < 1e-12",
  "solution": "def switchback_diff(arms, outcomes, drop_after_switch):\n    t, c = [], []\n    for i, (a, y) in enumerate(zip(arms, outcomes)):\n        if drop_after_switch and i > 0 and arms[i - 1] != a:\n            continue\n        (t if a == 'T' else c).append(y)\n    return sum(t) / len(t) - sum(c) / len(c)",
  "hints": [
    "Index 2 is a C window that follows a T window, so it is dropped (as are indices 4 and 5).",
    "Collect kept outcomes into two lists, then subtract the means."
  ]
}
```

```reveal
{
  "prompt": "Interview: \"We want to test a new driver incentive that pays more during rush hour. How would you design and analyze the experiment?\"",
  "answer": "**Interference**: drivers are the shared resource, so riders (and other drivers) in the same city are affected. Do not randomize drivers or riders within a city.\n\n**Design**: a city-level switchback (randomized 2-hour windows, 15-minute buffer) if the incentive is instantly visible; or paired city-level randomization if drivers' behaviour changes slowly (they learn the incentive). Balance by hour-of-week and city size.\n\n**Metrics**: primary is completed trips per hour per city and rider wait time; also driver hours online, driver earnings per hour, cancellation rate. Guardrail: **incentive cost per incremental trip** (a +3% trip lift that costs $20 per extra trip is a loss).\n\n**Analysis**: window-level or city-day-level means with cluster-robust SEs; compare to the pre-test period for variance reduction.\n\n**Risks**: drivers shift hours into the incentive window (time-shifting, not new supply), so also measure trips in the adjacent hours."
}
```

> [!TIP] Interview tips
> - Say "shared resource" within the first minute, then predict the direction of the user-level bias.
> - Propose a market-level design (geo or switchback) and state its cost: fewer units, so lower power.
> - Measure both sides of the market plus the cost per incremental booking, not just buyer conversion.
