---
id: experimentation-a-a-tests
title: A/A tests
estimatedMinutes: 8
difficulty: easy
tags: [experimentation, validation, platform]
---

## Why it matters
Before trusting an experimentation platform (or a new metric), you check that it doesn't find differences where none exist. A/A tests are how teams catch broken randomization, logging bugs and wrong variance formulas.

## Concept
An **A/A test** splits users into two groups that get the **identical** experience. What to expect:

- About **5%** of A/A comparisons are "significant" at α = 0.05, by design. Not 0%, and not 20%.
- Across many A/A tests (or many metrics), the **p-values should be uniform** between 0 and 1.
- Group sizes should match the intended split (no sample ratio mismatch).

What a failing A/A suggests:

| Symptom | Likely cause |
|---|---|
| Far more than 5% significant | variance underestimated (analysis unit ≠ randomization unit), or biased assignment |
| Group sizes off | assignment or logging bug |
| One metric always differs | metric pipeline bug |

## Worked example
A team runs 100 A/A comparisons on "clicks per pageview" and finds 18 significant. Expected: about 5. Investigation shows they randomized by user but computed SEs as if pageviews were independent. Switching to user-level analysis (delta method) brings the rate to about 5%.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You run 200 A/A tests. Roughly how many should show p < 0.05 if everything works?",
  "options": ["0", "About 10", "About 50", "About 100"],
  "answer": 1,
  "explanation": "5% of 200 = 10. Zero would also be suspicious (e.g. an overly conservative test)."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Simulate A/A tests. `aa_false_positive_rate(n_tests, n_per_group, p, seed)`: for each test, draw conversions for two groups from the same rate `p`, run a two-proportion z-test (pooled SE), and return the share of tests with |z| > 1.96. It should be close to 0.05.",
  "starterCode": "import math, random\n\ndef aa_false_positive_rate(n_tests, n_per_group, p, seed):\n    pass\n\nprint(aa_false_positive_rate(400, 1000, 0.1, 0))",
  "tests": "r = aa_false_positive_rate(400, 1000, 0.1, 0)\nassert 0.02 < r < 0.085, r",
  "solution": "import math, random\n\ndef aa_false_positive_rate(n_tests, n_per_group, p, seed):\n    rng = random.Random(seed)\n    hits = 0\n    for _ in range(n_tests):\n        a = sum(rng.random() < p for _ in range(n_per_group))\n        b = sum(rng.random() < p for _ in range(n_per_group))\n        pool = (a + b) / (2 * n_per_group)\n        se = math.sqrt(pool * (1 - pool) * 2 / n_per_group)\n        z = (b - a) / n_per_group / se if se > 0 else 0\n        hits += abs(z) > 1.96\n    return hits / n_tests",
  "hints": ["Both groups use the same p, so every significant result is a false positive.", "Count tests with |z| > 1.96."]
}
```

> [!TIP] Interview tips
> - Mention A/A tests when asked how you'd validate a new platform or metric.
> - Say what "passing" means: ~5% false positives, uniform p-values, no SRM.
> - Some teams run continuous A/A slices alongside real tests as a health check.
