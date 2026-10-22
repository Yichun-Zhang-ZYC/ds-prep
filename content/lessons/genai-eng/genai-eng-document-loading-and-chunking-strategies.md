---
id: genai-eng-document-loading-and-chunking-strategies
title: Document loading & chunking strategies
estimatedMinutes: 12
difficulty: medium
tags: [genai, rag, chunking]
---

## Why it matters
In RAG, retrieval quality is capped by how documents are split: chunks that are too big dilute the embedding and waste context, chunks that are too small lose the information needed to answer. "How would you chunk these documents?" is the first design question in almost every RAG interview.

## Concept
**Pipeline**: load (PDF, HTML, Markdown, docx, tickets, code) → clean and extract structure → chunk → attach metadata → embed → index.

**Loading**: PDFs need layout-aware parsing (columns, tables, headers/footers, scanned pages need OCR); HTML needs boilerplate removal; keep **structure** (headings, table rows, code blocks) and **metadata** (source, title, section path, page, date, ACL) because it powers filtering and citations.

**Chunking strategies**:
- **Fixed size** (tokens or characters) with **overlap** (10 to 20%): simple baseline, can cut mid-sentence; overlap protects facts that straddle a boundary.
- **Recursive / structure-aware**: split on the largest separator that fits (sections, paragraphs, sentences, words); the common default (for example LangChain's `RecursiveCharacterTextSplitter`). Markdown/HTML splitters respect headings; code splitters respect functions.
- **Semantic chunking**: split where embedding similarity between adjacent sentences drops; adapts to topics but costs more and is not always better.
- **Hierarchical / parent-child**: embed small child chunks for precise matching, return the larger parent (or neighbouring chunks, "sentence-window") to the LLM for context.
- **Contextual chunks**: prepend a document title or an LLM-written summary of where the chunk sits so isolated chunks stay interpretable.
- Special cases: tables (keep rows with headers), FAQs (one Q&A per chunk), chat logs (by turn window).

**Sizing**: typical 200 to 800 tokens. Smaller chunks give precise retrieval but need more chunks and lose context; larger chunks give context but blur the embedding and use more of the prompt budget. Respect the embedding model's max input length. There is no universal answer: tune chunk size, overlap and top-$k$ on an eval set measuring retrieval recall and answer quality.

Number of chunks for $n$ words, size $s$, overlap $o$: $\lceil (n - o)/(s - o) \rceil$ for $n > s$ (storage and embedding cost scale with it).

## Worked example
A 5,000-word policy document, chunk size 400 words, overlap 50. The stride is $400 - 50 = 350$, so the chunk count is $\lceil (5000 - 50)/350 \rceil = \lceil 14.14 \rceil = 15$. The chunks hold $15 \times 400 = 6{,}000$ words, 20% more than the document because of overlap and the short final chunk.

Failure case: "Refunds are allowed within 30 days." sits at the end of one chunk and "Exceptions: sale items." at the start of the next. With no overlap, a query about sale-item refunds retrieves a chunk that never mentions refunds. With 50 words of overlap, both facts appear in one chunk. Even better: a section-aware splitter keeps the "Refund policy" section together and stores `section: "Refund policy"` as metadata.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What is the main purpose of overlap in fixed-size chunking?",
  "options": [
    "To reduce the number of chunks",
    "To keep information that straddles a boundary retrievable in at least one chunk",
    "To speed up embedding",
    "To remove duplicates"
  ],
  "answer": 1,
  "explanation": "Overlap prevents facts and context at boundaries from being split across chunks without either chunk containing the whole idea. It increases chunk count and storage."
}
```

```quiz
{
  "id": "q2",
  "question": "Your retriever finds the right passage, but answers lack surrounding context. A good fix is:",
  "options": [
    "Shrink chunks to 20 tokens",
    "Parent-child or sentence-window retrieval: match on small chunks, pass larger surrounding text to the LLM",
    "Remove metadata",
    "Increase temperature"
  ],
  "answer": 1,
  "explanation": "Small chunks match precisely; expanding to the parent or neighbours supplies the context the LLM needs."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement three helpers. `chunk_words(text, size, overlap)` splits on whitespace into windows of `size` words, each starting `size - overlap` words after the previous, stopping once a window reaches the end (no redundant tail chunks); raise `ValueError` if `overlap >= size`; empty text gives `[]`. `n_chunks(n_words, size, overlap)` computes the count by formula (0 for no words, 1 if `n_words <= size`, otherwise `ceil((n - overlap) / (size - overlap))`). `pack_paragraphs(paragraphs, max_chars)` greedily merges consecutive paragraphs joined by `\\n\\n` while the merged length stays within `max_chars`; an oversize paragraph stays alone.",
  "starterCode": "import math\n\ndef chunk_words(text, size, overlap):\n    pass\n\ndef n_chunks(n_words, size, overlap):\n    pass\n\ndef pack_paragraphs(paragraphs, max_chars):\n    pass\n",
  "tests": "text = \" \".join(\"w%d\" % i for i in range(10))\nc = chunk_words(text, 4, 1)\nassert c == [\"w0 w1 w2 w3\", \"w3 w4 w5 w6\", \"w6 w7 w8 w9\"]\nassert chunk_words(\"a b c\", 5, 2) == [\"a b c\"]\nassert chunk_words(\"\", 4, 1) == []\ntry:\n    chunk_words(\"a b\", 2, 2)\n    assert False\nexcept ValueError:\n    pass\nfor n, s, o in [(10, 4, 1), (5000, 400, 50), (400, 400, 50), (401, 400, 50), (7, 3, 0)]:\n    t = \" \".join([\"x\"] * n)\n    assert len(chunk_words(t, s, o)) == n_chunks(n, s, o), (n, s, o)\nassert n_chunks(5000, 400, 50) == 15\nassert n_chunks(0, 4, 1) == 0\nassert pack_paragraphs([\"aaaa\", \"bbbb\", \"cccccc\"], 10) == [\"aaaa\\n\\nbbbb\", \"cccccc\"]\nassert pack_paragraphs([\"x\" * 15, \"y\"], 10) == [\"x\" * 15, \"y\"]\nassert pack_paragraphs([], 10) == []",
  "solution": "import math\n\ndef chunk_words(text, size, overlap):\n    if overlap >= size:\n        raise ValueError(\"overlap must be smaller than size\")\n    words = text.split()\n    chunks = []\n    start = 0\n    while words:\n        chunks.append(\" \".join(words[start:start + size]))\n        if start + size >= len(words):\n            break\n        start += size - overlap\n    return chunks\n\ndef n_chunks(n_words, size, overlap):\n    if n_words == 0:\n        return 0\n    if n_words <= size:\n        return 1\n    return math.ceil((n_words - overlap) / (size - overlap))\n\ndef pack_paragraphs(paragraphs, max_chars):\n    out = []\n    cur = \"\"\n    for p in paragraphs:\n        if cur and len(cur) + 2 + len(p) <= max_chars:\n            cur = cur + \"\\n\\n\" + p\n        else:\n            if cur:\n                out.append(cur)\n            cur = p\n    if cur:\n        out.append(cur)\n    return out",
  "hints": [
    "Stop the loop as soon as `start + size >= len(words)`.",
    "For packing, check `len(cur) + 2 + len(p) <= max_chars` before appending (2 is the length of the separator)."
  ]
}
```

> [!TIP] Interview tips
> - Start with the pipeline (parse, clean, chunk, metadata, embed) and say chunking is tuned on an eval set, not guessed.
> - Name recursive structure-aware splitting as the default, plus overlap, parent-child retrieval and contextual headers.
> - Mention metadata for filtering and citations, and tables/PDF layout as the usual real-world pain.
