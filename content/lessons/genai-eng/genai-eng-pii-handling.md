---
id: genai-eng-pii-handling
title: PII handling
estimatedMinutes: 10
difficulty: medium
tags: [genai, privacy, pii, redaction, compliance]
---

## Why it matters

Prompts, retrieved documents, logs and traces all carry user data, and every vendor or log store they touch widens your compliance scope (GDPR, HIPAA, CCPA). Interviewers want to see where you would redact, what you would store, and how you would still keep the product useful.


## Concept

**PII** is data that identifies a person: direct identifiers (name, email, phone, SSN, address, account numbers) and quasi-identifiers (birth date + ZIP + gender can re-identify most people). Treat health, financial and biometric data as a higher tier.

**Where PII leaks in an LLM system**: the prompt sent to a third-party API, retrieved chunks, model output, application logs and traces, eval datasets, fine-tuning data (models can memorize and regurgitate), vector stores (embeddings of PII are still PII; deleting a user means deleting their vectors), and caches.

**Controls**:
- **Data minimization**: do not send what the task does not need. Fewer fields, shorter retention.
- **Detect and redact before the model call**: regex for structured patterns (email, phone, SSN, credit card with a Luhn check), NER models (Presidio, spaCy) for names and addresses. Regex has high precision on structured IDs but misses names; NER catches names with lower precision.
- **Reversible pseudonymization**: replace values with stable tokens (`[EMAIL_1]`), keep the mapping server-side, and restore tokens in the response. Consistent tokens preserve coreference ("email her at [EMAIL_1]").
- **Masking vs hashing vs tokenization**: salted hash is irreversible but linkable; vault tokenization is reversible under access control; plain masking (`***-**-6789`) is for display.
- **Vendor controls**: zero-retention agreements, no training on your data, regional endpoints, DPA/BAA signed.
- **Logs and deletion**: redact before logging, set TTLs, and support deletion requests across logs, caches, vector stores and datasets.
- **Evaluate the redactor**: measure recall on a labeled set. Recall matters most, because each missed span is a leak.


## Worked example

A support bot receives: `Call Jane at 415-555-0134 or jane@acme.com, SSN 123-45-6789.` The redaction layer produces `Call Jane at [PHONE_1] or [EMAIL_1], SSN [SSN_1].` The LLM drafts a reply using the tokens; the server swaps them back before sending to the user, and logs only the redacted version.

Notice what regex missed: **"Jane"**. Adding an NER pass would catch it, at the cost of some false positives.

Recall math: a redactor with 95% recall over 10,000 PII spans per day leaks 500 spans per day to the vendor and the logs. That is why detection is paired with minimization, contractual controls and short retention, not used alone.


## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why is recall the key metric for a PII redactor?",
  "options": [
    "False positives are illegal",
    "Each missed PII span is a leak, while a false positive only costs some context",
    "Precision cannot be measured",
    "Recall makes it faster"
  ],
  "answer": 1,
  "explanation": "The costs are asymmetric: a leak creates compliance and trust damage, while over-redaction only slightly degrades answer quality."
}
```

```quiz
{
  "id": "q2",
  "question": "A user asks to delete their data. Which store is most often forgotten?",
  "options": [
    "The primary database only",
    "Vector store embeddings, caches, logs and eval/fine-tune datasets derived from their data",
    "The CSS bundle",
    "The model's tokenizer"
  ],
  "answer": 1,
  "explanation": "Derived copies of PII (chunks, embeddings, traces, datasets) must be deletable too, so track lineage from the start."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `redact(text)` that replaces emails, SSNs (`ddd-dd-dddd`) and phones (`ddd-ddd-dddd` or `ddd.ddd.dddd`) using the `PII` patterns, applied in that order. Each distinct value gets a stable numbered token such as `[EMAIL_1]`, `[EMAIL_2]` (the same value always maps to the same token). Return `(redacted_text, mapping)` with `mapping = {original_value: token}`. Then write `restore(text, mapping)` that swaps tokens back.",
  "starterCode": "import re\n\nPII = [\n    (\"EMAIL\", r\"[\\w.+-]+@[\\w-]+(?:\\.[\\w-]+)+\"),\n    (\"SSN\", r\"\\b\\d{3}-\\d{2}-\\d{4}\\b\"),\n    (\"PHONE\", r\"\\b\\d{3}[-.]\\d{3}[-.]\\d{4}\\b\"),\n]\n\ndef redact(text):\n    # return (redacted_text, mapping) where mapping is {original_value: token}\n    pass\n\ndef restore(text, mapping):\n    pass\n\nprint(redact(\"Email jane@acme.com or call 415-555-0134\"))",
  "tests": "t, m = redact('Email jane@acme.com or call 415-555-0134. SSN 123-45-6789. Again jane@acme.com')\nassert t == 'Email [EMAIL_1] or call [PHONE_1]. SSN [SSN_1]. Again [EMAIL_1]', t\nassert m == {'jane@acme.com': '[EMAIL_1]', '415-555-0134': '[PHONE_1]', '123-45-6789': '[SSN_1]'}, m\nt2, m2 = redact('a@x.com b@y.org')\nassert t2 == '[EMAIL_1] [EMAIL_2]', t2\nassert redact('nothing here') == ('nothing here', {})\nassert restore('Reply to [EMAIL_1] now', m) == 'Reply to jane@acme.com now'\norig = 'Ping a@x.com / 212.555.0199'\nr, mm = redact(orig)\nassert restore(r, mm) == orig",
  "solution": "import re\n\nPII = [\n    (\"EMAIL\", r\"[\\w.+-]+@[\\w-]+(?:\\.[\\w-]+)+\"),\n    (\"SSN\", r\"\\b\\d{3}-\\d{2}-\\d{4}\\b\"),\n    (\"PHONE\", r\"\\b\\d{3}[-.]\\d{3}[-.]\\d{4}\\b\"),\n]\n\ndef redact(text):\n    mapping = {}\n    counters = {}\n    for label, pat in PII:\n        def repl(m, label=label):\n            val = m.group(0)\n            if val not in mapping:\n                counters[label] = counters.get(label, 0) + 1\n                mapping[val] = f\"[{label}_{counters[label]}]\"\n            return mapping[val]\n        text = re.sub(pat, repl, text)\n    return text, mapping\n\ndef restore(text, mapping):\n    for val, token in mapping.items():\n        text = text.replace(token, val)\n    return text",
  "hints": [
    "Use `re.sub` with a function as the replacement; keep per-label counters in a dict.",
    "Look up `mapping` first so repeated values reuse their token."
  ]
}
```

> [!TIP] Interview tips
> - Name the leak points beyond the prompt: logs, traces, vector stores, caches, eval and fine-tune data.
> - Give the layered answer: minimize, redact (regex + NER), contractual vendor controls, retention and deletion; quote recall as the metric.
> - Pitfall: embeddings and fine-tuned weights are not anonymous just because they are numbers; deletion requests must reach them.
