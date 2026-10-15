---
id: experimentation-peeking-problem-and-sequential-testing
title: Peeking problem and sequential testing
estimatedMinutes: 15
difficulty: hard
tags: [experimentation, peeking, sequential-testing, false-positives]
---

## Why it matters
"We check the dashboard every day and stop as soon as p < 0.05." That practice can push the real false-positive rate above 20%. Explaining why, and what to do instead, is a core senior-DS interview topic.

## Concept
A fixed-horizon test controls the false-positive rate at α **only if you look once**, at the planned sample size. If you check repeatedly and stop at the first p < 0.05, you get many chances for random noise to cross the line, so the overall error rate grows with the number of peeks.

Solutions:
- **Commit** to a sample size / duration and look once (still fine to monitor for bugs and guardrails).
- **Group sequential designs** with alpha spending (e.g. O'Brien–Fleming): a few planned interim looks with stricter thresholds early on.
- **Always-valid inference** (mSPRT, confidence sequences): p-values or intervals that stay valid under continuous monitoring, at the cost of some power.
- Bayesian monitoring with a pre-set decision rule (it still needs care).

## Worked example
Simulation of A/A tests (no real effect), checking a z-test after every day for 20 days and stopping at the first |z| > 1.96: roughly 20–25% of tests "find" an effect, versus 5% with a single look at day 20. With an O'Brien–Fleming boundary (very strict early, close to 1.96 at the end), the overall rate returns to about 5%.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why does stopping at the first significant daily check inflate false positives?",
  "options": ["Daily data is biased", "Each look is another chance for noise to cross the threshold, and you stop on the lucky one", "The sample size gets too large", "p-values are only valid on weekends"],
  "answer": 1,
  "explanation": "Repeated testing of accumulating data compounds the error rate unless thresholds are adjusted."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Simulate peeking. `peeking_fpr(n_tests, looks, per_look, seed)`: for each A/A test, add `per_look` N(0,1) observations to each group at every look, compute z = (mean_b − mean_a) / sqrt(2/n_so_far) after each look, and count the test as a false positive if |z| > 1.96 at **any** look. Return the share of false positives.",
  "starterCode": "import math, random\n\ndef peeking_fpr(n_tests, looks, per_look, seed):\n    pass\n\nprint(peeking_fpr(600, 1, 20, 0), peeking_fpr(600, 20, 20, 0))",
  "tests": "one = peeking_fpr(600, 1, 20, 0)\nmany = peeking_fpr(600, 20, 20, 1)\nassert 0.02 < one < 0.085, one\nassert many > 0.13, many",
  "solution": "import math, random\n\ndef peeking_fpr(n_tests, looks, per_look, seed):\n    rng = random.Random(seed)\n    hits = 0\n    for _ in range(n_tests):\n        sa = sb = 0.0\n        n = 0\n        for _ in range(looks):\n            sa += sum(rng.gauss(0, 1) for _ in range(per_look))\n            sb += sum(rng.gauss(0, 1) for _ in range(per_look))\n            n += per_look\n            z = (sb / n - sa / n) / math.sqrt(2 / n)\n            if abs(z) > 1.96:\n                hits += 1\n                break\n    return hits / n_tests",
  "hints": ["Keep running sums for each group and recompute z after every look.", "Stop the test at the first crossing; that's what peeking does."]
}
```

> [!TIP] Interview tips
> - Say what peeking does in numbers: ~5% becomes ~20%+ with daily looks.
> - Offer solutions in order of simplicity: fixed horizon → group sequential → always-valid methods.
> - Distinguish monitoring for **harm or bugs** (fine, encouraged) from stopping early for **wins**.
