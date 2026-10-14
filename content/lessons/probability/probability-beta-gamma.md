---
id: probability-beta-gamma
title: Beta, Gamma
estimatedMinutes: 12
difficulty: hard
tags: [probability, distributions, bayesian, conjugate-priors]
---

## Why it matters
Beta and Gamma rarely appear as "compute this probability" questions. They appear in Bayesian A/B testing, Thompson sampling and modeling rates. Knowing what they're for (and the Beta-Binomial update) is what interviewers look for.

## Concept
**Beta(α, β)** lives on $[0, 1]$, so it models an unknown **probability** (a conversion rate):

$$
E[p] = \frac{\alpha}{\alpha + \beta}
$$

Think of α − 1 as prior successes and β − 1 as prior failures. Beta(1, 1) is uniform.

**Beta-Binomial update**: with prior Beta(α, β) and $s$ successes in $n$ trials, the posterior is

$$
\text{Beta}(\alpha + s,\; \beta + n - s)
$$

**Gamma(k, θ)** lives on $(0, \infty)$ and models positive, skewed quantities (waiting time for the $k$-th Poisson event, rates). Mean $k\theta$, variance $k\theta^2$. Exponential is Gamma with $k = 1$, and Gamma is the conjugate prior for a Poisson rate.

## Worked example
Start with Beta(1, 1) for a variant's conversion rate. After 40 conversions out of 200 visitors:

$$
\text{posterior} = \text{Beta}(41, 161), \qquad E[p] = \frac{41}{202} \approx 0.203
$$

The posterior mean is pulled slightly toward the prior (0.5) compared with the raw 0.20, and it tightens as data grows. Comparing two variants' posteriors (e.g. by sampling) gives "probability B beats A".

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Prior Beta(2, 8). You observe 3 successes in 10 trials. What is the posterior?",
  "options": ["Beta(5, 15)", "Beta(3, 7)", "Beta(5, 18)", "Beta(2, 8)"],
  "answer": 0,
  "explanation": "Add successes to α and failures to β: Beta(2 + 3, 8 + 7) = Beta(5, 15)."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `beta_update(alpha, beta, successes, trials)` returning the posterior `(alpha, beta)`, and `prob_b_beats_a(a_conv, a_n, b_conv, b_n, draws, seed)` that estimates P(p_B > p_A) by sampling both Beta(1+conv, 1+n−conv) posteriors with `random.Random(seed).betavariate`.",
  "starterCode": "import random\n\ndef beta_update(alpha, beta, successes, trials):\n    pass\n\ndef prob_b_beats_a(a_conv, a_n, b_conv, b_n, draws, seed):\n    pass\n\nprint(beta_update(1, 1, 40, 200), prob_b_beats_a(40, 200, 55, 200, 20000, 0))",
  "tests": "assert beta_update(1, 1, 40, 200) == (41, 161)\nassert beta_update(2, 8, 3, 10) == (5, 15)\np = prob_b_beats_a(40, 200, 55, 200, 20000, 0)\nassert 0.92 < p < 0.98, p\nq = prob_b_beats_a(50, 200, 50, 200, 20000, 1)\nassert 0.45 < q < 0.55, q",
  "solution": "import random\n\ndef beta_update(alpha, beta, successes, trials):\n    return (alpha + successes, beta + trials - successes)\n\ndef prob_b_beats_a(a_conv, a_n, b_conv, b_n, draws, seed):\n    rng = random.Random(seed)\n    wins = 0\n    for _ in range(draws):\n        pa = rng.betavariate(1 + a_conv, 1 + a_n - a_conv)\n        pb = rng.betavariate(1 + b_conv, 1 + b_n - b_conv)\n        wins += pb > pa\n    return wins / draws",
  "hints": ["Posterior: alpha + successes, beta + failures.", "Draw pa and pb from their posteriors many times; count how often pb > pa."]
}
```

> [!TIP] Interview tips
> - Describe Beta as "a distribution over a probability" and give the pseudo-count intuition.
> - Mention Thompson sampling (sample from each arm's Beta posterior, play the max) for bandits.
> - Contrast "probability B beats A" (Bayesian) with a p-value; stakeholders often find the former easier to read.
