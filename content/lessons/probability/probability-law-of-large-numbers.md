---
id: probability-law-of-large-numbers
title: Law of large numbers
estimatedMinutes: 8
difficulty: easy
tags: [probability, limit-theorems, sampling]
---

## Why it matters
The law of large numbers (LLN) is why averages from big samples are trustworthy, why casinos always win in the long run, and why small samples produce extreme rates. Interviewers use it to check intuition about noise.

## Concept
For independent draws $X_1, X_2, \dots$ with mean $\mu$, the sample average converges to $\mu$:

$$
\bar X_n = \frac{1}{n}\sum_{i=1}^n X_i \;\longrightarrow\; \mu \quad \text{as } n \to \infty
$$

How fast? The spread of $\bar X_n$ shrinks like $\sigma / \sqrt{n}$. Quadrupling the sample size halves the noise.

What the LLN does **not** say: that short runs "balance out". After 10 heads in a row, the next flip is still 50/50. The average converges because the early streak gets diluted by many later flips, not because tails become more likely.

## Worked example
Which hospital records more days where over 60% of births are boys: a large one (45 births a day) or a small one (15 a day)?

The small one. With $p = 0.5$, the daily share's standard deviation is $\sqrt{0.25/15} \approx 0.13$ at the small hospital versus $\sqrt{0.25/45} \approx 0.075$ at the large one, so extreme days are much more common with small samples.

The same logic explains why the "best" and "worst" counties for rare diseases, or the top-rated products with only 3 reviews, are usually the small ones.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A coin has come up heads 10 times in a row. By the law of large numbers, what is the probability of tails on the next flip?",
  "options": ["Higher than 0.5", "0.5", "Lower than 0.5", "It depends on how many flips remain"],
  "answer": 1,
  "explanation": "Independent flips have no memory. The LLN works by dilution, not compensation."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `running_means(n, seed)` that simulates `n` fair-coin flips (1 = heads) with `random.Random(seed)` and returns the list of running averages after each flip.",
  "starterCode": "import random\n\ndef running_means(n, seed):\n    pass\n\nm = running_means(10000, 42)\nprint(m[9], m[99], m[-1])",
  "tests": "m = running_means(10000, 42)\nassert len(m) == 10000\nassert all(0 <= x <= 1 for x in m)\nassert abs(m[-1] - 0.5) < 0.02, m[-1]\nassert m[0] in (0.0, 1.0)",
  "solution": "import random\n\ndef running_means(n, seed):\n    rng = random.Random(seed)\n    total = 0\n    out = []\n    for i in range(1, n + 1):\n        total += 1 if rng.random() < 0.5 else 0\n        out.append(total / i)\n    return out",
  "hints": ["Keep a running total of heads and divide by the number of flips so far."]
}
```

> [!TIP] Interview tips
> - Use $\sigma/\sqrt{n}$ to quantify "how much noise to expect" before interpreting a small-sample metric.
> - Warn about ranking by raw averages with tiny samples; suggest a minimum sample size or Bayesian shrinkage.
> - Name the gambler's fallacy if someone argues outcomes must "even out".
