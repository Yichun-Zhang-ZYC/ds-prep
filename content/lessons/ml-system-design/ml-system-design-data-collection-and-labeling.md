---
id: ml-system-design-data-collection-and-labeling
title: Data collection & labeling
estimatedMinutes: 12
difficulty: medium
tags: [ml-system-design, framework, data, labeling]
---

## Why it matters
In production ML, data usually matters more than the model. Interviewers probe where labels come from, how they are biased or delayed, and how you avoid leakage. A strong answer names the label source, its failure modes and the split strategy.

## Concept
**Where data comes from**: product logs (impressions, clicks, purchases), transactional databases, third-party data, human annotation, weak supervision (rules, heuristics, existing models), synthetic data and LLM-generated labels.

**Label types**
- **Explicit** (ratings, human tags): clean but scarce and costly.
- **Implicit** (clicks, dwell, purchases, chargebacks): abundant but noisy and biased.
- **Delayed**: fraud chargebacks arrive weeks later, churn needs an observation window. Only train on rows whose label window has **matured**; recent rows look falsely negative.

**Common problems**
- **Selection / exposure bias**: you only observe feedback on what the current system showed. Mitigate with exploration (random slots), inverse-propensity weighting, or logging propensities.
- **Feedback loops**: model outputs shape future training data.
- **Class imbalance**: negative downsampling (keep rate $\beta$; fix probabilities afterwards), class weights, hard-negative mining. Positives are never dropped.
- **Negative sampling** for retrieval: random, in-batch or hard negatives; "not clicked" is not "disliked".
- **Leakage**: random splits put the same user or a future event in train and test. Split by **time** (and by user/group when entities repeat).

**Labeling quality**: write guidelines, use multiple annotators, measure agreement with Cohen's kappa $\kappa = \frac{p_o - p_e}{1 - p_e}$ ($p_o$ observed agreement, $p_e$ chance agreement), keep a gold set, and use **active learning** to label the most uncertain items first.

Also plan logging early: log features at serving time, model version and propensity so tomorrow's training set exists.

## Worked example
Two annotators label 100 support tickets as urgent/not. Both say urgent on 40, both not urgent on 40; A urgent / B not on 10; A not / B urgent on 10.
- Observed agreement $p_o = 80/100 = 0.8$.
- Each annotator says "urgent" 50% of the time, so chance agreement $p_e = 0.5 \cdot 0.5 + 0.5 \cdot 0.5 = 0.5$.
- $\kappa = (0.8 - 0.5)/(1 - 0.5) = 0.6$: moderate agreement; tighten the guidelines before labeling more.

Delayed labels: fraud chargebacks take up to 60 days. Training on March data on April 10 would label most of March fraud as negative. Use a cutoff of `now - 60 days`.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Labels for a loan default model arrive 12 months after origination. What is the right way to build the training set?",
  "options": ["Use all loans and treat unobserved defaults as negatives", "Use only loans old enough that the 12-month outcome is known, and split by origination date", "Randomly split all loans", "Use only defaulted loans"],
  "answer": 1,
  "explanation": "Immature rows are falsely negative; a time-based split on matured loans mirrors production."
}
```

```quiz
{
  "id": "q2",
  "question": "A recommender is trained only on items users clicked from the current model's feed. What is the main risk?",
  "options": ["Too few features", "Exposure bias and a feedback loop: unseen items never get feedback", "Overfitting to noise in labels only", "Label delay"],
  "answer": 1,
  "explanation": "The model learns from its own past choices; use exploration or propensity weighting."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `cohens_kappa(a, b)` for two equal-length label lists (return 1.0 if chance agreement is 1). Write `mature_indices(timestamps, now, window)` returning indices of rows whose label window has closed (`t + window <= now`). Write `true_base_rate(pos, neg_kept, beta)`: after keeping only a fraction `beta` of negatives, the original positive rate is `pos / (pos + neg_kept / beta)`.",
  "starterCode": "def cohens_kappa(a, b):\n    pass\n\ndef mature_indices(timestamps, now, window):\n    pass\n\ndef true_base_rate(pos, neg_kept, beta):\n    pass\n",
  "tests": "a = [1] * 40 + [0] * 40 + [1] * 10 + [0] * 10\nb = [1] * 40 + [0] * 40 + [0] * 10 + [1] * 10\nassert abs(cohens_kappa(a, b) - 0.6) < 1e-12\nassert abs(cohens_kappa([1, 0, 1, 0], [1, 0, 1, 0]) - 1.0) < 1e-12\nassert cohens_kappa([1, 1], [1, 1]) == 1.0\nassert mature_indices([10, 50, 90, 100], 100, 30) == [0, 1]\nassert mature_indices([], 100, 30) == []\nassert abs(true_base_rate(100, 100, 0.01) - 100 / 10100) < 1e-12\nassert abs(true_base_rate(10, 90, 1.0) - 0.1) < 1e-12",
  "solution": "def cohens_kappa(a, b):\n    n = len(a)\n    po = sum(x == y for x, y in zip(a, b)) / n\n    pe = 0.0\n    for c in set(a) | set(b):\n        pe += (a.count(c) / n) * (b.count(c) / n)\n    if pe == 1:\n        return 1.0\n    return (po - pe) / (1 - pe)\n\ndef mature_indices(timestamps, now, window):\n    return [i for i, t in enumerate(timestamps) if t + window <= now]\n\ndef true_base_rate(pos, neg_kept, beta):\n    return pos / (pos + neg_kept / beta)",
  "hints": ["Chance agreement sums, over each label value, (share in a) × (share in b).", "Kept negatives represent neg_kept / beta original negatives."]
}
```

> [!TIP] Interview tips
> - For every label say: source, delay, bias, cost, and how you would validate quality.
> - Split by time (and by user when entities repeat) to avoid leakage; train only on matured labels.
> - Mention exposure bias and exploration/propensity logging for any recommender or ranking system.
