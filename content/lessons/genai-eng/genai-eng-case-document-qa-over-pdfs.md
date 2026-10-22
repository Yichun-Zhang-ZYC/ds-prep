---
id: genai-eng-case-document-qa-over-pdfs
title: "Case: Document Q&A over PDFs"
estimatedMinutes: 14
difficulty: medium
tags: [genai, case-study, rag, pdf, citations]
---

## Why it matters
"Build a chatbot over our PDFs" sounds easy and is where most RAG prototypes fail: the hard part is parsing, not the LLM. Interviewers look for whether you handle tables, scans, citations and abstention, and whether you can say how you would measure it.

## Concept
See the chunking, hybrid search, reranking and RAG metrics lessons for the building blocks; this case is the end-to-end playbook.

1. **Clarify**: corpus size and growth, document types (born-digital vs scanned, tables, charts), languages, access control per document or user, freshness, question types (lookup, multi-hop, comparison across documents, numeric), citation requirement.
2. **Ingestion**: detect a text layer; if absent, OCR. Use a layout-aware parser (reading order, multi-column, headers/footers removed, tables kept as Markdown/HTML rows, figures captioned or described by a vision model). Store page number, section path, doc id, version and ACL as metadata.
3. **Chunking**: split by structure (headings, paragraphs, table = one unit) with a size cap (e.g., 300-500 tokens) and small overlap; prepend the document title and section path to each chunk ("contextual chunks") so a chunk like "Revenue grew 12%" is not orphaned.
4. **Retrieval**: dense + BM25 hybrid, metadata filters (doc, date, ACL applied *before* ranking), over-retrieve (top 20-50), rerank to top 4-8. For multi-document or broad questions, use query decomposition or a document-level pre-filter, and for numeric table questions consider text-to-SQL over extracted tables.
5. **Generation**: answer only from context, quote or cite `[chunk id]` with page numbers, say "not found in the documents" when evidence is missing. Post-check that each cited chunk supports the sentence.
6. **Evaluation**: build 100-300 questions with gold answers and gold pages from real users; measure recall@k of the gold page, faithfulness, answer correctness, and abstention rate on unanswerable questions; slice by document type and question type.

**Pitfalls**: headers and footers repeated in every chunk poison BM25; tables flattened into word soup; tiny chunks lose meaning, huge ones dilute embeddings; users asking about "the latest" version; permissions enforced after retrieval (leaks); scanned PDFs silently producing empty text; evaluating only on easy lookup questions.

## Worked example
Illustrative: a 200-page annual report, about 500 tokens per page = 100,000 tokens. Chunks of 400 tokens with 50 overlap give stride 350, so $\lceil (100000-400)/350 \rceil + 1 = 285 + 1 = 286$ chunks. Embedding them is negligible in cost; the dominant risk is parse quality.

Query: "What was operating margin in 2023, and how did it compare to 2022?" The answer sits in a table (page 87) and a narrative paragraph (page 31).
- Hybrid retrieval returns 30 candidates; BM25 catches the exact phrase "operating margin", the dense retriever catches the paraphrase "profitability".
- The reranker keeps 6 chunks (about 2,400 tokens of context), including the table chunk, kept intact with its header row and the title "Consolidated results".
- The model answers "Operating margin was 14.1% in 2023 vs 12.8% in 2022 [p.87]" and the citation checker confirms both numbers appear in the cited chunk. If it had said 14.6%, the check would flag the sentence and the system would regenerate or abstain.
- Debug path when wrong: was the gold page in the top 30 (retrieval)? in the top 6 (rerank)? was the table parsed correctly (ingestion)? did the model use it (generation)?

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Users report that questions about numbers in tables get wrong answers, though narrative questions work. Which first step is most likely to help?",
  "options": [
    "Increase the temperature",
    "Check how tables are parsed and chunked; keep each table with its header and title as a unit (Markdown/HTML) and re-test",
    "Switch to a smaller embedding model",
    "Remove the reranker"
  ],
  "answer": 1,
  "explanation": "Flattened tables lose row/column structure, which retrieval and the model cannot recover. Fix ingestion first."
}
```

```quiz
{
  "id": "q2",
  "question": "Different users may see different documents. Where should access control be applied?",
  "options": [
    "After generation, by redacting the answer",
    "As a metadata filter inside the retrieval query, before ranking and before anything reaches the prompt",
    "Only in the system prompt",
    "Only at the UI"
  ],
  "answer": 1,
  "explanation": "Anything that reaches the prompt can leak into the answer, so filter before retrieval returns it."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `chunk_tokens(tokens, size, overlap)` returning a list of chunks (lists) of at most `size` tokens, advancing by `size - overlap`, stopping once a chunk reaches the end (no trailing chunk fully contained in the previous one); empty input gives `[]`. Also `num_chunks(total, size, overlap)` returning the count by formula without building chunks (1 if `total <= size`, 0 if `total == 0`).",
  "starterCode": "import math\n\ndef chunk_tokens(tokens, size, overlap):\n    pass\n\ndef num_chunks(total, size, overlap):\n    pass\n",
  "tests": "assert chunk_tokens(list(range(10)), 4, 1) == [[0,1,2,3],[3,4,5,6],[6,7,8,9]]\nassert chunk_tokens(list(range(5)), 10, 2) == [[0,1,2,3,4]]\nassert chunk_tokens([], 4, 1) == []\nassert chunk_tokens(list(range(8)), 4, 0) == [[0,1,2,3],[4,5,6,7]]\nassert num_chunks(100000, 400, 50) == 286\nassert num_chunks(0, 400, 50) == 0\nassert num_chunks(300, 400, 50) == 1\nfor total in range(0, 40):\n    for size, ov in [(4, 1), (5, 0), (7, 3)]:\n        assert num_chunks(total, size, ov) == len(chunk_tokens(list(range(total)), size, ov))",
  "solution": "import math\n\ndef chunk_tokens(tokens, size, overlap):\n    chunks = []\n    if not tokens:\n        return chunks\n    stride = size - overlap\n    i = 0\n    while True:\n        chunks.append(tokens[i:i + size])\n        if i + size >= len(tokens):\n            break\n        i += stride\n    return chunks\n\ndef num_chunks(total, size, overlap):\n    if total == 0:\n        return 0\n    if total <= size:\n        return 1\n    return math.ceil((total - size) / (size - overlap)) + 1",
  "hints": [
    "Slice `tokens[i:i+size]`, then stop if `i + size >= len(tokens)`.",
    "After the first chunk covers `size` tokens, each extra chunk covers `size - overlap` new ones."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Build a citation checker. `chunks` maps int ids to text; each answer sentence cites chunks like `[1]`. Implement `failed_sentences(sentences, chunks, min_cov=0.6)` returning the indices of sentences that fail. A sentence fails if it has no citation, cites an id not in `chunks`, or the best coverage over its cited chunks is below `min_cov`. Coverage = share of the sentence's words (lowercase `[a-z0-9]+` tokens of length >= 4, citation markers removed) that appear among the chunk's `[a-z0-9]+` tokens; a sentence with no such words has coverage 1.0.",
  "starterCode": "import re\n\ndef failed_sentences(sentences, chunks, min_cov=0.6):\n    pass\n",
  "tests": "chunks = {1: 'Revenue grew 12 percent to 4.2 billion dollars in fiscal 2023.', 2: 'The company employs 8,000 people across 30 countries.'}\nsents = [\n    'Revenue grew 12 percent in fiscal 2023 [1].',\n    'The company employs 30000 people [2].',\n    'Profit doubled last year [1].',\n    'Headcount is large.',\n    'Margins improved [3].',\n    'Revenue grew [2] [1].',\n]\nassert failed_sentences(sents, chunks) == [2, 3, 4]\nassert failed_sentences(sents, chunks, min_cov=0.8) == [1, 2, 3, 4]\nassert failed_sentences([], chunks) == []",
  "solution": "import re\n\ndef failed_sentences(sentences, chunks, min_cov=0.6):\n    words_of = {k: set(re.findall(r'[a-z0-9]+', v.lower())) for k, v in chunks.items()}\n    bad = []\n    for i, s in enumerate(sentences):\n        cited = [int(x) for x in re.findall(r'\\[(\\d+)\\]', s)]\n        if not cited or any(c not in chunks for c in cited):\n            bad.append(i)\n            continue\n        text = re.sub(r'\\[\\d+\\]', ' ', s).lower()\n        words = {w for w in re.findall(r'[a-z0-9]+', text) if len(w) >= 4}\n        if not words:\n            continue\n        best = max(len(words & words_of[c]) / len(words) for c in cited)\n        if best < min_cov:\n            bad.append(i)\n    return bad",
  "hints": [
    "Extract ids with `re.findall(r'\\[(\\d+)\\]', s)` and strip them before collecting words.",
    "Use `max(...)` over cited chunks, so a sentence passes if any cited chunk supports it."
  ]
}
```

> [!TIP] Interview tips
> - Say the hard part is ingestion (OCR, layout, tables, metadata), then walk through chunking, hybrid retrieval, rerank, cited generation.
> - Enforce access control as a pre-retrieval filter and require citations with page numbers plus an abstain path.
> - Describe evaluation: gold pages for recall@k, faithfulness, abstention on unanswerable questions, sliced by document and question type.
