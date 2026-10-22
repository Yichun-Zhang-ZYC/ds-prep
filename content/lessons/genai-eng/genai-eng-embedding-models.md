---
id: genai-eng-embedding-models
title: Embedding models
estimatedMinutes: 12
difficulty: medium
tags: [genai, rag, embeddings]
---

## Why it matters
Embeddings are the retrieval backbone of RAG, semantic search and dedup. Interviewers ask how you pick a model, what dimension and similarity to use, why domain and language matter, and how you measure whether an embedding model is good for your data.

## Concept
An **embedding model** maps text (or images, code) to a dense vector so that semantically similar items are close. Modern text embedders are transformer encoders (or LLM-based) trained **contrastively**: pull query and relevant-passage pairs together, push in-batch negatives apart.

**Similarity**: cosine (angle) or dot product; for **L2-normalized** vectors, cosine = dot product and ranks the same as Euclidean distance. Check which one the model was trained for.

**Choosing a model**:
- **Benchmarks**: MTEB (and its multilingual variants) rank models on retrieval, classification and clustering; use them to shortlist, then **evaluate on your own queries**, since leaderboards do not reflect your domain.
- **Dimension**: 384 to 3072 typical. More dimensions can mean better quality but cost memory, index build time and latency. **Matryoshka** models let you truncate to the first $d$ dimensions (then re-normalize) with a graceful quality drop.
- **Max input length**: 512 to 8k+ tokens; longer inputs are truncated, so chunk size must fit.
- **Multilingual and domain**: a monolingual English model fails on other languages; legal, biomedical and code corpora benefit from specialized or fine-tuned models.
- **Hosted API vs open-source**: API (OpenAI, Cohere, Voyage, Google) is easy but adds per-token cost, network latency and data-sharing concerns; open models (BGE, E5, GTE, Nomic and others, via sentence-transformers or text-embeddings-inference) give control and cheap bulk embedding on GPU.
- **Asymmetric search**: queries are short, documents long. Many models need a **query/document prefix or instruction** (for example `query: ` and `passage: `); skipping it quietly degrades results.

**Operational rules**: the same model (and version) must embed documents and queries; changing the model means **re-embedding the whole corpus**. Store the model id with each vector. Quantize (float16, int8, binary) to cut memory 2 to 32x with small recall loss. Dense embeddings can miss exact terms (IDs, rare names), which is why hybrid search with BM25 exists.

**Evaluate**: build (query, relevant doc) pairs, then measure recall@$k$, MRR and nDCG of the retrieval, not just a vibe check.

## Worked example
Corpus of 10M chunks. With 1,536-dim float32 vectors: $10^7 \times 1536 \times 4$ bytes $= 61.44$ GB; with 3,072 dims, 122.88 GB; with a Matryoshka-truncated 256-dim int8 index: $10^7 \times 256 \times 1 = 2.56$ GB, a 24x reduction (a bit of recall lost; check it on your eval set, and optionally rescore the top candidates with full vectors).

Retrieval check: 2 relevant docs {1, 2}; the retriever returns [5, 1, 9, 2]. Recall@2 = 1/2 = 0.5 (only doc 1 is in the top 2); recall@4 = 2/2 = 1.0. If the top-3 context window passed to the LLM only gets recall@3 = 0.5, improving the embedder or adding a reranker raises answer quality more than prompt tweaks.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You switch to a new embedding model but only re-embed new documents. What happens?",
  "options": [
    "Nothing, embeddings are interchangeable",
    "Old and new vectors live in different spaces, so similarity between queries and old documents becomes meaningless; you must re-embed the corpus",
    "Search gets faster",
    "Only the dimension changes"
  ],
  "answer": 1,
  "explanation": "Each model defines its own vector space. Queries and documents must come from the same model and version."
}
```

```quiz
{
  "id": "q2",
  "question": "Why is cosine similarity the same as dot product for many embedding models?",
  "options": [
    "They always output integers",
    "Vectors are L2-normalized, so the norm terms equal 1",
    "Dot product ignores direction",
    "Cosine uses only vector length"
  ],
  "answer": 1,
  "explanation": "For unit-length vectors, cosine = dot product, and ranking by either matches ranking by Euclidean distance."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement a mini retrieval toolkit on toy vectors. `normalize(v)` returns the unit vector (zero vector unchanged). `top_k(query, docs, k)` returns the indices of the `k` docs with highest cosine similarity to the query, ties broken by lower index. `truncate_renorm(v, dim)` keeps the first `dim` values and re-normalizes (Matryoshka-style). `recall_at_k(relevant, retrieved, k)` is the fraction of the `relevant` set found in `retrieved[:k]` (0.0 if `relevant` is empty). `index_size_gb(n_vectors, dim, bytes_per_value=4)` returns decimal gigabytes (1e9 bytes).",
  "starterCode": "import math\n\ndef normalize(v):\n    pass\n\ndef top_k(query, docs, k):\n    pass\n\ndef truncate_renorm(v, dim):\n    pass\n\ndef recall_at_k(relevant, retrieved, k):\n    pass\n\ndef index_size_gb(n_vectors, dim, bytes_per_value=4):\n    pass\n",
  "tests": "n = normalize([3, 4])\nassert abs(n[0] - 0.6) < 1e-12 and abs(n[1] - 0.8) < 1e-12\nassert normalize([0, 0]) == [0, 0]\n\ndocs = [[1, 0], [0.9, 0.1], [0, 1], [-1, 0]]\nassert top_k([1, 0], docs, 2) == [0, 1]\nassert top_k([0, 2], docs, 1) == [2]\nassert top_k([1, 0], docs, 10) == [0, 1, 2, 3]\n\nt = truncate_renorm([3, 4, 12], 2)\nassert abs(t[0] - 0.6) < 1e-12 and abs(t[1] - 0.8) < 1e-12 and len(t) == 2\n\nassert recall_at_k({1, 2}, [5, 1, 9, 2], 2) == 0.5\nassert recall_at_k({1, 2}, [5, 1, 9, 2], 4) == 1.0\nassert recall_at_k(set(), [1], 1) == 0.0\n\nassert abs(index_size_gb(10_000_000, 1536) - 61.44) < 1e-9\nassert abs(index_size_gb(10_000_000, 256, 1) - 2.56) < 1e-9",
  "solution": "import math\n\ndef normalize(v):\n    n = math.sqrt(sum(x * x for x in v))\n    if n == 0:\n        return list(v)\n    return [x / n for x in v]\n\ndef top_k(query, docs, k):\n    q = normalize(query)\n    scores = []\n    for i, d in enumerate(docs):\n        d = normalize(d)\n        scores.append((-sum(a * b for a, b in zip(q, d)), i))\n    scores.sort()\n    return [i for _, i in scores[:k]]\n\ndef truncate_renorm(v, dim):\n    return normalize(v[:dim])\n\ndef recall_at_k(relevant, retrieved, k):\n    if not relevant:\n        return 0.0\n    return len(relevant & set(retrieved[:k])) / len(relevant)\n\ndef index_size_gb(n_vectors, dim, bytes_per_value=4):\n    return n_vectors * dim * bytes_per_value / 1e9",
  "hints": [
    "Normalize both query and doc, then the dot product is the cosine.",
    "Sort `(-score, index)` pairs to get descending score with index tie-breaks."
  ]
}
```

> [!TIP] Interview tips
> - Shortlist with MTEB, decide with your own labelled queries and recall@k; never pick by leaderboard alone.
> - Mention query/document prefixes, normalization, dimension vs memory (Matryoshka, quantization) and that a model change forces re-embedding.
> - Acknowledge dense retrieval misses exact matches; pair it with BM25 and a reranker.
