---
id: statistics-multiple-testing
title: Multiple testing (Bonferroni, FDR / Benjamini-Hochberg)
estimatedMinutes: 12
difficulty: medium
tags: [statistics, hypothesis-testing, multiple-comparisons, ab-testing]
---

## Why it matters
Test 20 metrics at α = 0.05 and you expect one "significant" result even if nothing changed. Dashboards with many metrics and segment breakdowns make this the most common way experiments produce false wins.

## Concept
With $m$ independent tests at level α, P(at least one false positive) $= 1 - (1 - \alpha)^m$, which is about 64% for $m = 20$.

| Method | Controls | Rule | Trade-off |
|---|---|---|---|
| Bonferroni | family-wise error rate (any false positive) | reject if $p_i \le \alpha / m$ | simple, very conservative |
| Holm | family-wise error rate | step-down version of Bonferroni | uniformly more powerful than Bonferroni |
| Benjamini-Hochberg (BH) | false discovery rate (share of discoveries that are false) | sort p-values; find the largest $k$ with $p_{(k)} \le \frac{k}{m}\alpha$; reject the first $k$ | more power, allows some false positives |

Use FWER control when any false claim is costly (a launch decision on one metric). Use FDR when screening many hypotheses (segments, features, genes).

The cleanest fix is design: pick **one primary metric** before the test, and treat the rest as guardrails or exploratory.

## Worked example
Five p-values: 0.001, 0.008, 0.039, 0.041, 0.20 (m = 5, α = 0.05).

- Bonferroni threshold 0.01 → reject the first two.
- BH thresholds $k \times 0.01$: 0.01, 0.02, 0.03, 0.04, 0.05. Compare: 0.001 ✓, 0.008 ✓, 0.039 ✗ (> 0.03), 0.041 ✗ (> 0.04), 0.20 ✗. The largest passing $k$ is 2 → reject the first two.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You test 10 independent metrics at α = 0.05 with no real effects. What's the chance of at least one significant result?",
  "options": ["5%", "About 40%", "50%", "10%"],
  "answer": 1,
  "explanation": "1 − 0.95¹⁰ ≈ 0.40."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `bonferroni(pvals, alpha=0.05)` and `benjamini_hochberg(pvals, alpha=0.05)`, each returning a list of booleans (reject or not) in the **original order**.",
  "starterCode": "def bonferroni(pvals, alpha=0.05):\n    pass\n\ndef benjamini_hochberg(pvals, alpha=0.05):\n    pass\n\nps = [0.20, 0.001, 0.041, 0.008, 0.039]\nprint(bonferroni(ps), benjamini_hochberg(ps))",
  "tests": "ps = [0.20, 0.001, 0.041, 0.008, 0.039]\nassert bonferroni(ps) == [False, True, False, True, False]\nassert benjamini_hochberg(ps) == [False, True, False, True, False]\nqs = [0.01, 0.02, 0.03, 0.04, 0.05]\nassert benjamini_hochberg(qs) == [True] * 5\nassert bonferroni(qs) == [True, False, False, False, False]",
  "solution": "def bonferroni(pvals, alpha=0.05):\n    m = len(pvals)\n    return [p <= alpha / m for p in pvals]\n\ndef benjamini_hochberg(pvals, alpha=0.05):\n    m = len(pvals)\n    order = sorted(range(m), key=lambda i: pvals[i])\n    k = 0\n    for rank, i in enumerate(order, start=1):\n        if pvals[i] <= rank / m * alpha:\n            k = rank\n    rejected = set(order[:k])\n    return [i in rejected for i in range(m)]",
  "hints": ["BH: sort, then find the LARGEST rank k whose p-value is ≤ k/m·α; reject all ranks up to k.", "Map results back to the original positions."]
}
```

> [!TIP] Interview tips
> - Lead with design: one pre-registered primary metric, then guardrails.
> - Know the difference: FWER (Bonferroni/Holm) vs FDR (BH), and when each fits.
> - Segment "wins" found after the fact are hypotheses for the next test, not conclusions.
