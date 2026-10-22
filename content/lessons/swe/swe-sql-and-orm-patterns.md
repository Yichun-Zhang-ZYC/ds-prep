---
id: swe-sql-and-orm-patterns
title: Database access patterns and ORMs
estimatedMinutes: 13
difficulty: medium
tags: [sql, orm, sqlalchemy, transactions, n-plus-1]
---

## Why it matters
Almost every data or ML service talks to a relational database. Interviews probe whether you can use an ORM without hurting performance (the N+1 problem), write safe parameterised queries, reason about transactions and pools, and evolve schemas without downtime. See the SQL lessons for query writing and the integration-tests lesson for testing against a database.

## Concept
**Access layers**: raw driver (`psycopg`, `sqlite3`) gives full control; a **query builder / ORM** (SQLAlchemy, Django ORM) maps rows to objects and tracks changes (a **unit of work** flushed on commit). ORMs speed up CRUD and portability; for heavy analytics, window functions or bulk loads, drop to hand-written SQL (SQLAlchemy Core, `text()`), or use the warehouse tooling.

**Sessions and transactions**: a session wraps a transaction. Pattern: one session per request/job, commit once at the end, roll back on error, close in `finally` (a context manager). Keep transactions short: long ones hold locks and bloat MVCC. Know isolation levels (read committed is the common default; repeatable read and serializable prevent more anomalies at the cost of retries).

**Connection pooling**: opening connections is expensive and the database caps them (Postgres is often a few hundred). Use an application pool (size roughly workers x threads, not more than the database limit) and a server-side pooler such as PgBouncer when many services connect. Set timeouts; return connections promptly; do not share one connection across threads or forked processes.

**Safety**: always use **bound parameters** (`WHERE id = %s` / `:id`), never string formatting. This prevents SQL injection and lets the database reuse plans. Identifiers (table/column names) cannot be bound, so whitelist them.

**N+1 problem**: lazy-loading a relationship inside a loop issues 1 query for the parents plus N for children. Fix with eager loading (`selectinload` issues one extra `IN (...)` query; `joinedload` uses a JOIN, which can multiply rows for one-to-many), or fetch with a single query and group in Python. Detect it with query logging, counters in tests or APM traces.

**Other patterns**: **bulk operations** (`executemany`, multi-row INSERT, `COPY`) instead of row-at-a-time; **upsert** (`INSERT ... ON CONFLICT DO UPDATE`) for idempotent writes; **keyset pagination** (`WHERE id > :last ORDER BY id LIMIT n`) instead of large `OFFSET`, which scans and discards rows; select only needed columns; add indexes for filters and joins and check with `EXPLAIN`; optimistic locking with a version column for concurrent updates.

**Migrations** (Alembic, Flyway): versioned, reviewed, applied in CI/CD. Zero-downtime changes use **expand/contract**: add a nullable column, deploy code writing both, backfill in batches, switch reads, then drop the old column. Avoid long table locks (adding indexes `CONCURRENTLY` in Postgres).

**Pitfalls**: lazy loading after the session closed; ORM objects used as API responses; huge `IN` lists; autoflush surprises; missing indexes on foreign keys; mixing ORM sessions and raw connections in one transaction.

## Worked example
Illustrative: an endpoint lists 100 users with their orders. Lazy loading runs 1 + 100 = 101 queries; at about 2 ms each (including network round trip) that is roughly 200 ms. With `selectinload(User.orders)` it is 2 queries (users, then `WHERE user_id IN (...)`), about 4-6 ms.

Pagination: `ORDER BY id LIMIT 50 OFFSET 1000000` must walk past a million index entries on every call, and gets slower on later pages. `WHERE id > :last_id ORDER BY id LIMIT 50` seeks directly in the primary-key index, so page 20,000 costs the same as page 1. The trade-off: no jumping to an arbitrary page number.

Money transfer: debit and credit must be in one transaction. Debit with `UPDATE ... SET balance = balance - 30 WHERE id = 1 AND balance >= 30` and check the affected row count; if the credit then fails (unknown account), rolling back restores the debit.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "An API returns 200 orders, each with its customer via lazy loading, and takes 400 ms. What is the most likely issue and fix?",
  "options": [
    "Missing GPU; add one",
    "N+1 queries; eager-load customers (selectinload/joinedload) or join once",
    "Too few indexes on the primary key",
    "The ORM must be removed entirely"
  ],
  "answer": 1,
  "explanation": "Lazy loading in a loop issues one extra query per row. Eager loading or a join collapses it to one or two queries."
}
```

```quiz
{
  "id": "q2",
  "question": "Why use bound parameters instead of f-string SQL?",
  "options": [
    "They are shorter",
    "They prevent SQL injection and the database treats values as data, not code",
    "They make queries cacheable by the browser",
    "They allow dynamic table names"
  ],
  "answer": 1,
  "explanation": "Parameters are sent separately from the SQL text, so input cannot change the query structure. Table names cannot be bound."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Fix an N+1. `orders_by_user(user_ids, fetch)` receives `fetch(ids)`, one query returning `(user_id, order)` pairs for all ids. Call it exactly once (never for an empty list) and return a dict with a list for every requested id, empty if the user has no orders.",
  "starterCode": "def orders_by_user(user_ids, fetch):\n    \"\"\"Avoid the N+1 pattern. `fetch(ids)` runs ONE query and returns a list of\n    (user_id, order) pairs for all the given ids. Call it exactly once (and not at\n    all for an empty list) and return {user_id: [orders...]} with an entry for every\n    requested id (empty list if none), preserving the order orders were returned in.\"\"\"\n    pass\n\ncalls = []\ndef fake_fetch(ids):\n    calls.append(list(ids))\n    return [(1, \"o1\"), (2, \"o2\"), (1, \"o3\")]\n\nprint(orders_by_user([1, 2, 3], fake_fetch), calls)",
  "tests": "calls = []\ndef fake_fetch(ids):\n    calls.append(list(ids))\n    return [(1, \"o1\"), (2, \"o2\"), (1, \"o3\")]\n\nr = orders_by_user([1, 2, 3], fake_fetch)\nassert r == {1: [\"o1\", \"o3\"], 2: [\"o2\"], 3: []}\nassert len(calls) == 1 and calls[0] == [1, 2, 3]\ncalls.clear()\nassert orders_by_user([], fake_fetch) == {}\nassert calls == []",
  "solution": "def orders_by_user(user_ids, fetch):\n    out = {uid: [] for uid in user_ids}\n    if not user_ids:\n        return out\n    for uid, order in fetch(user_ids):\n        out[uid].append(order)\n    return out",
  "hints": [
    "Initialise the result with an empty list per requested id first.",
    "Then loop over the single batch of results and append."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Atomic transfer with sqlite3. Implement `transfer(conn, src, dst, amount)` using parameterised SQL inside one transaction (`with conn:`). Raise `ValueError` and leave balances untouched if the source lacks funds or either account does not exist.",
  "starterCode": "import sqlite3\n\ndef transfer(conn, src, dst, amount):\n    \"\"\"Move `amount` from account src to dst atomically, using parameterised SQL.\n    Table: accounts(id INTEGER PRIMARY KEY, balance INTEGER).\n    Raise ValueError (and leave ALL balances unchanged) if src has insufficient\n    funds or either account does not exist.\"\"\"\n    pass\n\nconn = sqlite3.connect(\":memory:\")\nconn.execute(\"CREATE TABLE accounts (id INTEGER PRIMARY KEY, balance INTEGER)\")\nconn.executemany(\"INSERT INTO accounts VALUES (?, ?)\", [(1, 100), (2, 50)])\nconn.commit()\ntransfer(conn, 1, 2, 30)\nprint(conn.execute(\"SELECT id, balance FROM accounts ORDER BY id\").fetchall())",
  "tests": "import sqlite3\n\ndef fresh():\n    c = sqlite3.connect(\":memory:\")\n    c.execute(\"CREATE TABLE accounts (id INTEGER PRIMARY KEY, balance INTEGER)\")\n    c.executemany(\"INSERT INTO accounts VALUES (?, ?)\", [(1, 100), (2, 50)])\n    c.commit()\n    return c\n\ndef bal(c):\n    return c.execute(\"SELECT id, balance FROM accounts ORDER BY id\").fetchall()\n\nc = fresh()\ntransfer(c, 1, 2, 30)\nassert bal(c) == [(1, 70), (2, 80)]\nc = fresh()\ntry:\n    transfer(c, 1, 2, 500)\n    assert False\nexcept ValueError:\n    pass\nassert bal(c) == [(1, 100), (2, 50)]\nc = fresh()\ntry:\n    transfer(c, 1, 99, 10)\n    assert False\nexcept ValueError:\n    pass\nassert bal(c) == [(1, 100), (2, 50)]",
  "solution": "import sqlite3\n\ndef transfer(conn, src, dst, amount):\n    with conn:\n        cur = conn.execute(\"UPDATE accounts SET balance = balance - ? WHERE id = ? AND balance >= ?\", (amount, src, amount))\n        if cur.rowcount != 1:\n            raise ValueError(\"insufficient funds or unknown source\")\n        cur = conn.execute(\"UPDATE accounts SET balance = balance + ? WHERE id = ?\", (amount, dst))\n        if cur.rowcount != 1:\n            raise ValueError(\"unknown destination\")",
  "hints": [
    "`with conn:` commits on success and rolls back if an exception escapes.",
    "Check `cursor.rowcount` after each UPDATE to detect a missing row or failed guard."
  ]
}
```

> [!TIP] Interview tips
- Name N+1 immediately, then give the fixes (eager load, join, batch IN query) and how you would detect it.
- Always say parameterised queries, short transactions, one session per request.
- Mention pooling limits and PgBouncer, keyset pagination and upserts for idempotent loads.
- For schema changes describe expand/contract migrations for zero downtime.
