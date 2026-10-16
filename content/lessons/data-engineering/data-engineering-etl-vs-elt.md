---
id: data-engineering-etl-vs-elt
title: ETL vs ELT
estimatedMinutes: 8
difficulty: easy
tags: [data-engineering, etl, elt, pipelines]
---

## Why it matters
"ETL or ELT?" is a common opener in data engineering interviews. The shift to ELT shaped the modern data stack (Fivetran/Airbyte + Snowflake/BigQuery + dbt), and you should explain why.

## Concept
- **ETL (Extract → Transform → Load)**: data is transformed on a separate processing server (Informatica, custom Spark/Python jobs) **before** loading into the warehouse. Only clean, modeled data lands.
- **ELT (Extract → Load → Transform)**: raw data is loaded into the warehouse/lakehouse first; transformations run **inside** it with SQL (often dbt).

Why ELT became the default:
- Cloud warehouses provide cheap storage and elastic compute, so transforming in-warehouse is fast and simple.
- Raw data is kept, so you can **re-transform** when business logic changes or bugs are found (replay history).
- Analysts and analytics engineers can own transformations in SQL with version control and tests.
- Managed connectors (Fivetran, Airbyte, Stitch) make "EL" a commodity.

When ETL still makes sense:
- **Privacy/compliance**: PII must be masked or dropped before it reaches the warehouse.
- Heavy non-SQL processing (image/audio parsing, complex ML feature extraction).
- Reducing huge raw volumes before loading (e.g. sampling or aggregating IoT telemetry).
- Legacy on-prem warehouses with expensive compute.

Many real pipelines are hybrid: light transformation in flight (parse, mask PII, standardize types), heavy modeling in the warehouse.

## Worked example
A company syncs Salesforce, Stripe and the app's PostgreSQL into Snowflake with Fivetran (EL). dbt models build `stg_` → `int_` → `fct_revenue`, `dim_customer` (T). When finance changes the revenue recognition rule, they edit one dbt model and rebuild 3 years of history from raw tables, with no re-extraction from sources.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which is a strong reason to prefer ETL over ELT?",
  "options": ["You want to replay history easily", "Sensitive PII must never land in the warehouse in raw form", "Your team prefers SQL", "Storage in the warehouse is cheap"],
  "answer": 1,
  "explanation": "If raw data can't be stored downstream, you must transform (mask/drop) before loading."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `choose_pattern(pii_must_be_masked, heavy_non_sql, warehouse_compute_cheap)` returning `'ETL'` if PII must be masked before landing or the processing is heavy non-SQL work, otherwise `'ELT'` if warehouse compute is cheap, else `'ETL'`. Then write `mask_email(email)` that keeps the first character of the local part and the domain: `'alice@x.com'` → `'a****@x.com'` (the number of stars equals the remaining local-part length).",
  "starterCode": "def choose_pattern(pii_must_be_masked, heavy_non_sql, warehouse_compute_cheap):\n    pass\n\ndef mask_email(email):\n    pass\n\nprint(mask_email('alice@x.com'))",
  "tests": "assert choose_pattern(True, False, True) == 'ETL'\nassert choose_pattern(False, True, True) == 'ETL'\nassert choose_pattern(False, False, True) == 'ELT'\nassert choose_pattern(False, False, False) == 'ETL'\nassert mask_email('alice@x.com') == 'a****@x.com'\nassert mask_email('b@y.org') == 'b@y.org'",
  "solution": "def choose_pattern(pii_must_be_masked, heavy_non_sql, warehouse_compute_cheap):\n    if pii_must_be_masked or heavy_non_sql:\n        return 'ETL'\n    return 'ELT' if warehouse_compute_cheap else 'ETL'\n\ndef mask_email(email):\n    local, domain = email.split('@', 1)\n    return local[0] + '*' * (len(local) - 1) + '@' + domain",
  "hints": ["Check the compliance and heavy-processing conditions first.", "Split once on '@'."]
}
```

> [!TIP] Interview tips
> - Define both in one sentence each, then explain why ELT won in the cloud (cheap compute, replayable raw data, SQL ownership).
> - Name cases for ETL: PII masking, heavy non-SQL processing, volume reduction.
> - Mention the modern stack: Fivetran/Airbyte → warehouse → dbt.
