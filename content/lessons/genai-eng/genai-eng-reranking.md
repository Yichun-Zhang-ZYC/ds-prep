---
id: genai-eng-reranking
title: Reranking
estimatedMinutes: 10
difficulty: medium
tags: [genai, rag, reranking, cross-encoder, mrr]
---

## Why it matters
First-stage retrieval is fast but coarse. A reranker re-scores a small candidate set with a much more accurate model, and is often the single cheapest quality win in a RAG pipeline. Expect questions on bi-encoder vs cross-encoder and the latency budget.

## Concept
**Bi-encoder** (embedding model): encodes query and document independently, so document vectors are precomputed and searched with ANN. Fast, but query and document never interact beyond one dot product.

**Cross-encoder** reranker: feeds `[query; document]` jointly through a transformer and outputs a relevance score. Token-level interaction makes it far more accurate, but it needs one forward pass per (query, document) pair and cannot be precomputed. Cost is $O(\text{candidates})$ per query, so it only runs on a shortlist.

**Two-stage pattern**: retrieve top $N$ (50-200, high recall, via hybrid search) then rerank to top $n$ (3-10) that go into the prompt. Rerankers include open cross-encoders (bge-reranker, MS MARCO MiniLM), hosted APIs (Cohere Rerank, Voyage) and **LLM rerankers** (pointwise score, listwise ordering; slower and costlier, useful for hard queries). Late-interaction models (ColBERT) sit between bi- and cross-encoders.

**Metrics**: stage 1 is judged by **recall@N** (is the answer in the candidate set at all?); stage 2 by ranking quality: **MRR** $= \frac{1}{|Q|}\sum_q \frac{1}{\text{rank}_q}$ (rank of first relevant, 0 if absent), **nDCG@k**, and recall@n for what reaches the LLM.

**Practical notes**: truncate long chunks to the reranker's max length (often 512 tokens); batch pairs on GPU; cache scores for popular queries; a reranker cannot recover documents the retriever missed, so raise $N$ before blaming the reranker; also useful for dropping low-score candidates (score threshold) so the LLM can say "not found".

## Worked example
Illustrative numbers on a support-docs eval set: the hybrid retriever has recall@50 = 0.92 but recall@5 = 0.61, so putting its top 5 in the prompt misses the answer 39% of the time. A cross-encoder re-scores the 50 candidates (about 150 ms batched on one GPU) and lifts recall@5 to 0.84, which is close to the 0.92 ceiling set by stage 1. MRR rises from 0.48 to 0.71.

Latency budget: retrieval 40 ms + rerank 150 ms + generation 1.5 s, so reranking adds under 10% to total latency while cutting prompt tokens from, say, 20 chunks to 5.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why can't you use a cross-encoder to search the whole corpus?",
  "options": [
    "It cannot output scores",
    "Document representations depend on the query, so nothing can be precomputed and each pair needs a forward pass",
    "It only works on short queries",
    "It requires a vector database"
  ],
  "answer": 1,
  "explanation": "Cross-encoders process query and document jointly, so cost scales with the number of candidates scored. That is why they rerank a shortlist."
}
```

```quiz
{
  "id": "q2",
  "question": "Recall@50 of the first stage is 0.70. The best reranker can lift recall@5 to at most about:",
  "options": [
    "0.50",
    "0.70",
    "0.95",
    "1.00"
  ],
  "answer": 1,
  "explanation": "A reranker only reorders candidates; it cannot recover documents missing from the top 50. The ceiling is 0.70, so improve retrieval (hybrid search, larger N, query rewriting) first."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `rerank(query, candidates, scorer, top_n)`: candidates is a list of `(doc_id, text)`; call `scorer(query, text)` for each, and return the top_n doc_ids by score descending (ties keep the original candidate order). Then implement `mrr(ranked_lists, relevant_sets)`: for each query, the reciprocal of the 1-based rank of the first relevant id (0 if none); return the mean over queries.",
  "starterCode": "def rerank(query, candidates, scorer, top_n):\n    pass\n\ndef mrr(ranked_lists, relevant_sets):\n    pass\n\ndef overlap(q, text):\n    return len(set(q.split()) & set(text.split()))\n\nprint(rerank('red apple', [('d1', 'green pear'), ('d2', 'red apple pie')], overlap, 1))\n",
  "tests": "def overlap(q, text):\n    return len(set(q.split()) & set(text.split()))\n\ncands = [('d1', 'green pear'), ('d2', 'red apple pie'), ('d3', 'apple'), ('d4', 'banana')]\nassert rerank('red apple', cands, overlap, 2) == ['d2', 'd3']\nassert rerank('red apple', cands, overlap, 4) == ['d2', 'd3', 'd1', 'd4']\nassert rerank('zzz', cands, overlap, 2) == ['d1', 'd2']\nassert rerank('x', [], overlap, 3) == []\nassert abs(mrr([['a', 'b', 'c'], ['x', 'y']], [{'b'}, {'z'}]) - 0.25) < 1e-12\nassert abs(mrr([['a'], ['q', 'r', 's']], [{'a'}, {'s', 'r'}]) - 0.75) < 1e-12",
  "solution": "def rerank(query, candidates, scorer, top_n):\n    scored = [(scorer(query, text), i, doc_id) for i, (doc_id, text) in enumerate(candidates)]\n    scored.sort(key=lambda t: (-t[0], t[1]))\n    return [doc_id for _, _, doc_id in scored[:top_n]]\n\ndef mrr(ranked_lists, relevant_sets):\n    total = 0.0\n    for ranking, rel in zip(ranked_lists, relevant_sets):\n        for pos, doc in enumerate(ranking, start=1):\n            if doc in rel:\n                total += 1.0 / pos\n                break\n    return total / len(ranked_lists)\n",
  "hints": [
    "Sort on (-score, original_index) so ties preserve the retriever's order.",
    "Break out of the loop at the first relevant hit; queries with no hit add 0."
  ]
}
```

> [!TIP] Interview tips
> - Say "recall-oriented first stage, precision-oriented second stage" and name the cross-encoder vs bi-encoder tradeoff (accuracy vs precomputation).
> - Quantify: candidates N, latency per pair, batch size, and what you gain in recall@5 or MRR.
> - Pitfall: the reranker is capped by first-stage recall. Diagnose with recall@N before tuning rerankers.
