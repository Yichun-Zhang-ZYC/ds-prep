---
id: data-engineering-case-slowly-changing-dimensions
title: "Case: Slowly changing dimensions in practice"
estimatedMinutes: 14
difficulty: medium
tags: [data-engineering, scd, dimensional-modeling, case-interview]
---

## Why it matters
Everyone can define Type 1 vs Type 2. Interviewers then ask the applied follow-ups: how do you load it incrementally, how do facts join to the right version, what about changes that arrive late, and when is Type 2 overkill? This case covers the mechanics that break in production. See Slowly changing dimensions for the types.

## Concept
Playbook for a Type 2 customer dimension:
1. **Decide per attribute**: track history only for attributes the business reports on historically (region, segment, plan). Correct typos in place (Type 1). Mixed handling is normal: Type 6 style.
2. **Schema**: surrogate key `customer_sk`, natural key `customer_id`, tracked columns, `valid_from`, `valid_to` (open = `NULL` or `9999-12-31`), `is_current`, optionally a row hash of tracked columns.
3. **Load**: compare staged rows to current rows by natural key using the **hash**; if it differs, close the current row (`valid_to = effective_date`) and insert a new one. One `MERGE` or two statements in one transaction.
4. **Fact loading**: look up the surrogate key **as of the event date**: `event_ts >= valid_from AND event_ts < valid_to`. Half-open intervals avoid overlaps and gaps.
5. **Idempotency**: reruns of the same change batch must not create duplicate versions (skip when the hash equals the current row).

Pitfalls:
- **Late-arriving changes** (a move reported two weeks late) require splitting an existing interval and re-keying facts in between. Many teams accept current-state attribution for these, or rebuild affected partitions.
- **Late-arriving facts** for a customer not yet in the dimension: insert an **inferred member** placeholder and update it when the real row arrives.
- **Multiple changes per day**: the source may show only the last state; capture changes via CDC if intermediate states matter.
- Type 2 on volatile attributes (e.g. last_login) explodes the table: keep these in a fact or a separate mini-dimension.
- BI users who join on the natural key and forget the date filter double count; expose a view of current rows for the common case.

## Worked example
Customer 42 lives in NYC from 2024-01-01 and moves to SF on 2024-03-10. Orders: 100 on 03-05 and 50 on 03-15.

Dimension after the change (half-open intervals):

| customer_sk | customer_id | region | valid_from | valid_to | is_current |
|---|---|---|---|---|---|
| 1001 | 42 | NYC | 2024-01-01 | 2024-03-10 | false |
| 1002 | 42 | SF | 2024-03-10 | NULL | true |

- Fact load: the 03-05 order gets `customer_sk = 1001`, the 03-15 order gets `1002`.
- Revenue by region with Type 2: NYC = 100, SF = 50. With Type 1 (overwrite): SF = 150, and last quarter's NYC revenue silently shrinks.
- Rerunning the 03-10 change batch finds the current row already has region SF (same hash), so nothing is inserted.
- Size sanity check (illustrative): 10 M customers, 8% change region or plan per year gives about 0.8 M new rows per year, which is cheap. A tracked `last_login` would add up to 10 M x 365 rows per year, which is not.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "How should an order fact row choose its customer surrogate key in a Type 2 dimension?",
  "options": [
    "Always the current row for the natural key",
    "The row whose validity interval contains the order date",
    "The oldest row for the natural key",
    "Any row; they hold the same data"
  ],
  "answer": 1,
  "explanation": "Joining on the interval as of the event keeps history correct: the order is attributed to the attributes that were true when it happened."
}
```

```quiz
{
  "id": "q2",
  "question": "A customer's address change is reported 14 days late. What is the cleanest way to keep facts correct?",
  "options": [
    "Split the affected validity interval and re-key or rebuild the affected fact partitions",
    "Ignore it; dimensions are never corrected",
    "Overwrite the old row with a Type 1 update",
    "Delete the customer and reinsert them"
  ],
  "answer": 0,
  "explanation": "A retroactive change needs the interval split at the true effective date, and facts after that date re-pointed to the new version (or those partitions rebuilt)."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `apply_scd2(dim, changes)` for rows `{'cust','region','valid_from','valid_to','is_current'}`. Process `changes` (tuples `(cust, region, effective_date)`, ISO date strings) in order of (date, cust). For a customer with no current row, insert a new current row. If the region equals the current row's region, skip. Otherwise close the current row (`valid_to = effective_date`, `is_current = False`) and add a new current row. Return a new list (do not mutate the input) sorted by (cust, valid_from). Running the same batch twice must give the same result.",
  "starterCode": "def apply_scd2(dim, changes):\n    # dim rows: {'cust','region','valid_from','valid_to','is_current'}\n    # changes: list of (cust, region, effective_date) with ISO date strings\n    pass\n",
  "tests": "dim = [{'cust': 1, 'region': 'NYC', 'valid_from': '2024-01-01', 'valid_to': None, 'is_current': True}]\nch = [(1, 'SF', '2024-03-10'), (1, 'SF', '2024-03-12'), (2, 'LA', '2024-03-11')]\nout = apply_scd2(dim, ch)\nassert [(r['cust'], r['region'], r['valid_from'], r['valid_to'], r['is_current']) for r in out] == [\n    (1, 'NYC', '2024-01-01', '2024-03-10', False),\n    (1, 'SF', '2024-03-10', None, True),\n    (2, 'LA', '2024-03-11', None, True)]\nassert apply_scd2(out, ch) == out\nassert dim[0]['valid_to'] is None\nout2 = apply_scd2(out, [(1, 'NYC', '2024-05-01')])\nassert [r['region'] for r in out2 if r['cust'] == 1] == ['NYC', 'SF', 'NYC']\nassert sum(1 for r in out2 if r['cust'] == 1 and r['is_current']) == 1",
  "solution": "def apply_scd2(dim, changes):\n    rows = [dict(r) for r in dim]\n    for cust, region, eff in sorted(changes, key=lambda c: (c[2], c[0])):\n        cur = [r for r in rows if r['cust'] == cust and r['is_current']]\n        if cur:\n            cur = cur[0]\n            if cur['region'] == region:\n                continue\n            cur['valid_to'] = eff\n            cur['is_current'] = False\n        rows.append({'cust': cust, 'region': region, 'valid_from': eff, 'valid_to': None, 'is_current': True})\n    return sorted(rows, key=lambda r: (r['cust'], r['valid_from']))",
  "hints": [
    "Copy the rows first; then look up the current row for the customer.",
    "Skipping unchanged regions is what makes the load idempotent."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `as_of_region(dim, cust, date)` returning the region whose interval satisfies `valid_from <= date < valid_to` (`valid_to` of `None` means open-ended), or `None` if no row matches. Then write `revenue_by_region(facts, dim)` for facts `(cust, date, amount)`, summing amounts per as-of region and using `'UNKNOWN'` when there is no match.",
  "starterCode": "def as_of_region(dim, cust, date):\n    pass\n\ndef revenue_by_region(facts, dim):\n    # facts: list of (cust, date, amount)\n    pass\n",
  "tests": "dim = [\n    {'cust': 1, 'region': 'NYC', 'valid_from': '2024-01-01', 'valid_to': '2024-03-10', 'is_current': False},\n    {'cust': 1, 'region': 'SF', 'valid_from': '2024-03-10', 'valid_to': None, 'is_current': True},\n]\nassert as_of_region(dim, 1, '2024-03-05') == 'NYC'\nassert as_of_region(dim, 1, '2024-03-10') == 'SF'\nassert as_of_region(dim, 1, '2023-12-31') is None\nassert as_of_region(dim, 9, '2024-03-10') is None\nfacts = [(1, '2024-03-05', 100), (1, '2024-03-15', 50), (7, '2024-03-15', 5)]\nassert revenue_by_region(facts, dim) == {'NYC': 100, 'SF': 50, 'UNKNOWN': 5}",
  "solution": "def as_of_region(dim, cust, date):\n    for r in dim:\n        if r['cust'] == cust and r['valid_from'] <= date and (r['valid_to'] is None or date < r['valid_to']):\n            return r['region']\n    return None\n\ndef revenue_by_region(facts, dim):\n    out = {}\n    for cust, date, amt in facts:\n        reg = as_of_region(dim, cust, date) or 'UNKNOWN'\n        out[reg] = out.get(reg, 0) + amt\n    return out",
  "hints": [
    "Use a half-open interval: the end date belongs to the next version.",
    "Use `or 'UNKNOWN'` after the lookup."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Our dim_customer is Type 2, but analysts report that revenue by segment differs between dashboards. How do you debug it?'",
  "answer": "Check in order:\n1. **Join logic**: dashboards joining on natural key without an as-of filter multiply facts by the number of versions; dashboards using `is_current` attribute today's segment to old orders. Standardize on one semantic definition (as-of surrogate key) in the semantic layer.\n2. **Interval integrity**: tests for overlapping intervals, gaps, and exactly one current row per natural key.\n3. **Fact keys**: facts with the surrogate key of the wrong version (loaded using current instead of as-of lookup) or unknown (-1) keys from late-arriving dimension rows.\n4. **Late changes**: retroactive changes processed without re-keying facts.\n5. **Idempotency**: duplicate versions created by reruns (no hash comparison).\n\nFix by adding dbt tests (unique current row, non-overlap), a documented as-of join macro, and a view for current-state reporting."
}
```

> [!TIP] Interview tips
> - Always mention how facts pick the right version: surrogate key lookup as of the event date, with half-open intervals.
> - Name the production edge cases: late-arriving changes, inferred members, multiple changes per day, volatile attributes.
> - Know when not to use Type 2: if nobody asks historical questions, Type 1 is simpler and cheaper.
