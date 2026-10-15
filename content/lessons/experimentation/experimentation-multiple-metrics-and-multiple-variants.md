---
id: experimentation-multiple-metrics-and-multiple-variants
title: Multiple metrics and multiple variants
estimatedMinutes: 12
difficulty: medium
tags: [experimentation, multiple-testing, decision-making]
---

## Why it matters
Real tests have 5 variants and 30 metrics on the dashboard. Without a plan, something will always look significant. Interviewers check that you structure decisions to control false wins.

## Concept
**Many metrics**
- One pre-registered **primary metric** decides the launch.
- **Guardrails** are checked for harm (non-inferiority).
- Everything else is **exploratory**: interesting, but corrected (e.g. Benjamini–Hochberg) or confirmed later.
- Tiered significance: p < 0.05 for the primary, stricter (e.g. 0.01 or FDR) for the rest.

**Many variants (A/B/C/D…)**
- Each extra variant splits traffic → less power per arm. Size the test for the number of arms.
- Comparing every variant to control: correct for the number of comparisons (Bonferroni/Holm, or Dunnett's test).
- "Pick the best of 5" has a winner's curse: the top variant's observed lift is biased upward. Confirm it in a follow-up head-to-head test, or use a bandit / Bayesian approach.

## Worked example
Four treatments vs control on conversion (α = 0.05 family-wise). Bonferroni per comparison: 0.05 / 4 = 0.0125.

| Variant | p-value | Decision |
|---|---|---|
| B | 0.004 | significant ✓ |
| C | 0.03 | not significant after correction |
| D | 0.20 | no |
| E | 0.011 | significant ✓ |

Then compare B vs E (or run them head to head) before picking one. Their observed lifts are likely inflated.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You test 5 variants and launch the one with the highest observed lift (+4%). Why might the real lift be smaller?",
  "options": ["Because of novelty effects only", "Winner's curse: selecting the maximum of noisy estimates biases it upward", "Because of SRM", "It won't be smaller"],
  "answer": 1,
  "explanation": "The best-looking variant is partly best because of favorable noise."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `holm(pvals, alpha=0.05)`: the Holm step-down procedure. Sort p-values ascending; for rank i (1-based) compare with alpha / (m − i + 1); reject while the condition holds and stop at the first failure. Return booleans in the original order.",
  "starterCode": "def holm(pvals, alpha=0.05):\n    pass\n\nprint(holm([0.004, 0.03, 0.20, 0.011]))",
  "tests": "assert holm([0.004, 0.03, 0.20, 0.011]) == [True, False, False, True]\nassert holm([0.01, 0.02, 0.03]) == [True, True, True]\nassert holm([0.02, 0.5]) == [True, False]\nassert holm([0.03, 0.04]) == [False, False]",
  "solution": "def holm(pvals, alpha=0.05):\n    m = len(pvals)\n    order = sorted(range(m), key=lambda i: pvals[i])\n    reject = [False] * m\n    for rank, i in enumerate(order, start=1):\n        if pvals[i] <= alpha / (m - rank + 1):\n            reject[i] = True\n        else:\n            break\n    return reject",
  "hints": ["The smallest p-value is compared with alpha/m, the next with alpha/(m − 1), and so on.", "Once a p-value fails, all larger ones are not rejected either."]
}
```

> [!TIP] Interview tips
> - Name one primary metric and a decision rule before the test.
> - Plan traffic for the number of variants; more arms = longer tests.
> - Mention the winner's curse and a confirmation test when picking the best of many.
