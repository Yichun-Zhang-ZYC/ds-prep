---
id: sql-joining-on-multiple-keys-non-equi-joins
title: Joining on multiple keys, non-equi joins
estimatedMinutes: 12
difficulty: medium
tags: [joins, non-equi, range-join]
---

## Why it matters
Real joins aren't always `a.id = b.id`. Prices change over time, tax rates depend on brackets, and events must match the session they fall into. These are range (non-equi) joins, and they show up in senior SQL rounds.

## Concept
- **Composite keys**: match on every column that identifies a row, e.g. `ON a.store_id = b.store_id AND a.day = b.day`. Missing one of them fans out the join.
- **Non-equi joins**: any condition other than equality, typically ranges:

```sql
JOIN price_history p
  ON p.product_id = s.product_id
 AND s.sold_at >= p.valid_from
 AND s.sold_at <  p.valid_to        -- half-open range
```

Range joins are correct only if the ranges don't overlap. If two price rows cover the same moment, the sale matches both and fans out.

## Worked example
Look up the tax bracket for each salary:

```sql
SELECT e.name, e.salary, b.rate
FROM employees e
JOIN tax_brackets b
  ON e.salary >= b.lower_bound
 AND e.salary <  b.upper_bound;
```

Range joins can be slow on big tables because ordinary hash joins need equality. Warehouses often add an equality key (like a bucket or date) next to the range to keep them fast.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A price table has rows [Jan 1, Feb 1) and [Jan 15, Mar 1) for the same product. A sale on Jan 20 is range-joined to it. What happens?",
  "options": ["It matches the first row only", "It matches both rows and the sale is duplicated", "It matches neither", "The database picks the latest row"],
  "answer": 1,
  "explanation": "Overlapping validity ranges break range joins. Check for overlaps before trusting the result."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "For each sale, return `sale_id` and the revenue `qty * price` as `revenue`, using the product's price that was valid at `sold_at`. Validity is `valid_from <= sold_at < valid_to`.",
  "setup": "CREATE TABLE sales (sale_id INTEGER PRIMARY KEY, product_id INTEGER, qty INTEGER, sold_at TEXT); CREATE TABLE prices (product_id INTEGER, price REAL, valid_from TEXT, valid_to TEXT); INSERT INTO prices VALUES (1,10.0,'2024-01-01','2024-02-01'),(1,12.0,'2024-02-01','2099-01-01'),(2,5.0,'2024-01-01','2024-03-15'),(2,4.0,'2024-03-15','2099-01-01'); INSERT INTO sales VALUES (1,1,2,'2024-01-20'),(2,1,1,'2024-02-01'),(3,2,10,'2024-03-14'),(4,2,10,'2024-03-15'),(5,1,3,'2024-05-05');",
  "starterCode": "SELECT s.sale_id\nFROM sales s\nJOIN prices p ON p.product_id = s.product_id\n",
  "solution": "SELECT s.sale_id, s.qty * p.price AS revenue\nFROM sales s\nJOIN prices p\n  ON p.product_id = s.product_id\n AND s.sold_at >= p.valid_from\n AND s.sold_at <  p.valid_to;",
  "hints": ["Match on product_id and on the date range.", "Use >= for valid_from and < for valid_to so boundary dates match exactly one row."]
}
```

> [!TIP] Interview tips
> - Ask whether the ranges can overlap and how open-ended rows are stored (NULL or a far-future date).
> - Name this a "slowly changing dimension lookup" if the role is data engineering; it's the same pattern as SCD Type 2.
> - For "latest value as of a date" without valid_to columns, a window (`ROW_NUMBER` over rows before the date) is an alternative.
