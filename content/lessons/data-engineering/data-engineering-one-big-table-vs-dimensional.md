---
id: data-engineering-one-big-table-vs-dimensional
title: One Big Table vs dimensional
estimatedMinutes: 10
difficulty: medium
tags: [data-engineering, data-modeling, denormalization]
---

## Why it matters
Columnar warehouses made "just flatten everything into one wide table" (OBT) popular. Interviewers ask when you'd choose OBT over a star schema, and what it costs.

## Concept
**One Big Table (OBT)**: a single, very wide, fully denormalized table, e.g. `orders_wide` with order facts plus all customer, product and store attributes repeated on every row.

Pros:
- **No joins** for analysts or BI tools; easy to understand ("one table for orders").
- Fast scans in columnar warehouses: unused columns aren't read, repeated values compress well.
- Great for specific, well-defined use cases: a dashboard, an ML feature table.

Cons:
- **Redundancy**: changing a customer attribute means rewriting many rows; history semantics (SCD) get muddy.
- **Grain confusion**: adding data at another grain (shipments, returns) duplicates rows or forces arrays/nesting.
- **Proliferation**: every team builds its own wide table with slightly different logic, leading to inconsistent metrics.
- Wide rebuilds can be expensive.

**Dimensional model (star schema)**: facts + conformed dimensions. Reusable, consistent across use cases, handles history well; requires joins and modeling discipline.

Common practice: keep a **dimensional core** (facts and conformed dimensions, maintained in dbt), and generate **OBT-style marts** from it for specific dashboards or feature sets. You get consistency and convenience.

## Worked example
A marketing dashboard needs order revenue by customer segment, product category and acquisition channel. A `mart_orders_wide` table built daily from `fact_orders` + `dim_customer` + `dim_product` lets the BI tool query without joins. If the definition of "segment" changes, you fix it once in `dim_customer` and rebuild every mart.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What's a main risk of letting every team build its own One Big Table?",
  "options": ["Too many joins", "Inconsistent metric definitions and duplicated logic across tables", "Columnar warehouses can't store wide tables", "OBTs can't be filtered"],
  "answer": 1,
  "explanation": "Without a shared dimensional core, each wide table encodes slightly different business logic."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Build an OBT-style mart from the star schema: return one row per order line with `order_id`, `amount`, `segment` (from dim_customer) and `category` (from dim_product), sorted by order_id. Include order lines whose product is missing from dim_product (category NULL).",
  "setup": "CREATE TABLE dim_customer (customer_key INTEGER PRIMARY KEY, segment TEXT); INSERT INTO dim_customer VALUES (1,'SMB'),(2,'Enterprise'); CREATE TABLE dim_product (product_key INTEGER PRIMARY KEY, category TEXT); INSERT INTO dim_product VALUES (10,'Software'),(11,'Hardware'); CREATE TABLE fact_order_line (order_id INTEGER, customer_key INTEGER, product_key INTEGER, amount REAL); INSERT INTO fact_order_line VALUES (1,1,10,99),(2,2,11,500),(3,2,99,20);",
  "starterCode": "SELECT f.order_id, f.amount\nFROM fact_order_line f\n",
  "solution": "SELECT f.order_id, f.amount, c.segment, p.category\nFROM fact_order_line f\nJOIN dim_customer c ON c.customer_key = f.customer_key\nLEFT JOIN dim_product p ON p.product_key = f.product_key\nORDER BY f.order_id;",
  "hints": ["Join both dimensions onto the fact.", "Use a LEFT JOIN for dim_product so unknown products aren't dropped."]
}
```

> [!TIP] Interview tips
> - Present OBT and star schema as complementary layers, not rivals.
> - OBT pros: simplicity, no joins, fast columnar scans. Cons: redundancy, grain mixing, metric drift.
> - Mention unknown-member handling (left joins or an "Unknown" dimension row) so wide tables don't silently drop facts.
