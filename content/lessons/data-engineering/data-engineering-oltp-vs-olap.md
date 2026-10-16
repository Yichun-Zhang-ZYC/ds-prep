---
id: data-engineering-oltp-vs-olap
title: OLTP vs OLAP
estimatedMinutes: 8
difficulty: easy
tags: [data-engineering, data-modeling, databases]
---

## Why it matters
Almost every data engineering conversation starts by separating the systems that **run** the business from the systems that **analyze** it. Mixing them up (running heavy analytics on the production database) is a classic outage story, and interviewers expect you to explain why they're designed differently.

## Concept

| | OLTP (online transaction processing) | OLAP (online analytical processing) |
|---|---|---|
| Purpose | Run the application: place order, update profile | Analyze: revenue by region last quarter |
| Queries | Many small reads/writes by key | Few large scans and aggregations |
| Data | Current state, highly normalized (3NF) | History, denormalized (star schema) |
| Storage | Row-oriented, B-tree indexes | Columnar, compressed, partitioned |
| Users | Application, thousands of concurrent requests | Analysts, BI tools, ML pipelines |
| Latency goal | Milliseconds per transaction | Seconds to minutes per query |
| Examples | PostgreSQL, MySQL, DynamoDB | BigQuery, Snowflake, Redshift, ClickHouse, DuckDB |

- OLTP needs **ACID transactions** and concurrency control; normalization avoids update anomalies.
- OLAP optimizes for read throughput: columnar storage reads only needed columns, compression shrinks scans, and denormalization avoids expensive joins.
- Data moves from OLTP to OLAP through **ETL/ELT** pipelines or **CDC** (change data capture), usually with some delay (minutes to a day).
- **HTAP** systems try to do both, but most companies still separate them.

## Worked example
A product team wants "average order value per country per week for 3 years" on a dashboard. Running that against the production PostgreSQL scans 500M order rows and locks resources during peak traffic. Instead, orders are replicated nightly (or via CDC) into BigQuery, where a columnar scan of 3 columns finishes in seconds without touching production.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which workload is typical of OLAP?",
  "options": ["Update a user's shipping address", "Insert a new order", "Compute monthly revenue by product category over 5 years", "Look up a session by ID"],
  "answer": 2,
  "explanation": "Large aggregations over history are analytical; the others are short transactions."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "The normalized OLTP tables `orders` and `customers` are below. Write the kind of analytical query an OLAP system serves: total revenue (`revenue`) and number of orders (`orders`) per customer `country`, sorted by revenue descending.",
  "setup": "CREATE TABLE customers (customer_id INTEGER PRIMARY KEY, name TEXT, country TEXT); INSERT INTO customers VALUES (1,'Ana','US'),(2,'Ben','CA'),(3,'Chloe','US'),(4,'Dev','IN'); CREATE TABLE orders (order_id INTEGER PRIMARY KEY, customer_id INTEGER, amount REAL, created_at TEXT); INSERT INTO orders VALUES (10,1,120.0,'2024-01-03'),(11,2,80.0,'2024-01-04'),(12,1,40.0,'2024-02-10'),(13,3,200.0,'2024-02-11'),(14,4,15.0,'2024-03-01');",
  "starterCode": "SELECT c.country\nFROM orders o\nJOIN customers c ON c.customer_id = o.customer_id\n",
  "solution": "SELECT c.country, SUM(o.amount) AS revenue, COUNT(*) AS orders\nFROM orders o\nJOIN customers c ON c.customer_id = o.customer_id\nGROUP BY c.country\nORDER BY revenue DESC;",
  "hints": ["Join orders to customers to get the country.", "GROUP BY country, then SUM and COUNT."]
}
```

> [!TIP] Interview tips
> - Contrast the two on purpose, query shape, schema, storage layout and latency.
> - Say how data gets from OLTP to OLAP (batch ETL/ELT or CDC) and the freshness tradeoff.
> - Never propose heavy analytics on the production database; mention read replicas as a stopgap.
