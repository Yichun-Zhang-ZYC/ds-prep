---
id: swe-integration-tests
title: "Integration tests"
estimatedMinutes: 12
difficulty: medium
tags: [testing, integration-tests, databases, pipelines]
---

## Why it matters
Unit tests prove each part works alone; production bugs live in the seams: a SQL query that does not match the schema, a serialization format a downstream service rejects, a migration that was never applied. "How do you know your pipeline works end to end?" is an interview staple.

## Concept
**Integration test**: exercises several real components together (your code + a database, a file system, a queue, an HTTP API) to verify they cooperate. It is slower and less precise than a unit test but catches wiring and contract errors that mocks hide.

**Testing pyramid.** Many unit tests (ms), fewer integration tests (100 ms to seconds), a handful of end-to-end tests (full system, minutes). Invert it and the suite becomes slow and flaky.

```python
# conftest.py: a real (throwaway) database per test
import pytest, sqlalchemy as sa

@pytest.fixture
def db(tmp_path):
    engine = sa.create_engine(f"sqlite:///{tmp_path}/test.db")   # or a Postgres container
    apply_migrations(engine)                                     # same schema as prod
    yield engine
    engine.dispose()

def test_pipeline_writes_daily_totals(db):
    load_raw_events(db, sample_events())          # real insert
    run_daily_job(db, day="2024-05-01")           # real SQL, real transaction
    rows = db.execute(sa.text("SELECT user_id, total FROM daily")).fetchall()
    assert sorted(rows) == [(1, 30.0), (2, 5.0)]
```

**Making them reliable.**
- Use a **real but disposable dependency**: SQLite or a Postgres/Redis container (Testcontainers, docker compose) instead of mocking the database. Apply the *same migrations* as production.
- **Isolation**: each test starts from a known state, via a fresh DB, a transaction rolled back at the end, or truncated tables. Tests must not depend on order.
- Control nondeterminism: fixed seeds, frozen time, no calls to the live internet. For third-party APIs use recorded responses or a local fake server, and keep a few *contract tests* to detect upstream drift.
- **Data pipelines**: run the whole job on a tiny fixture dataset and assert on output tables and schema (columns, dtypes, row counts, no duplicate keys), including a bad-input case.
- Mark them (`@pytest.mark.integration`) so developers run units on every save and integration tests in CI.

**What to assert**: transactionality (partial failure leaves no partial writes), idempotency (running the job twice gives the same result), and constraints (unique keys, non-null) actually enforced.

## Worked example
Scenario: a daily job upserts per-user totals. A unit test with a mocked DB passes, yet production fails: the real table has `UNIQUE(user_id, day)` and the job's `INSERT` ignores it.

An integration test against SQLite with the production schema runs the job twice. The second run raises `IntegrityError`, exposing the missing upsert. After switching to `INSERT ... ON CONFLICT DO UPDATE`, the test asserts the table still has exactly 2 rows after two runs, which also proves idempotency.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A unit test with a mocked database passes, but production fails on a UNIQUE constraint. What kind of test would have caught it?",
  "options": [
    "More unit tests with more mocks",
    "An integration test against a real (disposable) database using the production schema",
    "A linter",
    "A load test"
  ],
  "answer": 1,
  "explanation": "The constraint lives in the real schema; a mock cannot enforce it."
}
```

```quiz
{
  "id": "q2",
  "question": "Which practice most improves reliability of integration tests?",
  "options": [
    "Sharing one long-lived test database across all tests",
    "Relying on test execution order",
    "Calling live third-party APIs",
    "Starting each test from a known, isolated state (fresh DB or rolled-back transaction)"
  ],
  "answer": 3,
  "explanation": "Isolation makes tests independent, repeatable and parallelizable."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write the integration-style pieces of `OrderRepo` against an in-memory SQLite database. `add_many(rows)` inserts `(id, customer, amount)` tuples in a single transaction, so a duplicate id or negative amount (violating the table's PRIMARY KEY / CHECK) raises `sqlite3.IntegrityError` and leaves no partial rows. `totals()` returns `{customer: total_amount}`.",
  "starterCode": "import sqlite3\n\nclass OrderRepo:\n    def __init__(self, conn):\n        self.conn = conn\n        self.conn.execute(\n            \"CREATE TABLE IF NOT EXISTS orders (\"\n            \"id INTEGER PRIMARY KEY, customer TEXT NOT NULL, amount REAL NOT NULL CHECK (amount >= 0))\"\n        )\n\n    def add_many(self, rows):\n        \"\"\"rows: list of (id, customer, amount). Insert all in ONE transaction:\n        if any row violates a constraint, nothing is inserted and the\n        sqlite3.IntegrityError propagates.\"\"\"\n        pass\n\n    def totals(self):\n        \"\"\"Return {customer: sum of amount} for all stored orders.\"\"\"\n        pass\n",
  "tests": "conn = sqlite3.connect(\":memory:\")\nrepo = OrderRepo(conn)\nrepo.add_many([(1, \"ann\", 10.0), (2, \"bob\", 5.0), (3, \"ann\", 20.0)])\nassert repo.totals() == {\"ann\": 30.0, \"bob\": 5.0}\ntry:\n    repo.add_many([(4, \"cy\", 7.0), (1, \"dup\", 1.0)])\n    assert False, \"duplicate id should fail\"\nexcept sqlite3.IntegrityError:\n    pass\nassert \"cy\" not in repo.totals()\ntry:\n    repo.add_many([(5, \"eve\", -3.0)])\n    assert False, \"negative amount should fail\"\nexcept sqlite3.IntegrityError:\n    pass\nassert repo.totals() == {\"ann\": 30.0, \"bob\": 5.0}\n",
  "solution": "import sqlite3\n\nclass OrderRepo:\n    def __init__(self, conn):\n        self.conn = conn\n        self.conn.execute(\n            \"CREATE TABLE IF NOT EXISTS orders (\"\n            \"id INTEGER PRIMARY KEY, customer TEXT NOT NULL, amount REAL NOT NULL CHECK (amount >= 0))\"\n        )\n\n    def add_many(self, rows):\n        with self.conn:\n            self.conn.executemany(\"INSERT INTO orders (id, customer, amount) VALUES (?, ?, ?)\", rows)\n\n    def totals(self):\n        cur = self.conn.execute(\"SELECT customer, SUM(amount) FROM orders GROUP BY customer\")\n        return {c: t for c, t in cur.fetchall()}\n",
  "hints": [
    "`with conn:` commits on success and rolls back on exception.",
    "Use `executemany` for the insert and `GROUP BY customer` with `SUM(amount)` for totals."
  ]
}
```

> [!TIP] Interview tips
> - Frame it as risk: unit tests for logic, integration tests for boundaries (DB, queues, APIs), few end-to-end tests for critical journeys.
> - Say "disposable real dependency + production schema + isolated state" and mention idempotency and rollback checks for pipelines.
> - Pitfall: shared test databases and order-dependent tests; they pass locally and fail in CI.
