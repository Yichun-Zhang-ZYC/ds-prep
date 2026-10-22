---
id: python-practice-merge-reshape-and-pivot
title: "Practice: Merge, reshape and pivot"
estimatedMinutes: 15
difficulty: medium
tags: [python, coding-interview, pandas, merge, reshape, practice]
---

## Why it matters

Real tables never arrive in the shape you need. Interview tasks ask you to join two tables without silently duplicating rows, find unmatched keys, and flip between long and wide formats. The common failure is a join that quietly multiplies rows.

## Concept

**Merge checklist** (see the merge/join/concat lesson for the basics):

1. State the **grain** of each table (one row per what?). The result grain follows from the key's uniqueness on each side: 1:1, m:1, or m:m (row explosion).
2. Check key uniqueness before joining: `customers["cust"].is_unique`; or pass `validate="m:1"` so pandas raises on a violation.
3. Choose the join type from the question: `how="left"` to keep all orders, `how="inner"` for matched only. For an **anti-join** (rows with no match), use `indicator=True` and filter `_merge == "left_only"`.
4. Compare row counts before and after; they are your cheapest test.
5. Overlapping non-key columns get `_x`/`_y` suffixes; pass `suffixes=` or select columns first.

**Reshape**:

- `pivot_table(index, columns, values, aggfunc, fill_value)` aggregates duplicates; plain `pivot` raises on duplicates.
- `melt(id_vars, value_vars, var_name, value_name)` is wide to long; `stack`/`unstack` move a column level to and from the index.
- After a pivot the columns have a name (e.g. `quarter`); set `out.columns.name = None` and `reset_index()` for a flat frame.
- Missing combinations become NaN in the wide table, so `fill_value=0` only if "no row" truly means zero.

## Worked example

Orders: ids 1-4 with customers a, b, z, a. Customers table: `a` once, `b` twice (Bo and Bo2, a data-quality bug).

```python
o.merge(c, on="cust", how="left")                       # 5 rows: order 2 duplicated
o.merge(c, on="cust", how="left", validate="m:1")       # raises MergeError
c1 = c.drop_duplicates("cust", keep="last")
m = o.merge(c1, on="cust", how="left", indicator=True)  # 4 rows
m.loc[m["_merge"] == "left_only", "order_id"]           # order 3 (customer z)
```

The naive left join returns 5 rows for 4 orders, so any `sum(amount)` computed afterwards is inflated for order 2. `validate="m:1"` turns that silent bug into an error. After deduplicating, `indicator=True` marks order 3 as `left_only`, the answer to "which orders have no customer?". Always say the row-count check out loud: 4 in, 4 out.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "`orders` (1,000 rows) is left-joined to `customers` and the result has 1,040 rows. What is the most likely cause?",
  "options": [
    "Some orders have no matching customer",
    "Duplicate keys in `customers`",
    "Duplicate keys in `orders`",
    "The join type should have been inner"
  ],
  "answer": 1,
  "explanation": "A left join never loses left rows; extra rows mean some left keys matched more than one right row, i.e. duplicates in the right table. Unmatched keys produce NaN, not extra rows."
}
```

```quiz
{
  "id": "q2",
  "question": "Which call fails when the same (region, quarter) pair appears twice?",
  "options": [
    "`pivot_table(..., aggfunc=\"sum\")`",
    "`df.pivot(index=\"region\", columns=\"quarter\", values=\"amount\")`",
    "`df.melt(id_vars=\"region\")`",
    "`df.groupby([\"region\", \"quarter\"]).sum()`"
  ],
  "answer": 1,
  "explanation": "`pivot` cannot aggregate and raises \"Index contains duplicate entries\". `pivot_table` aggregates duplicates with `aggfunc`."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "`orders` has `order_id`, `cust`; `customers` has `cust`, `name` and may contain duplicate `cust` rows. Write `orphan_orders(orders, customers)` returning the **sorted list of order_ids** whose customer is not in `customers`. The result must not depend on duplicates in `customers`.",
  "setup": "import pandas as pd\nimport numpy as np",
  "packages": [
    "pandas",
    "numpy"
  ],
  "starterCode": "import pandas as pd\nimport numpy as np\n\ndef orphan_orders(orders, customers):\n    pass",
  "tests": "o = pd.DataFrame({\"order_id\": [4, 1, 2, 3, 5], \"cust\": [\"a\", \"b\", \"z\", \"a\", \"y\"]})\nc = pd.DataFrame({\"cust\": [\"a\", \"b\", \"b\"], \"name\": [\"Ann\", \"Bo\", \"Bo2\"]})\nassert orphan_orders(o, c) == [2, 5]\nassert orphan_orders(o, pd.DataFrame({\"cust\": list(\"abzy\"), \"name\": list(\"ABZY\")})) == []\nassert len(o) == 5",
  "solution": "import pandas as pd\nimport numpy as np\n\ndef orphan_orders(orders, customers):\n    keys = customers[[\"cust\"]].drop_duplicates()\n    m = orders.merge(keys, on=\"cust\", how=\"left\", indicator=True)\n    return sorted(int(i) for i in m.loc[m[\"_merge\"] == \"left_only\", \"order_id\"])",
  "hints": [
    "Deduplicate the right keys first so the merge cannot multiply rows.",
    "Use `indicator=True` and keep rows where `_merge == \"left_only\"`."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "`sales` has `region`, `quarter` (like \"Q1\"), `amount`, with possibly several rows per pair. Write `wide_sales(sales)` returning one row per region, one column per quarter (sorted), values = summed amount with 0 for missing pairs. The result has flat columns `region, Q1, Q2, ...` (no columns name) and a 0..n-1 index, regions sorted.",
  "setup": "import pandas as pd\nimport numpy as np",
  "packages": [
    "pandas",
    "numpy"
  ],
  "starterCode": "import pandas as pd\nimport numpy as np\n\ndef wide_sales(sales):\n    pass",
  "tests": "s = pd.DataFrame({\"region\": [\"W\", \"E\", \"E\", \"W\", \"E\"], \"quarter\": [\"Q1\", \"Q1\", \"Q2\", \"Q1\", \"Q1\"], \"amount\": [10, 5, 7, 20, 1]})\nout = wide_sales(s)\nassert list(out.columns) == [\"region\", \"Q1\", \"Q2\"]\nassert out.columns.name is None\nassert list(out[\"region\"]) == [\"E\", \"W\"]\nassert list(out[\"Q1\"]) == [6, 30]\nassert list(out[\"Q2\"]) == [7, 0]\nassert list(out.index) == [0, 1]",
  "solution": "import pandas as pd\nimport numpy as np\n\ndef wide_sales(sales):\n    out = sales.pivot_table(index=\"region\", columns=\"quarter\", values=\"amount\",\n                            aggfunc=\"sum\", fill_value=0)\n    out.columns.name = None\n    return out.reset_index()",
  "hints": [
    "`pivot_table` with `aggfunc=\"sum\"` and `fill_value=0` handles both duplicates and gaps.",
    "Clear the columns name before `reset_index()` so the result has plain column labels."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "`scores` is wide: columns `student`, `math`, `art`, `pe`, with NaN where a student did not take the subject. Write `scores_long(scores)` returning a long frame with columns `student`, `subject`, `score` without the NaN rows, sorted by student then subject, fresh index. Then write `best_subject(long_df)` returning a dict student -> subject with the highest score (ties: alphabetically first subject).",
  "setup": "import pandas as pd\nimport numpy as np",
  "packages": [
    "pandas",
    "numpy"
  ],
  "starterCode": "import pandas as pd\nimport numpy as np\n\ndef scores_long(scores):\n    pass\n\ndef best_subject(long_df):\n    pass",
  "tests": "w = pd.DataFrame({\"student\": [\"bo\", \"ann\"], \"math\": [90.0, 80.0], \"art\": [np.nan, 80.0], \"pe\": [70.0, np.nan]})\nlg = scores_long(w)\nassert list(lg.columns) == [\"student\", \"subject\", \"score\"]\nassert list(lg[\"student\"]) == [\"ann\", \"ann\", \"bo\", \"bo\"]\nassert list(lg[\"subject\"]) == [\"art\", \"math\", \"math\", \"pe\"]\nassert list(lg[\"score\"]) == [80.0, 80.0, 90.0, 70.0]\nassert list(lg.index) == [0, 1, 2, 3]\nassert best_subject(lg) == {\"ann\": \"art\", \"bo\": \"math\"}",
  "solution": "import pandas as pd\nimport numpy as np\n\ndef scores_long(scores):\n    lg = scores.melt(id_vars=\"student\", var_name=\"subject\", value_name=\"score\")\n    lg = lg.dropna(subset=[\"score\"])\n    return lg.sort_values([\"student\", \"subject\"]).reset_index(drop=True)\n\ndef best_subject(long_df):\n    ordered = long_df.sort_values([\"student\", \"score\", \"subject\"], ascending=[True, False, True])\n    first = ordered.groupby(\"student\").head(1)\n    return {str(s): str(sub) for s, sub in zip(first[\"student\"], first[\"subject\"])}",
  "hints": [
    "`melt(id_vars=\"student\", var_name=\"subject\", value_name=\"score\")`, then `dropna(subset=[\"score\"])`.",
    "For ties, sort by score descending then subject ascending, and take the first row per student."
  ]
}
```

> [!TIP] Interview tips
> - State the grain of both tables and the expected row count before you join; check it after.
> - Use `validate=`, `indicator=True` and `drop_duplicates` to prove the join is safe; this is the senior signal.
> - Know `pivot` vs `pivot_table` (aggregation) and `melt` vs `stack`; flatten columns after a pivot.
