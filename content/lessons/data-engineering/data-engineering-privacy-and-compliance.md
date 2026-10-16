---
id: data-engineering-privacy-and-compliance
title: Privacy & compliance (PII, GDPR)
estimatedMinutes: 12
difficulty: medium
tags: [data-engineering, governance, privacy, gdpr]
---

## Why it matters
Mishandling personal data leads to fines (GDPR: up to 4% of global revenue), breaches and lost trust. Interviewers ask how you'd store PII, honor deletion requests, and control access in a data platform.

## Concept
**PII** (personally identifiable information): data that identifies a person directly (name, email, phone, government ID) or indirectly in combination (IP address, device ID, precise location, birth date + zip code). Some categories are especially sensitive (health, biometrics, financial).

Key regulations and principles (GDPR, CCPA/CPRA, HIPAA for health in the US):
- **Lawful basis / consent**, **purpose limitation** (use data only for the stated purpose), **data minimization** (collect and keep only what's needed), **storage limitation** (retention periods).
- **Data subject rights**: access, correction, **erasure ("right to be forgotten")**, portability, objection to processing.
- **Data residency**: some data must stay in a region (e.g. EU).

Engineering techniques:
- **Classify and tag** PII columns in the catalog; enforce **access control** (RBAC/ABAC, column-level security, row-level policies, dynamic masking).
- **Pseudonymization**: replace identifiers with keyed hashes or tokens (HMAC with a secret key, tokenization vault). Still personal data under GDPR, but reduces exposure. Plain unsalted hashes of emails are easily reversed by lookup.
- **Anonymization**: aggregation, k-anonymity, differential privacy; truly anonymous data is out of GDPR scope, but it's hard to achieve.
- **Encryption** at rest and in transit; key management (KMS).
- **Deletion**: keep PII in a few well-known tables keyed by user ID; deletion jobs propagate erasure to lakes (Delta/Iceberg `DELETE` + `VACUUM`), warehouses, backups (or **crypto-shredding**: encrypt per-user and delete the key).
- **Retention policies** with automatic expiry; audit logs of who accessed what.

## Worked example
Design: raw events keep `user_id` only; emails and names live in a restricted `pii.users` table. Analysts see `user_key = HMAC(secret, user_id)` in marts. A deletion request triggers a job that deletes the user from `pii.users`, issues `DELETE ... WHERE user_id = X` on lakehouse tables, vacuums after the retention window, and logs completion within the 30-day deadline.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why is an unsalted SHA-256 hash of an email weak pseudonymization?",
  "options": ["SHA-256 is too slow", "Anyone with a list of emails can hash them and match, re-identifying users", "Hashes can't be joined", "GDPR bans hashing"],
  "answer": 1,
  "explanation": "Use a keyed hash (HMAC) or tokenization so the mapping can't be recomputed without a secret."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `pseudonymize(value, secret)` returning the hex HMAC-SHA256 of value with secret (use `hmac` and `hashlib`). Write `mask_row(row, pii_columns, secret)` returning a copy where PII columns are replaced by their pseudonym. Write `erase_user(tables, user_id)` taking a dict table_name → list of row dicts (each with `user_id`) and returning `(new_tables, deleted_count)` with all rows for that user removed.",
  "starterCode": "import hmac, hashlib\n\ndef pseudonymize(value, secret):\n    pass\n\ndef mask_row(row, pii_columns, secret):\n    pass\n\ndef erase_user(tables, user_id):\n    pass\n",
  "tests": "import hmac, hashlib\np = pseudonymize('ana@x.com', 'k1')\nassert p == hmac.new(b'k1', b'ana@x.com', hashlib.sha256).hexdigest()\nassert p != pseudonymize('ana@x.com', 'k2')\nrow = {'user_id': 7, 'email': 'ana@x.com', 'country': 'US'}\nm = mask_row(row, ['email'], 'k1')\nassert m['email'] == p and m['country'] == 'US' and row['email'] == 'ana@x.com'\ntables = {'events': [{'user_id': 7}, {'user_id': 8}, {'user_id': 7}], 'orders': [{'user_id': 7}]}\nnew, n = erase_user(tables, 7)\nassert n == 3 and new == {'events': [{'user_id': 8}], 'orders': []}",
  "solution": "import hmac, hashlib\n\ndef pseudonymize(value, secret):\n    return hmac.new(secret.encode(), str(value).encode(), hashlib.sha256).hexdigest()\n\ndef mask_row(row, pii_columns, secret):\n    out = dict(row)\n    for c in pii_columns:\n        if out.get(c) is not None:\n            out[c] = pseudonymize(out[c], secret)\n    return out\n\ndef erase_user(tables, user_id):\n    new, deleted = {}, 0\n    for name, rows in tables.items():\n        kept = [r for r in rows if r['user_id'] != user_id]\n        deleted += len(rows) - len(kept)\n        new[name] = kept\n    return new, deleted",
  "hints": ["hmac.new(key_bytes, msg_bytes, hashlib.sha256).hexdigest()", "Count deleted rows as the difference in lengths."]
}
```

> [!TIP] Interview tips
> - Define PII (direct and indirect) and key GDPR principles: minimization, purpose limitation, retention, data subject rights.
> - Describe controls: tagging, column/row-level security, masking, keyed pseudonymization, encryption, audit logs.
> - Have a concrete erasure design: isolate PII, propagate deletes through lakehouse tables and backups, or crypto-shred.
