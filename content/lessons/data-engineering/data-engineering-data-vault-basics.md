---
id: data-engineering-data-vault-basics
title: Data vault basics
estimatedMinutes: 10
difficulty: medium
tags: [data-engineering, data-modeling, data-vault]
---

## Why it matters
Large enterprises with many source systems and audit requirements often use Data Vault for the integration layer. You may be asked how it differs from dimensional modeling and when it's worth the complexity.

## Concept
Data Vault 2.0 splits data into three table types:
- **Hubs**: one row per unique **business key** (customer number, product SKU). Columns: hash key, business key, load timestamp, record source. Hubs rarely change.
- **Links**: relationships between hubs (customer–order, order–product), keyed by a hash of the participating hub keys. Many-to-many by design.
- **Satellites**: descriptive attributes and their **history**, attached to a hub or link (customer name, address, status), with load timestamps. New versions are inserted, never updated (insert-only).

Properties:
- **Auditability**: every row records when it was loaded and from which source; nothing is overwritten.
- **Scalability and parallel loading**: hash keys let hubs, links and satellites load independently and in parallel.
- **Flexibility**: adding a new source or attribute means adding a satellite, not refactoring tables.
- **Downside**: many tables and joins; not query-friendly for analysts. Teams build a **dimensional (star) layer** on top for reporting ("raw vault → business vault → marts").

When to use: many volatile source systems, strict audit/compliance needs, large enterprise integration. For a startup with a few sources, a staging layer plus star schemas (often with dbt) is simpler.

## Worked example
A bank merges two CRM systems that both have customers. Hub_Customer holds every distinct customer number once; Sat_Customer_CRM_A and Sat_Customer_CRM_B hold each system's attributes with full history; Link_Customer_Account connects customers to accounts. Reporting reads a `dim_customer` view built from the hub and the latest satellite rows.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "In Data Vault, where are a customer's changing attributes (address, segment) stored?",
  "options": ["Hub", "Link", "Satellite", "Fact table"],
  "answer": 2,
  "explanation": "Satellites hold descriptive attributes and their history; hubs hold only business keys."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Build the current customer view from a hub and an insert-only satellite. Return `customer_number` and the **latest** `segment` (by `load_ts`) for each customer, sorted by customer_number.",
  "setup": "CREATE TABLE hub_customer (customer_hk TEXT PRIMARY KEY, customer_number TEXT, load_ts TEXT, record_source TEXT); INSERT INTO hub_customer VALUES ('h1','C-001','2024-01-01','crm'),('h2','C-002','2024-01-05','crm'); CREATE TABLE sat_customer (customer_hk TEXT, load_ts TEXT, segment TEXT, record_source TEXT); INSERT INTO sat_customer VALUES ('h1','2024-01-01','basic','crm'),('h1','2024-04-10','premium','crm'),('h2','2024-01-05','basic','crm'),('h1','2024-02-01','plus','crm');",
  "starterCode": "SELECT h.customer_number\nFROM hub_customer h\n",
  "solution": "SELECT h.customer_number, s.segment\nFROM hub_customer h\nJOIN sat_customer s ON s.customer_hk = h.customer_hk\nWHERE s.load_ts = (SELECT MAX(s2.load_ts) FROM sat_customer s2 WHERE s2.customer_hk = h.customer_hk)\nORDER BY h.customer_number;",
  "hints": ["Satellites keep every version; you want the row with the max load_ts per hash key.", "A correlated subquery or ROW_NUMBER() works."]
}
```

> [!TIP] Interview tips
> - Name hubs (keys), links (relationships), satellites (attributes + history).
> - Sell its strengths (auditability, parallel loads, easy source onboarding) and admit the cost (query complexity).
> - Say you'd still expose star-schema marts on top for analysts.
