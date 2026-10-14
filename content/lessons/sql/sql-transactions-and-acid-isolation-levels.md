---
id: sql-transactions-and-acid-isolation-levels
title: Transactions and ACID, isolation levels
estimatedMinutes: 15
difficulty: hard
tags: [transactions, acid, concurrency, internals]
---

## Why it matters
Data engineers and backend-leaning roles get asked "what does ACID mean?" and "what can go wrong when two transactions run at once?". Knowing the isolation anomalies by name is what makes the answer convincing.

## Concept
A **transaction** groups statements so they succeed or fail together (`BEGIN … COMMIT`, or `ROLLBACK`).

**ACID**:
- **Atomicity**: all or nothing.
- **Consistency**: constraints hold before and after.
- **Isolation**: concurrent transactions don't see each other's half-done work (to a chosen degree).
- **Durability**: once committed, it survives crashes.

Isolation levels trade safety for concurrency:

| Level | Dirty read | Non-repeatable read | Phantom read |
|---|---|---|---|
| Read Uncommitted | possible | possible | possible |
| Read Committed (Postgres default) | prevented | possible | possible |
| Repeatable Read (MySQL InnoDB default) | prevented | prevented | possible in the standard (prevented in Postgres) |
| Serializable | prevented | prevented | prevented |

- **Dirty read**: seeing another transaction's uncommitted change.
- **Non-repeatable read**: reading the same row twice and getting different values.
- **Phantom read**: re-running a range query and getting new rows.
- **Lost update**: two transactions read a value, both write, one write is lost.

## Worked example
Transferring money atomically, with a row lock to avoid lost updates:

```sql
BEGIN;
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;   -- lock the row
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;   -- both updates apply, or neither (ROLLBACK on error)
```

`balance = balance - 100` (instead of writing a value computed in the app) also avoids lost updates, because the database computes it from the current value.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Transaction A reads a row, B updates and commits it, then A reads the same row again and sees the new value. Which anomaly is this?",
  "options": ["Dirty read", "Non-repeatable read", "Phantom read", "Lost update"],
  "answer": 1,
  "explanation": "Same row, read twice, different committed values: non-repeatable read. Repeatable Read or Serializable prevents it."
}
```

```quiz
{
  "id": "q2",
  "question": "Why don't analytical warehouses usually focus on isolation levels the way OLTP databases do?",
  "options": ["They don't support transactions at all", "Workloads are mostly batch loads plus reads; they typically use snapshot isolation so readers see a consistent version", "Isolation is only for NoSQL", "They always run at Read Uncommitted"],
  "answer": 1,
  "explanation": "Snowflake, BigQuery and Delta Lake give readers a consistent snapshot; concurrent row-level updates are rare compared to OLTP."
}
```

> [!TIP] Interview tips
> - Define each ACID letter in one short sentence; don't over-explain.
> - Give one concrete anomaly example (the double-booking or bank-transfer story) to show you understand the risk.
> - For pipelines, connect it to idempotency: if a load fails halfway, a transaction (or atomic swap) prevents half-loaded tables.
