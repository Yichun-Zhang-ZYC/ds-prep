---
id: analytics-bi-data-gathering-and-cleaning
title: Data gathering & cleaning
estimatedMinutes: 12
difficulty: easy
tags: [analytics, workflow, data-cleaning, pandas]
---

## Why it matters
Analysts spend most of their time getting data into a trustworthy shape. Interviewers ask how you would handle duplicates, nulls, inconsistent labels and joins that silently change row counts, because these produce wrong numbers that look plausible.

## Concept
**Gather**: identify the source of truth (warehouse table, event log, spreadsheet), the **grain** (one row per order? per event?), the refresh time and the owner. Document filters you apply.

**Audit before cleaning**:
- Row count, distinct keys, min/max dates, null rate per column.
- **Uniqueness** of the supposed key; duplicates inflate sums and counts.
- **Referential integrity**: orphan foreign keys, rows lost by inner joins.
- **Reconcile** totals against a known figure (finance revenue, dashboard).

**Common cleaning tasks**:
- **Duplicates**: exact repeats vs the same key with different values (keep latest by `updated_at`).
- **Missing values**: drop, impute, or keep as its own category. Decide by mechanism: missing completely at random, at random, or *not* at random (e.g. income skipped by high earners). Never impute silently.
- **Types and formats**: numbers stored as text, mixed date formats, timezones, currencies, units.
- **Labels**: whitespace, case, spelling variants (`US`, `usa`, `United States`).
- **Outliers**: investigate first (bug or real?) before removing; record every exclusion.

**Join hygiene**: check cardinality (1:1, 1:many) before joining, and compare row counts before and after. A many-to-many join fans out rows and multiplies revenue.

Keep cleaning **reproducible** (a script or SQL view, not manual spreadsheet edits) and log how many rows each rule changed.

## Worked example
An orders extract has 5 rows: order 1 appears twice (`' US'` and `'us'`), order 2 has amount `'abc'`, orders 3 and 4 are fine but `'fr'` and `'FR'` differ in case.

| Step | Rule | Rows left |
|---|---|---|
| 0 | raw | 5 |
| 1 | normalize country (strip, lowercase) | 5 |
| 2 | drop duplicate `order_id` (keep first) | 4 |
| 3 | convert amount to number, drop unparseable | 3 |

The log "5 → 4 (1 duplicate) → 3 (1 bad amount)" is what you report. If the bad-amount rate were 20% in the real data, you would chase the upstream bug rather than just drop rows. Without normalizing case, `fr` and `FR` would be counted as two countries in a group-by.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You join orders (1 row per order) to payments (up to 3 rows per order) and sum order amount. What goes wrong?",
  "options": [
    "Nothing, joins preserve sums",
    "Orders with several payments are duplicated, so the order amount is overcounted",
    "Orders without payments are double counted",
    "The join drops all multi-payment orders"
  ],
  "answer": 1,
  "explanation": "A 1:many join repeats the order row once per payment, so summing an order-level column overcounts. Aggregate payments to the order grain first."
}
```

```quiz
{
  "id": "q2",
  "question": "30% of `income` is missing, mostly for high earners. What is the best approach?",
  "options": [
    "Drop all rows with missing income",
    "Fill with the mean income and move on",
    "Investigate the mechanism, treat it as not-at-random, and report results with an explicit missing category or a sensitivity analysis",
    "Fill with zero"
  ],
  "answer": 2,
  "explanation": "Missing-not-at-random data biases both dropping and mean imputation downward. State the assumption and show how conclusions change."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `clean_orders(df)`: strip and lowercase `country`; convert `amount` with `pd.to_numeric(errors='coerce')`; drop duplicate `order_id` rows (keep the first); drop rows whose amount is missing; return the result with a fresh 0..n-1 index. Then write `missing_report(df)` returning a dict mapping each column to its share of missing values.",
  "setup": "import pandas as pd\nimport numpy as np",
  "starterCode": "import pandas as pd\nimport numpy as np\n\ndef clean_orders(df):\n    pass\n\ndef missing_report(df):\n    pass\n",
  "tests": "raw = pd.DataFrame({'order_id': [1, 1, 2, 3, 4], 'country': [' US', 'us', 'Ca ', 'fr', 'FR'], 'amount': ['10', '10', 'abc', '5.5', '7']})\nout = clean_orders(raw)\nassert out['order_id'].tolist() == [1, 3, 4]\nassert out['country'].tolist() == ['us', 'fr', 'fr']\nassert np.allclose(out['amount'].astype(float).tolist(), [10.0, 5.5, 7.0])\nassert out.index.tolist() == [0, 1, 2]\nassert len(raw) == 5\nrep = missing_report(pd.DataFrame({'a': [1, None, 3, None], 'b': [1, 2, 3, 4]}))\nassert abs(rep['a'] - 0.5) < 1e-12 and rep['b'] == 0",
  "solution": "import pandas as pd\nimport numpy as np\n\ndef clean_orders(df):\n    out = df.copy()\n    out['country'] = out['country'].str.strip().str.lower()\n    out['amount'] = pd.to_numeric(out['amount'], errors='coerce')\n    out = out.drop_duplicates(subset='order_id', keep='first')\n    out = out.dropna(subset=['amount'])\n    return out.reset_index(drop=True)\n\ndef missing_report(df):\n    return df.isna().mean().to_dict()",
  "packages": [
    "pandas",
    "numpy"
  ],
  "hints": [
    "Use the `.str` accessor for strip and lower, and work on a copy so the input is unchanged.",
    "`df.isna().mean()` gives the missing share per column."
  ]
}
```

> [!TIP] Interview tips
> - Say out loud that you would check grain, uniqueness, null rates and a reconciliation total before analyzing.
> - Compare row counts before and after every join and filter; that single habit catches most silent errors.
> - Treat outliers and missing values as questions about the data-generating process, and document every exclusion.
