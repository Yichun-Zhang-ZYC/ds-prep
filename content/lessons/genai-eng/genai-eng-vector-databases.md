---
id: genai-eng-vector-databases
title: Vector databases (FAISS, Pinecone, pgvector, Chroma)
estimatedMinutes: 12
difficulty: medium
tags: [genai, rag, vector-search, ann]
---

## Why it matters
Every RAG system needs fast nearest-neighbor search over millions of embeddings. Interviewers probe whether you know why exact search stops scaling, how ANN indexes trade recall for speed and memory, and when to pick a library, a Postgres extension or a managed service.

## Concept
**Exact (flat) search** compares the query to every vector: $O(N d)$ per query. Fine up to roughly 100k-1M vectors; beyond that you need **approximate nearest neighbor (ANN)** indexes that give up a little recall for large speedups. Quality is measured by $\text{recall@}k = |\text{ANN top-}k \cap \text{exact top-}k| / k$.

**Index families**:
- **HNSW**: a layered proximity graph; greedy search from the top layer down. Best recall/latency, but the whole graph lives in RAM (extra links per vector) and builds slowly. Knobs: `M` (links), `efConstruction`, `efSearch` (higher = better recall, slower).
- **IVF**: k-means partitions vectors into `nlist` cells; a query scans only the `nprobe` nearest cells. Cheap to build; recall rises with `nprobe`.
- **PQ (product quantization)**: split each vector into $m$ sub-vectors and store one byte code per sub-vector (about 32x compression). Usually combined as IVF-PQ for billion-scale or memory-limited setups; costs some recall.
- **DiskANN-style / on-disk graphs** keep most data on SSD for very large corpora.

**Metric**: normalize embeddings and use inner product, which equals cosine. Use the metric the embedding model was trained for.

**Production concerns**: **metadata filtering** (tenant, date, ACL) done as pre-filter, post-filter or filtered graph traversal (post-filtering can return fewer than $k$ hits), upserts/deletes (HNSW deletes are tombstones, so rebuild periodically), sharding and replication, and hybrid (keyword + vector) support.

**Choosing**: **FAISS** is a library (no server, persistence or filtering; ideal for batch jobs and research). **Chroma** is an easy embedded/dev store. **pgvector** adds `vector` columns with HNSW/IVFFlat to Postgres: transactional, SQL joins and filters in one system, good up to a few million vectors. **Pinecone, Weaviate, Qdrant, Milvus** are dedicated engines: managed scaling, filtering and multi-tenancy at larger scale.

## Worked example
Corpus: 10M chunks, 768-dim float32 embeddings. Raw size: $10^7 \cdot 768 \cdot 4 = 30.72$ GB. HNSW with `M=16` adds about $2M \cdot 4 = 128$ bytes per vector of links, so about 1.28 GB more, around 32 GB in RAM. Scalar int8 quantization cuts vectors to 7.68 GB; PQ with 96 one-byte codes gives $96 \cdot 10^7 = 0.96$ GB, at some recall loss that you recover by re-scoring the top 100 with the full vectors.

Decision: under 1M chunks, one Postgres instance with pgvector is simplest. At 10M with filters and high QPS, use a dedicated engine with quantization plus rescoring.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You raise HNSW `efSearch` from 32 to 256. What happens?",
  "options": [
    "Recall and latency both typically increase",
    "Recall increases and latency decreases",
    "Index memory drops",
    "Build time increases but queries are unchanged"
  ],
  "answer": 0,
  "explanation": "`efSearch` is the candidate list size at query time: a larger beam explores more graph nodes, improving recall at the cost of latency. It does not change the index."
}
```

```quiz
{
  "id": "q2",
  "question": "A 5M-vector corpus needs ACID updates, joins with a users table and tenant filters. Which is the most natural first choice?",
  "options": [
    "FAISS flat index in app memory",
    "pgvector in the existing Postgres",
    "A separate GPU cluster",
    "Storing embeddings as JSON strings"
  ],
  "answer": 1,
  "explanation": "pgvector keeps vectors, metadata and transactions in one system, which fits a few million vectors. Move to a dedicated engine when scale or QPS demands it."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `cosine_top_k(query, vectors, k)` (vectors is a dict id -> list; return the ids of the k highest cosine scores, ties broken by id), `recall_at_k(approx_ids, exact_ids)` (|intersection| / len(exact_ids)), and `ivf_search(query, clusters, centroids, nprobe, k)` which finds the `nprobe` centroids most similar to the query (cosine) and runs `cosine_top_k` only over the union of those clusters (each cluster is a dict id -> vector).",
  "starterCode": "import math\n\ndef cosine(a, b):\n    dot = sum(x * y for x, y in zip(a, b))\n    return dot / (math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b)))\n\ndef cosine_top_k(query, vectors, k):\n    pass\n\ndef recall_at_k(approx_ids, exact_ids):\n    pass\n\ndef ivf_search(query, clusters, centroids, nprobe, k):\n    pass\n",
  "tests": "vecs = {'a': [1, 0], 'b': [0.9, 0.1], 'c': [0, 1], 'd': [-1, 0]}\nassert cosine_top_k([1, 0], vecs, 2) == ['a', 'b']\nassert cosine_top_k([1, 0], vecs, 3) == ['a', 'b', 'c']\nassert cosine_top_k([1, 0], {'y': [1, 0], 'x': [2, 0]}, 2) == ['x', 'y']\nassert recall_at_k(['c', 'd'], ['c', 'b']) == 0.5\nassert recall_at_k(['a'], ['a']) == 1.0\nclusters = [{'a': [1, 0], 'b': [0.9, 0.1]}, {'c': [0, 1], 'd': [-1, 0]}]\ncentroids = [[1, 0], [0, 1]]\nq = [0.6, 0.8]\nexact = cosine_top_k(q, vecs, 2)\nassert exact == ['c', 'b']\nassert ivf_search(q, clusters, centroids, 1, 2) == ['c', 'd']\nassert ivf_search(q, clusters, centroids, 2, 2) == exact\nassert recall_at_k(ivf_search(q, clusters, centroids, 1, 2), exact) == 0.5",
  "solution": "import math\n\ndef cosine(a, b):\n    dot = sum(x * y for x, y in zip(a, b))\n    return dot / (math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b)))\n\ndef cosine_top_k(query, vectors, k):\n    ranked = sorted(vectors, key=lambda i: (-cosine(query, vectors[i]), i))\n    return ranked[:k]\n\ndef recall_at_k(approx_ids, exact_ids):\n    return len(set(approx_ids) & set(exact_ids)) / len(exact_ids)\n\ndef ivf_search(query, clusters, centroids, nprobe, k):\n    order = sorted(range(len(centroids)), key=lambda c: (-cosine(query, centroids[c]), c))\n    pool = {}\n    for c in order[:nprobe]:\n        pool.update(clusters[c])\n    return cosine_top_k(query, pool, k)\n",
  "hints": [
    "Sort by the tuple (-score, id) to get deterministic tie-breaking.",
    "IVF is just: choose cells by centroid similarity, merge their vectors, then do an exact search on the merged pool."
  ]
}
```

> [!TIP] Interview tips
> - Always quote recall alongside latency; "ANN" without a recall number is meaningless. Tune `efSearch`/`nprobe` against a labeled set of exact results.
> - Know the memory math (N x d x 4 bytes) and the levers: lower dimension (Matryoshka embeddings), quantization, disk-based indexes.
> - Mention filtering pitfalls: heavy post-filtering returns too few results, so over-fetch or use an engine with filtered search.
