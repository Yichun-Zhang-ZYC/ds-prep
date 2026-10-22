---
id: ml-system-design-visual-search
title: "Design: Visual / image search"
estimatedMinutes: 14
difficulty: medium
tags: [ml-system-design, visual-search, embeddings, ann, product-quantization]
---

## Why it matters
"Design visual search" (search by photo for shopping, "find similar pins", reverse image search) tests embedding-based retrieval end to end: representation learning, approximate nearest-neighbor (ANN) indexing at hundreds of millions of items, memory math, and evaluation without obvious labels. It reuses the retrieval half of *Search ranking* and the two-tower ideas in *Recommendation feed*, with images as the modality.

## Concept
**Clarify.** Query type: a photo from a phone (noisy, cluttered, partial object), a catalog image (similar items), or image plus text ("this dress but in red"). Goal: visually similar or *the same product*? Corpus size, update rate (new items hourly?), latency (~200 ms), and whether results must be filtered (in stock, safe, region).

**Pipeline.**
1. **Query preprocessing**: for cluttered photos, run an **object detector** (or a salient-region model) to crop the item and optionally classify the category; this boosts precision a lot because embeddings of a whole scene are dominated by background.
2. **Embedding model**: a CNN or ViT backbone producing a 256-1024-d vector, L2-normalized so cosine similarity = dot product. Options: pretrained image-text models (CLIP-style) for zero-shot and text+image queries; fine-tuned with **metric learning** on domain data. Train with **contrastive/triplet loss**: pull an anchor towards a positive (same product, different photo; augmentations of the same image) and push away negatives, with **hard-negative mining** (similar-looking but different items). Use a separate **index-side** pass offline so query-side compute is one forward pass.
3. **Index**: ANN over all item embeddings. **HNSW** (graph, high recall, memory heavy, supports incremental inserts), **IVF** (cluster, then search the `nprobe` nearest clusters) and **PQ/IVF-PQ** (compress vectors into short codes; asymmetric distance computation) are the standard options. Sharding across machines with scatter-gather and top-k merge.
4. **Filtering and re-ranking**: attribute filters (category, price, stock), a re-ranker using fine-grained features or a cross-modal model on the top ~100, de-duplication of near-identical listings, and business signals (popularity, quality, personalization). Multimodal queries: combine image and text embeddings (weighted sum, or a fusion model), or filter by text attributes.

**Product quantization.** Split a $d$-dim vector into $m$ sub-vectors; learn a codebook of $2^8=256$ centroids per sub-space (k-means); store each sub-vector as a 1-byte centroid id, so a vector uses $m$ bytes. Distances are computed with lookup tables. Cost: a recall drop, usually mitigated by re-scoring the shortlist with full-precision vectors.

**Data and labels.** Same-product groups from catalog (many images per product), user behavior (co-clicks, "similar" feedback; noisy), synthetic pairs through augmentation (crop, color jitter, background change), and human-labeled relevance sets for evaluation. Domain gap: user photos vs studio catalog photos; include both in training.

**Metrics.** Retrieval: **recall@K** against exact nearest neighbors (ANN quality) and against labeled same-product ground truth (embedding quality), **mAP**, precision@k from human or LLM/VLM judges. Online: click-through on results, add-to-cart, query abandonment, latency. Keep ANN recall and model quality separate when debugging.

**Operations.** Embedding versioning: a new model means re-embedding the whole corpus and swapping the index (blue-green), since embeddings from different models are not comparable. Incremental index updates for new/removed items; monitor embedding drift, index freshness, recall on a canary query set, and safety (adult or copyrighted images).

## Worked example
**Memory.** 100M images, 512-d float32: $100\times10^6\times512\times4\text{ B}=204.8$ GB, which is too much for one machine's RAM and expensive to replicate. With PQ using $m=64$ one-byte codes: $100\times10^6\times64=6.4$ GB ($32\times$ smaller). An HNSW graph with $M=32$ neighbors at 4 B each adds about $128$ B/vector, $12.8$ GB, so full IVF-PQ or PQ plus a graph is feasible on a few machines, with full-precision vectors on SSD for re-scoring.

**Search cost.** IVF with 16,384 clusters and `nprobe`=32 scans $100\text{M}\times32/16{,}384\approx195{,}000$ vectors per query (0.2% of the corpus), instead of 100M.

**Recall.** If the exact top-4 are $\{1,2,3,4\}$ and the ANN returns $[1,2,3,9]$: recall@4 $=3/4=0.75$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Users photograph a handbag on a cluttered table, but results are mostly tables and rugs. What is the most targeted fix?",
  "options": [
    "Increase the embedding dimension",
    "Detect and crop the item (or use a saliency/object detector) before embedding the query, and train with background augmentations",
    "Use a larger ANN nprobe",
    "Switch from cosine to Euclidean distance"
  ],
  "answer": 1,
  "explanation": "Whole-image embeddings capture scene context. Object-level crops focus the embedding on the product; ANN settings do not fix a representation problem."
}
```

```quiz
{
  "id": "q2",
  "question": "You ship a better embedding model. What must you do with the existing index?",
  "options": [
    "Nothing; embeddings are interchangeable",
    "Re-embed the corpus and build a new index (blue-green swap), because vectors from different models live in different spaces",
    "Only re-embed the queries",
    "Average old and new vectors"
  ],
  "answer": 1,
  "explanation": "Similarity is only meaningful within one embedding space. Plan for full re-indexing, which can be a large cost, or use backward-compatible training."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `cosine_topk(query, vectors, k)` returning the indices of the `k` vectors with highest cosine similarity to `query`, in descending order of similarity (ties go to the lower index).",
  "starterCode": "import math\n\ndef cosine_topk(query, vectors, k):\n    pass\n\nvecs = [[1, 0], [0, 1], [1, 1], [-1, 0]]\nprint(cosine_topk([1, 0], vecs, 2))",
  "tests": "vecs = [[1, 0], [0, 1], [1, 1], [-1, 0]]\nassert cosine_topk([1, 0], vecs, 2) == [0, 2]\nassert cosine_topk([1, 0], vecs, 4) == [0, 2, 1, 3]\nassert cosine_topk([0, 1], vecs, 1) == [1]",
  "solution": "import math\n\ndef cosine_topk(query, vectors, k):\n    def norm(v):\n        return math.sqrt(sum(x * x for x in v))\n    qn = norm(query)\n    scored = []\n    for i, v in enumerate(vectors):\n        sim = sum(a * b for a, b in zip(query, v)) / (qn * norm(v))\n        scored.append((-sim, i))\n    scored.sort()\n    return [i for _, i in scored[:k]]",
  "hints": [
    "cos = dot(q, v) / (|q| |v|).",
    "Sort on (-similarity, index) so ties favor the lower index."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Implement `recall_at_k(approx, exact, k)` = fraction of the top-`k` of `exact` that appear in the top-`k` of `approx`; and `index_bytes(n, dim, bytes_per_dim=4, pq_bytes=None)` = `n * pq_bytes` when `pq_bytes` is given, else `n * dim * bytes_per_dim`.",
  "starterCode": "def recall_at_k(approx, exact, k):\n    pass\n\ndef index_bytes(n, dim, bytes_per_dim=4, pq_bytes=None):\n    pass\n\nprint(recall_at_k([1, 2, 3, 9], [1, 2, 3, 4], 4), index_bytes(100_000_000, 512))",
  "tests": "assert abs(recall_at_k([1, 2, 3, 9], [1, 2, 3, 4], 4) - 0.75) < 1e-12\nassert abs(recall_at_k([1, 2, 3, 9], [1, 2, 3, 4], 3) - 1.0) < 1e-12\nassert abs(recall_at_k([9, 8], [1, 2], 2)) < 1e-12\nassert index_bytes(100_000_000, 512) == 204_800_000_000\nassert index_bytes(100_000_000, 512, pq_bytes=64) == 6_400_000_000",
  "solution": "def recall_at_k(approx, exact, k):\n    return len(set(approx[:k]) & set(exact[:k])) / k\n\ndef index_bytes(n, dim, bytes_per_dim=4, pq_bytes=None):\n    if pq_bytes is not None:\n        return n * pq_bytes\n    return n * dim * bytes_per_dim",
  "hints": [
    "Intersect the two top-k sets and divide by k.",
    "float32 uses 4 bytes per dimension."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Product quantization. `pq_encode(vec, codebooks)`: split `vec` into `len(codebooks)` equal sub-vectors; for each, return the index of the nearest centroid in that sub-space's codebook (squared L2; ties to the lower index). `pq_decode(codes, codebooks)` concatenates the chosen centroids. `pq_error(vec, codebooks)` returns the squared L2 error between `vec` and its reconstruction.",
  "starterCode": "def pq_encode(vec, codebooks):\n    pass\n\ndef pq_decode(codes, codebooks):\n    pass\n\ndef pq_error(vec, codebooks):\n    pass\n\ncb = [[[0, 0], [1, 1]], [[4, 4], [5, 6]]]\nc = pq_encode([1, 1, 5, 5], cb)\nprint(c, pq_decode(c, cb))",
  "tests": "cb = [[[0, 0], [1, 1]], [[4, 4], [5, 6]]]\nc = pq_encode([1, 1, 5, 5], cb)\nassert c == [1, 1]\nassert pq_decode(c, cb) == [1, 1, 5, 6]\nassert abs(pq_error([1, 1, 5, 5], cb) - 1.0) < 1e-12\nassert pq_encode([0, 0.2, 4, 4], cb) == [0, 0]",
  "solution": "def pq_encode(vec, codebooks):\n    m = len(codebooks)\n    d = len(vec) // m\n    codes = []\n    for j, book in enumerate(codebooks):\n        sub = vec[j * d:(j + 1) * d]\n        best, best_d = 0, None\n        for ci, c in enumerate(book):\n            dist = sum((a - b) ** 2 for a, b in zip(sub, c))\n            if best_d is None or dist < best_d:\n                best, best_d = ci, dist\n        codes.append(best)\n    return codes\n\ndef pq_decode(codes, codebooks):\n    out = []\n    for code, book in zip(codes, codebooks):\n        out.extend(book[code])\n    return out\n\ndef pq_error(vec, codebooks):\n    rec = pq_decode(pq_encode(vec, codebooks), codebooks)\n    return sum((a - b) ** 2 for a, b in zip(vec, rec))",
  "hints": [
    "With 4 dims and 2 codebooks, each sub-vector has 2 dims.",
    "Use a strict < comparison so ties keep the lower index."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Design visual search for a shopping app (take a photo, find matching products).' Give a model answer.",
  "answer": "**Requirements** (illustrative): 100M catalog images, 1k QPS, p99 < 300 ms, return the same or very similar products, support filters (in stock, category).\n\n**Query path**: detector crops the main item and predicts coarse category; embed with a fine-tuned ViT/CNN (512-d, L2-normalized); ANN search (IVF-PQ or HNSW) with category filter; top-200 re-ranked with full-precision vectors plus a fine-grained re-ranker and business signals; dedupe near-identical listings.\n\n**Training**: metric learning on same-product groups from the catalog and user-photo/catalog pairs, augmentations (crop, lighting, background), hard-negative mining; optionally start from a CLIP-style model for text+image queries.\n\n**Index**: 204.8 GB raw vs 6.4 GB with 64-byte PQ codes; sharded with scatter-gather; hourly incremental inserts, nightly compaction; model upgrades require re-embedding and a blue-green index swap.\n\n**Evaluation**: ANN recall@K vs exact search, retrieval mAP/recall@K on a labeled same-product set, human/VLM judged precision@10, online CTR and add-to-cart, latency guardrails.\n\n**Risks**: domain gap between phone photos and studio photos, background-dominated embeddings, adult/copyright content, stale items, embedding version drift."
}
```

> [!TIP] Interview tips
> - Do the memory math out loud: vectors x dimensions x bytes, then show how PQ shrinks it.
> - Separate ANN recall (index quality) from embedding quality (model quality).
> - Mention detection/cropping for real-world photos and the phone-vs-studio domain gap.
> - Note re-embedding and index swap costs whenever the model changes.
