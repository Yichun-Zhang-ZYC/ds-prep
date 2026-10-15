---
id: experimentation-sample-size-and-power-analysis
title: Sample size and power analysis
estimatedMinutes: 15
difficulty: medium
tags: [experimentation, power, sample-size]
---

## Why it matters
"How long should we run this test?" starts with a sample size calculation. Interviewers expect you to know the inputs, the rough formula, and how each input changes the answer.

## Concept
Inputs: baseline rate (or mean and SD), **minimum detectable effect (MDE)**, significance α (usually 0.05, two-sided), and power 1 − β (usually 80%).

A handy approximation for equal groups, per group:

$$
n \approx \frac{2\,(z_{1-\alpha/2} + z_{1-\beta})^2\,\sigma^2}{\delta^2} \approx \frac{16\,\sigma^2}{\delta^2}\quad(\alpha = 0.05,\ \text{power} = 80\%)
$$

For a conversion rate $p$, $\sigma^2 = p(1-p)$. The "16" comes from $2 \times (1.96 + 0.84)^2 \approx 15.7$.

How inputs move $n$:
- Halve the MDE → **4×** the sample.
- Higher variance → more sample (variance reduction helps).
- Lower baseline rate (rarer events) → for the same *relative* lift, much more sample.
- Unequal splits (e.g. 90/10) need more total traffic than 50/50.

## Worked example
Baseline checkout conversion 4%, and you want to detect a 5% **relative** lift (4.0% → 4.2%, δ = 0.002).

$$
n \approx \frac{16 \times 0.04 \times 0.96}{0.002^2} = 153{,}600 \text{ per group}
$$

With 20,000 eligible visitors a day split 50/50, that's about 15–16 days; round up to whole weeks: 3 weeks.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A test needs 50,000 users per group to detect a 2% relative lift. About how many per group to detect a 1% relative lift?",
  "options": ["100,000", "200,000", "70,000", "25,000"],
  "answer": 1,
  "explanation": "n ∝ 1/δ². Halving δ multiplies n by 4."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `n_per_group_rule16(p, relative_lift)` using n = 16·p(1−p)/δ² with δ = p·relative_lift (round up), and `days_needed(n_per_group, daily_traffic, share_in_test=1.0)` assuming a 50/50 split (round up).",
  "starterCode": "import math\n\ndef n_per_group_rule16(p, relative_lift):\n    pass\n\ndef days_needed(n_per_group, daily_traffic, share_in_test=1.0):\n    pass\n\nn = n_per_group_rule16(0.04, 0.05)\nprint(n, days_needed(n, 20000))",
  "tests": "n = n_per_group_rule16(0.04, 0.05)\nassert n == 153600, n\nassert days_needed(n, 20000) == 16\nassert days_needed(n, 20000, 0.5) == 31\nassert n_per_group_rule16(0.04, 0.025) == 4 * n",
  "solution": "import math\n\ndef n_per_group_rule16(p, relative_lift):\n    delta = p * relative_lift\n    return math.ceil(round(16 * p * (1 - p) / delta ** 2, 6))\n\ndef days_needed(n_per_group, daily_traffic, share_in_test=1.0):\n    per_group_per_day = daily_traffic * share_in_test / 2\n    return math.ceil(n_per_group / per_group_per_day)",
  "hints": ["δ is the absolute difference: baseline × relative lift.", "Each group gets half of the traffic that enters the test."]
}
```

> [!TIP] Interview tips
> - Ask for baseline and MDE before computing; MDE is a business decision ("what lift is worth shipping?").
> - Quote the rule of 16 for quick estimates, then mention a proper calculator for the final number.
> - Round test duration up to full weeks to cover weekday/weekend cycles.
