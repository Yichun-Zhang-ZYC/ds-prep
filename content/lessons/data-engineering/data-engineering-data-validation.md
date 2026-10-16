---
id: data-engineering-data-validation
title: Data validation (Great Expectations)
estimatedMinutes: 12
difficulty: medium
tags: [data-engineering, data-quality, testing]
---

## Why it matters
Bad data that silently flows into dashboards and models is worse than a failed job. Interviewers ask what you check, where in the pipeline, and what happens when a check fails.

## Concept
Dimensions of data quality: **completeness** (nulls, missing partitions), **uniqueness** (duplicate keys), **validity** (types, ranges, allowed values, formats), **consistency** (referential integrity, totals reconcile with source), **timeliness/freshness** (data arrived on time), **accuracy** (matches reality, often checked against a trusted source).

Common checks:
- Schema: expected columns and types.
- `not_null`, `unique`, `accepted_values`, value ranges (`0 <= age <= 120`), regex formats.
- Row-count and volume anomalies vs history; distribution drift (mean, null rate).
- Referential integrity (every `customer_id` exists in `dim_customer`).
- Reconciliation: sum of revenue in the warehouse = source system total.
- Freshness: max(updated_at) within the SLA.

Tools: **Great Expectations** (declarative "expectations" suites, data docs), **dbt tests**, Soda, Deequ (Spark), Pandera (pandas), and data observability platforms (Monte Carlo, etc.) that learn baselines automatically.

Where and how to act:
- Validate at **ingestion** (raw), after **transformation**, and before **publishing**.
- Severity levels: **error** → stop the pipeline / don't publish (write-audit-publish pattern: write to staging, run checks, then swap); **warn** → alert but continue.
- **Quarantine** bad rows rather than silently dropping them; track the rate.
- Route alerts to owners; avoid alert fatigue by tuning thresholds.

## Worked example
Great Expectations-style suite for `orders`:
- `expect_column_values_to_not_be_null("order_id")`
- `expect_column_values_to_be_unique("order_id")`
- `expect_column_values_to_be_between("amount", 0, 100000)`
- `expect_column_values_to_be_in_set("status", ["placed", "paid", "shipped", "cancelled"])`
- `expect_table_row_count_to_be_between(0.8 × avg_7d, 1.2 × avg_7d)`

A deploy upstream started sending amounts in cents: the range check fails, the pipeline halts before the revenue dashboard updates, and the owner is paged.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What is the write-audit-publish pattern?",
  "options": ["Write directly to production and audit monthly", "Write output to a staging location, run validation checks, and only publish (swap) to production if they pass", "Publish first, then write logs", "Audit source systems only"],
  "answer": 1,
  "explanation": "Consumers never see data that failed validation."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write a mini expectation runner. `run_checks(rows, checks)` takes row dicts and a list of check dicts, each with `type` in {'not_null', 'unique', 'between', 'in_set'}, a `column`, a `severity` ('error' or 'warn') and parameters (`min`/`max` for between, `values` for in_set). Return a list of result dicts `{'type', 'column', 'severity', 'failed'}` where failed is the number of offending rows (for unique: rows whose value appeared before). Then write `should_publish(results)` returning False if any error-severity check failed.",
  "starterCode": "def run_checks(rows, checks):\n    pass\n\ndef should_publish(results):\n    pass\n",
  "tests": "rows = [{'id': 1, 'amount': 10, 'status': 'paid'}, {'id': 2, 'amount': -5, 'status': 'paid'}, {'id': 2, 'amount': 20, 'status': 'lost'}, {'id': None, 'amount': 7, 'status': 'placed'}]\nchecks = [\n    {'type': 'not_null', 'column': 'id', 'severity': 'error'},\n    {'type': 'unique', 'column': 'id', 'severity': 'error'},\n    {'type': 'between', 'column': 'amount', 'min': 0, 'max': 100, 'severity': 'warn'},\n    {'type': 'in_set', 'column': 'status', 'values': ['placed', 'paid', 'shipped'], 'severity': 'warn'},\n]\nres = run_checks(rows, checks)\nassert [r['failed'] for r in res] == [1, 1, 1, 1]\nassert should_publish(res) is False\nassert should_publish(run_checks(rows[:1], checks)) is True",
  "solution": "def run_checks(rows, checks):\n    results = []\n    for c in checks:\n        col, t = c['column'], c['type']\n        vals = [r.get(col) for r in rows]\n        if t == 'not_null':\n            failed = sum(v is None for v in vals)\n        elif t == 'unique':\n            seen, failed = set(), 0\n            for v in vals:\n                if v is None:\n                    continue\n                if v in seen:\n                    failed += 1\n                seen.add(v)\n        elif t == 'between':\n            failed = sum(v is not None and not (c['min'] <= v <= c['max']) for v in vals)\n        elif t == 'in_set':\n            failed = sum(v not in c['values'] for v in vals)\n        else:\n            raise ValueError(t)\n        results.append({'type': t, 'column': col, 'severity': c['severity'], 'failed': failed})\n    return results\n\ndef should_publish(results):\n    return not any(r['severity'] == 'error' and r['failed'] > 0 for r in results)",
  "hints": ["Handle each check type separately; ignore None in unique and between.", "Only error-severity failures block publishing."]
}
```

> [!TIP] Interview tips
> - List quality dimensions and concrete checks (nulls, uniqueness, ranges, referential integrity, volume, freshness, reconciliation).
> - Say where checks run (ingest, transform, pre-publish) and what happens on failure (block vs warn, quarantine).
> - Mention tools (Great Expectations, dbt tests, Soda, Deequ) and the write-audit-publish pattern.
