---
id: ml-system-design-rag-chatbot-enterprise-q-and-a
title: RAG chatbot / enterprise Q&A
estimatedMinutes: 15
difficulty: hard
tags: [ml-system-design, llm, rag, retrieval, evaluation]
---

## Why it matters
"Build a chatbot that answers questions over our company documents" is now the most common LLM system design prompt. Interviewers check that you can structure ingestion, retrieval, generation, evaluation and security, and that you know where RAG fails.

## Concept
**Why RAG**: an LLM alone lacks private and fresh knowledge and hallucinates. Retrieval-augmented generation fetches relevant passages at query time and asks the model to answer **only from them with citations**. Compared with fine-tuning, RAG updates instantly (re-index), respects access control, and gives traceable sources. Fine-tune for style/format or domain vocabulary, not for facts that change.

**Offline ingestion**:
1. **Connectors** (Confluence, Drive, Slack, tickets, PDFs) with incremental sync and deletions.
2. **Parsing and cleaning**: layout-aware PDF/table extraction, boilerplate removal, OCR where needed. Parsing quality often dominates answer quality.
3. **Chunking**: split by structure (headings, paragraphs) into ~200-500 token chunks with small overlap; keep the title/section path and metadata (source, date, ACL, product) with each chunk. Too small loses context; too large dilutes the embedding and wastes prompt tokens.
4. **Embedding and indexing**: embed chunks, store in a vector DB (HNSW ANN) plus a BM25 index for keywords; keep metadata for filtering.

**Online path**:
1. **Query rewriting** (resolve chat history references, expand acronyms, optional multi-query/HyDE) and routing (is retrieval needed?).
2. **Hybrid retrieval** with **ACL/metadata filters applied inside the search**: top ~50 from dense and BM25, fused with **RRF** $\sum_r 1/(k+\text{rank}_r)$.
3. **Reranking** with a cross-encoder to the top 5-10; this typically gives the largest quality jump.
4. **Prompt assembly**: system rules ("answer only from context, say 'I don't know' otherwise, cite sources"), numbered passages, conversation, token-budget management.
5. **Generation** (streaming), then **citation/faithfulness checks** and output guardrails.

**Evaluation (separate the stages)**:
- *Retrieval*: recall@k, MRR, nDCG on a labeled question set (question to gold passage).
- *Generation*: **faithfulness/groundedness** (every claim supported by context), answer relevance, correctness against gold answers, refusal rate on unanswerable questions; use LLM-as-judge calibrated with human labels.
- *Online*: thumbs up/down, escalation rate, citation click-through, latency (time to first token), cost per query.

**Security and ops**: enforce permissions at retrieval (never rely on the prompt), treat retrieved text as untrusted (**prompt injection**), redact PII, log for audit, cache embeddings and frequent answers, version the index and prompts, and monitor drift in documents and questions.

**Typical failure modes**: bad chunking or parsing, missing recall (the answer exists but was not retrieved), stale documents, conflicting sources, multi-hop questions needing several passages, long-context "lost in the middle", and confident answers when no evidence exists.

## Worked example
Chunking: a 4,000-word handbook with chunks of 500 words and 100 overlap has stride 400. Windows start at 0, 400, ..., 3,600 (the last one reaches the end), so there are 10 chunks.

Fusion: BM25 ranks $[a,b,c]$ and the dense retriever ranks $[c,a,d]$. With $k=60$: $a=\frac{1}{61}+\frac{1}{62}=0.03252$, $c=\frac{1}{63}+\frac{1}{61}=0.03227$, $b=\frac{1}{62}=0.01613$, $d=\frac{1}{63}=0.01587$. Fused order: $a,c,b,d$.

Sizing: 10M chunks at 1,024 dimensions in float32 need $10^7\times1024\times4\approx41$ GB; int8 quantization cuts it to about 10 GB. With 6 passages of 400 tokens plus 500 tokens of instructions and history, the prompt is about 2,900 tokens per query.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Users report wrong answers. Logs show the correct passage was NOT in the retrieved top-10. Where do you invest first?",
  "options": [
    "Switch to a bigger LLM",
    "Improve retrieval (chunking, hybrid search, query rewriting, reranker) and measure recall@k",
    "Lower the temperature",
    "Add more instructions to the prompt"
  ],
  "answer": 1,
  "explanation": "A generator cannot use evidence it never sees. Diagnose retrieval and generation separately; here retrieval recall is the bottleneck."
}
```

```quiz
{
  "id": "q2",
  "question": "Documents have per-team access permissions. Where should access control be enforced?",
  "options": [
    "In the system prompt: 'do not reveal restricted documents'",
    "As filters in the retrieval query using the caller's identity, so restricted chunks never enter the prompt",
    "After generation by scanning the answer",
    "Not needed if the model is aligned"
  ],
  "answer": 1,
  "explanation": "Anything in the context can leak. Filter at retrieval time; prompts are not a security boundary."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `chunk_words(words, size, overlap)`: windows of `size` words with stride `size - overlap`, starting at 0, stopping after the window that reaches the end of the list (empty input gives `[]`). Implement `recall_at_k(retrieved, relevant, k)` = fraction of `relevant` ids found in the first `k` retrieved (0.0 if `relevant` is empty). Implement `rrf(rankings, k=60)` taking a list of ranked id lists and returning `[(doc_id, score), ...]` sorted by score descending (ties by id ascending), where score = sum of 1/(k + rank) with rank starting at 1.",
  "starterCode": "def chunk_words(words, size, overlap):\n    pass\n\ndef recall_at_k(retrieved, relevant, k):\n    pass\n\ndef rrf(rankings, k=60):\n    pass\n\nprint(chunk_words(list(range(10)), 4, 1))\nprint(rrf([['a', 'b', 'c'], ['c', 'a', 'd']]))",
  "tests": "assert chunk_words(list(range(10)), 4, 1) == [[0, 1, 2, 3], [3, 4, 5, 6], [6, 7, 8, 9]]\nassert chunk_words(list(range(5)), 4, 1) == [[0, 1, 2, 3], [3, 4]]\nassert chunk_words([], 4, 1) == []\nassert len(chunk_words(list(range(4000)), 500, 100)) == 10\nassert recall_at_k(['a', 'b', 'c'], ['b', 'z'], 2) == 0.5\nassert recall_at_k(['a'], [], 3) == 0.0\nr = rrf([['a', 'b', 'c'], ['c', 'a', 'd']])\nassert [d for d, _ in r] == ['a', 'c', 'b', 'd']\nassert abs(r[0][1] - (1 / 61 + 1 / 62)) < 1e-12\nassert abs(r[2][1] - 1 / 62) < 1e-12",
  "solution": "def chunk_words(words, size, overlap):\n    n = len(words)\n    if n == 0:\n        return []\n    step = size - overlap\n    out = []\n    i = 0\n    while True:\n        out.append(words[i:i + size])\n        if i + size >= n:\n            break\n        i += step\n    return out\n\ndef recall_at_k(retrieved, relevant, k):\n    if not relevant:\n        return 0.0\n    top = set(retrieved[:k])\n    return len([r for r in relevant if r in top]) / len(relevant)\n\ndef rrf(rankings, k=60):\n    scores = {}\n    for ranking in rankings:\n        for pos, d in enumerate(ranking, start=1):\n            scores[d] = scores.get(d, 0.0) + 1 / (k + pos)\n    return sorted(scores.items(), key=lambda kv: (-kv[1], kv[0]))",
  "hints": [
    "Stop the loop right after appending the window whose end index i + size reaches len(words).",
    "enumerate(ranking, start=1) gives the 1-based rank directly."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Design an internal Q&A chatbot over 2M company documents with per-team permissions.' Outline your answer.",
  "answer": "**Requirements**: 2M docs (~20M chunks), 50 QPS, time-to-first-token < 2 s, answers must cite sources and respect ACLs, freshness within an hour.\n\n**Ingestion**: connectors with incremental sync/webhooks, layout-aware parsing, structure-based chunking (~400 tokens, 50 overlap) with title path + ACL metadata, embeddings in a vector DB with a BM25 index; deletions and permission changes propagate.\n\n**Query path**: rewrite with chat history -> hybrid retrieval (top 50 dense + 50 BM25) with ACL filter inside the query -> RRF -> cross-encoder rerank to 8 -> prompt with numbered passages and strict grounding instructions -> streaming LLM answer with citations -> faithfulness check; fall back to 'I could not find this' and a link to search/escalation.\n\n**Evaluation**: golden set of ~500 Q&A with gold passages; recall@k/MRR for retrieval; faithfulness and correctness via LLM judge + human spot checks; online thumbs, escalations; regression suite in CI for prompt/model/index changes.\n\n**Risks and mitigations**: prompt injection in documents (delimit, sanitize, no tool power from retrieved text), PII leakage (redaction, audit logs), stale/conflicting docs (date metadata, prefer newer), cost (cache, smaller model for easy queries, shorter contexts).\n\n**Extensions**: conversational memory, agentic multi-step retrieval for multi-hop questions, fine-tuned embedding model on domain pairs."
}
```

> [!TIP] Interview tips
> - Walk through ingestion, retrieval, reranking, generation, evaluation in that order and name a failure mode for each.
> - Evaluate retrieval (recall@k) separately from generation (faithfulness); say which you would fix first.
> - Enforce ACLs at retrieval time and treat retrieved content as untrusted input.
> - Know when not to use RAG: style/format changes (fine-tune), tiny corpora (just put it in the context), structured data (text-to-SQL or tools).
