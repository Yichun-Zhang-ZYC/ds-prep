---
id: analytics-bi-pivot-tables
title: Pivot tables
estimatedMinutes: 10
difficulty: easy
tags: [excel, google-sheets, pivot-tables, aggregation]
---

## Why it matters

Pivot tables are the fastest way to summarise tabular data in Excel or Google Sheets, and analyst interviews and take-homes often include a spreadsheet task. They are `GROUP BY` with a UI.

## Concept

A pivot table aggregates a flat table into a cross-tab. Four areas:
- **Rows** and **Columns**: the grouping fields (like `GROUP BY` keys; columns spread a second key across).
- **Values**: the aggregated field and function (Sum, Count, Average, Min/Max, Distinct Count via Data Model).
- **Filters** (and **Slicers/Timelines**): restrict the data.

**Useful features**
- **Show values as**: % of row total, % of column total, % of grand total, running total, difference from the previous period.
- **Grouping**: dates into months/quarters/years; numbers into bins; manual groups of text items.
- **Calculated fields/items**: custom formulas (careful: they operate on sums, not row-level values).
- **GETPIVOTDATA**: stable references into a pivot from other cells.
- **Pivot charts** linked to the pivot.

**Practical rules**
- Source data must be tidy: one header row, no blanks or merged cells, one record per row. Convert it to a **Table** so the range grows.
- Pivots do not auto-update; **Refresh** after the data changes.
- Averages are not additive: a pivot grand-total average is over raw rows, not the mean of subtotals. Decide whether you need a weighted or simple average.
- Text numbers and mixed types silently break sums; check Count vs Sum.

## Worked example

Rows: (East, Q1, 100), (East, Q1, 50), (East, Q2, 150), (West, Q1, 80), (West, Q2, 120), (West, Q2, 60). Pivot with Region on rows, Quarter on columns, Sum of Sales:

| | Q1 | Q2 | Total |
|---|---|---|---|
| East | 150 | 150 | 300 |
| West | 80 | 180 | 260 |
| Total | 230 | 330 | 560 |

"Show values as % of row total": East is 50%/50%, West is $80/260 \approx 30.8\%$ and $180/260 \approx 69.2\%$. Switching to Average of Sales gives a grand total of $560/6 \approx 93.3$, the average of all six rows, not the average of the four cell averages. The SQL equivalent is `GROUP BY region, quarter` with conditional aggregation for the columns.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A pivot table shows Average of Sales by region and quarter. Why can the Grand Total average differ from the average of the subtotals?",
  "options": [
    "It is a bug",
    "The grand total averages all underlying rows, so groups with more rows weigh more",
    "Excel rounds totals",
    "Grand totals always use SUM"
  ],
  "answer": 1,
  "explanation": "Averages aren't additive. The grand total is computed over the raw rows, so it is a row-weighted average rather than the mean of group averages."
}
```

```quiz
{
  "id": "q2",
  "question": "You add new rows below your source range and the pivot doesn't change. What is the best fix?",
  "options": [
    "Rebuild the pivot every time",
    "Base the pivot on an Excel Table (or a whole-column range) and Refresh",
    "Sort the data",
    "Use VLOOKUP"
  ],
  "answer": 1,
  "explanation": "A pivot reads its source when refreshed. A Table expands automatically as rows are added, so Refresh picks up the new data."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Build pivot tables with pandas. `sales_pivot(df)` returns total `sales` with `region` as rows and `quarter` as columns, missing combinations as 0, plus a `Total` row and `Total` column (grand totals). `row_pct(df)` returns the same pivot without totals, with each cell divided by its row total (Excel's \"% of row total\").",
  "setup": "import pandas as pd",
  "packages": [
    "pandas"
  ],
  "starterCode": "import pandas as pd\n\ndef sales_pivot(df):\n    # sum of sales: regions down, quarters across, with a 'Total' row and column\n    pass\n\ndef row_pct(df):\n    # share of each region's sales by quarter (rows sum to 1), no totals\n    pass\n\ndf = pd.DataFrame({'region': ['East', 'East', 'East', 'West', 'West', 'West'], 'quarter': ['Q1', 'Q1', 'Q2', 'Q1', 'Q2', 'Q2'], 'sales': [100, 50, 150, 80, 120, 60]})\nprint(sales_pivot(df))",
  "tests": "df = pd.DataFrame({'region': ['East', 'East', 'East', 'West', 'West', 'West'], 'quarter': ['Q1', 'Q1', 'Q2', 'Q1', 'Q2', 'Q2'], 'sales': [100, 50, 150, 80, 120, 60]})\npv = sales_pivot(df)\nassert pv.loc['East', 'Q1'] == 150 and pv.loc['East', 'Q2'] == 150\nassert pv.loc['West', 'Q1'] == 80 and pv.loc['West', 'Q2'] == 180\nassert pv.loc['Total', 'Q1'] == 230 and pv.loc['Total', 'Q2'] == 330\nassert pv.loc['East', 'Total'] == 300 and pv.loc['Total', 'Total'] == 560\nr = row_pct(df)\nassert abs(r.loc['East', 'Q1'] - 0.5) < 1e-9\nassert abs(r.loc['West', 'Q2'] - 180 / 260) < 1e-9\nassert all(abs(v - 1) < 1e-9 for v in r.sum(axis=1))\nassert 'Total' not in r.index",
  "solution": "import pandas as pd\n\ndef sales_pivot(df):\n    return df.pivot_table(index='region', columns='quarter', values='sales', aggfunc='sum', fill_value=0, margins=True, margins_name='Total')\n\ndef row_pct(df):\n    pv = df.pivot_table(index='region', columns='quarter', values='sales', aggfunc='sum', fill_value=0)\n    return pv.div(pv.sum(axis=1), axis=0)",
  "hints": [
    "`DataFrame.pivot_table(index=..., columns=..., values=..., aggfunc='sum', fill_value=0, margins=True, margins_name='Total')`.",
    "`pv.div(pv.sum(axis=1), axis=0)` divides each row by its total."
  ]
}
```

> [!TIP] Interview tips
> - Describe a pivot as `GROUP BY` plus a reshape; interviewers like seeing the SQL mapping.
> - Mention refresh, tidy source data and non-additive averages.
> - Pitfall: pasting pivot results into a report with hard-coded numbers; use GETPIVOTDATA or link to the pivot so it stays in sync.
