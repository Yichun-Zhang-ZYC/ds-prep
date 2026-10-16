---
id: python-pivot-table-melt-stack-unstack
title: pivot_table, melt, stack / unstack
estimatedMinutes: 12
difficulty: medium
tags: [python, pandas, reshaping]
---

## Why it matters
Data comes "long" (one row per observation) or "wide" (one column per category). Dashboards, cohort tables and model features need one or the other, so reshaping is a frequent interview task.

## Concept
- **Long → wide**: `pivot_table` (aggregates duplicates) or `pivot` (errors on duplicates).

```python
wide = df.pivot_table(index="user", columns="month", values="revenue",
                      aggfunc="sum", fill_value=0)
```

- **Wide → long**: `melt`.

```python
long = wide.reset_index().melt(id_vars="user", var_name="month", value_name="revenue")
```

- **stack / unstack** move levels between the row index and columns (MultiIndex):
  - `df.unstack()` moves the innermost row-index level into columns (long → wide).
  - `df.stack()` moves columns into the innermost row-index level (wide → long).
  - `groupby([a, b]).size().unstack(fill_value=0)` is a quick cross-tab.
- `pd.crosstab(df.a, df.b, normalize="index")` gives counts or row proportions.
- `pivot_table(margins=True)` adds row/column totals.
- After pivoting, columns may be a MultiIndex; flatten with `df.columns = [f"{a}_{b}" for a, b in df.columns]`.

## Worked example
Cohort retention table:

```python
cohort = (events.groupby(["signup_month", "months_since_signup"])["user"].nunique()
                .unstack(fill_value=0))
retention = cohort.div(cohort[0], axis=0)   # divide each row by its month-0 size
```
Rows = signup cohorts, columns = months since signup, values = retention rates.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "`df.pivot(index='user', columns='month', values='rev')` raises 'Index contains duplicate entries'. What should you use?",
  "options": ["melt", "pivot_table with an aggfunc such as sum", "stack", "concat"],
  "answer": 1,
  "explanation": "pivot requires unique (index, column) pairs; pivot_table aggregates duplicates."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Rows have `user`, `month`, `revenue` (possibly several rows per user-month). Write `to_wide(df)` returning a pivot with users as the index, months as columns, summed revenue and 0 for missing. Write `to_long(wide)` converting it back to columns `user`, `month`, `revenue`, sorted by user then month with a fresh index. Write `row_shares(wide)` dividing each row by its row total.",
  "setup": "import pandas as pd",
  "packages": ["pandas"],
  "starterCode": "import pandas as pd\n\ndef to_wide(df):\n    pass\n\ndef to_long(wide):\n    pass\n\ndef row_shares(wide):\n    pass\n\ndf = pd.DataFrame({'user': ['a', 'a', 'a', 'b'], 'month': ['m1', 'm1', 'm2', 'm2'], 'revenue': [5, 5, 3, 4]})\nprint(to_wide(df))",
  "tests": "df = pd.DataFrame({'user': ['a', 'a', 'a', 'b'], 'month': ['m1', 'm1', 'm2', 'm2'], 'revenue': [5, 5, 3, 4]})\nw = to_wide(df)\nassert w.loc['a', 'm1'] == 10 and w.loc['a', 'm2'] == 3 and w.loc['b', 'm1'] == 0 and w.loc['b', 'm2'] == 4\nl = to_long(w)\nassert list(l.columns) == ['user', 'month', 'revenue']\nassert list(zip(l.user, l.month, l.revenue)) == [('a', 'm1', 10), ('a', 'm2', 3), ('b', 'm1', 0), ('b', 'm2', 4)]\nassert list(l.index) == [0, 1, 2, 3]\ns = row_shares(w)\nassert abs(s.loc['a', 'm1'] - 10 / 13) < 1e-12 and s.loc['b', 'm2'] == 1.0",
  "solution": "import pandas as pd\n\ndef to_wide(df):\n    return df.pivot_table(index='user', columns='month', values='revenue', aggfunc='sum', fill_value=0)\n\ndef to_long(wide):\n    long = wide.reset_index().melt(id_vars='user', var_name='month', value_name='revenue')\n    return long.sort_values(['user', 'month']).reset_index(drop=True)\n\ndef row_shares(wide):\n    return wide.div(wide.sum(axis=1), axis=0)",
  "hints": ["pivot_table(aggfunc='sum', fill_value=0) handles duplicates and gaps.", "div(..., axis=0) divides each row by the matching value of a Series."]
}
```

> [!TIP] Interview tips
> - Name the shapes: "this is long; I'll pivot_table to wide" (or melt back).
> - Use pivot_table when duplicates are possible, and fill_value for gaps.
> - Cohort retention tables (groupby + unstack + divide by first column) are a classic exercise.
