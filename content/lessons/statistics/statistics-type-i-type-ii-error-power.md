---
id: statistics-type-i-type-ii-error-power
title: Type I / Type II error, power
estimatedMinutes: 12
difficulty: medium
tags: [statistics, hypothesis-testing, power, ab-testing]
---

## Why it matters
"Our test wasn't significant, so the feature doesn't work" is wrong if the test had low power. Power analysis decides how long an experiment must run, and it's one of the most practical statistics topics in DS interviews.

## Concept
| | $H_0$ true (no effect) | $H_0$ false (real effect) |
|---|---|---|
| Reject $H_0$ | **Type I error** (false positive), prob. α | correct: **power** = 1 − β |
| Fail to reject | correct | **Type II error** (false negative), prob. β |

Power rises with:
- larger **effect size** (easier to detect big changes),
- larger **sample size**,
- lower **variance** of the metric,
- larger **α** (at the cost of more false positives).

Common target: α = 0.05, power = 80%. For a two-sample test of proportions, the sample size per group is roughly

$$
n \approx \frac{(z_{1-\alpha/2} + z_{1-\beta})^2 \,\big[p_1(1-p_1) + p_2(1-p_2)\big]}{(p_2 - p_1)^2}
$$

## Worked example
Baseline conversion 5%, and you want to detect a lift to 5.5% (α = 0.05 two-sided, 80% power: $z$ values 1.96 and 0.84):

$$
n \approx \frac{(2.8)^2\,(0.0475 + 0.05198)}{0.005^2} \approx 31{,}200 \text{ per group}
$$

Halving the detectable lift (to 5.25%) needs about 4× as many users.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A test has 30% power for the effect you care about, and the result is not significant. What should you conclude?",
  "options": ["The feature has no effect", "The test was unlikely to detect the effect even if it exists; the result is inconclusive", "Increase α to 0.5", "The feature hurts the metric"],
  "answer": 1,
  "explanation": "With 30% power, a real effect would be missed 70% of the time."
}
```

```quiz
{
  "id": "q2",
  "question": "Which change increases power without increasing the false-positive rate?",
  "options": ["Raising α from 0.05 to 0.10", "Running the test longer to get more users", "Peeking daily and stopping when significant", "Testing 10 metrics"],
  "answer": 1,
  "explanation": "More data raises power at a fixed α. The other options inflate false positives."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `sample_size_per_group(p1, p2, alpha=0.05, power=0.8)` using the formula above with `statistics.NormalDist().inv_cdf`. Round up with `math.ceil`.",
  "starterCode": "import math\nfrom statistics import NormalDist\n\ndef sample_size_per_group(p1, p2, alpha=0.05, power=0.8):\n    pass\n\nprint(sample_size_per_group(0.05, 0.055))",
  "tests": "n = sample_size_per_group(0.05, 0.055)\nassert 31000 < n < 31500, n\nassert sample_size_per_group(0.05, 0.0525) > 3.5 * n\nassert sample_size_per_group(0.05, 0.055, power=0.9) > n",
  "solution": "import math\nfrom statistics import NormalDist\n\ndef sample_size_per_group(p1, p2, alpha=0.05, power=0.8):\n    z = NormalDist()\n    za = z.inv_cdf(1 - alpha / 2)\n    zb = z.inv_cdf(power)\n    var = p1 * (1 - p1) + p2 * (1 - p2)\n    return math.ceil((za + zb) ** 2 * var / (p2 - p1) ** 2)",
  "hints": ["z for α/2 = 0.025 is about 1.96; z for 80% power is about 0.84.", "Sample size grows with 1 / (effect size)²."]
}
```

> [!TIP] Interview tips
> - Compute (or estimate) sample size **before** the test, from the minimum effect you care about.
> - Never call an underpowered null result "no effect"; report the CI instead.
> - Mention variance reduction (CUPED, stratification) as a way to gain power without more users.
