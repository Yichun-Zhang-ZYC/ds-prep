---
id: statistics-practice-power-and-sample-size
title: "Practice: Power and sample size calculations"
estimatedMinutes: 14
difficulty: hard
tags: [statistics, power, sample-size, ab-testing, practice]
---

## Why it matters

Sample size questions appear in nearly every experimentation interview: "How many users do you need to detect a 1-point lift?" The interviewer wants a formula, sensible inputs, and awareness of what drives the answer. This set practices the algebra for both means and proportions, and the reverse questions (power for a given $n$, smallest detectable effect). It builds on Type I/II error and power.

## Concept

**Four linked quantities**: significance level $\alpha$, power $1-\beta$, effect size $\delta$ (the minimum detectable effect, MDE), and sample size $n$. Fix three and the fourth follows.

**Per-group sample size, two-sided test** (equal groups):
- Means: $n = \dfrac{2\,(z_{1-\alpha/2} + z_{1-\beta})^2\,\sigma^2}{\delta^2}$.
- Proportions ($p_1$ baseline, $p_2 = p_1 + \delta$): $n = \dfrac{(z_{1-\alpha/2} + z_{1-\beta})^2\,[\,p_1(1-p_1) + p_2(1-p_2)\,]}{\delta^2}$.

Standard values: $z_{0.975} = 1.96$, $z_{0.80} = 0.84$, $z_{0.90} = 1.28$. So $(1.96 + 0.84)^2 = 7.84$ at 80% power and $(1.96+1.28)^2 = 10.5$ at 90%.

**Power for a given $n$** (means): $\text{power} \approx \Phi\!\left(\dfrac{\delta}{\sigma\sqrt{2/n}} - z_{1-\alpha/2}\right)$, where $\Phi$ is the standard normal CDF. The **MDE** at a given $n$ is $(z_{1-\alpha/2} + z_{1-\beta})\,\sigma\sqrt{2/n}$.

**Scaling rules to quote**: $n \propto \sigma^2/\delta^2$, so halving the MDE quadruples $n$; doubling the variance doubles $n$; one-sided tests save about 20% ($z_{1-\alpha}$ instead of $z_{1-\alpha/2}$); unequal allocation (ratio $r$) costs efficiency; a pre-experiment covariate (CUPED) with correlation $\rho$ cuts variance by $\rho^2$.

**Pitfalls**: using the observed effect from a small pilot as the MDE (it is noisy and biased upward); choosing the MDE by what you can afford instead of what is worth detecting; forgetting that randomization units are users but the metric may be per-session (clustering inflates variance); ignoring the number of metrics and variants (multiple-comparison adjustments raise the needed $z$); peeking without a sequential design.

## Worked example

**Case**: checkout conversion is 10%. The team cares about a +1 percentage point lift (10% to 11%), $\alpha = 0.05$ two-sided, 80% power.

$$n = \frac{(1.96 + 0.84)^2\,[0.10 \cdot 0.90 + 0.11 \cdot 0.89]}{0.01^2} = \frac{7.84 \cdot 0.1879}{0.0001} = 14{,}731.4 \to 14{,}732 \text{ per arm}$$

So about 29,500 users in total. At 20,000 eligible users per week, the test needs roughly 1.5 weeks; round up to 2 full weeks to cover weekly seasonality.

**Sensitivity**: for a +0.5 pp lift, the variance term becomes $0.1\cdot0.9 + 0.105\cdot0.895 = 0.18398$ and the denominator $0.005^2$, so $n = 7.84 \cdot 0.18398/0.000025 \approx 57{,}700$ per arm, about four times larger. A third variant with Bonferroni (two comparisons, $\alpha = 0.025$, $z = 2.24$) gives $(2.24+0.84)^2 = 9.49$ instead of 7.84, so 21% more users per arm.

**Means example**: $\sigma = 20$ minutes, MDE $\delta = 5$. For 80% power, $n = 2\,(2.8 \cdot 20/5)^2 = 250.9 \to 251$ per group. With only 100 per group, power $= \Phi(5/(20\sqrt{0.02}) - 1.96) = \Phi(-0.19) \approx 0.42$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You want to detect an effect half as large as originally planned, keeping alpha, power and variance fixed. How does the required sample size change?",
  "options": [
    "It doubles",
    "It quadruples",
    "It halves",
    "It is unchanged"
  ],
  "answer": 1,
  "explanation": "$n \\propto 1/\\delta^2$, so halving $\\delta$ multiplies $n$ by 4."
}
```

```quiz
{
  "id": "q2",
  "question": "A pilot of 200 users showed a 3 pp lift (p = 0.04). The team plans the full test to detect exactly 3 pp. What is the main problem?",
  "options": [
    "The pilot is too large",
    "Significant pilot effects are biased upward (winner's curse), so the real effect is likely smaller and the test underpowered",
    "Power cannot be computed from a pilot",
    "Alpha should be 0.5"
  ],
  "answer": 1,
  "explanation": "Selecting on significance in a small noisy sample inflates the estimate. Plan for the smallest effect that matters to the business, not the pilot's point estimate."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `n_per_group_means(sigma, delta, z_alpha=1.96, z_beta=0.84)` returning the smallest integer per-group $n = 2(z_\\alpha + z_\\beta)^2\\sigma^2/\\delta^2$ (use `math.ceil`). Check: sigma = 20, delta = 5 gives 251.",
  "starterCode": "import math\n\ndef n_per_group_means(sigma, delta, z_alpha=1.96, z_beta=0.84):\n    pass\n\nprint(n_per_group_means(20, 5))",
  "tests": "assert n_per_group_means(20, 5) == 251\nassert n_per_group_means(20, 2.5) == 1004\nassert n_per_group_means(10, 5, z_beta=1.28) == 84\nassert n_per_group_means(1, 1) == 16",
  "solution": "import math\n\ndef n_per_group_means(sigma, delta, z_alpha=1.96, z_beta=0.84):\n    return math.ceil(2 * (z_alpha + z_beta) ** 2 * sigma ** 2 / delta ** 2)",
  "hints": [
    "Compute (z_alpha + z_beta)² first; with defaults it is 7.84.",
    "Round up, never down, so power is at least the target."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `n_per_group_props(p1, p2, z_alpha=1.96, z_beta=0.84)` returning the smallest integer per-group $n = (z_\\alpha+z_\\beta)^2[p_1(1-p_1)+p_2(1-p_2)]/(p_2-p_1)^2$. Then write `total_days(n_per_group, daily_users, arms=2)` returning the number of whole weeks needed (round up to full weeks), assuming `daily_users` eligible users per day split evenly across arms. Check: 10% to 11% gives 14732 per arm.",
  "starterCode": "import math\n\ndef n_per_group_props(p1, p2, z_alpha=1.96, z_beta=0.84):\n    pass\n\ndef total_days(n_per_group, daily_users, arms=2):\n    pass\n\nprint(n_per_group_props(0.10, 0.11), total_days(14732, 4000))",
  "tests": "assert n_per_group_props(0.10, 0.11) == 14732\nassert n_per_group_props(0.10, 0.105) == 57695\nassert n_per_group_props(0.11, 0.10) == 14732\nassert n_per_group_props(0.5, 0.52) == 9793\nassert total_days(14732, 4000) == 2\nassert total_days(14732, 4000, arms=4) == 3\nassert total_days(100, 1000) == 1",
  "solution": "import math\n\ndef n_per_group_props(p1, p2, z_alpha=1.96, z_beta=0.84):\n    var = p1 * (1 - p1) + p2 * (1 - p2)\n    return math.ceil((z_alpha + z_beta) ** 2 * var / (p2 - p1) ** 2)\n\ndef total_days(n_per_group, daily_users, arms=2):\n    per_arm_per_day = daily_users / arms\n    days = math.ceil(n_per_group / per_arm_per_day)\n    return math.ceil(days / 7)",
  "hints": [
    "Per-arm daily traffic is daily_users / arms; days = n_per_group divided by that, rounded up.",
    "Convert days to weeks with another ceiling, so the test covers whole weekly cycles."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Implement `power_two_means(delta, sigma, n, z_alpha=1.96)` $= \\Phi(\\delta/(\\sigma\\sqrt{2/n}) - z_\\alpha)$ using the normal CDF `Phi(x) = 0.5 * (1 + math.erf(x / math.sqrt(2)))`, and `mde_means(sigma, n, z_alpha=1.96, z_beta=0.84)` $= (z_\\alpha+z_\\beta)\\sigma\\sqrt{2/n}$. Check: delta = 5, sigma = 20, n = 100 gives power about 0.424.",
  "starterCode": "import math\n\ndef power_two_means(delta, sigma, n, z_alpha=1.96):\n    pass\n\ndef mde_means(sigma, n, z_alpha=1.96, z_beta=0.84):\n    pass\n\nprint(power_two_means(5, 20, 100), mde_means(20, 251))",
  "tests": "assert abs(power_two_means(5, 20, 100) - 0.4238) < 1e-3\nassert abs(power_two_means(5, 20, 251) - 0.8004) < 2e-3\nassert abs(power_two_means(0, 20, 100) - 0.025) < 1e-3\nassert power_two_means(5, 20, 400) > power_two_means(5, 20, 100)\nassert abs(mde_means(20, 251) - 5.0) < 0.01\nassert abs(mde_means(20, 400) - 2.8 * 20 * (2 / 400) ** 0.5) < 1e-12",
  "solution": "import math\n\ndef Phi(x):\n    return 0.5 * (1 + math.erf(x / math.sqrt(2)))\n\ndef power_two_means(delta, sigma, n, z_alpha=1.96):\n    se = sigma * math.sqrt(2 / n)\n    return Phi(delta / se - z_alpha)\n\ndef mde_means(sigma, n, z_alpha=1.96, z_beta=0.84):\n    return (z_alpha + z_beta) * sigma * math.sqrt(2 / n)",
  "hints": [
    "SE of the difference in means is sigma·√(2/n).",
    "At delta = 0 the formula returns Φ(−1.96) = 0.025: the rejection probability in one tail."
  ]
}
```

> [!TIP] Interview tips
> - State the four inputs (alpha, power, MDE, variance) before computing; ask for the baseline and the smallest lift worth shipping.
> - Quote the scaling: half the MDE means 4x the sample, and translate users into calendar weeks.
> - Mention variance reduction (CUPED), full weekly cycles, and multiple-variant corrections.
