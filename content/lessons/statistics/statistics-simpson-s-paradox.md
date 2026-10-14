---
id: statistics-simpson-s-paradox
title: Simpson's paradox
estimatedMinutes: 12
difficulty: medium
tags: [statistics, paradoxes, segmentation, confounding]
---

## Why it matters
"Variant B wins in every segment but loses overall. How?" Simpson's paradox is a favorite interview puzzle because it tests whether you check segment mix before trusting an aggregate.

## Concept
A trend that holds in every subgroup can reverse when the subgroups are combined. It happens when:

1. the groups being compared have **different mixes** of segments, and
2. segments have very **different base rates**.

The overall rate is a weighted average of segment rates (law of total probability). If one variant gets mostly low-converting traffic, its overall rate drops even if it wins inside each segment.

Which answer is "right" depends on the causal question: if the segment influences both who gets which variant and the outcome (a confounder), compare **within** segments (or reweight to a common mix).

## Worked example
| Segment | A: conv / visitors | B: conv / visitors |
|---|---|---|
| Desktop | 90 / 1,000 (9.0%) | 19 / 200 (9.5%) |
| Mobile | 20 / 1,000 (2.0%) | 45 / 2,000 (2.25%) |
| **Total** | **110 / 2,000 (5.5%)** | **64 / 2,200 (2.9%)** |

B is better on desktop and on mobile, but worse overall, because 91% of B's traffic is mobile (low-converting) versus 50% for A. In a properly randomized A/B test, the mix should match; a big mix difference is itself a red flag (sample ratio mismatch within segments).

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What two conditions together produce Simpson's paradox?",
  "options": ["Small samples and outliers", "Different segment mixes between groups, and very different outcome rates across segments", "Heteroscedasticity and multicollinearity", "Missing data and duplicates"],
  "answer": 1,
  "explanation": "Without a mix difference or without differing base rates, the reversal can't happen."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Using `results(variant, segment, visitors, conversions)`, return each `variant` with its **overall** conversion rate as `overall_rate` and its **mix-adjusted** rate as `adjusted_rate`: the average of its two segment rates weighted equally (50% desktop, 50% mobile). Round both to 4 decimals.",
  "setup": "CREATE TABLE results (variant TEXT, segment TEXT, visitors INTEGER, conversions INTEGER); INSERT INTO results VALUES ('A','desktop',1000,90),('A','mobile',1000,20),('B','desktop',200,19),('B','mobile',2000,45);",
  "starterCode": "SELECT variant,\n       ROUND(1.0 * SUM(conversions) / SUM(visitors), 4) AS overall_rate\nFROM results\nGROUP BY variant;",
  "solution": "SELECT variant,\n       ROUND(1.0 * SUM(conversions) / SUM(visitors), 4) AS overall_rate,\n       ROUND(AVG(1.0 * conversions / visitors), 4) AS adjusted_rate\nFROM results\nGROUP BY variant;",
  "hints": ["The overall rate pools all visitors: SUM(conversions) / SUM(visitors).", "With equal weights, the adjusted rate is just the average of the per-row (per-segment) rates."]
}
```

> [!TIP] Interview tips
> - When an aggregate surprises you, segment it by the obvious drivers (device, country, new vs returning).
> - Explain the mechanism as a weighted average, and say which comparison answers the causal question.
> - In A/B tests, a segment-mix difference between arms points to a bug in randomization or logging.
