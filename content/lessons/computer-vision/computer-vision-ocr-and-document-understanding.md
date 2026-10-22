---
id: computer-vision-ocr-and-document-understanding
title: OCR and document understanding
estimatedMinutes: 12
difficulty: medium
tags: [computer-vision, ocr, document-ai, ctc, layoutlm]
---

## Why it matters
Invoices, receipts, IDs and contracts are still the largest pool of unstructured data in most companies. "Extract the fields from this scan" is one of the most common applied-CV tasks, and interviewers use it to test whether you can split a problem into stages, pick metrics that match the business unit (a field, not a pixel) and choose between classic pipelines and modern vision-language models.

## Concept
**Classic pipeline** (still the production workhorse):
1. **Pre-process**: deskew, denoise, binarize or normalize contrast, upscale small text (about 30+ px line height helps). If a PDF has a **native text layer**, use it and skip OCR.
2. **Text detection**: find words or lines as boxes or polygons (DBNet and CRAFT are segmentation-style; EAST regresses boxes).
3. **Text recognition**: crop each region and read it. The standard recipe is a CNN or ViT encoder plus a sequence head trained with **CTC loss** (CRNN), or an attention/autoregressive decoder (TrOCR). CTC emits one symbol or a **blank** per frame; decoding collapses repeats and then drops blanks, so a blank is what lets "ll" survive.
4. **Layout and reading order**: group words into lines, blocks, tables and columns; wrong reading order silently corrupts downstream text.
5. **Key information extraction (KIE)**: label tokens as `vendor`, `total`, `date` (token classification) or fill a schema.

**Layout-aware models**: LayoutLM / LayoutLMv2 / v3 feed **text tokens + 2-D bounding boxes (+ image patches)** into a transformer, so position and visual style (a bold number at the bottom right is probably the total) inform the label. **OCR-free** models (Donut, Pix2Struct) map image to structured text end to end, avoiding OCR error propagation but needing more data and compute.

**Today**: general vision-language models read documents zero-shot and often win on messy layouts, charts and handwriting, but cost more per page, can **hallucinate plausible text**, and give no per-character confidence. A common design is OCR/native text for cheap high-volume pages, a VLM for hard ones, and human review below a confidence threshold. See *CLIP and vision-language models* for the model family.

**Metrics** (match the unit that matters to the business):
- **CER / WER**: Levenshtein distance divided by reference length in characters or words (can exceed 1).
- **Detection**: IoU-based precision/recall/F1 of text boxes (see *CV evaluation metrics*).
- **Field-level exact match / F1** for KIE; **ANLS** (average normalized Levenshtein similarity) for DocVQA, which gives partial credit but zeroes out answers whose normalized distance is $\ge 0.5$.
- **Straight-through rate**: share of documents needing no human touch at a target accuracy.

**Pitfalls**: look-alike characters (O/0, l/1), handwriting, stamps and low-resolution fax, multi-column and rotated text, tables (cell structure matters more than text), non-Latin scripts, and **train/test shift across vendors and templates** (split by vendor, not by page).

## Worked example
Reference `invoice 1024`, OCR output `invoice 1O24`: one substitution (0 to O) over 12 characters gives CER $=1/12 \approx 8.3\%$. WER is $1/2 = 50\%$ because one of two words is wrong, which is why CER suits long text, while a single wrong digit in a total is a 100% field error.

CTC decoding of per-frame argmax `- h h - e - l l - l l - o o` ($-$ is blank): collapse repeats to `- h - e - l - l - o`, drop blanks, giving `hello`. The blank between the two `l` runs is what preserves the double letter; without it `llll` would collapse to a single `l`.

Illustrative budget: 99% character accuracy on 10-digit invoice numbers means the whole field is right only $0.99^{10} \approx 90\%$ of the time, so you add validation (checksum, vendor master data, amount reconciliation) and route low-confidence fields to review.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "In CTC decoding, why does the model need a blank symbol?",
  "options": [
    "To mark the end of the text line",
    "To allow repeated characters such as \"ll\" and to represent frames with no character",
    "To speed up beam search",
    "To encode spaces between words"
  ],
  "answer": 1,
  "explanation": "Decoding collapses consecutive identical symbols and then removes blanks. A blank between two identical letters keeps both, and it also absorbs frames that contain no new character."
}
```

```quiz
{
  "id": "q2",
  "question": "A bank wants to extract the amount from scanned cheques. Which metric best reflects business value?",
  "options": [
    "Character error rate of the whole page",
    "Mean IoU of text boxes",
    "Exact-match accuracy of the extracted amount field (with coverage at a confidence threshold)",
    "BLEU against the page text"
  ],
  "answer": 2,
  "explanation": "One wrong digit makes the amount useless, so field-level exact match, together with how many documents are auto-processed at a given confidence, matches the business outcome. CER and IoU are diagnostics for components."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `edit_distance(a, b)` (Levenshtein, works on strings or lists), `cer(ref, hyp)` (edit distance over characters divided by `len(ref)`) and `wer(ref, hyp)` (same over whitespace-split words).",
  "starterCode": "def edit_distance(a, b):\n    pass\n\ndef cer(ref, hyp):\n    pass\n\ndef wer(ref, hyp):\n    pass\n\nprint(cer('invoice 1024', 'invoice 1O24'))",
  "tests": "assert edit_distance('kitten', 'sitting') == 3\nassert edit_distance('', 'abc') == 3\nassert edit_distance(['a', 'b'], ['a']) == 1\nassert abs(cer('invoice 1024', 'invoice 1O24') - 1 / 12) < 1e-12\nassert abs(wer('total due 50', 'total do 50') - 1 / 3) < 1e-12\nassert abs(wer('a b c d', 'a b') - 0.5) < 1e-12\nassert cer('abc', 'abc') == 0.0",
  "solution": "def edit_distance(a, b):\n    prev = list(range(len(b) + 1))\n    for i in range(1, len(a) + 1):\n        cur = [i] + [0] * len(b)\n        for j in range(1, len(b) + 1):\n            cost = 0 if a[i - 1] == b[j - 1] else 1\n            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)\n        prev = cur\n    return prev[-1]\n\ndef cer(ref, hyp):\n    return edit_distance(ref, hyp) / len(ref)\n\ndef wer(ref, hyp):\n    r = ref.split()\n    return edit_distance(r, hyp.split()) / len(r)",
  "hints": [
    "Dynamic programming over two rows: min of delete, insert, substitute.",
    "WER is the same function applied to `ref.split()` and `hyp.split()`."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Implement `ctc_greedy_decode(frames, blank='-')` for a list of per-frame argmax symbols: collapse consecutive repeats, then remove blanks.",
  "starterCode": "def ctc_greedy_decode(frames, blank='-'):\n    pass\n\nprint(ctc_greedy_decode(list('-hh-e-ll-ll-oo')))",
  "tests": "assert ctc_greedy_decode(list('-hh-e-ll-ll-oo')) == 'hello'\nassert ctc_greedy_decode(list('lll')) == 'l'\nassert ctc_greedy_decode(list('l-l')) == 'll'\nassert ctc_greedy_decode(list('----')) == ''\nassert ctc_greedy_decode(['<b>', 'a', 'a', '<b>', 'a'], blank='<b>') == 'aa'",
  "solution": "def ctc_greedy_decode(frames, blank='-'):\n    out = []\n    prev = None\n    for f in frames:\n        if f != prev and f != blank:\n            out.append(f)\n        prev = f\n    return ''.join(out)",
  "hints": [
    "Keep a symbol only if it differs from the previous frame and is not the blank.",
    "Update `prev` on every frame, including blanks."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Implement `nls(a, b)` (edit distance divided by the longer length, 0 if both empty) and `anls(pred, gold_answers, tau=0.5)`: lowercase and strip both sides, for each gold answer score $1 - \\text{nls}$ if $\\text{nls} < \\tau$ else 0, and return the best score over gold answers.",
  "starterCode": "def nls(a, b):\n    pass\n\ndef anls(pred, gold_answers, tau=0.5):\n    pass\n\nprint(anls('Acme Corp', ['acme corp.']))",
  "tests": "assert nls('abc', 'abc') == 0.0\nassert abs(nls('abcd', 'abxx') - 0.5) < 1e-12\nassert anls('Acme Corp', ['Acme Corp']) == 1.0\nassert abs(anls('acme corp', ['ACME CORP.', 'acme']) - 0.9) < 1e-12\nassert anls('zzzz', ['abcd']) == 0.0\nassert abs(anls('abcd', ['abxd']) - 0.75) < 1e-12\nassert anls('abcd', ['abxx']) == 0.0",
  "solution": "def edit_distance(a, b):\n    prev = list(range(len(b) + 1))\n    for i in range(1, len(a) + 1):\n        cur = [i] + [0] * len(b)\n        for j in range(1, len(b) + 1):\n            cost = 0 if a[i - 1] == b[j - 1] else 1\n            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)\n        prev = cur\n    return prev[-1]\n\ndef nls(a, b):\n    m = max(len(a), len(b))\n    return 0.0 if m == 0 else edit_distance(a, b) / m\n\ndef anls(pred, gold_answers, tau=0.5):\n    p = pred.strip().lower()\n    best = 0.0\n    for g in gold_answers:\n        d = nls(p, g.strip().lower())\n        score = 1 - d if d < tau else 0.0\n        best = max(best, score)\n    return best",
  "hints": [
    "Normalize with `.strip().lower()` before comparing.",
    "The threshold is strict: a normalized distance of exactly 0.5 scores 0."
  ]
}
```

> [!TIP] Interview tips
> - Frame it as stages (preprocess, detect, recognize, layout, extract, validate) and name where errors compound.
> - Pick metrics at the field level for the business, CER/WER for the recognizer, and ANLS for QA-style tasks.
> - Mention native PDF text first, layout-aware models (LayoutLM) vs OCR-free (Donut) vs VLMs, and the hallucination risk of generative readers.
> - Split evaluation by vendor/template and add validation rules plus human-in-the-loop for low confidence.
