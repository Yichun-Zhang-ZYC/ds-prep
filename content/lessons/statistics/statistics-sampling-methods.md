---
id: statistics-sampling-methods
title: Sampling methods (simple random, stratified, cluster)
estimatedMinutes: 10
difficulty: easy
tags: [statistics, sampling, survey-design]
---

## Why it matters
"We can only label 1,000 records / survey 500 users. How do you pick them?" How you sample decides whether the estimate is unbiased and how precise it is. Stratification is a common follow-up in both survey and experiment design.

## Concept
| Method | How | Pros | Cons |
|---|---|---|---|
| Simple random | every unit equally likely | unbiased, simple | can miss small groups by chance |
| Stratified | split into groups (strata), sample within each | more precise; guarantees coverage of small groups | needs the stratum variable up front |
| Cluster | randomly pick whole groups (stores, schools), take everyone inside | cheap to collect | less precise when clusters are similar inside |
| Systematic | every k-th unit after a random start | easy | biased if the list has a periodic pattern |

Stratified sampling reduces variance when the outcome differs a lot **between** strata. With **disproportionate** stratification (oversampling a small group), reweight by each stratum's population share when estimating overall numbers.

## Worked example
You want the average satisfaction of 100,000 customers: 90% consumer, 10% enterprise. A simple random sample of 500 gives only ~50 enterprise customers, too few to say anything about them.

Stratify instead: sample 250 consumers and 250 enterprise customers. For the overall average, weight the two stratum means by 0.9 and 0.1:

$$
\bar y = 0.9\,\bar y_{\text{consumer}} + 0.1\,\bar y_{\text{enterprise}}
$$

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You sample 20 random stores and survey every customer in them. What is this, and what's its main drawback?",
  "options": ["Stratified sampling; it needs weights", "Cluster sampling; customers in the same store are similar, so the effective sample size is smaller", "Simple random sampling; none", "Systematic sampling; periodicity"],
  "answer": 1,
  "explanation": "Responses within a cluster are correlated, so 20 stores × 100 customers carries less information than 2,000 independent customers."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `stratified_mean(strata)` where `strata` is a list of `(population_share, sample_values)` tuples. Return the population-weighted estimate of the overall mean.",
  "starterCode": "def stratified_mean(strata):\n    pass\n\nprint(stratified_mean([(0.9, [7, 8, 6, 7]), (0.1, [4, 5, 3])]))",
  "tests": "assert abs(stratified_mean([(0.9, [7, 8, 6, 7]), (0.1, [4, 5, 3])]) - (0.9 * 7 + 0.1 * 4)) < 1e-12\nassert abs(stratified_mean([(0.5, [1, 3]), (0.5, [10])]) - 6.0) < 1e-12\nassert abs(stratified_mean([(1.0, [2, 4, 6])]) - 4) < 1e-12",
  "solution": "def stratified_mean(strata):\n    return sum(share * sum(vals) / len(vals) for share, vals in strata)",
  "hints": ["Compute each stratum's sample mean, then weight by the population share (not the sample size)."]
}
```

> [!TIP] Interview tips
> - Ask which subgroups matter; if a small group must be analyzed, stratify and oversample it.
> - Always reweight disproportionate samples back to population shares for overall estimates.
> - For cluster designs, mention the design effect: correlated units shrink the effective sample size.
