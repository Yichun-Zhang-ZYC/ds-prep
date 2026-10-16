---
id: data-engineering-data-contracts
title: Data contracts
estimatedMinutes: 10
difficulty: medium
tags: [data-engineering, governance, schema, data-quality]
---

## Why it matters
Most pipeline breakages start upstream: an application team renames a column or changes an enum, and analytics silently breaks. Data contracts are the increasingly common answer, and interviewers ask what they contain and how they're enforced.

## Concept
A **data contract** is an explicit, versioned agreement between a data **producer** (e.g. the checkout service) and its **consumers** (analytics, ML) about a dataset or event stream.

Typical contents:
- **Schema**: fields, types, nullability, allowed values/enums, keys.
- **Semantics**: what each field means, units (cents vs dollars), time zone.
- **Quality expectations**: uniqueness, ranges, completeness.
- **SLAs**: freshness, latency, availability.
- **Ownership** and support channel; **versioning and change policy** (how to deprecate, notice period).
- Classification (PII) and access rules.

Enforcement ("shift left"):
- Contracts live in code (YAML/JSON Schema/Protobuf/Avro) next to the producer.
- **CI checks** block producer changes that break compatibility.
- **Schema registry** compatibility modes for events: **backward** (new schema can read old data: e.g. adding an optional field), **forward** (old consumers can read new data), **full** (both). Removing a required field or changing a type is breaking.
- Runtime validation at ingestion; violating records go to a dead-letter queue.
- Breaking changes require a new **version** (e.g. `orders_v2`) and a migration window.

Contracts don't replace downstream tests; they move the first line of defense to the source.

## Worked example
The checkout team wants to change `amount` from dollars (float) to cents (integer). The contract marks this as breaking: CI fails the PR. They instead add `amount_cents`, mark `amount` deprecated with a 60-day notice, consumers migrate, and `orders_v2` drops the old field.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Under backward compatibility in a schema registry, which change is allowed?",
  "options": ["Removing a required field", "Changing a field's type from string to int", "Adding a new optional field with a default", "Renaming a field"],
  "answer": 2,
  "explanation": "New readers can still read old data because the new field has a default."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Schemas are dicts field → {'type': str, 'required': bool}. Write `breaking_changes(old, new)` returning a sorted list of messages: `'removed:<f>'` for a field in old missing from new, `'type:<f>'` for a type change, and `'new_required:<f>'` for a field added to new as required (old data lacks it). Optional additions are fine. Then write `is_compatible(old, new)`.",
  "starterCode": "def breaking_changes(old, new):\n    pass\n\ndef is_compatible(old, new):\n    pass\n",
  "tests": "old = {'order_id': {'type': 'string', 'required': True}, 'amount': {'type': 'float', 'required': True}, 'coupon': {'type': 'string', 'required': False}}\nnew_ok = dict(old, channel={'type': 'string', 'required': False})\nassert breaking_changes(old, new_ok) == [] and is_compatible(old, new_ok)\nnew_bad = {'order_id': {'type': 'string', 'required': True}, 'amount': {'type': 'int', 'required': True}, 'region': {'type': 'string', 'required': True}}\nassert breaking_changes(old, new_bad) == ['new_required:region', 'removed:coupon', 'type:amount']\nassert not is_compatible(old, new_bad)",
  "solution": "def breaking_changes(old, new):\n    msgs = []\n    for f, spec in old.items():\n        if f not in new:\n            msgs.append(f'removed:{f}')\n        elif new[f]['type'] != spec['type']:\n            msgs.append(f'type:{f}')\n    for f, spec in new.items():\n        if f not in old and spec['required']:\n            msgs.append(f'new_required:{f}')\n    return sorted(msgs)\n\ndef is_compatible(old, new):\n    return not breaking_changes(old, new)",
  "hints": ["Compare old fields against new, then look for newly required fields.", "Optional new fields don't break existing data."]
}
```

> [!TIP] Interview tips
> - Define contracts as producer–consumer agreements covering schema, semantics, quality, SLAs and ownership.
> - Explain enforcement: contracts in code, CI compatibility checks, schema registry modes, dead-letter queues.
> - Describe a safe breaking-change process: add new field, deprecate, migrate, version.
