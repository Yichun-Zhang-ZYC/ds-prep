---
id: experimentation-mde
title: MDE (minimum detectable effect)
estimatedMinutes: 10
difficulty: medium
tags: [experimentation, power, mde]
---

## Why it matters
"We only have 2 weeks of traffic. What's the smallest effect we can detect?" Flipping the sample-size question around gives the MDE, and it often decides whether a test is worth running at all.

## Concept
The **MDE** is the smallest true effect the test has (say) 80% power to detect at the chosen α. With a fixed sample size per group $n$:

$$
\text{MDE} \approx (z_{1-\alpha/2} + z_{1-\beta})\sqrt{\frac{2\sigma^2}{n}} \approx 2.8\sqrt{\frac{2\sigma^2}{n}}
$$

Key points:
- MDE shrinks like $1/\sqrt{n}$: 4× the traffic halves the MDE.
- It's not "the effect we expect"; it's a property of the test's sensitivity.
- If plausible effects are much smaller than the MDE, the test is likely to be inconclusive. Options: run longer, reduce variance (CUPED), pick a more sensitive metric, or accept the risk.

## Worked example
Baseline conversion 10% (σ² = 0.09), 25,000 users per group:

$$
\text{MDE} \approx 2.8\sqrt{\frac{2 \times 0.09}{25{,}000}} \approx 2.8 \times 0.00268 \approx 0.0075
$$

So the test can reliably detect a change of about **0.75 points** (7.5% relative). If the team expects a ~2% relative lift, this test is underpowered.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A test's MDE is a 3% relative lift. The observed lift is +1.5% and not significant. What's the most accurate conclusion?",
  "options": ["The feature has no effect", "The test couldn't reliably detect effects this small; the true effect could still be positive", "The feature hurts conversion", "The MDE was wrong"],
  "answer": 1,
  "explanation": "An effect below the MDE often won't reach significance even if real. Report the CI."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `mde_abs(p, n_per_group, alpha=0.05, power=0.8)` returning the absolute MDE for a proportion using exact z-values from `statistics.NormalDist`, and `mde_relative(p, n_per_group)` = mde_abs / p.",
  "starterCode": "import math\nfrom statistics import NormalDist\n\ndef mde_abs(p, n_per_group, alpha=0.05, power=0.8):\n    pass\n\ndef mde_relative(p, n_per_group):\n    pass\n\nprint(mde_abs(0.10, 25000), mde_relative(0.10, 25000))",
  "tests": "m = mde_abs(0.10, 25000)\nassert 0.0073 < m < 0.0077, m\nassert abs(mde_abs(0.10, 100000) - m / 2) < 1e-9\nassert abs(mde_relative(0.10, 25000) - m / 0.10) < 1e-12",
  "solution": "import math\nfrom statistics import NormalDist\n\ndef mde_abs(p, n_per_group, alpha=0.05, power=0.8):\n    z = NormalDist()\n    k = z.inv_cdf(1 - alpha / 2) + z.inv_cdf(power)\n    return k * math.sqrt(2 * p * (1 - p) / n_per_group)\n\ndef mde_relative(p, n_per_group):\n    return mde_abs(p, n_per_group) / p",
  "hints": ["(z for 0.975) + (z for 0.8) ≈ 2.8.", "Quadrupling n halves the MDE."]
}
```

> [!TIP] Interview tips
> - Compute the MDE before launching; if it's bigger than any realistic effect, say so and propose alternatives.
> - Express it both ways: absolute points and relative %.
> - Separate "MDE" (test sensitivity) from "expected effect" (product hypothesis).
