---
id: probability-discrete-vs-continuous
title: Discrete vs continuous random variables
estimatedMinutes: 8
difficulty: easy
tags: [probability, random-variables, basics]
---

## Why it matters
Choosing a model starts with the type of the outcome: counts (orders per day) are discrete, measurements (time on site) are continuous. Mixing them up leads to wrong distributions and wrong tests.

## Concept
A **random variable** maps each outcome to a number.

| | Discrete | Continuous |
|---|---|---|
| Values | countable (0, 1, 2, …) | any value in an interval |
| Described by | PMF: $P(X = x)$ | PDF $f(x)$: probabilities are areas |
| $P(X = x)$ for one value | can be > 0 | always 0 |
| Examples | clicks, defects, die rolls | latency, height, revenue per user (approx.) |

For a continuous variable, $P(a \le X \le b) = \int_a^b f(x)\,dx$, so $P(X \le b)$ and $P(X < b)$ are equal.

Some real data is **mixed**: revenue per user is exactly 0 for most users (a point mass) and continuous for buyers.

## Worked example
Time to load a page, $X$, is uniform between 1 and 3 seconds: $f(x) = 1/2$ on $[1, 3]$.

$$
P(X \le 1.5) = \int_1^{1.5} \tfrac{1}{2}\,dx = 0.25 \qquad P(X = 2) = 0
$$

The density value $1/2$ is not a probability; densities can even exceed 1 when the interval is short.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which variables are discrete? Select all that apply.",
  "type": "multi",
  "options": ["Number of support tickets per day", "Time between two tickets", "Number of heads in 10 flips", "A user's exact session length"],
  "answer": [0, 2],
  "explanation": "Counts are discrete. Durations are (modeled as) continuous."
}
```

```quiz
{
  "id": "q2",
  "question": "A density f(x) equals 4 on the interval [0, 0.25]. Is that valid?",
  "options": ["No, probabilities can't exceed 1", "Yes, the total area is 4 × 0.25 = 1", "Only for discrete variables", "Only if f is symmetric"],
  "answer": 1,
  "explanation": "A PDF must integrate to 1 and be non-negative. Individual density values can exceed 1."
}
```

## Practice

```reveal
{
  "prompt": "You want to model daily revenue per user for an e-commerce app. Is it discrete or continuous, and what's the catch?",
  "answer": "Neither, exactly: it's a **mixed** distribution. Most users spend nothing on a given day (a large point mass at 0), and buyers' spend is positive and right-skewed (roughly continuous, often modeled as log-normal).\n\nA common approach is a **two-part (hurdle) model**: P(spend > 0) with a Bernoulli / logistic model, and the spend amount given purchase with a skewed continuous distribution. This also matters for A/B tests on revenue, where the zero mass and heavy tail inflate variance."
}
```

> [!TIP] Interview tips
> - Name the type of the outcome before proposing a distribution or a test.
> - Say "probability is area under the density" if asked why P(X = x) = 0.
> - Point out zero-inflated, mixed outcomes (revenue, time spent); they're common and interviewers like the nuance.
