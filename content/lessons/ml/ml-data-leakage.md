---
id: ml-data-leakage
title: Data leakage
estimatedMinutes: 12
difficulty: medium
tags: [ml, fundamentals, leakage, evaluation]
---

## Why it matters
Leakage is the most common reason a model looks great offline and fails in production. Interviewers love "your model has 0.99 AUC, what do you suspect?" questions.

## Concept
**Data leakage** = the model uses information during training (or evaluation) that won't be available at prediction time. Main types:

- **Target leakage**: a feature is a consequence or proxy of the label. Example: `account_closed_date` in a churn model, or `received_treatment` when predicting diagnosis.
- **Temporal leakage**: features computed with data from after the prediction moment (e.g. "total purchases this month" when predicting on day 10), or random splits on time-ordered data.
- **Train-test contamination**: preprocessing (scaling, imputation, target encoding, feature selection) fit on the full dataset; duplicates or the same entity in both train and test.
- **Leaky IDs or metadata**: row IDs, file paths, or timestamps that correlate with the label because of how data was collected.

How to catch it:
- Suspiciously high scores, or one feature dominating importance.
- For every feature, ask: "Would I know this value at the exact moment I make the prediction?"
- Build features with **point-in-time** (as-of) joins.
- Validate on a later time period and compare with production performance.

## Worked example
A hospital readmission model hits AUC 0.97. Feature importance shows `discharge_summary_length` on top. Summaries are written longer for complex cases *and* are often finalized days after discharge, after readmission is known. Removing features unavailable at discharge time drops AUC to 0.74, which is the honest number.

## Check your understanding

```quiz
{
  "id": "q1",
  "type": "multi",
  "question": "You're predicting whether a loan will default, scored at application time. Which features leak? Select all that apply.",
  "options": ["Applicant's income at application", "Number of late payments on this loan", "Credit score pulled at application", "Whether the loan was sent to collections"],
  "answer": [1, 3],
  "explanation": "Late payments and collections happen after the loan is issued; they're consequences of default risk, not available at application time."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Each feature has the timestamp when its value becomes known. Write `leaky_features(feature_times, prediction_time)` returning a sorted list of feature names whose known time is **after** `prediction_time`. Then write `point_in_time_value(history, t)`: `history` is a list of `(timestamp, value)` updates; return the latest value with timestamp ≤ t, or `None`.",
  "starterCode": "def leaky_features(feature_times, prediction_time):\n    pass\n\ndef point_in_time_value(history, t):\n    pass\n\nprint(leaky_features({'income': 1, 'late_payments': 30, 'collections': 90}, 5))\nprint(point_in_time_value([(1, 600), (10, 650), (20, 580)], 15))",
  "tests": "assert leaky_features({'income': 1, 'late_payments': 30, 'collections': 90}, 5) == ['collections', 'late_payments']\nassert leaky_features({'a': 5}, 5) == []\nh = [(1, 600), (10, 650), (20, 580)]\nassert point_in_time_value(h, 15) == 650\nassert point_in_time_value(h, 20) == 580\nassert point_in_time_value(h, 0) is None\nassert point_in_time_value([(10, 'b'), (1, 'a')], 5) == 'a'",
  "solution": "def leaky_features(feature_times, prediction_time):\n    return sorted(f for f, t in feature_times.items() if t > prediction_time)\n\ndef point_in_time_value(history, t):\n    best = None\n    for ts, v in sorted(history):\n        if ts <= t:\n            best = v\n        else:\n            break\n    return best",
  "hints": ["A feature known exactly at prediction time is fine.", "Sort the history before scanning; it may be unordered."]
}
```

> [!TIP] Interview tips
> - When a score looks too good, say "I'd check for leakage first" and explain how.
> - The key question per feature: "Is this known at prediction time?" Mention point-in-time joins and feature stores.
> - Name preprocessing-inside-CV and group/time splits as defenses against contamination.
