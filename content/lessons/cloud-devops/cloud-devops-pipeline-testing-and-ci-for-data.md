---
id: cloud-devops-pipeline-testing-and-ci-for-data
title: Pipeline testing & CI for data
estimatedMinutes: 12
difficulty: medium
tags: [dataops, testing, ci-cd, dbt, data-quality]
---

## Why it matters
Data pipelines break silently: a join fan-out doubles revenue, a renamed column yields NULLs, and nobody notices for a week. Interviewers want to hear how you test transformations, gate merges with CI, and deploy safely.

## Concept
**Layers of data testing** (a pyramid):
- **Unit tests**: pure transformation functions and SQL macros on tiny hand-built fixtures (pytest, dbt unit tests). Fast, deterministic, run on every commit.
- **Data tests / assertions** on real data: `not_null`, `unique`, `accepted_values`, `relationships` (referential integrity), row-count and range checks. Tools: dbt tests, Great Expectations, Soda. Mark each as `error` (block publish) or `warn`.
- **Schema / contract tests**: columns, types and semantics agreed with producers and consumers; fail on breaking changes.
- **Integration / end-to-end tests**: run the pipeline on a sample in an isolated environment and check outputs.
- **Regression / diff tests**: compare the PR's output to production (row counts, aggregates, `data-diff`) to catch unintended changes.

```yaml
# models/staging/schema.yml (dbt data tests)
models:
  - name: stg_orders
    columns:
      - name: order_id
        data_tests: [unique, not_null]
      - name: status
        data_tests:
          - accepted_values: {values: [placed, shipped, returned]}
      - name: user_id
        data_tests:
          - relationships: {to: ref('stg_users'), field: user_id}
```

**CI for data** (on every pull request):
1. **Static checks**: lint SQL (sqlfluff) and Python (ruff), compile/parse models, validate YAML and DAG.
2. **Unit tests** with pytest.
3. **Build in an isolated schema/database** per PR (clone or sample of prod so it is cheap), so PRs cannot touch production tables.
4. **Slim CI**: build only modified models and their descendants (`state:modified+`), and **defer** unchanged upstream refs to production. This is faster and cheaper than rebuilding the whole warehouse.
5. **Run data tests**, then drop the schema.

```yaml
# CI on pull request: build only what changed, in an isolated schema
- run: sqlfluff lint models/ && ruff check .
- run: pytest tests/unit
- run: dbt build --select state:modified+ --defer --state prod-artifacts/ --target ci
  env: {DBT_SCHEMA: ci_pr_${{ github.event.number }}}
- run: dbt run-operation drop_schema --args '{schema: ci_pr_${{ github.event.number }}}'
  if: always()
```

**CD**: merge to `main` deploys code through the same stages; the orchestrator (Airflow, Dagster) runs the new version. Use **write-audit-publish**: write to a staging table, run tests, then atomically swap/publish only if they pass. Also test **idempotency** (re-running a partition gives identical output) and backfills.

**Pitfalls**: tests that only run in CI but not in production (data changes daily); no ownership for failed tests; flaky tests from non-deterministic fixtures; slow full-warehouse builds; testing on tiny data that hides skew and fan-out.

## Worked example
A PR changes the join in `stg_orders`. CI builds `stg_orders` and its descendants `fct_orders` and `dash` in schema `ci_pr_123` on a 1% sample. The `unique(order_id)` test fails for 3 rows: the new join fans out. The PR cannot merge. The developer adds a dedup, CI turns green, and the diff against production shows revenue unchanged within 0.01%. After merge, the nightly run uses write-audit-publish so a bad day's data never reaches the dashboard table.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What does `dbt build --select state:modified+ --defer` accomplish in CI?",
  "options": [
    "Builds every model in the project",
    "Builds only changed models and their descendants, reading unchanged upstream models from production",
    "Deploys to production",
    "Skips all tests"
  ],
  "answer": 1,
  "explanation": "Slim CI selects modified nodes plus downstream, and defers unchanged upstream references to production artifacts, saving time and compute."
}
```

```quiz
{
  "id": "q2",
  "question": "Which test would catch a join that accidentally duplicates order rows?",
  "options": [
    "not_null on order_id",
    "unique on order_id",
    "accepted_values on status",
    "A linter"
  ],
  "answer": 1,
  "explanation": "Fan-out creates duplicate keys, which a uniqueness test detects. not_null and accepted_values would still pass."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement tiny data-test and slim-CI helpers on lists of dict rows. `not_null(rows, col)` returns indices of rows where the column is None or missing. `unique(rows, col)` returns indices of all rows whose value appears more than once. `accepted_values(rows, col, allowed)` returns indices of rows whose non-null value is not in `allowed` (nulls belong to `not_null`). `downstream(changed, deps)` takes `deps` (model -> list of upstream models) and returns a sorted list of the changed models plus all their descendants.",
  "starterCode": "def not_null(rows, col):\n    pass\n\ndef unique(rows, col):\n    pass\n\ndef accepted_values(rows, col, allowed):\n    pass\n\ndef downstream(changed, deps):\n    pass\n\nrows = [{\"id\": 1, \"s\": \"a\"}, {\"id\": 2, \"s\": None}, {\"id\": 2, \"s\": \"z\"}]\nprint(not_null(rows, \"s\"), unique(rows, \"id\"), accepted_values(rows, \"s\", [\"a\", \"b\"]))",
  "tests": "rows = [{\"id\": 1, \"s\": \"a\"}, {\"id\": 2, \"s\": None}, {\"id\": 2, \"s\": \"z\"}]\nassert not_null(rows, \"s\") == [1]\nassert not_null(rows, \"id\") == []\nassert unique(rows, \"id\") == [1, 2]\nassert unique(rows, \"s\") == []\nassert accepted_values(rows, \"s\", [\"a\", \"b\"]) == [2]\nassert accepted_values([], \"s\", [\"a\"]) == []\ndeps = {\n    \"stg_orders\": [],\n    \"stg_users\": [],\n    \"fct_orders\": [\"stg_orders\", \"stg_users\"],\n    \"dash\": [\"fct_orders\"],\n    \"other\": [\"stg_users\"],\n}\nassert downstream([\"stg_orders\"], deps) == [\"dash\", \"fct_orders\", \"stg_orders\"]\nassert downstream([\"stg_users\"], deps) == [\"dash\", \"fct_orders\", \"other\", \"stg_users\"]\nassert downstream([\"dash\"], deps) == [\"dash\"]\nassert downstream([], deps) == []",
  "solution": "def not_null(rows, col):\n    return [i for i, r in enumerate(rows) if r.get(col) is None]\n\ndef unique(rows, col):\n    counts = {}\n    for r in rows:\n        counts[r.get(col)] = counts.get(r.get(col), 0) + 1\n    return [i for i, r in enumerate(rows) if counts[r.get(col)] > 1]\n\ndef accepted_values(rows, col, allowed):\n    return [i for i, r in enumerate(rows) if r.get(col) is not None and r[col] not in allowed]\n\ndef downstream(changed, deps):\n    result = set(changed)\n    grew = True\n    while grew:\n        grew = False\n        for model, ups in deps.items():\n            if model not in result and any(u in result for u in ups):\n                result.add(model)\n                grew = True\n    return sorted(result)",
  "hints": [
    "Use `r.get(col)` so a missing column counts as null.",
    "Count values first, then return the indices whose count is greater than 1.",
    "Repeat: add any model that has an upstream already in the result, until nothing changes."
  ]
}
```

> [!TIP] Interview tips
> - Describe the pyramid: unit tests on logic, data tests on real data, contract tests at boundaries, diff tests vs production.
> - Explain slim CI (state:modified+, defer, per-PR schema) as the way to keep CI fast and safe.
> - Mention write-audit-publish and idempotent loads so failures never expose bad data.
> - Tests need owners and severities; a red test nobody acts on is worse than none.
