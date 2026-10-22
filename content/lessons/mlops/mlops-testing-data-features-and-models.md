---
id: mlops-testing-data-features-and-models
title: Testing data, features, and models
estimatedMinutes: 12
difficulty: medium
tags: [mlops, testing, ci-cd, data-validation, behavioral-testing]
---

## Why it matters
ML systems fail silently: the code runs, but the numbers are wrong. Interviewers want to hear a testing strategy that goes beyond unit tests: data checks, feature tests, and behavioural model tests wired into CI.

## Concept
Test three layers, in CI and in the pipeline:

**1. Data tests** (run on every new batch or snapshot):
- **Schema**: columns, types, nullability, allowed categories; enforce with Great Expectations, Pandera, TFDV or dbt tests.
- **Statistics**: row count, null rate, ranges, uniqueness of keys, freshness; **distribution checks** versus a reference (PSI, KS).
- **Integrity**: referential integrity, label sanity (class balance within bounds), no train/test leakage or duplicate entities across splits.
- Fail fast: a failed check blocks training or publishing.

**2. Feature and code tests**:
- **Unit tests** for transformations with small hand-made inputs, including edge cases (nulls, empty strings, zero, timezone boundaries).
- **Training-serving parity**: the same raw row must produce identical features offline and online.
- **Point-in-time correctness**: features use only information available at prediction time.
- Pipeline **integration test** on a tiny dataset: runs end to end in minutes, produces a model with the expected signature.

**3. Model tests**:
- **Performance gates**: metric at or above a fixed threshold and not worse than the champion (with tolerance); check key **slices**, calibration, latency and size.
- **Behavioural tests** (CheckList style): **invariance** (changing a name or irrelevant field must not change the output), **directional expectations** (more income should not lower approval score), and **minimum functionality** cases (known easy examples must be right).
- **Sanity checks**: model overfits a tiny batch, outputs are in range and finite, a model trained on shuffled labels scores near chance, and random seeds give similar results.
- **Regression tests**: a frozen set of past failures must stay fixed.

**CI/CD**: fast data and unit tests on every commit; heavier training and evaluation on merge or schedule; promote through the registry only when gates pass; add monitoring in production because tests cannot cover live drift.

**Pitfall**: a single aggregate metric hides regressions, and tests on a stale, unrepresentative golden dataset give false confidence.

## Worked example
A credit model's CI runs on a 5,000-row fixture:

- Data: `age` must be in [18, 100] and non-null; the fixture has a row with age 140 and one null, so 2 violations and the pipeline stops before training.
- Model gate: champion AUC 0.80, candidate 0.803; with tolerance 0.005 the candidate must be at least 0.795 and, to be promoted, gain at least 0.002. Passes.
- Invariance: change `first_name` on 1,000 rows; a prediction moves by more than 0.001 on 12 of them (1.2%), exceeding the 0.5% budget, so it fails. The cause is that a hashed name feature leaked into the model.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which is a behavioural invariance test?",
  "options": ["Check the model's AUC exceeds 0.8", "Change an applicant's first name and assert the score barely changes", "Check that the table has 5,000 rows", "Check that training finishes in 10 minutes"],
  "answer": 1,
  "explanation": "Invariance tests perturb something that should not matter and assert the output is stable."
}
```

```quiz
{
  "id": "q2",
  "question": "Why test training-serving parity of features?",
  "options": ["It makes training faster", "Different offline and online implementations cause silent skew and degrade the model in production", "It increases the AUC", "It is required by Python"],
  "answer": 1,
  "explanation": "Two code paths for the same feature drift apart; parity tests catch it before it hurts."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write tests as code. `check_data(rows, schema)`: `rows` is a list of dicts; `schema` maps column to `{'min': x, 'max': y, 'nullable': bool}`. Return a list of `(row_index, column, reason)` in row order then schema order, with reason `'null'` for a None or missing value in a non-nullable column (nullable columns skip null values), or `'range'` for a value outside [min, max]. `invariance_failures(predict, rows, perturb, tol)` returns the indices where `abs(predict(row) - predict(perturb(row))) > tol`. `directional_ok(predict, row, col, delta, sign)` is True if `sign * (predict(row with col += delta) - predict(row)) >= 0`, without mutating `row`.",
  "starterCode": "def check_data(rows, schema):\n    pass\n\ndef invariance_failures(predict, rows, perturb, tol):\n    pass\n\ndef directional_ok(predict, row, col, delta, sign):\n    pass\n",
  "tests": "schema = {'age': {'min': 18, 'max': 100, 'nullable': False}, 'income': {'min': 0, 'max': 1e7, 'nullable': True}}\nrows = [{'age': 30, 'income': 5e4}, {'age': 140, 'income': None}, {'age': None, 'income': -5}, {'income': 10}]\nassert check_data(rows, schema) == [(1, 'age', 'range'), (2, 'age', 'null'), (2, 'income', 'range'), (3, 'age', 'null')]\nassert check_data([], schema) == []\ndef predict(r):\n    return 0.1 * r['income'] / 1000 + (0.5 if r.get('name') == 'Zed' else 0.0)\nrs = [{'income': 1000, 'name': 'Amy'}, {'income': 2000, 'name': 'Zed'}, {'income': 3000, 'name': 'Bob'}]\ndef perturb(r):\n    r2 = dict(r)\n    r2['name'] = 'Zed'\n    return r2\nassert invariance_failures(predict, rs, perturb, 0.001) == [0, 2]\nassert invariance_failures(predict, rs, lambda r: dict(r), 0.001) == []\nrow = {'income': 1000, 'name': 'Amy'}\nassert directional_ok(predict, row, 'income', 500, 1) is True\nassert directional_ok(predict, row, 'income', 500, -1) is False\nassert row == {'income': 1000, 'name': 'Amy'}",
  "solution": "def check_data(rows, schema):\n    out = []\n    for i, row in enumerate(rows):\n        for col, rule in schema.items():\n            v = row.get(col)\n            if v is None:\n                if not rule['nullable']:\n                    out.append((i, col, 'null'))\n            elif v < rule['min'] or v > rule['max']:\n                out.append((i, col, 'range'))\n    return out\n\ndef invariance_failures(predict, rows, perturb, tol):\n    return [i for i, r in enumerate(rows) if abs(predict(r) - predict(perturb(r))) > tol]\n\ndef directional_ok(predict, row, col, delta, sign):\n    changed = dict(row)\n    changed[col] = changed[col] + delta\n    return sign * (predict(changed) - predict(row)) >= 0",
  "hints": ["Check for None / missing first, then the range; do not range-check null values.", "Copy the row with dict(row) before modifying it in directional_ok."]
}
```

> [!TIP] Interview tips
> - Structure the answer as data tests, feature/code tests, model tests (gates, slices, behavioural), then CI placement and production monitoring.
> - Name tools: Great Expectations/Pandera/dbt tests for data, pytest for code, CheckList-style invariance and directional tests for models.
> - Pitfall: relying on one global metric or a stale golden set; also test slices and keep a regression set of past incidents.
