---
id: probability-law-of-total-probability
title: Law of total probability
estimatedMinutes: 10
difficulty: easy
tags: [probability, total-probability, mixtures]
---

## Why it matters
"Overall conversion is a mix of mobile and desktop conversion" is the law of total probability. It's also the denominator in every Bayes problem, and the tool behind Simpson's paradox explanations.

## Concept
If $B_1, \dots, B_k$ split the sample space into disjoint pieces (a **partition**), then

$$
P(A) = \sum_{i=1}^{k} P(A \mid B_i)\,P(B_i)
$$

An overall rate is the **weighted average** of the segment rates, weighted by segment size. That's why the overall rate can move even when no segment's rate changes: the mix shifted.

## Worked example
60% of traffic is mobile with 2% conversion; 40% is desktop with 5% conversion.

$$
P(\text{convert}) = 0.6 \times 0.02 + 0.4 \times 0.05 = 0.012 + 0.020 = 0.032
$$

If next month traffic becomes 80% mobile with the same segment rates, overall conversion drops to $0.8 \times 0.02 + 0.2 \times 0.05 = 0.026$, a 19% "decline" with no change in user behavior.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Factory A makes 70% of parts with a 1% defect rate; factory B makes 30% with a 4% defect rate. What is the overall defect rate?",
  "options": ["2.5%", "1.9%", "5%", "1.3%"],
  "answer": 1,
  "explanation": "0.7 × 0.01 + 0.3 × 0.04 = 0.007 + 0.012 = 0.019."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `overall_rate(segments)` where `segments` is a list of `(share, rate)` tuples whose shares sum to 1. Return the overall rate.",
  "starterCode": "def overall_rate(segments):\n    pass\n\nprint(overall_rate([(0.6, 0.02), (0.4, 0.05)]))",
  "tests": "assert abs(overall_rate([(0.6, 0.02), (0.4, 0.05)]) - 0.032) < 1e-12\nassert abs(overall_rate([(0.7, 0.01), (0.3, 0.04)]) - 0.019) < 1e-12\nassert abs(overall_rate([(1.0, 0.5)]) - 0.5) < 1e-12",
  "solution": "def overall_rate(segments):\n    return sum(share * rate for share, rate in segments)",
  "hints": ["Weighted average: multiply each rate by its share and add."]
}
```

```reveal
{
  "prompt": "Overall conversion dropped 10% week over week, but conversion is flat within every country. How do you explain this to a stakeholder?",
  "answer": "It's a **mix shift**. Overall conversion is a weighted average of country conversion rates, weighted by each country's share of traffic. If traffic grew faster in lower-converting countries (for example from a new campaign), the overall rate falls even though no country got worse.\n\nShow a table with each country's share and rate for both weeks, and compute what overall conversion would have been with last week's mix. That separates the mix effect from a true performance change."
}
```

> [!TIP] Interview tips
> - When a top-line metric moves, decompose it: segment rates × segment shares.
> - The same idea explains Simpson's paradox: the aggregate can reverse the segment-level trend.
> - In Bayes problems, write the total-probability denominator explicitly; it's where most arithmetic mistakes happen.
