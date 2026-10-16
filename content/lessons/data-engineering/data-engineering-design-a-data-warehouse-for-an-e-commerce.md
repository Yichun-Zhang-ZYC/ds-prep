---
id: data-engineering-design-a-data-warehouse-for-an-e-commerce
title: Design a data warehouse for an e-commerce company
estimatedMinutes: 20
difficulty: hard
tags: [data-engineering, system-design, data-modeling, case-interview]
---

## Why it matters
"Design the analytics warehouse for an online store" tests data modeling (facts, dimensions, SCDs), ingestion, layering and serving. It's a staple for DE and analytics engineering interviews.

## Concept
Approach:
1. **Business questions first**: revenue by day/category/channel, conversion funnel, customer LTV and retention, inventory, marketing ROI, returns.
2. **Sources**: application DB (orders, order_items, customers, products, inventory) via CDC; payments (Stripe); marketing/ads APIs; clickstream; CRM/support tickets.
3. **Ingestion**: managed connectors / Debezium CDC into the warehouse or lakehouse raw layer; events from the clickstream pipeline.
4. **Layers**: raw → staging (clean, typed, 1:1 with sources) → intermediate (business logic) → marts (dimensional models) → semantic layer/metrics.
5. **Dimensional model** (Kimball):
   - `fct_order_items` (grain: one row per order line): order_id, line, date_key, customer_key, product_key, promotion_key, quantity, gross_amount, discount, tax, net_amount.
   - `fct_orders` (grain: one row per order) for order-level facts like shipping fee.
   - `fct_payments`, `fct_returns`, `fct_inventory_daily` (periodic snapshot), `fct_sessions`/funnel facts from clickstream.
   - Dimensions: `dim_date`, `dim_customer` (SCD2 for segment/region), `dim_product` (SCD2 for category/price tier), `dim_store/channel`, `dim_promotion`, `dim_geography`.
6. **Metrics definitions** in one place (dbt semantic layer/metrics): net revenue, AOV, conversion rate (store numerator & denominator), repeat purchase rate.
7. **Operations**: dbt + orchestration, tests (unique/not_null/relationships, reconciliation with payments), incremental models, partitioning/clustering by date, access control on PII, documentation and catalog.

## Worked example
Question: "Net revenue by product category per month, using the category the product had at the time of sale." `fct_order_items` stores the `product_key` (surrogate key from SCD2 `dim_product`) valid at order time, so a product moved from "Gadgets" to "Electronics" in June still reports May sales under Gadgets.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Shipping fee is charged per order, but most analysis is at order-line level. How should you model it?",
  "options": ["Repeat the full shipping fee on every order line", "Keep it in an order-grain fact (fct_orders) or allocate it across lines explicitly", "Drop shipping fees", "Store it in dim_product"],
  "answer": 1,
  "explanation": "Repeating an order-level amount on line-level rows double-counts it when summed."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Using the mini star schema, compute monthly net revenue per category (`year_month`, `category`, `net_revenue`) where net revenue = SUM(net_amount) minus refunds from `fct_returns` for the same order lines. Sort by year_month, then category.",
  "setup": "CREATE TABLE dim_date (date_key INTEGER PRIMARY KEY, year_month TEXT); INSERT INTO dim_date VALUES (20240510,'2024-05'),(20240602,'2024-06'),(20240615,'2024-06'); CREATE TABLE dim_product (product_key INTEGER PRIMARY KEY, product_id INTEGER, category TEXT); INSERT INTO dim_product VALUES (1,100,'Gadgets'),(2,100,'Electronics'),(3,200,'Home'); CREATE TABLE fct_order_items (order_id INTEGER, line INTEGER, date_key INTEGER, product_key INTEGER, net_amount REAL); INSERT INTO fct_order_items VALUES (1,1,20240510,1,100),(2,1,20240602,2,150),(2,2,20240602,3,40),(3,1,20240615,3,60); CREATE TABLE fct_returns (order_id INTEGER, line INTEGER, refund_amount REAL); INSERT INTO fct_returns VALUES (2,2,40);",
  "starterCode": "SELECT d.year_month, p.category\nFROM fct_order_items f\n",
  "solution": "SELECT d.year_month, p.category,\n       SUM(f.net_amount) - COALESCE(SUM(r.refund_amount), 0) AS net_revenue\nFROM fct_order_items f\nJOIN dim_date d ON d.date_key = f.date_key\nJOIN dim_product p ON p.product_key = f.product_key\nLEFT JOIN fct_returns r ON r.order_id = f.order_id AND r.line = f.line\nGROUP BY d.year_month, p.category\nORDER BY d.year_month, p.category;",
  "hints": ["LEFT JOIN returns on (order_id, line) so lines without refunds stay.", "Product 100 appears under two categories because dim_product is SCD2."]
}
```

```reveal
{
  "prompt": "Interview: 'Design the data warehouse for a mid-size e-commerce company. Leadership wants daily revenue, marketing ROI and customer retention dashboards.' Outline your answer.",
  "answer": "**1. Questions & SLAs**: daily revenue/AOV/orders by channel and category (by 8 a.m.), marketing spend vs attributed revenue (ROAS), cohort retention and LTV; data fresh daily, some ops metrics hourly.\n\n**2. Sources & ingestion**: Postgres (orders, items, customers, products, inventory) via CDC (Debezium/Fivetran) → raw; Stripe payments, ad platforms (Google/Meta) via connectors; clickstream from the event pipeline. Land in Snowflake/BigQuery (or Delta/Iceberg lakehouse).\n\n**3. Layers (dbt)**: `stg_` (rename, cast, dedupe CDC to latest), `int_` (order lines with discounts allocated, attribution logic), marts.\n\n**4. Model**: facts `fct_order_items` (line grain), `fct_orders` (order grain: shipping, totals), `fct_payments`, `fct_returns`, `fct_ad_spend_daily` (campaign × day), `fct_sessions`; dimensions `dim_date`, `dim_customer` (SCD2: segment, region), `dim_product` (SCD2: category, price tier), `dim_channel`, `dim_campaign`, `dim_promotion`. Conformed dimensions let revenue and spend join for ROAS.\n\n**5. Metrics**: central definitions (net revenue = gross − discounts − refunds; AOV; conversion = orders / sessions; retention by first-order cohort) in a semantic layer so dashboards agree.\n\n**6. Quality**: dbt tests (unique/not_null/relationships), reconciliation of daily revenue vs Stripe within 0.5%, freshness checks, anomaly alerts on volume.\n\n**7. Performance & cost**: incremental models, partition facts by date and cluster by customer/product, aggregate marts for dashboards, warehouse auto-suspend.\n\n**8. Governance**: PII (emails, addresses) in restricted tables with masking; role-based access; catalog with owners and certified marts; GDPR deletion workflow.\n\n**Tradeoffs to mention**: star schema core with OBT marts for BI convenience; SCD2 only where history matters; late-arriving facts and unknown-member rows in dimensions."
}
```

> [!TIP] Interview tips
> - Start from business questions and SLAs, then sources, layers, and the dimensional model with explicit grains.
> - Show SCD2 where history matters, conformed dimensions across facts, and centralized metric definitions.
> - Close with tests/reconciliation, performance (incremental, partitioning) and governance.
