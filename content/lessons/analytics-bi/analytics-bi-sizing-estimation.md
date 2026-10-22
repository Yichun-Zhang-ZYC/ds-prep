---
id: analytics-bi-sizing-estimation
title: Sizing / estimation (Fermi problems)
estimatedMinutes: 12
difficulty: medium
tags: [case-study, estimation, fermi, market-sizing]
---

## Why it matters
"How many ride-share trips happen in Chicago per day?" or "What is the market size for a meal-kit startup?" These questions test structured thinking, sensible assumptions and sanity checks, not recall of facts.

## Concept
A **Fermi problem** is an order-of-magnitude estimate built from simple, defensible assumptions.

**Method**
1. **Clarify** the target: what exactly, which geography, per day / year, units, and why (decision it supports).
2. **Pick an approach and say it out loud.**
   - **Top-down**: start from a large population and filter by percentages (population $\to$ households $\to$ target $\to$ adopters).
   - **Bottom-up**: build from units (number of stores x customers per store x spend).
3. **Break it into factors** you can estimate; write the formula first, then fill numbers.
4. **Use round numbers** and say them with a source or rule of thumb (US population 330M, ~130M households, 250 working days a year, 4 minutes per task).
5. **Calculate** carefully with powers of ten; keep units.
6. **Sanity check** with a second method or a known benchmark. If the two are within 2-3x, you are fine.
7. **State the key sensitivities** and what data you would collect to tighten the estimate.

**Useful tricks**
- **TAM / SAM / SOM**: total, serviceable and obtainable market. A startup's realistic target is SOM, not TAM.
- **Ranges**: give low / base / high. The geometric mean $\sqrt{\text{low} \times \text{high}}$ is the natural midpoint for a quantity that is uncertain by factors. Multiplying every low gives an overly wide interval, since errors partly cancel.
- Errors multiply: a factor 2 off in three assumptions can be 8x off overall, so spend your effort on the biggest uncertainties.
- Segment heterogeneous groups (heavy vs light users) instead of using one average.

## Worked example
Classic: how many piano tuners are in Chicago?

- Population 2.7M, 2.5 people per household, so 1.08M households.
- 1 in 20 households has a piano: $1.08\text{M} \times 0.05 = 54{,}000$ pianos.
- Tuned once a year: 54,000 tunings a year.
- A tuner does 4 a day x 250 days $= 1{,}000$ a year.
- Tuners $\approx 54{,}000 / 1{,}000 = 54$.

Sanity check: roughly 1 tuner per 50,000 people, plausible; the real answer is likely 40-150. Dropping to 500 tunings per tuner doubles the answer to 108, so the productivity assumption matters more than the exact household count.

For a business: SaaS tool for dentists. 200K US dental practices x 40% with 3+ staff x \$150 per month x 12 = \$144M addressable per year (SAM). Winning 2% in year 3 gives about \$2.9M (SOM).

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You estimate market size by multiplying three uncertain inputs, each likely within a factor of 2 of the truth. Roughly how far off could the product be?",
  "options": [
    "About 2x",
    "Up to about 8x",
    "Exactly 6x",
    "There is no compounding"
  ],
  "answer": 1,
  "explanation": "Errors multiply: $2 \\times 2 \\times 2 = 8$. (In practice some errors cancel, so the typical error is smaller.) Focus on the inputs you are least sure of."
}
```

```quiz
{
  "id": "q2",
  "question": "Which is the best last step in a Fermi estimate?",
  "options": [
    "Report the number to 5 significant figures",
    "Cross-check with a second method or benchmark and state key sensitivities",
    "Search for the exact figure online and use it",
    "Stop as soon as you have a number"
  ],
  "answer": 1,
  "explanation": "A sanity check against another approach or a known benchmark builds trust in the estimate, and naming sensitivities shows judgement. False precision is a red flag."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement three helpers. `geo_mean(low, high)` returns $\\sqrt{\\text{low} \\times \\text{high}}$. `fermi_range(ranges)` takes a list of `(low, high)` factor ranges and returns `(low_product, mid_estimate, high_product)`, where the middle is the product of each factor's geometric mean (an empty list gives `(1.0, 1.0, 1.0)`). `tuners_needed(population, people_per_household, pct_with_piano, tunings_per_year, tunings_per_tuner_per_year)` returns the estimated number of tuners.",
  "starterCode": "import math\n\ndef geo_mean(low, high):\n    pass\n\ndef fermi_range(ranges):\n    # ranges: list of (low, high) factors -> (low_product, mid_estimate, high_product)\n    pass\n\ndef tuners_needed(population, people_per_household, pct_with_piano, tunings_per_year, tunings_per_tuner_per_year):\n    pass\n\nprint(geo_mean(100, 10000), fermi_range([(2, 8), (10, 40)]))",
  "tests": "assert abs(geo_mean(100, 10000) - 1000) < 1e-9\nassert abs(geo_mean(5, 5) - 5) < 1e-12\nlo, mid, hi = fermi_range([(1e6, 4e6), (0.02, 0.08)])\nassert abs(lo - 20000) < 1e-6 and abs(hi - 320000) < 1e-6 and abs(mid - 80000) < 1e-6\nassert fermi_range([]) == (1.0, 1.0, 1.0)\nassert abs(tuners_needed(2_700_000, 2.5, 0.05, 1, 1000) - 54) < 1e-9\nassert abs(tuners_needed(2_700_000, 2.5, 0.05, 1, 500) - 108) < 1e-9\nassert tuners_needed(0, 2.5, 0.05, 1, 1000) == 0",
  "solution": "import math\n\ndef geo_mean(low, high):\n    return math.sqrt(low * high)\n\ndef fermi_range(ranges):\n    lo = mid = hi = 1.0\n    for a, b in ranges:\n        lo *= a\n        hi *= b\n        mid *= geo_mean(a, b)\n    return lo, mid, hi\n\ndef tuners_needed(population, people_per_household, pct_with_piano, tunings_per_year, tunings_per_tuner_per_year):\n    households = population / people_per_household\n    pianos = households * pct_with_piano\n    return pianos * tunings_per_year / tunings_per_tuner_per_year",
  "hints": [
    "Households = population / people_per_household; pianos = households x pct_with_piano.",
    "Start low, mid and high at 1.0 and multiply in each factor in a loop."
  ]
}
```

```reveal
{
  "prompt": "Interview: \"Estimate the annual market size for electric scooter rentals in a city of 3 million people.\" Outline your approach and numbers.",
  "answer": "**Clarify**: revenue per year from short-term rental trips (not sales), one city, tourists excluded for simplicity.\n\n**Bottom-up (supply side)**: 1 scooter per 400 residents $\\to$ 7,500 scooters; 5 trips per scooter per day on average; 1.5 miles ~ $4 per trip. Revenue = 7,500 x 5 x $4 x 365 = about $55M per year.\n\n**Top-down (demand side)**: 3M residents, 70% adults = 2.1M; 8% rent a scooter in a year = 168K riders; each rides about 25 times a year at $4 = $100 per rider. Revenue = 168K x $100 = about $17M per year.\n\n**Reconcile**: a 3x gap. Supply-side utilisation of 5 trips a day is likely too high for mixed weather and idle scooters (use 2 trips: $22M), which brings the two close. Present a range of $15-30M with a base case near $20M.\n\n**Sensitivities and next steps**: utilisation, price, seasonality (winter off), and regulation caps on fleet size. Validate with operator permit data and trips-per-vehicle benchmarks."
}
```

> [!TIP] Interview tips
> - Talk through structure before numbers: state the formula, name each factor, then estimate. Interviewers mainly score your structure and assumptions.
> - Use round numbers and powers of ten, keep units visible, and give a range with a base case. Never claim false precision.
> - Always sanity-check with a second approach or per-capita benchmark and say which assumption you would refine first with real data.
