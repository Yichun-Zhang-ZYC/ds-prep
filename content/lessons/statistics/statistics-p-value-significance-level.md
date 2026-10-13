---
id: statistics-p-value-significance-level
title: p-value, significance level
estimatedMinutes: 12
difficulty: easy
tags: [hypothesis-testing, p-value, communication]
---

## Why it matters
"What is a p-value?" sounds basic, but most candidates give a wrong definition. Getting it exactly right, and explaining it simply, is an easy way to stand out.

## Concept
Assume the null hypothesis $H_0$ is true (e.g. "the new button doesn't change conversion"). The **p-value** is the probability of seeing a result **at least as extreme** as the one observed, under that assumption.

$$
p = P(\text{data at least this extreme} \mid H_0)
$$

The **significance level** $\alpha$ (often 0.05) is a threshold you choose **before** the test. If $p < \alpha$, you reject $H_0$. $\alpha$ is also the Type I error rate: the chance of a false positive when $H_0$ is true.

What a p-value is **not**:

- not the probability that $H_0$ is true
- not the probability the result is due to chance
- not a measure of effect size

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "An A/B test gives p = 0.03. Which statement is correct?",
  "options": [
    "There is a 3% chance the null hypothesis is true.",
    "If there were truly no effect, results this extreme would happen about 3% of the time.",
    "There is a 97% chance the new version is better.",
    "The effect is large."
  ],
  "answer": 1,
  "explanation": "A p-value is computed assuming H0 is true. It says nothing directly about the probability of H0, of the alternative, or about effect size."
}
```

```quiz
{
  "id": "q2",
  "type": "multi",
  "question": "Which of these can make a tiny, unimportant effect statistically significant? Select all that apply.",
  "options": ["A very large sample size", "Choosing α = 0.10 instead of 0.05", "Low variance in the metric", "A two-sided test instead of one-sided"],
  "answer": [0, 1, 2],
  "explanation": "Larger samples and lower variance shrink the standard error, and a looser α lowers the bar. A two-sided test makes significance harder, not easier."
}
```

```reveal
{
  "prompt": "Explain a p-value to a non-technical stakeholder in two sentences.",
  "answer": "\"Imagine the change did nothing at all. The p-value tells us how surprising our result would be in that world: a small p-value means it would be very surprising, so we doubt the change did nothing.\"\n\nThen add the practical part: *statistical significance doesn't mean the effect is big enough to matter, so let's look at the size of the lift and its confidence interval.*"
}
```

> [!TIP] Interview tips
> - Lead with the conditional: \"*Assuming the null is true*, the p-value is…\". That phrase alone fixes most wrong answers.
> - Always pair significance with effect size and a confidence interval.
> - Follow-up: \"What if you check the p-value every day and stop when it's below 0.05?\" That's peeking, and it inflates the false-positive rate.
