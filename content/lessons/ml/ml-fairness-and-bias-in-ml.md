---
id: ml-fairness-and-bias-in-ml
title: Fairness & bias in ML
estimatedMinutes: 12
difficulty: medium
tags: [ml, practical, fairness, responsible-ai]
---

## Why it matters
Models used for hiring, lending, healthcare, ads and content moderation can harm groups of people and create legal risk. Interviewers increasingly ask how you'd detect and mitigate bias, and they look for an understanding of the tradeoffs rather than a single magic metric.

## Concept
Where bias comes from:
- **Historical bias**: labels reflect past discrimination (past hiring decisions).
- **Representation / sampling bias**: some groups are under-represented, so error is higher for them.
- **Measurement bias**: proxies measured differently across groups (arrests as a proxy for crime).
- **Proxy features**: removing the protected attribute isn't enough; zip code or name can encode it.
- **Feedback loops**: model decisions shape future training data.

Common group fairness criteria (for protected attribute A):
- **Demographic parity**: $P(\hat Y = 1 \mid A = a)$ equal across groups.
- **Equal opportunity**: equal **TPR** across groups. **Equalized odds**: equal TPR and FPR.
- **Predictive parity / calibration within groups**: equal precision, or $P(Y = 1 \mid \hat p = p, A)$ = $p$ for every group.

These generally **can't all hold at once** when base rates differ (impossibility results: Kleinberg et al., Chouldechova). Choosing one is a value judgment made with stakeholders, legal and domain experts.

Mitigation:
- **Pre-processing**: better data collection, reweighting, removing proxies.
- **In-processing**: fairness constraints or penalties during training.
- **Post-processing**: group-specific thresholds to equalize a chosen metric (legally sensitive in some domains).
- Ongoing: **slice-based evaluation** by group, model cards, monitoring after launch.

A related **disparate impact** check is the four-fifths rule: the selection rate for any group should be at least 80% of the highest group's rate.

## Worked example
Loan approvals: group X approves 60% of applicants, group Y 42%. Ratio = 0.42/0.60 = 0.70 < 0.8 → potential disparate impact. Next, check TPR: among applicants who would repay, X approval is 85%, Y 68%, so qualified Y applicants are rejected more often. Investigate features and labels before choosing a mitigation.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You remove 'gender' from the features. Why might the model still be biased?",
  "options": ["It can't be biased without that column", "Other features (proxies) can encode gender, and labels may reflect historical bias", "Removing columns always increases bias", "Because of feature scaling"],
  "answer": 1,
  "explanation": "'Fairness through unawareness' fails when proxies exist or labels are biased."
}
```

```quiz
{
  "id": "q2",
  "question": "Equal opportunity requires equality of which metric across groups?",
  "options": ["Selection rate", "True positive rate", "Accuracy", "Precision"],
  "answer": 1,
  "explanation": "Equal opportunity: qualified people in every group have the same chance of a positive decision."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Rows are `(group, y_true, y_pred)`. Write `group_rates(rows)` returning a dict group → {'selection': P(pred=1), 'tpr': P(pred=1 | true=1)}. Then `disparate_impact_ratio(rows)` = min selection rate / max selection rate, and `equal_opportunity_gap(rows)` = max TPR − min TPR.",
  "starterCode": "def group_rates(rows):\n    pass\n\ndef disparate_impact_ratio(rows):\n    pass\n\ndef equal_opportunity_gap(rows):\n    pass\n\nrows = [('X', 1, 1), ('X', 1, 1), ('X', 0, 1), ('X', 0, 0), ('Y', 1, 1), ('Y', 1, 0), ('Y', 0, 0), ('Y', 0, 0)]\nprint(group_rates(rows), disparate_impact_ratio(rows), equal_opportunity_gap(rows))",
  "tests": "rows = [('X', 1, 1), ('X', 1, 1), ('X', 0, 1), ('X', 0, 0), ('Y', 1, 1), ('Y', 1, 0), ('Y', 0, 0), ('Y', 0, 0)]\nr = group_rates(rows)\nassert r['X'] == {'selection': 0.75, 'tpr': 1.0}\nassert r['Y'] == {'selection': 0.25, 'tpr': 0.5}\nassert abs(disparate_impact_ratio(rows) - 1 / 3) < 1e-12\nassert abs(equal_opportunity_gap(rows) - 0.5) < 1e-12",
  "solution": "def group_rates(rows):\n    out = {}\n    for g in sorted({r[0] for r in rows}):\n        gr = [r for r in rows if r[0] == g]\n        pos = [r for r in gr if r[1] == 1]\n        out[g] = {\n            'selection': sum(r[2] for r in gr) / len(gr),\n            'tpr': sum(r[2] for r in pos) / len(pos),\n        }\n    return out\n\ndef disparate_impact_ratio(rows):\n    s = [v['selection'] for v in group_rates(rows).values()]\n    return min(s) / max(s)\n\ndef equal_opportunity_gap(rows):\n    t = [v['tpr'] for v in group_rates(rows).values()]\n    return max(t) - min(t)",
  "hints": ["Selection rate uses all rows in the group; TPR uses only rows with y_true = 1.", "Compute per-group rates once and reuse them."]
}
```

> [!TIP] Interview tips
> - Name sources of bias (historical, representation, measurement, proxies, feedback loops) before metrics.
> - Know demographic parity vs equal opportunity vs calibration, and that they conflict when base rates differ.
> - Propose slice-based evaluation, stakeholder alignment on the fairness definition, and post-launch monitoring.
