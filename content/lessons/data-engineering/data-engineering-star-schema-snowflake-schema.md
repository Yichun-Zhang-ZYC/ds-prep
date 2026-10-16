---
id: data-engineering-star-schema-snowflake-schema
title: Star schema, snowflake schema
estimatedMinutes: 12
difficulty: medium
tags: [data-engineering, data-modeling, dimensional-modeling]
---

## Why it matters
"Model the data for our sales dashboard" is a standard DE/analytics-engineering interview prompt. The star schema (Kimball dimensional modeling) is the expected starting point, and you should know when a snowflake schema makes sense.

## Concept
**Star schema**: one central **fact table** (events/measurements at a fixed grain) surrounded by **dimension tables** (descriptive context), each joined by a surrogate key.

```
                dim_date
                   |
dim_customer — fact_sales — dim_product
                   |
               dim_store
```

- Dimensions are **denormalized**: `dim_product` holds product name, brand, category and department in one table.
- Queries are simple: join the fact to a few dimensions, filter on dimension attributes, aggregate fact measures.
- BI tools and columnar warehouses handle this shape very well.

**Snowflake schema**: dimensions are **normalized** into sub-dimensions (`dim_product → dim_brand → dim_category`).
- Less redundancy and easier maintenance of shared hierarchies.
- More joins, more complex queries, often slower.
- Modern columnar warehouses make storage cheap and compression strong, so the star schema is usually preferred; snowflake when a hierarchy is large, shared, or changes independently.

Design steps (Kimball): 1) choose the **business process** (sales), 2) declare the **grain** (one row per order line), 3) identify **dimensions**, 4) identify **facts** (quantity, amount).

## Worked example
"Revenue by product category and month in the US":

```sql
SELECT d.year_month, p.category, SUM(f.amount) AS revenue
FROM fact_sales f
JOIN dim_date d     ON d.date_key = f.date_key
JOIN dim_product p  ON p.product_key = f.product_key
JOIN dim_store s    ON s.store_key = f.store_key
WHERE s.country = 'US'
GROUP BY d.year_month, p.category;
```
In a snowflake design, `category` would need an extra join through `dim_subcategory → dim_category`.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What is the main difference between a star and a snowflake schema?",
  "options": ["Star schemas have no fact table", "Snowflake schemas normalize dimension tables into sub-dimensions; star schemas keep dimensions denormalized", "Snowflake schemas only work in Snowflake", "Star schemas can't have more than 4 dimensions"],
  "answer": 1,
  "explanation": "The fact table is the same; the difference is whether dimensions are flattened or normalized."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "Using the star schema below, return revenue (`revenue`) per product `category` for orders in **2024-02**, sorted by revenue descending.",
  "setup": "CREATE TABLE dim_date (date_key INTEGER PRIMARY KEY, full_date TEXT, year_month TEXT); INSERT INTO dim_date VALUES (20240115,'2024-01-15','2024-01'),(20240203,'2024-02-03','2024-02'),(20240220,'2024-02-20','2024-02'); CREATE TABLE dim_product (product_key INTEGER PRIMARY KEY, name TEXT, category TEXT); INSERT INTO dim_product VALUES (1,'Laptop','Electronics'),(2,'Phone','Electronics'),(3,'Desk','Furniture'); CREATE TABLE fact_sales (sale_id INTEGER PRIMARY KEY, date_key INTEGER, product_key INTEGER, quantity INTEGER, amount REAL); INSERT INTO fact_sales VALUES (1,20240115,1,1,1200),(2,20240203,2,2,1600),(3,20240203,3,1,300),(4,20240220,1,1,1100),(5,20240220,3,2,650);",
  "starterCode": "SELECT p.category\nFROM fact_sales f\n",
  "solution": "SELECT p.category, SUM(f.amount) AS revenue\nFROM fact_sales f\nJOIN dim_date d ON d.date_key = f.date_key\nJOIN dim_product p ON p.product_key = f.product_key\nWHERE d.year_month = '2024-02'\nGROUP BY p.category\nORDER BY revenue DESC;",
  "hints": ["Join the fact to both dimensions on their keys.", "Filter on dim_date.year_month, group by dim_product.category."]
}
```

> [!TIP] Interview tips
> - Always state the grain of the fact table first ("one row per order line").
> - Default to a star schema in columnar warehouses; justify snowflaking with a concrete reason.
> - Mention surrogate keys and a date dimension; they show dimensional-modeling fluency.
