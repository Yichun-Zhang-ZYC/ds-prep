---
id: statistics-interpretation-pitfalls
title: Confidence interval interpretation pitfalls
estimatedMinutes: 10
difficulty: medium
tags: [statistics, confidence-intervals, communication]
---

## Why it matters
"What does a 95% confidence interval mean?" Most candidates say "there's a 95% chance the true value is in it", which is the classic wrong answer in frequentist statistics. Getting this right is a quick credibility win.

## Concept
**Correct**: if we repeated the experiment many times and built an interval the same way each time, about 95% of those intervals would contain the true value. The 95% describes the **procedure**, not one specific interval.

Common mistakes:
- "95% probability the true value is in [5.2%, 6.1%]." Once computed, the interval either contains it or not. (A Bayesian **credible** interval does support that statement.)
- "95% of the data falls in the interval." That's a prediction / reference range, not a CI for the mean.
- "Overlapping CIs mean no significant difference." Two 95% CIs can overlap a little while the difference is still significant; test the difference directly.
- "A wider CI means a bigger effect." Width measures uncertainty, not size.

## Worked example
Control: 5.0% [4.6%, 5.4%]. Treatment: 5.6% [5.2%, 6.1%]. The intervals overlap (5.2–5.4%), yet the difference is 0.6 points with CI roughly [0.0, 1.2] points, borderline significant.

The right summary: "Treatment is about 0.6 points higher; the 95% CI for the lift runs from about 0 to 1.2 points."

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which is a correct interpretation of a 95% confidence interval [10, 14]?",
  "options": ["There's a 95% probability the true mean is between 10 and 14", "95% of observations lie between 10 and 14", "The method that produced [10, 14] captures the true mean in 95% of repeated samples", "The true mean is 12 with 95% certainty"],
  "answer": 2,
  "explanation": "The confidence is in the procedure across repetitions, not in this particular interval."
}
```

```quiz
{
  "id": "q2",
  "question": "Two groups' 95% CIs for the mean overlap slightly. What can you conclude?",
  "options": ["The difference is not significant", "The difference is significant", "Nothing definitive; compute the CI or test for the difference itself", "The groups are identical"],
  "answer": 2,
  "explanation": "Overlap of individual CIs is a conservative and unreliable rule. Use the SE of the difference."
}
```

```reveal
{
  "prompt": "Explain a confidence interval to a product manager in one or two sentences.",
  "answer": "\"Our best estimate of the lift is +0.6 points. Given the noise in the data, the true lift is plausibly anywhere from about 0 to +1.2 points. If we ran this test many times, intervals built this way would capture the true value about 95% of the time.\"\n\nThen focus on the decision: is the low end of the range still worth shipping?"
}
```

> [!TIP] Interview tips
> - Use the phrase "the procedure captures the true value 95% of the time".
> - Contrast with Bayesian credible intervals if the interviewer pushes.
> - When comparing groups, always build the interval for the difference.
