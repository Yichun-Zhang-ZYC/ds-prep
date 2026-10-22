---
id: ml-practice-leakage-case-studies
title: "Practice: Data leakage case studies"
estimatedMinutes: 13
difficulty: medium
tags: [ml, practice, leakage, evaluation]
---

## Why it matters
Leakage questions are always case-based: "AUC is 0.99, what happened?" or "audit this feature list". The definitions are in Data leakage; here you practice spotting leaks in concrete setups and proving them with a quick test. Interviewers reward candidates who name the **prediction moment** and check every feature against it.

## Concept
A repeatable audit:

1. **Fix the prediction moment** $t_0$ and the label window $(t_0, t_0 + H]$. Every feature must be computable from data with timestamp $\le t_0$ (use the time the data was *available*, not the time it describes).
2. **Read the feature list for suspicious names**: anything with `_after`, `final`, `status`, `resolved`, `refund`, `cancel_reason`, counts or sums over the whole table.
3. **Run quick statistical probes**: single-feature AUC close to 1 (or 0), one feature with dominating importance, a model that is perfect with a tiny tree, shuffled-label sanity checks, identical rows in train and test.
4. **Audit the split**: group by entity (user, patient, device, image source); split by time when the future is predicted; check preprocessing was fit on training folds only (scaling, imputation, target encoding, feature selection, SMOTE, PCA).
5. **Compare with production**: a large offline-online gap is the final symptom.

Common case patterns:
- **Label proxy**: `chargeback_flag` in a fraud model; `loan_status_final` in a default model.
- **Future aggregates**: "lifetime orders" snapshot taken after the event; fix with as-of (point-in-time) joins using a strict `ts < t_0`.
- **Entity leakage**: several rows or images per patient on both sides; fix with group splits.
- **Pipeline leakage**: fitting a scaler, target encoder or feature selector on all data before cross-validation; fix by putting them inside the CV pipeline.
- **Collection artifacts**: scanner ID, hospital ID, file name or row order correlating with the label.

## Worked example
Task: predict loan default at application time. A candidate feature list gives these single-feature AUCs (illustrative):

| Feature | AUC | Verdict |
|---|---|---|
| `income` | 0.62 | fine |
| `debt_to_income` | 0.68 | fine |
| `credit_score` | 0.74 | fine, known at application |
| `num_collection_calls` | 0.97 | leak: calls only happen after missed payments |
| `account_status_30d_later` | 0.99 | leak: encodes the outcome |
| `region_avg_default_rate` | 0.70 | suspicious: if computed over all loans including the test period, it leaks the label via target encoding |

Fix: drop the first two leaks; recompute the regional rate using only loans originated and resolved before $t_0$ (point-in-time), with out-of-fold computation inside training. Validation AUC falls from 0.99 to 0.78. That lower number is the true performance and matches the first month in production (0.77).

Note that a leak is a property of the **timeline**, not of the column name: `num_collection_calls` is legitimate if you predict *next-month* default at the end of this month.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You run 5-fold CV on a dataset after selecting the top 20 of 5,000 features using correlation with the label on the full dataset. Why is the CV score optimistic?",
  "options": [
    "Correlation is not a valid feature-selection method",
    "Feature selection saw the validation folds' labels, so selection leaks the target",
    "Five folds are too few",
    "Top-20 selection always underfits"
  ],
  "answer": 1,
  "explanation": "Selection used labels from rows that later act as validation. With thousands of noisy features some correlate by chance, and CV rewards them. Do selection inside each training fold."
}
```

```quiz
{
  "id": "q2",
  "question": "A skin-lesion classifier gets 0.98 AUC in a random image-level split but 0.80 on a new hospital. Images come from 1,200 patients with about 10 images each. Most likely cause?",
  "options": [
    "Class imbalance",
    "Images of the same patient (and scanner) appear in both train and test",
    "The learning rate was too high",
    "Too few epochs"
  ],
  "answer": 1,
  "explanation": "Same-patient images are near-duplicates and share scanner artifacts. A patient-level (group) split, ideally also by site, gives an honest estimate."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `auc(y, scores)` using the rank definition (probability a random positive scores above a random negative; ties count 0.5), and `flag_leaky(features, y, thr=0.95)` where `features` maps names to score lists. Flag a feature when `max(auc, 1 - auc) >= thr`. Return the sorted list of flagged names.",
  "starterCode": "def auc(y, scores):\n    pass\n\ndef flag_leaky(features, y, thr=0.95):\n    pass\n\ny = [0, 0, 0, 1, 1, 1]\nprint(auc([0, 0, 1, 1], [0.1, 0.4, 0.35, 0.8]), flag_leaky({'a': [1, 2, 3, 4, 5, 6], 'b': [3, 1, 4, 1, 5, 2]}, y))",
  "tests": "assert abs(auc([0, 0, 1, 1], [0.1, 0.4, 0.35, 0.8]) - 0.75) < 1e-12\nassert abs(auc([0, 1], [0.5, 0.5]) - 0.5) < 1e-12\ny = [0, 0, 0, 1, 1, 1]\nf = {'a': [1, 2, 3, 4, 5, 6], 'b': [3, 1, 4, 1, 5, 2], 'c': [6, 5, 4, 3, 2, 1]}\nassert abs(auc(y, f['b']) - 0.5) < 1e-12\nassert flag_leaky(f, y) == ['a', 'c']\nassert flag_leaky(f, y, thr=1.01) == []",
  "solution": "def auc(y, scores):\n    pos = [s for yi, s in zip(y, scores) if yi == 1]\n    neg = [s for yi, s in zip(y, scores) if yi == 0]\n    total = 0.0\n    for p in pos:\n        for n in neg:\n            total += 1.0 if p > n else 0.5 if p == n else 0.0\n    return total / (len(pos) * len(neg))\n\ndef flag_leaky(features, y, thr=0.95):\n    out = []\n    for name, col in features.items():\n        a = auc(y, col)\n        if max(a, 1 - a) >= thr:\n            out.append(name)\n    return sorted(out)",
  "hints": [
    "Compare every positive with every negative: 1 if higher, 0.5 if tied, else 0.",
    "A feature that is perfectly anti-correlated (AUC 0) is just as leaky, hence `max(a, 1 - a)`."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `group_overlap(train_groups, test_groups)` returning `(shared, frac)`: `shared` is the sorted list of group ids that appear in both lists, and `frac` is the fraction of *test rows* whose group also appears in train (0.0 for an empty test list).",
  "starterCode": "def group_overlap(train_groups, test_groups):\n    pass\n\nprint(group_overlap(['p1', 'p1', 'p2'], ['p2', 'p3']))",
  "tests": "s, f = group_overlap(['p1', 'p1', 'p2'], ['p2', 'p3'])\nassert s == ['p2'] and abs(f - 0.5) < 1e-12\ns, f = group_overlap(['a', 'b'], ['c', 'd', 'e'])\nassert s == [] and f == 0.0\ns, f = group_overlap(['a', 'b'], ['a', 'a', 'b', 'c'])\nassert s == ['a', 'b'] and abs(f - 0.75) < 1e-12\nassert group_overlap(['a'], []) == ([], 0.0)",
  "solution": "def group_overlap(train_groups, test_groups):\n    tr = set(train_groups)\n    shared = sorted(tr & set(test_groups))\n    if not test_groups:\n        return [], 0.0\n    frac = sum(1 for g in test_groups if g in tr) / len(test_groups)\n    return shared, frac",
  "hints": [
    "Use sets for membership tests.",
    "The fraction is over test rows (with repeats), not over distinct groups."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Write `as_of_values(events, query_times)`. `events` is a list of `(timestamp, value)` sorted by timestamp. For each query time `t` return the value of the latest event with `timestamp < t` (strictly before, since an event at exactly `t` may not be available yet), or `None` if there is none.",
  "starterCode": "def as_of_values(events, query_times):\n    pass\n\nprint(as_of_values([(1, 'a'), (5, 'b')], [0, 1, 3, 6]))",
  "tests": "ev = [(1, 'a'), (5, 'b'), (9, 'c')]\nassert as_of_values(ev, [0, 1, 3, 5, 6, 100]) == [None, None, 'a', 'a', 'b', 'c']\nassert as_of_values([], [1, 2]) == [None, None]\nassert as_of_values(ev, []) == []",
  "solution": "import bisect\n\ndef as_of_values(events, query_times):\n    ts = [t for t, _ in events]\n    out = []\n    for q in query_times:\n        i = bisect.bisect_left(ts, q)\n        out.append(events[i - 1][1] if i > 0 else None)\n    return out",
  "hints": [
    "`bisect.bisect_left(ts, q)` returns the number of timestamps strictly less than q.",
    "If that count is 0 there is no earlier event; otherwise take index count - 1."
  ]
}
```

> [!TIP] Interview tips
> - Start by stating the prediction moment; then walk the feature list asking "would I know this then?".
> - Quote cheap probes: single-feature AUC, importance dominance, shuffled-label test, group-overlap check.
> - Name the fixes: as-of joins, group or time splits, and pipelines that fit all preprocessing inside the training fold.
