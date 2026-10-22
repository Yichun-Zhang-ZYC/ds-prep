---
id: python-practice-pandas-groupby-puzzles
title: "Practice: pandas groupby puzzles"
estimatedMinutes: 15
difficulty: medium
tags: [python, coding-interview, pandas, groupby, practice]
---

## Why it matters

"Top N per group", "share of group total", "latest row per customer" and "compare each row with its group" are the staple pandas interview questions. They test whether you know when to use `agg`, `transform` or `head`, not whether you can memorize the API.

## Concept

**Decision rule** (see the groupby agg/transform lesson for basics):

- One row per group out: `agg` (use named aggregation: `agg(n=("id", "size"), total=("amt", "sum"))`).
- Same length as the input, group statistic broadcast back: `transform` (`x / g.transform("sum")`).
- A few rows per group: sort, then `groupby(...).head(n)` or `.nlargest`; `rank(method=..., ascending=False)` when ties matter.
- Compare to a neighbour in the group: `groupby(...).shift()`, `.diff()`, `.cumsum()`, `.cumcount()`.
- Arbitrary per-group logic: `apply` is the last resort (slow, and its output shape is easy to get wrong).

**Pitfalls**:

- `sort_values` before `head`, `first` or `last`; groupby keeps the order of rows within each group, it does not sort for you.
- `groupby` drops NaN keys by default; use `dropna=False` to keep them.
- `size` counts rows, `count` counts non-null values.
- `as_index=False` or `reset_index()` before merging results back; aggregation moves keys into the index.
- Ties: `head(2)` returns exactly 2 rows, `rank(method="dense") <= 2` may return more. Say which one the question wants.
- Selecting a column and calling `agg` with a dict of lists gives MultiIndex columns; prefer named aggregation for flat names.

## Worked example

Sales by region: E has reps a, b, c with 50, 30, 20; W has d, e, f with 40, 40, 10. Task: each rep's share of the region total and their dense rank within the region.

```python
g = df.groupby("region")["amount"]
df["share"] = df["amount"] / g.transform("sum")
df["rank"] = g.rank(method="dense", ascending=False)
```

Region totals are 100 (E) and 90 (W), so shares are 0.50, 0.30, 0.20 for E and 0.444, 0.444, 0.111 for W; ranks are 1, 2, 3 and 1, 1, 2. `transform("sum")` returns a Series aligned to the original index, so the division is row-wise with no merge. Using `agg("sum")` instead would give 2 rows and force a join back. A tie in W means "top 1 per region" returns two reps under `rank`, but only one under `sort + head(1)`.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You need each order's amount divided by its customer's total spend, keeping all rows. Which is the cleanest?",
  "options": [
    "`df.groupby(\"cust\")[\"amt\"].agg(\"sum\")`",
    "`df[\"amt\"] / df.groupby(\"cust\")[\"amt\"].transform(\"sum\")`",
    "`df.groupby(\"cust\").apply(len)`",
    "`df.groupby(\"cust\")[\"amt\"].head(1)`"
  ],
  "answer": 1,
  "explanation": "`transform` returns a result aligned to the original rows, so the division is element-wise. `agg` collapses to one row per customer."
}
```

```quiz
{
  "id": "q2",
  "question": "Amounts in one group are 40, 40, 10. What does `rank(method=\"min\", ascending=False)` return?",
  "options": [
    "1, 2, 3",
    "1, 1, 3",
    "1, 1, 2",
    "1, 2, 2"
  ],
  "answer": 1,
  "explanation": "`min` gives tied rows the lowest rank of the tie (1, 1) and skips the next (3); `dense` would give 1, 1, 2."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "`df` has columns `region`, `rep`, `amount`. Write `top2_per_region(df)` returning the 2 largest-amount rows per region (ties broken by input order), sorted by region ascending then amount descending, with a fresh 0..n-1 index and the original columns.",
  "setup": "import pandas as pd\nimport numpy as np",
  "packages": [
    "pandas",
    "numpy"
  ],
  "starterCode": "import pandas as pd\nimport numpy as np\n\ndef top2_per_region(df):\n    pass",
  "tests": "df = pd.DataFrame({\"region\": [\"W\", \"E\", \"E\", \"W\", \"E\", \"W\"], \"rep\": list(\"abcdef\"), \"amount\": [40, 30, 50, 40, 20, 10]})\nout = top2_per_region(df)\nassert list(out.columns) == [\"region\", \"rep\", \"amount\"]\nassert list(out[\"rep\"]) == [\"c\", \"b\", \"a\", \"d\"]\nassert list(out.index) == [0, 1, 2, 3]\nassert list(df[\"rep\"]) == list(\"abcdef\")",
  "solution": "import pandas as pd\nimport numpy as np\n\ndef top2_per_region(df):\n    out = df.sort_values([\"region\", \"amount\"], ascending=[True, False], kind=\"stable\")\n    return out.groupby(\"region\").head(2).reset_index(drop=True)",
  "hints": [
    "Sort first, then `groupby(\"region\").head(2)`.",
    "Use `kind=\"stable\"` so ties keep input order, and `reset_index(drop=True)` at the end."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `add_share_rank(df)` that returns a copy of `df` (columns `region`, `rep`, `amount`) with two new columns: `share` = amount / region total, and `rank` = dense rank of amount within the region (highest = 1, as int). Do not change the row order.",
  "setup": "import pandas as pd\nimport numpy as np",
  "packages": [
    "pandas",
    "numpy"
  ],
  "starterCode": "import pandas as pd\nimport numpy as np\n\ndef add_share_rank(df):\n    pass",
  "tests": "df = pd.DataFrame({\"region\": [\"E\", \"E\", \"E\", \"W\", \"W\", \"W\"], \"rep\": list(\"abcdef\"), \"amount\": [50, 30, 20, 40, 40, 10]})\nout = add_share_rank(df)\nassert list(out.columns) == [\"region\", \"rep\", \"amount\", \"share\", \"rank\"]\nassert np.allclose(out[\"share\"], [0.5, 0.3, 0.2, 40 / 90, 40 / 90, 10 / 90])\nassert list(out[\"rank\"]) == [1, 2, 3, 1, 1, 2]\nassert out[\"rank\"].dtype.kind == \"i\"\nassert \"share\" not in df.columns",
  "solution": "import pandas as pd\nimport numpy as np\n\ndef add_share_rank(df):\n    out = df.copy()\n    g = out.groupby(\"region\")[\"amount\"]\n    out[\"share\"] = out[\"amount\"] / g.transform(\"sum\")\n    out[\"rank\"] = g.rank(method=\"dense\", ascending=False).astype(int)\n    return out",
  "hints": [
    "Build `g = out.groupby(\"region\")[\"amount\"]` once and reuse it.",
    "`rank` returns floats; cast with `astype(int)`."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "`orders` has columns `customer`, `date` (ISO strings) and `amount`. Write `repeat_buyers(orders)` returning a DataFrame with columns `customer`, `n` (order count), `total` (sum) and `above_avg` (True when the customer's most recent order is larger than the customer's mean order amount). Keep only customers with at least 2 orders, sorted by `total` descending, fresh index.",
  "setup": "import pandas as pd\nimport numpy as np",
  "packages": [
    "pandas",
    "numpy"
  ],
  "starterCode": "import pandas as pd\nimport numpy as np\n\ndef repeat_buyers(orders):\n    pass",
  "tests": "o = pd.DataFrame({\n    \"customer\": [\"a\", \"b\", \"a\", \"c\", \"a\", \"b\"],\n    \"date\": [\"2024-01-05\", \"2024-01-06\", \"2024-02-01\", \"2024-02-02\", \"2024-01-20\", \"2024-03-01\"],\n    \"amount\": [10, 100, 40, 5, 20, 50],\n})\nout = repeat_buyers(o)\nassert list(out.columns) == [\"customer\", \"n\", \"total\", \"above_avg\"]\nassert list(out[\"customer\"]) == [\"b\", \"a\"]\nassert list(out[\"n\"]) == [2, 3]\nassert list(out[\"total\"]) == [150, 70]\nassert list(out[\"above_avg\"]) == [False, True]\nassert list(out.index) == [0, 1]",
  "solution": "import pandas as pd\nimport numpy as np\n\ndef repeat_buyers(orders):\n    g = orders.sort_values(\"date\").groupby(\"customer\")[\"amount\"]\n    out = g.agg(n=\"size\", total=\"sum\", avg=\"mean\", last=\"last\").reset_index()\n    out = out[out[\"n\"] >= 2].copy()\n    out[\"above_avg\"] = out[\"last\"] > out[\"avg\"]\n    out = out.sort_values(\"total\", ascending=False)\n    return out[[\"customer\", \"n\", \"total\", \"above_avg\"]].reset_index(drop=True)",
  "hints": [
    "Sort by date before using `\"last\"`; groupby keeps row order within each group.",
    "Named aggregation `agg(n=\"size\", total=\"sum\", ...)` gives flat column names; filter with a boolean mask afterwards."
  ]
}
```

> [!TIP] Interview tips
> - Name the shape of the answer first (one row per group, same length, or a few rows per group); that picks agg, transform or head.
> - Always sort before first/last/head, and ask how ties should be handled.
> - Prefer named aggregation and `transform` over `apply`; mention `apply` is slower and its output shape varies.
