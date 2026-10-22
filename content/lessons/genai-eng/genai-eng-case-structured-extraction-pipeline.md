---
id: genai-eng-case-structured-extraction-pipeline
title: "Case: Structured information extraction pipeline"
estimatedMinutes: 13
difficulty: medium
tags: [genai, case-study, extraction, structured-output, evaluation]
---

## Why it matters
Extracting fields from invoices, contracts, resumes or clinical notes is one of the most valuable (and most asked) LLM use cases. The interview is about turning a fuzzy model into a reliable pipeline: schemas, validation, retries, human review and per-field evaluation.

## Concept
See the structured-output and tool-calling lessons for the mechanics; this is the system view.

1. **Define the schema with the business**: each field with type, format, allowed values, and "null if absent". Distinguish *missing* from *unknown*; forbid guessing. Add short field descriptions and 2-3 few-shot examples including a tricky one.
2. **Pipeline**: ingest (OCR/parse, see the PDF case) → optionally classify document type and pick a per-type schema → extract with schema-constrained output (JSON schema / tool call / constrained decoding) → **validate** (types, enums, regex, cross-field checks like `subtotal + tax = total`, dates in range) → **repair** (re-ask with the validation error message, 1-2 retries) → **normalize** (dates to ISO, currency, entity matching against master data) → route low-confidence records to human review → load.
3. **Confidence**: LLMs are poorly calibrated, so combine signals: validation pass/fail, agreement across 2-3 samples or two prompts, whether the value is literally present in the source text (span grounding), and token log-probs if available. Require extracted values to carry a source quote so reviewers can verify quickly.
4. **Long or multi-page documents**: chunk by section, extract per chunk, then merge with conflict rules (prefer the labeled "total due" over a table subtotal); or use a long-context model with page references.
5. **Cost and throughput**: use the cheapest model that meets per-field targets (often a small model with a good schema), batch APIs for offline jobs, prompt caching for the shared instructions, and a stronger model only for retries.
6. **Evaluation**: gold set (100-500 documents) double-annotated; metrics per field: precision, recall, F1 (a wrong value counts as both a false positive and a false negative; an abstained null on a present field is a false negative), plus document-level "fully correct" rate and straight-through-processing rate. Track drift: new vendors/layouts.

**Pitfalls**: evaluating overall accuracy only (hides a weak critical field), hallucinating plausible values for absent fields, fixing the prompt on the test set, ignoring format normalization before comparison, no versioning of schema and prompt, silent failures when OCR is bad.

## Worked example
Illustrative: 50,000 invoices/month, 6 fields. A 300-invoice gold set gives, for `total`: 280 correct, 8 wrong values, 6 nulls on present fields, 6 where the gold is null and the model correctly returned null.

- $TP = 280$; $FP = 8$ (wrong values); $FN = 8 + 6 = 14$ (wrong values plus abstentions).
- Precision $= 280/288 = 0.972$; recall $= 280/294 = 0.952$; $F_1 = 2PR/(P+R) \approx 0.962$.
- Routing: records that fail validation or whose two-sample extractions disagree (say 18%) go to review. The 14 bad records are 4.7% of 300; if review catches 85% of them, residual error falls to about 0.7% with an 18% manual workload instead of 100%.
- Cost sketch: 2,000 input + 300 output tokens per invoice at \$0.15 / \$0.60 per million (small model) is $0.0003 + 0.00018 = 0.00048$ dollars, about \$24 per month for 50k invoices; retries on 5% with a stronger model add little. The review labor dominates the budget.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A field is absent from a document, and the model returns a plausible-looking value. Which mitigation is most direct?",
  "options": [
    "Increase max tokens",
    "Allow null in the schema, instruct 'null if not stated', require a source quote, and check that the quote appears in the document",
    "Use a longer system prompt",
    "Raise the temperature"
  ],
  "answer": 1,
  "explanation": "Giving the model a legitimate way to abstain and verifying grounding in the source catches fabricated values."
}
```

```quiz
{
  "id": "q2",
  "question": "Overall field accuracy is 97%, but the `total` field is critical. What should you report?",
  "options": [
    "Only the 97%",
    "Per-field precision/recall/F1, with the critical fields tracked and gated separately, plus the straight-through rate",
    "Only BLEU",
    "Only latency"
  ],
  "answer": 1,
  "explanation": "Aggregates hide weak fields; each field has different error costs."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `validate(record, schema)` returning a sorted list of `(field, code)` tuples. `schema` maps field to a dict with `type` (`'str'` or `'number'`, where bool is not a number), optional `required` (default False), `enum` (list) and `pattern` (regex, use `re.fullmatch`). Codes: `'missing'` (required and absent or None), `'type'`, `'enum'`, `'pattern'`, and `'unexpected'` for record keys not in the schema. A None value on a non-required field is fine; check enum/pattern only when the type is correct.",
  "starterCode": "import re\n\ndef validate(record, schema):\n    pass\n",
  "tests": "schema = {\n    'invoice_no': {'type': 'str', 'required': True, 'pattern': r'INV-\\d{4}'},\n    'total': {'type': 'number', 'required': True},\n    'currency': {'type': 'str', 'required': True, 'enum': ['USD', 'EUR']},\n    'po': {'type': 'str'},\n}\nassert validate({'invoice_no': 'INV-0001', 'total': 10, 'currency': 'USD'}, schema) == []\nassert validate({'invoice_no': 'INV-0001', 'total': 10.5, 'currency': 'EUR', 'po': None}, schema) == []\nassert validate({}, schema) == [('currency', 'missing'), ('invoice_no', 'missing'), ('total', 'missing')]\nbad = {'invoice_no': 'INV-12', 'total': '12.5', 'currency': 'GBP', 'extra': 1}\nassert validate(bad, schema) == [('currency', 'enum'), ('extra', 'unexpected'), ('invoice_no', 'pattern'), ('total', 'type')]\nassert validate({'invoice_no': 'INV-0001', 'total': True, 'currency': 'USD'}, schema) == [('total', 'type')]",
  "solution": "import re\n\ndef validate(record, schema):\n    errs = []\n    for field, spec in schema.items():\n        val = record.get(field)\n        if val is None:\n            if spec.get('required'):\n                errs.append((field, 'missing'))\n            continue\n        t = spec.get('type')\n        if t == 'str':\n            ok = isinstance(val, str)\n        elif t == 'number':\n            ok = isinstance(val, (int, float)) and not isinstance(val, bool)\n        else:\n            ok = True\n        if not ok:\n            errs.append((field, 'type'))\n            continue\n        if 'enum' in spec and val not in spec['enum']:\n            errs.append((field, 'enum'))\n        if 'pattern' in spec and not re.fullmatch(spec['pattern'], val):\n            errs.append((field, 'pattern'))\n    for key in record:\n        if key not in schema:\n            errs.append((key, 'unexpected'))\n    return sorted(errs)",
  "hints": [
    "Use `record.get(field)` so absent keys and explicit None are treated alike.",
    "`bool` is a subclass of `int`, so exclude it explicitly."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Implement `field_prf(preds, golds, fields)` returning `{field: (precision, recall, f1)}` over parallel lists of dicts (use `.get`, so a missing key is None). Per document and field: pred equal to a non-null gold is a TP; a non-null pred that differs from the gold (including a null gold) is an FP; a non-null gold not matched by the pred (null or wrong) is an FN. Use 0.0 where a denominator is 0.",
  "starterCode": "def field_prf(preds, golds, fields):\n    pass\n",
  "tests": "golds = [{'a': 'x', 'b': '1'}, {'a': 'y', 'b': None}, {'a': 'z', 'b': '3'}]\npreds = [{'a': 'x', 'b': '1'}, {'a': 'w', 'b': '9'}, {'a': None, 'b': '3'}]\nres = field_prf(preds, golds, ['a', 'b'])\npa, ra, fa = res['a']\nassert abs(pa - 0.5) < 1e-12 and abs(ra - 1 / 3) < 1e-12 and abs(fa - 0.4) < 1e-12\npb, rb, fb = res['b']\nassert abs(pb - 2 / 3) < 1e-12 and abs(rb - 1.0) < 1e-12 and abs(fb - 0.8) < 1e-12\nassert field_prf([{}], [{}], ['a']) == {'a': (0.0, 0.0, 0.0)}",
  "solution": "def field_prf(preds, golds, fields):\n    out = {}\n    for f in fields:\n        tp = fp = fn = 0\n        for p, g in zip(preds, golds):\n            pv, gv = p.get(f), g.get(f)\n            if pv is not None and pv == gv:\n                tp += 1\n            else:\n                if pv is not None:\n                    fp += 1\n                if gv is not None:\n                    fn += 1\n        prec = tp / (tp + fp) if tp + fp else 0.0\n        rec = tp / (tp + fn) if tp + fn else 0.0\n        f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0.0\n        out[f] = (prec, rec, f1)\n    return out",
  "hints": [
    "A wrong non-null value is both an FP and an FN.",
    "A null prediction on a null gold is a correct abstention: it counts toward nothing."
  ]
}
```

> [!TIP] Interview tips
> - Lead with schema design, validation and repair loops; say prompts alone are not a reliability strategy.
> - Explain confidence as combined signals (validation, agreement, source-quote grounding) and a human-review queue sized by cost of errors.
> - Evaluate per field with P/R/F1 on a gold set, gate critical fields, and track drift and straight-through rate.
