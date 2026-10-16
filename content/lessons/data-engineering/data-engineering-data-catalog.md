---
id: data-engineering-data-catalog
title: Data catalog
estimatedMinutes: 8
difficulty: easy
tags: [data-engineering, governance, metadata, discovery]
---

## Why it matters
"Which table has the official revenue number?" In a company with 20,000 tables, nobody knows without a catalog. Interviewers ask how you'd make data discoverable, trustworthy and governed.

## Concept
A **data catalog** is a searchable inventory of data assets and their metadata.

Metadata types:
- **Technical**: schemas, column types, partitions, location, row counts, freshness (often harvested automatically from warehouses, lakes, BI tools).
- **Business**: descriptions, glossary terms ("active user" definition), certified/"golden" tables, example queries.
- **Operational**: owners, SLAs, lineage, quality check results, usage/popularity.
- **Governance**: classifications/tags (PII, confidential), access policies, retention.

Two related layers:
- **Technical metastore** used by engines to find tables: Hive Metastore, AWS Glue Data Catalog, Unity Catalog, Iceberg REST catalogs.
- **Discovery/governance catalog** for humans: DataHub, OpenMetadata, Amundsen, Atlan, Alation, Collibra.

Making it useful: automate ingestion (don't rely on manual docs), assign **owners** per table, mark **certified** datasets, surface quality and freshness, integrate with where people work (dbt docs, BI tool, Slack), and tag PII to drive access control.

## Worked example
An analyst searches "revenue" and finds 37 tables. The catalog ranks `analytics.fct_revenue` first: certified badge, owner = Finance Data team, description with the metric definition, last refreshed 2 hours ago, all quality checks passing, used by 120 people last month. Deprecated look-alikes are flagged.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which is an example of business metadata?",
  "options": ["Column data types", "Partition locations on S3", "A glossary definition of 'active customer' attached to a column", "Query execution time"],
  "answer": 2,
  "explanation": "Business metadata explains meaning; technical metadata describes structure."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `search(catalog, term)` over a list of asset dicts (`name`, `description`, `certified` bool, `deprecated` bool, `monthly_users` int). Match when `term` (case-insensitive) appears in name or description; exclude deprecated assets; rank certified assets first, then by monthly_users descending, then name. Return the ordered list of names.",
  "starterCode": "def search(catalog, term):\n    pass\n",
  "tests": "cat = [\n    {'name': 'tmp_revenue_v2', 'description': 'scratch', 'certified': False, 'deprecated': False, 'monthly_users': 3},\n    {'name': 'fct_revenue', 'description': 'Official revenue', 'certified': True, 'deprecated': False, 'monthly_users': 120},\n    {'name': 'old_revenue', 'description': 'Revenue (legacy)', 'certified': False, 'deprecated': True, 'monthly_users': 50},\n    {'name': 'mart_sales', 'description': 'Daily REVENUE by region', 'certified': False, 'deprecated': False, 'monthly_users': 40},\n    {'name': 'dim_user', 'description': 'Users', 'certified': True, 'deprecated': False, 'monthly_users': 500},\n]\nassert search(cat, 'revenue') == ['fct_revenue', 'mart_sales', 'tmp_revenue_v2']\nassert search(cat, 'nothing') == []",
  "solution": "def search(catalog, term):\n    t = term.lower()\n    hits = [a for a in catalog if not a['deprecated'] and (t in a['name'].lower() or t in a['description'].lower())]\n    hits.sort(key=lambda a: (not a['certified'], -a['monthly_users'], a['name']))\n    return [a['name'] for a in hits]",
  "hints": ["Filter first, then sort by a tuple key.", "`not certified` sorts True (certified) before False."]
}
```

> [!TIP] Interview tips
> - Describe technical, business, operational and governance metadata.
> - Distinguish engine metastores (Glue, Hive, Unity) from discovery catalogs (DataHub, Atlan).
> - Emphasize automation, ownership, certification and PII tagging over manual documentation.
