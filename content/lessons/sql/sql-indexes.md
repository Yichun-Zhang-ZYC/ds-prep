---
id: sql-indexes
title: Indexes (B-tree, composite index)
estimatedMinutes: 12
difficulty: medium
tags: [performance, indexes, internals]
---

## Why it matters
"This query is slow, what would you do?" The first answer is almost always about indexes. Interviewers expect you to know how a B-tree index helps, when it can't, and how column order in a composite index matters.

## Concept
A **B-tree index** keeps a column's values sorted, with pointers to the rows. Finding a value or a range takes O(log n) instead of scanning the whole table.

An index helps when the query filters, joins or sorts on the indexed columns **and** selects a small fraction of rows. It does not help (or isn't used) when:
- the condition wraps the column in a function: `WHERE LOWER(email) = ...` (unless you index that expression),
- the pattern starts with a wildcard: `LIKE '%gmail.com'`,
- most rows match anyway (a full scan is cheaper),
- the column has very few distinct values and the filter isn't selective.

A **composite index** on `(a, b)` is sorted by `a`, then by `b` within each `a`. It serves `WHERE a = ?` and `WHERE a = ? AND b = ?`, but not `WHERE b = ?` alone (the **leftmost-prefix rule**). Put equality columns first and range columns last.

Indexes aren't free: they use storage and slow down every `INSERT`, `UPDATE` and `DELETE`.

## Worked example
A common query and an index that fits it:

```sql
-- Query: a user's recent orders
SELECT order_id, amount
FROM orders
WHERE user_id = 42 AND order_date >= '2024-01-01'
ORDER BY order_date DESC;

-- Index: equality column first, then the range / sort column
CREATE INDEX idx_orders_user_date ON orders (user_id, order_date);
```

If the index also includes `amount` (a **covering index**), the database can answer from the index alone without reading the table rows.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "There is an index on `(country, city)`. Which filters can use it efficiently? Select all that apply.",
  "type": "multi",
  "options": ["`WHERE country = 'US'`", "`WHERE country = 'US' AND city = 'Boston'`", "`WHERE city = 'Boston'`", "`WHERE country = 'US' ORDER BY city`"],
  "answer": [0, 1, 3],
  "explanation": "The leftmost prefix (country) must be constrained. city alone can't use the sorted order of (country, city)."
}
```

```quiz
{
  "id": "q2",
  "question": "`created_at` is indexed, but `WHERE DATE(created_at) = '2024-05-01'` is slow. Why, and what's the fix?",
  "options": ["DATE() is slow; cache it", "Wrapping the column in a function prevents using the index; rewrite as a range on created_at", "Indexes don't work on dates", "Add an index on DATE"],
  "answer": 1,
  "explanation": "Rewrite as created_at >= '2024-05-01' AND created_at < '2024-05-02' so the index on created_at can be used (or index the expression)."
}
```

```reveal
{
  "prompt": "A dashboard query on a 500M-row events table got slow. Walk through how you'd investigate.",
  "answer": "1. **Look at the plan** (`EXPLAIN` / query profile): is it scanning the whole table? Which step takes the time?\n2. **Check filters**: are they on indexed / partitioned / clustered columns, and are they sargable (no functions on the column)?\n3. **Check joins**: fan-out, missing join keys, or a huge shuffle in a warehouse.\n4. **Reduce data early**: filter by date partition first, select only needed columns.\n5. **Then structural fixes**: add or adjust an index (OLTP), partition / cluster by date and a common filter key (warehouse), or pre-aggregate into a summary table.\n\nState the trade-offs: write cost of indexes, storage, and freshness of summary tables."
}
```

> [!TIP] Interview tips
> - Say "I'd check the query plan first" before suggesting any index.
> - Use the word **sargable** (search-argument-able) for filters that can use an index.
> - In columnar warehouses (BigQuery, Snowflake), talk about partitioning and clustering rather than B-tree indexes.
