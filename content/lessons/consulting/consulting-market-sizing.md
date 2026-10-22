---
id: consulting-market-sizing
title: Market sizing
estimatedMinutes: 12
difficulty: medium
tags: [consulting, estimation, market-sizing, fermi]
---

## Why it matters
Market sizing questions ("How many coffee shops can a city of 1M support?") test structured thinking, comfortable arithmetic and sanity checks. Data science interviews use the same skill for "how many users will this feature reach?" estimates.

## Concept
**Steps**: (1) clarify scope (geography, time, what counts); (2) pick an approach; (3) state assumptions with round numbers; (4) calculate; (5) sanity-check and triangulate; (6) state the answer and what would change it.

**Top-down**: start from a large population and filter: $\text{market} = N \times \text{share relevant} \times \text{frequency} \times \text{price}$. Fast, but each share is a guess.

**Bottom-up**: build from supply or unit economics: $\text{market} = \text{units} \times \text{capacity per unit} \times \text{price}$ (e.g. stores x customers per store). Better anchored in observable quantities.

**Triangulate**: do both; if they agree within roughly 2x, report the average and the range. If not, find which assumption is off.

**Practical tips**: segment heterogeneous populations (age, income, urban/rural) rather than using one average. Use round, memorable anchors (US 330M people, ~130M households, 365 days, 250 workdays). Work in orders of magnitude and keep a running unit check. Always give a range and name the two assumptions with the largest leverage.

## Worked example
**How many coffee shops can a city of 1,000,000 support?**

Top-down demand: 60% of residents buy coffee out, 0.5 cups per person per day on average among them. Cups per day = $1{,}000{,}000 \times 0.6 \times 0.5 = 300{,}000$. A shop sells about 600 cups/day, so $300{,}000 / 600 = 500$ shops.

Bottom-up check from supply: one shop per 2,000 residents in dense cities gives 500 shops. The two agree, so we answer about 500, with a plausible range of 300-700.

Sensitivity: the cups-per-shop assumption has the most leverage. If a typical shop sells 400 cups/day, the city supports 750 shops. Revenue check: 300,000 cups x \$4 x 365 = \$438M per year, or \$438 per resident, which is plausible for a coffee-loving city but would be high for a small town.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You estimate a market top-down at USD 800M and bottom-up at USD 300M. What do you do?",
  "options": [
    "Average them and move on",
    "Pick the one you like better",
    "Find which assumption drives the gap and reconcile it",
    "Say the question is unanswerable"
  ],
  "answer": 2,
  "explanation": "A gap larger than about 2x signals a wrong assumption (scope, frequency, share); locate and fix it before reporting a number."
}
```

```quiz
{
  "id": "q2",
  "question": "Which is a bottom-up estimate of annual taxi demand in a city?",
  "options": [
    "Population x share who take taxis x rides per year",
    "Number of taxis x trips per taxi per day x 365",
    "GDP per capita x taxi share of GDP",
    "Number of tourists x average spend"
  ],
  "answer": 1,
  "explanation": "Bottom-up builds from supply or unit capacity (taxis x trips per taxi); the others start from demand-side populations."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `chain(base, factors)` returning `base` multiplied by every factor in the list. Write `units_needed(total, per_unit)` returning the ceiling of total / per_unit (an int). Write `triangulate(a, b)` returning `(estimate, agree)` where estimate is the geometric mean sqrt(a*b) and agree is True if max/min <= 2.",
  "starterCode": "def chain(base, factors):\n    pass\n\ndef units_needed(total, per_unit):\n    pass\n\ndef triangulate(a, b):\n    pass\n\ncups = chain(1000000, [0.6, 0.5])\nprint(cups, units_needed(cups, 600), triangulate(800, 300))\n",
  "tests": "import math\nassert abs(chain(1000000, [0.6, 0.5]) - 300000) < 1e-6\nassert chain(10, []) == 10\nassert units_needed(300000, 600) == 500\nassert units_needed(301, 100) == 4\nassert isinstance(units_needed(10, 3), int)\ne, ok = triangulate(800, 300)\nassert abs(e - math.sqrt(240000)) < 1e-9 and ok is False\ne, ok = triangulate(500, 400)\nassert abs(e - math.sqrt(200000)) < 1e-9 and ok is True\nassert triangulate(100, 200)[1] is True",
  "solution": "import math\n\ndef chain(base, factors):\n    out = base\n    for f in factors:\n        out *= f\n    return out\n\ndef units_needed(total, per_unit):\n    return int(math.ceil(total / per_unit - 1e-9))\n\ndef triangulate(a, b):\n    hi, lo = max(a, b), min(a, b)\n    return math.sqrt(a * b), hi / lo <= 2",
  "hints": [
    "Use math.ceil; guard against floating-point noise such as 300000/600 = 500.00000000000006.",
    "Geometric mean is less sensitive than the arithmetic mean when estimates differ by multiples."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Estimate the annual market for ride-hailing in the US.'",
  "answer": "**Clarify**: US only, consumer rides (not delivery), gross bookings not company revenue.\n\n**Top-down**: 330M people; ~80% are 16-70 urban/suburban adults who could ride = ~190M addressable after removing children and rural-only areas; ~25% use ride-hailing at least monthly = ~48M users; average 3 rides a month = ~1.7B rides/year; average fare USD 20 = ~USD 35B gross bookings.\n\n**Bottom-up check**: ~1M active drivers; a driver does ~12 rides/day over ~200 days per year = ~2.4B rides if all were full time; many drivers are part-time (assume 40% of that) = ~1B rides = ~USD 20B.\n\n**Triangulate**: USD 20B vs USD 35B is within 2x; answer ~USD 25-30B with range USD 20-35B. Largest leverage: frequency of use and average fare.\n\n**Close**: state the two biggest assumptions and how you would validate them (public filings, trip data)."
}
```

> [!TIP] Interview tips
> - Say your structure and assumptions out loud; interviewers grade the process more than the final number.
> - Use round numbers and segment the population; always finish with a sanity check and a range.
> - Pitfall: precision theatre. Do not carry five significant digits through guesses.
