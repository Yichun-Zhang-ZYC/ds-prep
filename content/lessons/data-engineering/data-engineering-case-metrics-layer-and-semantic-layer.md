---
id: data-engineering-case-metrics-layer-and-semantic-layer
title: "Case: Building a metrics (semantic) layer"
estimatedMinutes: 13
difficulty: hard
tags: [data-engineering, semantic-layer, metrics, case-interview]
---

## Why it matters
"Why does revenue differ between dashboards?" is the symptom that motivates a metrics layer. The case asks you to define metrics once, serve them consistently to BI, notebooks and APIs, and avoid the classic aggregation traps. Think of it as the contract between data modeling and every consumer.

## Concept
A **semantic (metrics) layer** is a governed definition of **entities, dimensions, measures and metrics** that compiles to SQL at query time. Examples: dbt Semantic Layer/MetricFlow, Cube, LookML, AtScale.

Playbook:
1. **Inventory and conflicts**: collect the top dashboards' definitions of revenue, active users, conversion; agree on one definition per metric with an owner (finance for revenue).
2. **Model the base**: clean, well-grained fact tables (star schema) with conformed dimensions. A metrics layer cannot fix a bad grain.
3. **Define in code**: each metric = measure(s) + filters + time dimension + allowed dimensions, in version-controlled YAML with tests and docs.
4. **Compile and serve**: the layer generates SQL, handles joins, and exposes it via SQL/JDBC, REST/GraphQL, BI connectors. Cache or pre-aggregate hot queries.
5. **Govern**: owners, review via pull request, certification of "gold" metrics, deprecation, access control, and lineage.

Aggregation traps the layer must handle:
- **Non-additive metrics**: ratios (AOV, conversion) and distinct counts cannot be summed across groups. Store **additive components** (sum, count) and divide at query time, or recount distinct from the raw level.
- **Semi-additive** measures (account balance, inventory): sum across accounts, but not across time; use last/avg over time.
- **Fan-out** when joining a one-to-many table to a fact: header-level measures duplicate per child row. Aggregate at the correct grain first, or use `count(distinct)` / sum-once-per-key.
- **Time handling**: one canonical date and time zone per metric, fiscal calendars, as-of dimension versions.
- **Metric drift**: forks of the definition in BI tools; make BI query the layer instead of raw tables.

Build vs buy: start with dbt models plus a metrics spec; adopt a semantic layer when many tools and teams consume the same numbers.

## Worked example
Two dashboards report average order value (AOV) per week from daily numbers.

Daily data (illustrative): day 1 has 4 orders totalling 200, so AOV 50. Day 2 has 2 orders totalling 200, so AOV 100.

- Averaging the daily AOVs: (50 + 100) / 2 = **75**. Wrong: it ignores that day 1 had more orders.
- Correct: total revenue / total orders = 400 / 6 = **66.67**.

The metrics layer stores `revenue = sum(order_total)` and `orders = count_distinct(order_id)` and defines `aov = revenue / orders`, so every grain (day, week, country) divides the summed components.

Fan-out case: join `orders` (header revenue) to `order_items`. Order A (revenue 100) has 3 items; order B (revenue 50) has 1. `SUM(orders.revenue)` over the join gives 100 x 3 + 50 = **350** instead of 150. The layer either aggregates revenue before the join or marks `revenue` as order-grain and deduplicates by `order_id`.

Metric spec sketch:

```yaml
metrics:
  - name: aov
    type: ratio
    numerator: revenue
    denominator: orders
    filter: status = 'completed'
    owner: finance
```

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why can't a weekly conversion rate be computed as the average of daily conversion rates?",
  "options": [
    "Averages are not allowed in SQL",
    "Days have different denominators, so ratios must be recomputed from summed numerators and denominators",
    "Conversion is a semi-additive measure over time",
    "The time zone changes the weekly total"
  ],
  "answer": 1,
  "explanation": "A ratio of sums is not the average of ratios unless every day has the same denominator. Store the components and divide after aggregating."
}
```

```quiz
{
  "id": "q2",
  "question": "A report that joins orders to order_items shows revenue 3x too high for some orders. What is the cause?",
  "options": [
    "Missing partition filter",
    "Late-arriving dimension rows",
    "Duplicate source events",
    "Fan-out: order-level revenue is repeated for each item row in the join"
  ],
  "answer": 3,
  "explanation": "A one-to-many join repeats the parent's measure per child row. Aggregate at the proper grain before joining, or sum once per parent key."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `compute_metric(rows, spec, group_by=None)`. `spec` is `{'type': 'sum', 'col': c}`, `{'type': 'count_distinct', 'col': c}`, or `{'type': 'ratio', 'num': spec, 'den': spec}`. Group the row dicts by the `group_by` column (key `'all'` when `group_by` is None), evaluate the spec on each group's rows (ratios divide the aggregated numerator by the aggregated denominator; a zero denominator gives `None`), and return `{group: value}`.",
  "starterCode": "def compute_metric(rows, spec, group_by=None):\n    # spec: {'type': 'sum', 'col': c} | {'type': 'count_distinct', 'col': c}\n    #       | {'type': 'ratio', 'num': spec, 'den': spec}\n    # returns {group: value}; group key is 'all' when group_by is None\n    pass\n",
  "tests": "rows = [\n    {'day': 'd1', 'order_id': 1, 'revenue': 50}, {'day': 'd1', 'order_id': 2, 'revenue': 50},\n    {'day': 'd1', 'order_id': 3, 'revenue': 50}, {'day': 'd1', 'order_id': 4, 'revenue': 50},\n    {'day': 'd2', 'order_id': 5, 'revenue': 100}, {'day': 'd2', 'order_id': 6, 'revenue': 100},\n]\nrev = {'type': 'sum', 'col': 'revenue'}\ncnt = {'type': 'count_distinct', 'col': 'order_id'}\naov = {'type': 'ratio', 'num': rev, 'den': cnt}\nassert compute_metric(rows, rev, 'day') == {'d1': 200, 'd2': 200}\nassert compute_metric(rows, cnt) == {'all': 6}\nassert compute_metric(rows, aov, 'day') == {'d1': 50, 'd2': 100}\nassert abs(compute_metric(rows, aov)['all'] - 400 / 6) < 1e-9\nrows2 = rows + [{'day': 'd3', 'order_id': None, 'revenue': 0}]\nassert compute_metric([{'day': 'z', 'order_id': 1, 'revenue': 0}], {'type': 'ratio', 'num': rev, 'den': {'type': 'sum', 'col': 'revenue'}}, 'day') == {'z': None}",
  "solution": "def compute_metric(rows, spec, group_by=None):\n    def ev(rs, s):\n        if s['type'] == 'sum':\n            return sum(r[s['col']] for r in rs)\n        if s['type'] == 'count_distinct':\n            return len({r[s['col']] for r in rs})\n        n, d = ev(rs, s['num']), ev(rs, s['den'])\n        return None if d == 0 else n / d\n    groups = {}\n    for r in rows:\n        groups.setdefault(r[group_by] if group_by else 'all', []).append(r)\n    return {g: ev(rs, spec) for g, rs in groups.items()}",
  "hints": [
    "Write a recursive helper that evaluates a spec on a list of rows.",
    "For ratios, evaluate numerator and denominator on the whole group, then divide."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Demonstrate fan-out. Rows are the result of joining orders to items (order fields repeat per item). Write `naive_sum(rows, col)` that sums the column over all rows, and `sum_once_per_key(rows, key, col)` that counts each distinct `key` value's `col` only once.",
  "starterCode": "def sum_once_per_key(rows, key, col):\n    pass\n\ndef naive_sum(rows, col):\n    pass\n",
  "tests": "joined = [\n    {'order_id': 'A', 'revenue': 100, 'sku': 1},\n    {'order_id': 'A', 'revenue': 100, 'sku': 2},\n    {'order_id': 'A', 'revenue': 100, 'sku': 3},\n    {'order_id': 'B', 'revenue': 50, 'sku': 1},\n]\nassert naive_sum(joined, 'revenue') == 350\nassert sum_once_per_key(joined, 'order_id', 'revenue') == 150\nassert sum_once_per_key([], 'order_id', 'revenue') == 0",
  "solution": "def sum_once_per_key(rows, key, col):\n    seen = {}\n    for r in rows:\n        seen.setdefault(r[key], r[col])\n    return sum(seen.values())\n\ndef naive_sum(rows, col):\n    return sum(r[col] for r in rows)",
  "hints": [
    "Remember the first value seen for each key.",
    "Sum the remembered values."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Marketing, finance and product each report a different monthly active users number. Design the fix.'",
  "answer": "1. **Diagnose**: list each definition (event types counted, bots filtered, time zone, rolling 28-day vs calendar month, internal users, identity stitching). Typically 3-4 small differences.\n2. **Agree** on one canonical definition and a name (`mau`), plus explicitly named variants if needed (`mau_logged_in`); assign an owner.\n3. **Model**: a clean `fact_user_activity` at user-day grain, built once with bot/internal filtering and stitched ids; a `dim_date` and `dim_user`.\n4. **Define** the metric in the semantic layer: `count_distinct(user_id)` over the window, with allowed dimensions (platform, country) and the canonical time zone. Note that MAU is non-additive across platforms (a user can be on two), so it cannot be derived from per-platform sums; compute from user-day grain or use sketches (HLL) when approximations are acceptable.\n5. **Serve**: BI, notebooks and the experimentation platform query the layer; direct raw-table queries for this metric are discouraged. Pre-aggregate for dashboard speed.\n6. **Govern**: tests (row counts vs source, day-over-day change), certification label, change log; changes via PR with notification of consumers.\n7. **Tradeoffs**: central control vs team speed; precomputed (fast, stale) vs on-the-fly (flexible, costly)."
}
```

> [!TIP] Interview tips
> - Lead with the problem (conflicting numbers) and the idea: define once in code, compile to SQL, serve to all tools.
> - Show you know the traps: non-additive ratios and distinct counts, semi-additive balances, fan-out, time zones.
> - Discuss governance (owners, PR review, certification), not just the technology.
