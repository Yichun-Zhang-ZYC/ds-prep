---
id: genai-eng-hybrid-search
title: Hybrid search (BM25 + dense)
estimatedMinutes: 10
difficulty: medium
tags: [genai, rag, bm25, rrf, retrieval]
---

## Why it matters
Dense embeddings capture meaning but miss exact tokens (SKUs, error codes, names); BM25 does the opposite. Production RAG almost always fuses both, and interviewers ask how you combine scores that live on different scales.

## Concept
**BM25** scores a document by query-term matches, with saturating term frequency and length normalization:
$$\text{BM25}(q, d) = \sum_{t \in q} \text{IDF}(t) \cdot \frac{f(t,d)(k_1+1)}{f(t,d) + k_1\left(1 - b + b\,\frac{|d|}{\text{avgdl}}\right)}$$
with typical $k_1 \approx 1.2$-$2$, $b \approx 0.75$. It is strong on rare exact terms and needs no training; it fails on synonyms and paraphrase. **Dense retrieval** (bi-encoder + ANN) handles paraphrase and cross-lingual queries but can miss identifiers and rare entities. Sparse learned models (SPLADE) sit in between.

**Fusion** options:
- **Reciprocal Rank Fusion (RRF)**: $\text{score}(d) = \sum_{r} \frac{1}{k + \text{rank}_r(d)}$, with $k \approx 60$. Uses ranks only, so no score normalization, robust, the default choice. A document missing from a list contributes 0.
- **Weighted score fusion**: min-max (or z-score) normalize each score list, then $\alpha\, s_{\text{dense}} + (1-\alpha)\, s_{\text{bm25}}$. Can be tuned on labeled queries but is sensitive to score distributions and outliers.
- **Cascade**: retrieve with one, rerank with a cross-encoder (see the Reranking lesson).

**Pipeline**: run both retrievers in parallel (top 50-100 each), fuse, optionally apply metadata filters in each, then pass the top 5-20 on. Many engines (Elasticsearch/OpenSearch, Weaviate, Qdrant, pgvector + `tsvector`) support this natively.

## Worked example
Query "error E4021 timeout". BM25 ranking: A, B, C. Dense ranking: B, D, A. With $k=60$:
- A: $1/61 + 1/63 = 0.016393 + 0.015873 = 0.032266$
- B: $1/62 + 1/61 = 0.016129 + 0.016393 = 0.032522$
- C: $1/63 = 0.015873$ (BM25 only); D: $1/62 = 0.016129$ (dense only)

Fused order: B, A, D, C. B wins because both retrievers like it, even though neither ranked it first in both. Note the raw scores (BM25 around 12, cosine around 0.8) were never compared.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why is RRF preferred over adding raw BM25 and cosine scores?",
  "options": [
    "RRF is more accurate on every dataset",
    "It uses only ranks, so it needs no normalization across incomparable score scales",
    "It removes the need for a second retriever",
    "It lowers index size"
  ],
  "answer": 1,
  "explanation": "BM25 scores are unbounded and corpus-dependent while cosine is in [-1, 1]. Ranks are comparable, which makes RRF a robust default; it is not guaranteed best everywhere."
}
```

```quiz
{
  "id": "q2",
  "question": "Which query most clearly benefits from adding BM25 to a dense retriever?",
  "options": [
    "\"how do I get my money back\" (refund policy)",
    "\"summarize our vacation policy\"",
    "\"ORA-00942 table or view does not exist\"",
    "\"ideas for a team offsite\""
  ],
  "answer": 2,
  "explanation": "Exact identifiers like error codes are rare tokens that embeddings may blur; BM25 matches them precisely."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `rrf(rankings, k=60)`: rankings is a list of ranked id lists (best first); return a list of `(id, score)` sorted by score descending (ties by id), where score = sum of 1/(k + rank) with rank starting at 1. Then implement `alpha_fuse(bm25, dense, alpha)`: both are dicts id -> raw score; min-max normalize each dict to [0, 1] (all-equal scores normalize to 0.0), treat a missing id as 0, combine as alpha * dense + (1 - alpha) * bm25, and return ids sorted by fused score descending (ties by id).",
  "starterCode": "def rrf(rankings, k=60):\n    pass\n\ndef alpha_fuse(bm25, dense, alpha):\n    pass\n\nprint(rrf([['A', 'B', 'C'], ['B', 'D', 'A']]))\n",
  "tests": "r = rrf([['A', 'B', 'C'], ['B', 'D', 'A']])\nassert [i for i, _ in r] == ['B', 'A', 'D', 'C']\nassert abs(dict(r)['A'] - (1 / 61 + 1 / 63)) < 1e-12\nassert abs(dict(r)['B'] - (1 / 62 + 1 / 61)) < 1e-12\nassert [i for i, _ in rrf([['a', 'b'], ['a', 'b']])] == ['a', 'b']\nassert [i for i, _ in rrf([['x'], ['y']])] == ['x', 'y']\nbm = {'a': 10, 'b': 5, 'c': 0}\nde = {'a': 0.2, 'b': 0.9, 'c': 0.5}\nassert alpha_fuse(bm, de, 0.5) == ['b', 'a', 'c']\nassert alpha_fuse(bm, de, 0.0) == ['a', 'b', 'c']\nassert alpha_fuse(bm, de, 1.0) == ['b', 'c', 'a']\nassert alpha_fuse({'a': 3, 'b': 3}, {'b': 1.0, 'c': 0.0}, 0.5) == ['b', 'a', 'c']",
  "solution": "def rrf(rankings, k=60):\n    scores = {}\n    for ranking in rankings:\n        for pos, doc in enumerate(ranking, start=1):\n            scores[doc] = scores.get(doc, 0.0) + 1.0 / (k + pos)\n    return sorted(scores.items(), key=lambda kv: (-kv[1], kv[0]))\n\ndef _minmax(d):\n    if not d:\n        return {}\n    lo, hi = min(d.values()), max(d.values())\n    if hi == lo:\n        return {i: 0.0 for i in d}\n    return {i: (v - lo) / (hi - lo) for i, v in d.items()}\n\ndef alpha_fuse(bm25, dense, alpha):\n    b, d = _minmax(bm25), _minmax(dense)\n    ids = set(b) | set(d)\n    fused = {i: alpha * d.get(i, 0.0) + (1 - alpha) * b.get(i, 0.0) for i in ids}\n    return sorted(ids, key=lambda i: (-fused[i], i))\n",
  "hints": [
    "Use enumerate(ranking, start=1) so the first item has rank 1.",
    "Min-max: (v - min) / (max - min); guard the max == min case."
  ]
}
```

> [!TIP] Interview tips
> - Explain why you cannot just add BM25 and cosine scores: different scales and distributions. RRF sidesteps that; weighted fusion needs normalization.
> - Know when hybrid matters most: identifiers, jargon, short keyword queries, domain-specific vocab. Evaluate with recall@k on a labeled set, not by eyeballing.
> - Mention tuning knobs: $k$ in RRF (rarely matters), list depth, $\alpha$, and per-retriever filters.
