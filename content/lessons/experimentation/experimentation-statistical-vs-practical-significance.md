---
id: experimentation-statistical-vs-practical-significance
title: Statistical vs practical significance
estimatedMinutes: 10
difficulty: easy
tags: [experimentation, decision-making, effect-size]
---

## Why it matters
With millions of users, tiny changes become "significant". Interviewers check that you decide launches on whether the effect is **worth it**, not just whether p < 0.05.

## Concept
- **Statistical significance**: the effect is unlikely to be pure noise (p < α, CI excludes 0).
- **Practical significance**: the effect is large enough to matter, compared with costs, risks and alternatives.

Decide upfront what effect is practically meaningful (often the MDE or a business threshold). Then read the **confidence interval** against it:

| CI for the lift | Reading |
|---|---|
| entirely above the practical threshold | significant and meaningful: launch |
| above 0 but includes values below the threshold | real but maybe too small; weigh costs |
| includes 0, upper end below threshold | probably not worth it, even if more data would make it significant |
| wide, includes 0 and large values | inconclusive: need more data |

## Worked example
A huge test (5M users per arm) finds +0.05% conversion, CI [+0.02%, +0.08%], p = 0.001. The team's practical threshold is +0.5% because the feature adds maintenance and infra cost.

Statistically significant, practically negligible: don't launch on this basis (unless it's free to keep).

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A lift of +2% has CI [−0.5%, +4.5%] and the practical threshold is +1%. What's the best conclusion?",
  "options": ["Launch: the point estimate beats the threshold", "No effect", "Inconclusive: the data is consistent with no effect and with a meaningful one; more data or a decision under uncertainty is needed", "The test is broken"],
  "answer": 2,
  "explanation": "The interval spans both 0 and values above the threshold."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `classify(ci_low, ci_high, threshold)` returning one of 'launch' (ci_low ≥ threshold), 'small' (0 < ci_low < threshold), 'not-worth-it' (ci_low ≤ 0 and ci_high < threshold), or 'inconclusive' (ci_low ≤ 0 and ci_high ≥ threshold).",
  "starterCode": "def classify(ci_low, ci_high, threshold):\n    pass\n\nprint(classify(0.02, 0.08, 0.5))",
  "tests": "assert classify(0.6, 1.2, 0.5) == 'launch'\nassert classify(0.02, 0.08, 0.5) == 'small'\nassert classify(-0.1, 0.3, 0.5) == 'not-worth-it'\nassert classify(-0.5, 4.5, 1.0) == 'inconclusive'",
  "solution": "def classify(ci_low, ci_high, threshold):\n    if ci_low >= threshold:\n        return 'launch'\n    if ci_low > 0:\n        return 'small'\n    if ci_high < threshold:\n        return 'not-worth-it'\n    return 'inconclusive'",
  "hints": ["Check the cases in order: fully above threshold, above zero, then whether the upper bound reaches the threshold."]
}
```

> [!TIP] Interview tips
> - Read the CI against a pre-agreed practical threshold, not the p-value alone.
> - Translate the effect into business units ("about \$40k per month") to judge practical value.
> - Small but real effects can still be worth shipping if they're cheap; say what the costs are.
