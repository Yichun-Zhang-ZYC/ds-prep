---
id: nlp-llms-sentence-embeddings
title: Sentence embeddings
estimatedMinutes: 12
difficulty: medium
tags: [nlp, embeddings, sbert, contrastive-learning, retrieval]
---

## Why it matters
Semantic search, RAG, deduplication and clustering all rest on one primitive: a single vector per sentence or passage whose distances reflect meaning. Interviewers ask how these models are trained, why averaging BERT tokens is not enough, and how retrieval is served.

## Concept
A **sentence embedding** maps a variable-length text to one fixed-size vector (384-1536 dims) so that semantically similar texts are close.

**Naive options and why they fall short**: averaging Word2Vec vectors ignores order and context; raw BERT `[CLS]` or mean-pooled vectors, never trained for similarity, often do worse than averaged GloVe on similarity tasks.

**Sentence-BERT (SBERT)**: a **bi-encoder**. Run a pretrained transformer on each sentence independently, **pool** the token vectors (usually mean pooling over non-padding tokens; sometimes `[CLS]` or max), and fine-tune the shared encoder (a *siamese* setup) on sentence pairs. Because each text is encoded once, you can precompute and index all document vectors.

**Training objectives**:
- **Classification/regression** on NLI or STS-labeled pairs (early SBERT).
- **Contrastive (InfoNCE) with in-batch negatives**: for a batch of $B$ positive pairs $(a_i, p_i)$, every other $p_j$ is a negative:

$$\mathcal{L} = -\frac{1}{B}\sum_i \ln \frac{\exp(\text{sim}(a_i, p_i)/\tau)}{\sum_{j} \exp(\text{sim}(a_i, p_j)/\tau)}$$

  with temperature $\tau$ (about 0.05-0.1 for cosine). Larger batches mean more negatives; **hard negatives** (similar but wrong passages) improve quality a lot.
- Modern models (E5, BGE, GTE, OpenAI embeddings) are pretrained on huge weakly supervised pair sets, then fine-tuned with hard negatives. Matryoshka training lets you truncate dimensions.

**Serving**: L2-normalize vectors so the dot product equals cosine similarity, store in a vector index (exact, or approximate nearest neighbor such as HNSW or IVF), and retrieve top-$k$. **Bi-encoder vs cross-encoder**: a cross-encoder reads the query and document together, is more accurate but cannot be precomputed. The standard pipeline is bi-encoder retrieval of ~100 candidates, then cross-encoder reranking.

**Pitfalls**: use the same model and prefix conventions (`query:` / `passage:`) for queries and documents; asymmetric search (short query vs long passage) differs from symmetric similarity; domain shift hurts, so evaluate on your own data (recall@k, MRR, nDCG); embeddings from different models are not comparable.

## Worked example
Mean pooling with a padding mask. Token vectors $[1,2]$, $[3,4]$ and a pad $[9,9]$ with mask $[1,1,0]$: the mean over real tokens is $([1,2]+[3,4])/2 = [2,3]$. Averaging the pad too would give $[4.33, 5]$, a clear error.

In-batch InfoNCE with $B = 2$, cosine similarities $\begin{pmatrix}0.8 & 0.2 \\ 0.1 & 0.6\end{pmatrix}$ (rows: anchors, columns: candidates, diagonal = positives), $\tau = 0.5$. Row 1 logits $[1.6, 0.4]$: loss $= \ln(1 + e^{-1.2}) = 0.263$. Row 2 logits $[0.2, 1.2]$: loss $= \ln(1 + e^{-1.0}) = 0.313$. Mean $= 0.288$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why is a cross-encoder not used to retrieve from millions of documents directly?",
  "options": ["It is less accurate than a bi-encoder", "It must run the transformer on every (query, document) pair, so nothing can be precomputed", "It cannot read two texts", "It produces a vector that is too large"],
  "answer": 1,
  "explanation": "Cross-encoders are accurate but cost one forward pass per pair. Use a bi-encoder with an index to get candidates, then rerank the top ones."
}
```

```quiz
{
  "id": "q2",
  "question": "In in-batch contrastive training with batch size B, how many negatives does each anchor see, and what happens if you grow the batch?",
  "options": ["1; nothing changes", "B - 1; the task gets harder and embeddings usually improve", "B; accuracy always drops", "0; it only uses positives"],
  "answer": 1,
  "explanation": "Every other positive in the batch acts as a negative for the anchor, so larger batches provide more (and harder) negatives, typically improving quality."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement three pieces of an embedding pipeline in plain Python. `mean_pool(vectors, mask)` averages only the token vectors whose mask value is 1. `l2_normalize(v)` returns the unit-length vector (return `v` unchanged if its norm is 0). `info_nce(sim, tau)` takes a $B \\times B$ similarity matrix whose diagonal holds the positives and returns the mean in-batch InfoNCE loss (row-wise cross-entropy of `sim / tau`), numerically stable.",
  "setup": "import math",
  "starterCode": "import math\n\ndef mean_pool(vectors, mask):\n    # average only the vectors whose mask value is 1\n    pass\n\ndef l2_normalize(v):\n    pass\n\ndef info_nce(sim, tau):\n    # sim: B x B similarity matrix, positives on the diagonal; return mean loss\n    pass\n\nprint(mean_pool([[1, 2], [3, 4], [9, 9]], [1, 1, 0]), info_nce([[0.8, 0.2], [0.1, 0.6]], 0.5))",
  "tests": "assert mean_pool([[1, 2], [3, 4], [9, 9]], [1, 1, 0]) == [2.0, 3.0]\nassert mean_pool([[5, 5]], [1]) == [5.0, 5.0]\nn = l2_normalize([3, 4])\nassert abs(n[0] - 0.6) < 1e-12 and abs(n[1] - 0.8) < 1e-12\nassert l2_normalize([0, 0]) == [0, 0]\nsim = [[0.8, 0.2], [0.1, 0.6]]\nexp = (math.log(1 + math.exp(-1.2)) + math.log(1 + math.exp(-1.0))) / 2\nassert abs(info_nce(sim, 0.5) - exp) < 1e-9\nassert abs(info_nce([[0.0, 0.0], [0.0, 0.0]], 1.0) - math.log(2)) < 1e-9\nassert info_nce([[1.0, 0.0], [0.0, 1.0]], 0.05) < 1e-6\nassert math.isfinite(info_nce([[1.0, -1.0], [-1.0, 1.0]], 0.001))",
  "solution": "import math\n\ndef mean_pool(vectors, mask):\n    kept = [v for v, m in zip(vectors, mask) if m]\n    return [sum(v[i] for v in kept) / len(kept) for i in range(len(vectors[0]))]\n\ndef l2_normalize(v):\n    n = math.sqrt(sum(x * x for x in v))\n    return [x / n for x in v] if n > 0 else list(v)\n\ndef info_nce(sim, tau):\n    total = 0.0\n    for i, row in enumerate(sim):\n        logits = [x / tau for x in row]\n        m = max(logits)\n        lse = m + math.log(sum(math.exp(x - m) for x in logits))\n        total += lse - logits[i]\n    return total / len(sim)",
  "hints": ["Row loss = logsumexp(row / tau) - (diagonal entry) / tau.", "For stability subtract the row max before exponentiating."]
}
```

> [!TIP] Interview tips
> - Draw the bi-encoder (index offline, fast) vs cross-encoder (rerank, accurate) pipeline and say why you use both.
> - Pitfall: forgetting to mask padding in mean pooling, or to normalize before dot-product search; also mixing embeddings from different models.
> - Explain in-batch negatives and temperature in one breath, and mention evaluating retrieval on your own queries (recall@k, nDCG).
