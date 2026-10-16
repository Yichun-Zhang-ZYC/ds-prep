---
id: data-engineering-relational-vs-nosql
title: Relational vs NoSQL
estimatedMinutes: 10
difficulty: easy
tags: [data-engineering, databases, sql, nosql]
---

## Why it matters
"Would you use PostgreSQL or DynamoDB/MongoDB for this?" comes up in DE, backend and ML system design interviews. A good answer starts from access patterns and consistency needs, not from hype.

## Concept
**Relational databases** (PostgreSQL, MySQL, SQL Server, Oracle):
- Tables with fixed schemas, relationships via foreign keys, **SQL** with joins and aggregations.
- **ACID transactions**: Atomicity, Consistency, Isolation, Durability, so multi-row updates (debit one account, credit another) are all-or-nothing.
- Normalization reduces redundancy; indexes (B-tree) make lookups fast.
- Scale vertically first; read replicas; horizontal sharding is possible but harder (Citus, Vitess, or distributed SQL like CockroachDB, Spanner, YugabyteDB).

**NoSQL** ("not only SQL") families: key-value, document, wide-column, graph (next lesson).
- Flexible or schema-less data models, designed around **access patterns** (often denormalized).
- Built for **horizontal scale** and high write throughput across many nodes.
- Often **BASE**: Basically Available, Soft state, Eventually consistent; many now offer tunable or strong consistency and limited transactions.
- Limited or no joins; ad-hoc analytical queries are awkward.

How to choose:
- Complex relationships, ad-hoc queries, strong transactional integrity (payments, inventory, orders) → **relational** (the default for most applications).
- Massive scale with simple key-based access, flexible/nested schemas, very high write rates, global low latency (user sessions, carts, IoT telemetry, feeds) → **NoSQL**.
- Many systems use both (**polyglot persistence**), plus a warehouse for analytics.

## Worked example
An e-commerce app: orders, payments and inventory in PostgreSQL (transactions across tables, strong consistency); shopping carts and sessions in Redis/DynamoDB (key lookups, huge traffic, TTLs); product catalog with varied attributes per category in a document store; analytics in a warehouse fed by CDC.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Transferring money between two accounts must never leave one debited without the other credited. Which property guarantees this?",
  "options": ["Eventual consistency", "Atomicity (ACID transactions)", "Horizontal sharding", "Schema flexibility"],
  "answer": 1,
  "explanation": "Atomicity makes the transfer all-or-nothing."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Simulate an atomic transaction. `transfer(balances, src, dst, amount)` returns a new balances dict after moving amount from src to dst; if src lacks funds or either account doesn't exist, raise `ValueError` and leave nothing changed (the input dict must be untouched in every case). Then write `choose_store(needs_transactions, needs_joins, key_value_access, massive_scale)` returning 'relational' if transactions or joins are needed, 'nosql' if access is key-value and scale is massive, else 'relational'.",
  "starterCode": "def transfer(balances, src, dst, amount):\n    pass\n\ndef choose_store(needs_transactions, needs_joins, key_value_access, massive_scale):\n    pass\n",
  "tests": "b = {'A': 100, 'B': 20}\nnb = transfer(b, 'A', 'B', 30)\nassert nb == {'A': 70, 'B': 50} and b == {'A': 100, 'B': 20}\nfor args in [('A', 'B', 500), ('A', 'Z', 1)]:\n    try:\n        transfer(b, *args)\n        assert False\n    except ValueError:\n        pass\nassert b == {'A': 100, 'B': 20}\nassert choose_store(True, False, True, True) == 'relational'\nassert choose_store(False, False, True, True) == 'nosql'\nassert choose_store(False, False, False, True) == 'relational'",
  "solution": "def transfer(balances, src, dst, amount):\n    if src not in balances or dst not in balances:\n        raise ValueError('unknown account')\n    if balances[src] < amount:\n        raise ValueError('insufficient funds')\n    out = dict(balances)\n    out[src] -= amount\n    out[dst] += amount\n    return out\n\ndef choose_store(needs_transactions, needs_joins, key_value_access, massive_scale):\n    if needs_transactions or needs_joins:\n        return 'relational'\n    if key_value_access and massive_scale:\n        return 'nosql'\n    return 'relational'",
  "hints": ["Validate everything before changing anything, and work on a copy.", "Transactions/joins push toward relational."]
}
```

> [!TIP] Interview tips
> - Choose by access patterns, consistency needs and scale, not popularity; relational is a strong default.
> - Explain ACID vs BASE and that modern NoSQL often offers tunable consistency.
> - Mention polyglot persistence plus a warehouse for analytics.
