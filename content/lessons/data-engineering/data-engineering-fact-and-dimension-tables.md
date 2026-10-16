---
id: data-engineering-fact-and-dimension-tables
title: Fact & dimension tables
estimatedMinutes: 12
difficulty: medium
tags: [data-engineering, data-modeling, dimensional-modeling]
---

## Why it matters
Getting the grain or the fact type wrong leads to double-counted revenue and dashboards nobody trusts. Interviewers ask you to classify facts, pick keys and explain additivity.

## Concept
**Fact tables** store measurements of a business process at a declared **grain**, plus foreign keys to dimensions.
- **Transaction facts**: one row per event (order line, click). Most common.
- **Periodic snapshot facts**: one row per entity per period (account balance per day, inventory per week).
- **Accumulating snapshot facts**: one row per process instance, updated as it moves through milestones (order placed → shipped → delivered dates).
- **Factless facts**: record that something happened with no measure (student attended class).

Measure **additivity**:
- **Additive**: can be summed across all dimensions (revenue, quantity).
- **Semi-additive**: can be summed across some dimensions but not time (account balance, inventory level: average or take the last value over time).
- **Non-additive**: ratios and percentages (conversion rate, margin %): store the numerator and denominator and compute the ratio after aggregating.

**Dimension tables** hold descriptive attributes used to filter and group: customer, product, date, store.
- Use a **surrogate key** (integer, warehouse-generated) instead of the source system's natural key, so you can track history (SCD Type 2) and integrate multiple sources.
- A **date dimension** with year, quarter, month, week, weekday, holiday flags simplifies calendar logic.
- **Conformed dimensions** are shared across fact tables, so metrics from different processes line up.
- **Degenerate dimension**: an identifier kept on the fact table with no dimension table (order number).

## Worked example
Mixing grains: a table with order-level `shipping_fee` repeated on every order line. Summing `shipping_fee` over lines double-counts it for multi-item orders. Fix: allocate the fee across lines, or model shipping in an order-level fact table.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which measure is semi-additive?",
  "options": ["Revenue", "Units sold", "End-of-day account balance", "Conversion rate"],
  "answer": 2,
  "explanation": "Balances can be summed across accounts but not across days; take the last or average over time."
}
```

```quiz
{
  "id": "q2",
  "question": "How should a conversion rate be stored for correct roll-ups?",
  "options": ["As a pre-computed percentage on each row", "As numerator and denominator counts, dividing after aggregation", "Only in the BI tool", "As a string"],
  "answer": 1,
  "explanation": "Averaging ratios gives wrong results when group sizes differ."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "`fact_daily_balance` is a periodic snapshot (one row per account per day). For each `region`, return the total balance on the **latest date** in the table as `total_balance` (don't sum across days!), sorted by region.",
  "setup": "CREATE TABLE dim_account (account_key INTEGER PRIMARY KEY, region TEXT); INSERT INTO dim_account VALUES (1,'East'),(2,'East'),(3,'West'); CREATE TABLE fact_daily_balance (account_key INTEGER, snapshot_date TEXT, balance REAL); INSERT INTO fact_daily_balance VALUES (1,'2024-03-01',100),(2,'2024-03-01',50),(3,'2024-03-01',70),(1,'2024-03-02',120),(2,'2024-03-02',40),(3,'2024-03-02',90);",
  "starterCode": "SELECT a.region\nFROM fact_daily_balance f\nJOIN dim_account a ON a.account_key = f.account_key\n",
  "solution": "SELECT a.region, SUM(f.balance) AS total_balance\nFROM fact_daily_balance f\nJOIN dim_account a ON a.account_key = f.account_key\nWHERE f.snapshot_date = (SELECT MAX(snapshot_date) FROM fact_daily_balance)\nGROUP BY a.region\nORDER BY a.region;",
  "hints": ["Balances are semi-additive: sum across accounts, not across days.", "Filter to snapshot_date = (SELECT MAX(snapshot_date) ...)."]
}
```

> [!TIP] Interview tips
> - Declare the grain, then list facts and dimensions; refuse to mix grains in one fact table.
> - Classify measures as additive, semi-additive or non-additive and say how each rolls up.
> - Mention surrogate keys, a date dimension and conformed dimensions.
