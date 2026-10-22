---
id: analytics-bi-tableau
title: Tableau (calculated fields, LOD expressions)
estimatedMinutes: 14
difficulty: medium
tags: [tableau, lod, calculated-fields, bi]
---

## Why it matters

Tableau is the other big BI tool. Interviewers ask when you'd use a LOD expression, how a filter interacts with a calculation, and how an extract differs from a live connection.

## Concept

**Fields**: *dimensions* (categorical, slice the data) and *measures* (numeric, aggregated); *discrete* (blue, headers) vs *continuous* (green, axes). The view's **level of detail** is the set of dimensions on it.

**Calculated fields** come in three kinds:
- **Row-level**: evaluated per record (`IF [Sales] > 100 THEN 'Big' END`).
- **Aggregate**: `SUM([Profit]) / SUM([Sales])`; always aggregate before dividing, never average ratios.
- **Table calculations**: run on the already-aggregated result in the view (running total, rank, percent of total, `WINDOW_AVG`); depend on addressing/partitioning.

**LOD expressions** compute at a level different from the view:
- `{ FIXED [dims] : agg }`: exactly those dimensions, ignoring the view.
- `{ INCLUDE [dim] : agg }`: view dimensions plus `dim`.
- `{ EXCLUDE [dim] : agg }`: view dimensions minus `dim`.
Typical uses: first-purchase date per customer (cohorts), customer-level totals averaged per region, percent of total at a fixed grain.

**Order of operations** (simplified): extract filters → data source filters → context filters → **FIXED LODs** → dimension filters → INCLUDE/EXCLUDE LODs → measure filters → table calculations. So a normal dimension filter does *not* affect FIXED; add it to context if it should.

**Data**: *live* connection (always fresh, depends on DB speed) vs **extract** (.hyper snapshot, fast, scheduled refresh). *Relationships* (logical tables, joined at query time) are preferred to physical joins to avoid fan-out; *blending* for separate sources. Publish to Server/Cloud with permissions.

## Worked example

```text
// Row-level calculated field
[Profit Ratio] = SUM([Profit]) / SUM([Sales])

// FIXED: ignores the view's dimensions
{ FIXED [Customer ID] : MIN([Order Date]) }

// INCLUDE adds a dimension to the view's level; EXCLUDE removes one
{ INCLUDE [Customer ID] : SUM([Sales]) }
{ EXCLUDE [Sub-Category] : SUM([Sales]) }
```

Data: East has customer A (orders 100 and 300) and customer B (100); West has customer C (50 and 150). The plain average of `[Sales]` for East is $500/3 \approx 166.7$ (average order value). With `{ FIXED [Customer] : SUM([Sales]) }` each customer has a total (A 400, B 100, C 200); averaging per region gives East $(400+100)/2 = 250$ and West 200: average *revenue per customer*. Same field, different question, decided by the level of detail.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A dimension filter (not in context) is applied to a view. Which calculation ignores it?",
  "options": [
    "A table calculation",
    "An INCLUDE LOD",
    "A FIXED LOD",
    "A measure filter"
  ],
  "answer": 2,
  "explanation": "FIXED LODs are computed before dimension filters in Tableau's order of operations (unless the filter is added to context), so the filter does not change them."
}
```

```quiz
{
  "id": "q2",
  "question": "Region East has customers A (sales 400 total) and B (100 total) over 3 orders. What does AVG({FIXED [Customer]: SUM([Sales])}) give for East?",
  "options": [
    "166.7",
    "250",
    "500",
    "300"
  ],
  "answer": 1,
  "explanation": "The FIXED step sums per customer (400 and 100), then the view averages those two values: 250. The average order value would be 500/3 = 166.7."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Reproduce Tableau LOD expressions in pandas. `fixed_region_total(df)` returns a Series aligned to `df` equal to `{FIXED [Region]: SUM([Sales])}`. `first_order_date(df)` returns `{FIXED [Customer]: MIN([Order Date])}` on every row (ISO date strings compare correctly). `avg_customer_sales_by_region(df)` returns a Series indexed by region with the average of each customer's total sales (a nested aggregation, not the average order value).",
  "setup": "import pandas as pd",
  "packages": [
    "pandas"
  ],
  "starterCode": "import pandas as pd\n\ndef fixed_region_total(df):\n    # {FIXED [Region]: SUM([Sales])} repeated on every row\n    pass\n\ndef first_order_date(df):\n    # {FIXED [Customer]: MIN([Order Date])}\n    pass\n\ndef avg_customer_sales_by_region(df):\n    # AVG over customers of {FIXED [Customer]: SUM([Sales])}, per region\n    pass\n\ndf = pd.DataFrame({'customer': ['A', 'A', 'B', 'C', 'C'], 'region': ['E', 'E', 'E', 'W', 'W'], 'sales': [100, 300, 100, 50, 150], 'order_date': ['2024-01-05', '2024-02-10', '2024-01-20', '2024-03-01', '2024-01-15']})\nprint(fixed_region_total(df).tolist())",
  "tests": "df = pd.DataFrame({'customer': ['A', 'A', 'B', 'C', 'C'], 'region': ['E', 'E', 'E', 'W', 'W'], 'sales': [100, 300, 100, 50, 150], 'order_date': ['2024-01-05', '2024-02-10', '2024-01-20', '2024-03-01', '2024-01-15']})\nassert fixed_region_total(df).tolist() == [500, 500, 500, 200, 200]\nassert first_order_date(df).tolist() == ['2024-01-05', '2024-01-05', '2024-01-20', '2024-01-15', '2024-01-15']\ns = avg_customer_sales_by_region(df)\nassert abs(s['E'] - 250) < 1e-9 and abs(s['W'] - 200) < 1e-9\nassert abs(df.groupby('region')['sales'].mean()['E'] - 500 / 3) < 1e-9\nassert 'x' not in df.columns",
  "solution": "import pandas as pd\n\ndef fixed_region_total(df):\n    return df.groupby('region')['sales'].transform('sum')\n\ndef first_order_date(df):\n    return df.groupby('customer')['order_date'].transform('min')\n\ndef avg_customer_sales_by_region(df):\n    per_customer = df.groupby(['region', 'customer'])['sales'].sum()\n    return per_customer.groupby('region').mean()",
  "hints": [
    "A FIXED LOD that keeps row level is groupby(...).transform(...).",
    "For the nested one, aggregate to one row per (region, customer) first, then aggregate again by region."
  ]
}
```

```reveal
{
  "prompt": "In Tableau, you want each customer's cohort month (month of first order) and the share of revenue per cohort. How do you build it, and why use FIXED rather than a table calculation?",
  "answer": "**Cohort month**: `[Cohort Month] = DATETRUNC('month', { FIXED [Customer ID] : MIN([Order Date]) })`. It is a row-level attribute for every order of that customer, so you can place it on Rows/Columns like any dimension.\n\n**Revenue share**: put `[Cohort Month]` on Rows and `SUM([Sales])` on Text; add a table calc *Percent of Total* or use `SUM([Sales]) / SUM({ FIXED : SUM([Sales]) })`.\n\n**Why FIXED**: it is computed at the customer level regardless of what is in the view and before dimension filters, so filtering to 2024 orders doesn't change which month counts as a customer's first order. A table calc would only see the rows already in the view (and after filters), so a filtered view would give the wrong first order. Add filters to context if you need them to affect the FIXED result.\n\n**Performance note**: LODs generate subqueries; on huge data prefer precomputing the cohort in the warehouse or the extract."
}
```

> [!TIP] Interview tips
> - Say "FIXED is computed before dimension filters; add the filter to context to change that."
> - Distinguish LOD (changes the grain of the data) from table calcs (post-aggregation, depend on the view layout).
> - Pitfall: averaging row-level ratios; compute `SUM(a)/SUM(b)` instead.
