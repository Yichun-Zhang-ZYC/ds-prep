---
id: genai-eng-nl-to-sql-text-to-sql-systems
title: "NL-to-SQL / Text-to-SQL systems"
estimatedMinutes: 12
difficulty: hard
tags: [genai, text-to-sql, sql, agents, safety]
---

## Why it matters
Letting business users ask questions in plain English is one of the most common LLM products, and one of the easiest to get subtly wrong. Interviewers probe how you handle large schemas, ambiguous terms, wrong joins, safety, and how you measure correctness.

## Concept
**Pipeline**:
1. **Schema linking / retrieval**: with hundreds of tables, retrieve only relevant tables and columns (embed table and column descriptions, plus sample values) instead of dumping the whole schema.
2. **Prompt**: DDL, column descriptions, key relationships, a few sample rows or values, business definitions ("active user = 1+ session in 28 days"), and few-shot question/SQL pairs, ideally retrieved by similarity.
3. **Generate** at low temperature, often with the SQL dialect named explicitly.
4. **Validate** before running: parse it, allow only a single read-only `SELECT`, whitelist tables, enforce `LIMIT`, set a timeout and a read-only role with row-level security.
5. **Execute and self-correct**: on an error or an empty result, feed the message back for 1-3 retries.
6. **Explain**: show the SQL and assumptions so users can verify.

**Failure modes**: hallucinated columns; wrong join keys or **fan-out** (joining a one-to-many table duplicates rows and inflates `SUM`); ambiguous metrics and time ranges; dialect quirks; silent wrong answers that execute fine. Mitigate with a **semantic layer** (governed metric definitions the model selects rather than invents), clarifying questions, and showing the query.

**Evaluation**: **execution accuracy** (compare result sets with gold SQL's results) beats exact string match since many queries are equivalent. Benchmarks: Spider, BIRD (dirty real-world data). Build an in-house eval set from real questions and monitor in production.

**Security**: the DB role, not the prompt, is the control. Never rely on "only write SELECT" instructions; prompt injection can come from data in the tables.

## Worked example
A warehouse has 200 tables and 2,500 columns. Dumping the schema costs about 60,000 tokens; retrieving the top 5 tables (about 40 columns) costs roughly 2,000 tokens, a 97% cut, and fewer distractors.

Fan-out: `orders` has one row per order with `total` of \$50. An order has 3 `order_items`. The question "total revenue" generated as `SELECT SUM(o.total) FROM orders o JOIN order_items i ON i.order_id = o.id` returns 3 × \$50 = \$150 for that order instead of \$50. The query runs without error, which is why you test against known answers and prefer a semantic-layer metric (`SUM(total)` on `orders` only).

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why is execution accuracy preferred over exact-match SQL accuracy?",
  "options": [
    "It is cheaper to compute",
    "Different SQL strings can return identical, correct results",
    "It ignores the database",
    "It measures latency"
  ],
  "answer": 1,
  "explanation": "Equivalent queries differ in aliases, ordering, CTEs vs subqueries. Comparing executed result sets credits any correct formulation."
}
```

```quiz
{
  "id": "q2",
  "question": "Which control best protects a production database from a malicious generated query?",
  "options": [
    "Telling the model in the prompt to only write SELECT",
    "A read-only DB role with table/row permissions and a statement timeout",
    "Lowering the temperature",
    "Longer few-shot examples"
  ],
  "answer": 1,
  "explanation": "Enforce safety outside the model: least-privilege credentials, allowlists, limits and timeouts. Prompts can be bypassed."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `validate_sql(sql, allowed_tables)` returning `(ok, reason)`, and `ensure_limit(sql, n)`. Checks in order: strip whitespace and one trailing `;`; if another `;` remains return `(False, \"multiple statements\")`; the lowercase text must start with `select` or `with`, else `(False, \"not a select\")`; any whole-word forbidden keyword among `insert update delete drop alter create attach pragma truncate grant` returns `(False, \"forbidden keyword: <kw>\")` (first one in that list order that appears); every table after `from` or `join` (regex `\\b(?:from|join)\\s+([A-Za-z_][\\w.]*)`, lowercased, ignoring CTE names defined by `name AS (`) must be in `allowed_tables` else `(False, \"table not allowed: <t>\")`; otherwise `(True, \"ok\")`. `ensure_limit` returns the SQL (trailing `;` removed) unchanged if it already has a whole-word `limit` (any case), else appends ` LIMIT n`.",
  "starterCode": "import re\n\ndef validate_sql(sql, allowed_tables):\n    pass\n\ndef ensure_limit(sql, n):\n    pass\n\nprint(validate_sql('SELECT * FROM orders', {'orders'}), ensure_limit('SELECT 1;', 10))",
  "tests": "A = {'orders', 'customers'}\nassert validate_sql('SELECT id FROM orders;', A) == (True, 'ok')\nassert validate_sql('  select * from Orders o join customers c on c.id=o.cid  ', A) == (True, 'ok')\nassert validate_sql('SELECT 1; DROP TABLE orders', A) == (False, 'multiple statements')\nassert validate_sql('DELETE FROM orders', A) == (False, 'not a select')\nassert validate_sql('SELECT * FROM orders WHERE 1=1 OR (SELECT 1 FROM x) = 1 -- drop', A)[1] == 'forbidden keyword: drop'\nassert validate_sql('SELECT created_at, updated_at FROM orders', A) == (True, 'ok')\nassert validate_sql('SELECT * FROM secrets', A) == (False, 'table not allowed: secrets')\nassert validate_sql('SELECT * FROM orders JOIN payments p ON 1=1', A) == (False, 'table not allowed: payments')\nassert validate_sql('WITH t AS (SELECT * FROM orders) SELECT * FROM t', A) == (True, 'ok')\nassert ensure_limit('SELECT * FROM orders;', 10) == 'SELECT * FROM orders LIMIT 10'\nassert ensure_limit('select * from orders limit 5', 10) == 'select * from orders limit 5'\nassert ensure_limit('SELECT unlimited FROM orders', 3) == 'SELECT unlimited FROM orders LIMIT 3'",
  "solution": "import re\n\nFORBIDDEN = ['insert', 'update', 'delete', 'drop', 'alter', 'create', 'attach', 'pragma', 'truncate', 'grant']\n\ndef validate_sql(sql, allowed_tables):\n    s = sql.strip()\n    if s.endswith(';'):\n        s = s[:-1].strip()\n    if ';' in s:\n        return (False, 'multiple statements')\n    low = s.lower()\n    if not (low.startswith('select') or low.startswith('with')):\n        return (False, 'not a select')\n    for kw in FORBIDDEN:\n        if re.search(r'\\b' + kw + r'\\b', low):\n            return (False, 'forbidden keyword: ' + kw)\n    ctes = set(re.findall(r'\\b(\\w+)\\s+as\\s*\\(', low))\n    allowed = {t.lower() for t in allowed_tables}\n    for t in re.findall(r'\\b(?:from|join)\\s+([a-z_][\\w.]*)', low):\n        if t not in ctes and t not in allowed:\n            return (False, 'table not allowed: ' + t)\n    return (True, 'ok')\n\ndef ensure_limit(sql, n):\n    s = sql.strip()\n    if s.endswith(';'):\n        s = s[:-1].strip()\n    if re.search(r'\\blimit\\b', s, re.I):\n        return s\n    return s + ' LIMIT %d' % n",
  "hints": [
    "Lowercase a copy for matching; use `re.search(r'\\b' + kw + r'\\b', low)`.",
    "CTE names: `re.findall(r'\\b(\\w+)\\s+as\\s*\\(', low)`; skip those when checking tables."
  ]
}
```

> [!TIP] Interview tips
> - Walk the full pipeline: schema retrieval, prompt, generate, validate, execute, self-correct, explain.
> - Call out fan-out joins and ambiguous metrics as the silent killers; propose a semantic layer.
> - Security lives in DB permissions; evaluate with execution accuracy on your own questions.
