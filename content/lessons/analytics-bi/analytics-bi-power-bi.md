---
id: analytics-bi-power-bi
title: Power BI (DAX, data modeling, Power Query)
estimatedMinutes: 14
difficulty: medium
tags: [power-bi, dax, data-modeling, power-query]
---

## Why it matters

Power BI dominates enterprise BI. Interviews for analyst and BI roles probe the model-then-measure workflow: shape data in Power Query, build a star schema, write DAX measures, and keep it fast.

## Concept

**Workflow**: connect and transform (**Power Query**, M language) → model (relationships, star schema) → measures (**DAX**) → visuals and publish to the Service (refresh, RLS, workspaces).

**Power Query**: a repeatable ETL step list. Remove columns early, set types, merge/append, unpivot. **Query folding** pushes steps back to the source database as SQL, so keep foldable steps first.

**Data modeling**: one fact table (grain, e.g. order line) surrounded by dimension tables (Date, Product, Customer) on one-to-many, single-direction relationships. Avoid many-to-many and bi-directional filters unless justified. Mark a proper **Date table** for time intelligence. Storage modes: **Import** (fast, VertiPaq compression, scheduled refresh), **DirectQuery** (live, slower), **composite**.

**DAX essentials**
- **Calculated column**: per-row, computed at refresh, stored. **Measure**: evaluated at query time in the current **filter context**; no storage.
- **Row context** (iterating rows, e.g. `SUMX`) vs **filter context** (slicers, rows/columns of the visual). `CALCULATE` modifies filter context; it is the core function.
- **Time intelligence**: `SAMEPERIODLASTYEAR`, `DATESYTD`, `TOTALYTD` (need a continuous date table).
- Use `DIVIDE` for safe division and `VAR` for readability and speed.

**Security and sharing**: row-level security (roles with DAX filters), workspaces/apps, scheduled refresh through a gateway for on-premises sources.

## Worked example

Measures over a `FactSales` table related to `DimChannel` and a marked `Date` table:

```dax
Sales = SUM ( FactSales[Amount] )

Sales Online =
CALCULATE ( [Sales], DimChannel[Channel] = "Online" )

Sales LY =
CALCULATE ( [Sales], SAMEPERIODLASTYEAR ( 'Date'[Date] ) )

YoY % =
DIVIDE ( [Sales] - [Sales LY], [Sales LY] )
```

Suppose 2024 sales are 1.2M (of which Online is 0.45M) and 2023 sales were 1.0M. In a visual with the Year 2024 slicer: `[Sales]` = 1.2M, `[Sales Online]` = 0.45M, `[Sales LY]` = 1.0M and `[YoY %]` = $(1.2 - 1.0)/1.0 = 20\%$. The same measures re-evaluate for each month, region or product, because the filter context changes per cell; you never write a separate formula for each cut.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "When should you use a measure instead of a calculated column?",
  "options": [
    "When the value must be evaluated per row and stored in the table",
    "When the result must respond to slicers and filter context at query time (e.g. a ratio or YTD total)",
    "When you need to filter a relationship",
    "Never; measures are slower"
  ],
  "answer": 1,
  "explanation": "Measures are evaluated at query time in the current filter context and use no storage. Calculated columns are computed at refresh per row and consume memory; use them for row-level attributes you slice by."
}
```

```quiz
{
  "id": "q2",
  "question": "What does CALCULATE([Sales], DimChannel[Channel] = \"Online\") do?",
  "options": [
    "Adds a row filter to the table permanently",
    "Evaluates [Sales] after modifying the filter context to Channel = Online",
    "Creates a calculated column",
    "Sorts the visual by channel"
  ],
  "answer": 1,
  "explanation": "CALCULATE changes the filter context for its first argument; the boolean filter overrides existing filters on the same column (Channel) and keeps others."
}
```

## Practice

```reveal
{
  "prompt": "A Power BI report takes 30 seconds to render. How do you diagnose and speed it up?",
  "answer": "**Diagnose**: Performance Analyzer in Power BI Desktop shows time per visual split into DAX query, visual display and other. Copy the slow query into **DAX Studio** (server timings, storage vs formula engine). Check the model size with **VertiPaq Analyzer**.\n\n**Fix by layer**\n- **Model**: use a star schema, single-direction relationships, integer surrogate keys; drop unused columns and high-cardinality text; turn off auto date/time; split datetime into date and time.\n- **DAX**: avoid iterators over big tables when an aggregate works; use variables (`VAR`) to avoid recomputation; replace nested `IF` with `SWITCH`; avoid row-level calculated columns where a measure works.\n- **Data**: Import mode where possible; DirectQuery only for freshness or size, with aggregation tables or composite models; incremental refresh for large facts.\n- **Power Query**: keep query folding (push filters/joins to the source), remove columns early.\n- **Report**: fewer visuals per page, fewer slicers, avoid very wide tables and visual-level filters on high-cardinality columns."
}
```

> [!TIP] Interview tips
> - Explain filter context vs row context in one sentence each; it is the most common DAX question.
> - Say "star schema, single-direction relationships, measures not calculated columns" when asked about best practice.
> - Pitfall: using Import for a 2-billion-row table or DirectQuery for everything; know the trade-offs and when to use aggregations or incremental refresh.
