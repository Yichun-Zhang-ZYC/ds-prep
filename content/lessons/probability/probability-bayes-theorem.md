---
id: probability-bayes-theorem
title: Bayes' theorem
estimatedMinutes: 15
difficulty: medium
tags: [bayes, conditional-probability, base-rates]
---

## Why it matters
The "rare disease, accurate test" question is asked at nearly every DS interview. It tests whether you account for base rates instead of trusting the test's accuracy.

## Concept
Bayes' theorem flips a conditional probability:

$$
P(A \mid B) = \frac{P(B \mid A)\,P(A)}{P(B)}
$$

The denominator usually comes from the law of total probability:

$$
P(B) = P(B \mid A)\,P(A) + P(B \mid \neg A)\,P(\neg A)
$$

- $P(A)$ is the **prior** (base rate before seeing evidence).
- $P(B \mid A)$ is the **likelihood** of the evidence if $A$ is true.
- $P(A \mid B)$ is the **posterior**.

## Worked example
A disease affects 1% of people. A test catches 95% of sick people (sensitivity) and wrongly flags 5% of healthy people (false positive rate). You test positive. How likely is it that you're sick?

$$
P(\text{sick} \mid +) = \frac{0.95 \times 0.01}{0.95 \times 0.01 + 0.05 \times 0.99} = \frac{0.0095}{0.059} \approx 16\%
$$

A quick way to explain it: out of 10,000 people, 100 are sick and 95 of them test positive. Of the 9,900 healthy people, 495 also test positive. Only 95 of the 590 positives are actually sick.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Same test (95% sensitivity, 5% false positive rate), but now the disease affects 10% of people. The posterior after a positive test is…",
  "options": ["About 16%, the same as before", "About 68%", "95%", "About 50%"],
  "answer": 1,
  "explanation": "0.95 × 0.10 / (0.95 × 0.10 + 0.05 × 0.90) = 0.095 / 0.14 ≈ 68%. A higher base rate makes a positive result far more convincing."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `posterior(prior, sensitivity, false_positive_rate)` that returns $P(\\text{sick} \\mid +)$.",
  "starterCode": "def posterior(prior, sensitivity, false_positive_rate):\n    # P(sick | positive)\n    pass\n\nprint(posterior(0.01, 0.95, 0.05))",
  "tests": "assert abs(posterior(0.01, 0.95, 0.05) - 0.0095 / 0.059) < 1e-9\nassert abs(posterior(0.10, 0.95, 0.05) - 0.095 / 0.14) < 1e-9\nassert posterior(0.0, 0.9, 0.1) == 0.0",
  "solution": "def posterior(prior, sensitivity, false_positive_rate):\n    true_pos = sensitivity * prior\n    false_pos = false_positive_rate * (1 - prior)\n    return true_pos / (true_pos + false_pos)",
  "hints": ["The numerator is P(+ | sick) × P(sick).", "The denominator adds the false positives: P(+ | healthy) × P(healthy)."]
}
```

```reveal
{
  "prompt": "How would you explain to a product manager why a 95%-accurate fraud model flags mostly legitimate transactions?",
  "answer": "Fraud is rare, say 1 in 1,000 transactions. Even a small false-positive rate applied to the 999 legitimate ones produces more flags than the single fraudulent one.\n\nFrame it with counts, not percentages: \"Out of 100,000 transactions, about 100 are fraud and we catch 95. But we also flag 5% of the 99,900 good ones, which is about 5,000. So only around 2% of flags are real fraud.\" Then talk about raising the threshold or adding a second-stage review."
}
```

> [!TIP] Interview tips
> - Convert to natural frequencies (\"out of 10,000 people…\"). It's easier to compute out loud and easier for the interviewer to follow.
> - State the base rate explicitly. Ignoring it is the exact mistake the question is designed to catch.
> - Follow-up: \"What if you test positive twice?\" Use the first posterior as the new prior (assuming independent tests).
