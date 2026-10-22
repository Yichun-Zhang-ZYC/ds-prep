---
id: deep-learning-embeddings-and-metric-learning
title: Embeddings and metric learning (triplet, contrastive loss)
estimatedMinutes: 12
difficulty: medium
tags: [deep-learning, embeddings, metric-learning, retrieval]
---

## Why it matters
Search, recommendation, face verification, duplicate detection and RAG all reduce to one idea: map items into a vector space where distance means similarity, then do nearest-neighbour lookup. Interviewers ask how to train such an embedding (contrastive and triplet losses), how to mine negatives, and how to evaluate and serve it.

## Concept
An **embedding** is a learned dense vector $f_\theta(x) \in \mathbb{R}^d$ (typically $d$ from 64 to 1024). **Metric learning** trains $f_\theta$ so that similar items are close and dissimilar items are far under a chosen distance, usually Euclidean or cosine on L2-normalised vectors.

**Losses**
- **Contrastive (pairwise) loss**: for a pair with distance $d$ and label $y = 1$ (similar) or $0$:
$$\mathcal{L} = y\,\tfrac12 d^2 + (1 - y)\,\tfrac12 \max(0,\, m - d)^2$$
Similar pairs are pulled together; dissimilar pairs are pushed apart only until margin $m$.
- **Triplet loss** (anchor $a$, positive $p$, negative $n$): $\mathcal{L} = \max\big(0,\ d(a,p) - d(a,n) + m\big)$. It enforces a *relative* ordering, so the scale of the space is not constrained as tightly.
- **Softmax-style losses**: **N-pair / InfoNCE** (one positive against many in-batch negatives; see *Self-supervised and contrastive learning*), and **angular-margin classification** losses (ArcFace, CosFace) that add a margin to the target-class angle and scale high; common for face recognition.
- **Siamese / two-tower setup**: shared weights for the two sides of a pair; or separate towers (query, item) trained jointly, so item vectors can be pre-computed.

**Mining matters.** Most random triplets already satisfy the margin and give zero loss and zero gradient.
- **Easy**: $d(a,n) > d(a,p) + m$ (loss 0). **Semi-hard**: $d(a,p) < d(a,n) < d(a,p) + m$ (useful, stable; FaceNet). **Hard**: $d(a,n) < d(a,p)$ (the negative is closer than the positive; largest gradient, but noisy labels and collapse risk early in training).
- **Batch-hard / in-batch negatives**: compute all pairwise distances in the batch and pick the hardest. Use $P \times K$ sampling (P classes, K images each) so every anchor has positives.
- Watch for **false negatives** (items that are actually similar but unlabelled).

**Using the embeddings**
- **Retrieval**: exact kNN is $O(nd)$ per query; use **approximate nearest neighbours** (HNSW graphs, IVF with product quantisation) and trade recall for latency and memory. Normalise so that dot product equals cosine.
- **Evaluate** with recall@k, precision@k, MRR, nDCG on labelled query-relevant pairs, not only with training loss; also track the distance distributions of positives and negatives.
- **Operational**: re-embed everything when the model changes (vectors from different versions are not comparable), watch for drift, handle cold-start items via content features.
- Related: word2vec / entity embeddings for categorical IDs (see *Handling high-cardinality features*), and pretrained sentence/image encoders as a strong default before training your own.

## Worked example
Margin $m = 1$ and Euclidean distance. Anchor $a = (0, 0)$, positive $p = (1, 0)$, so $d(a,p) = 1$. Try three negatives:

| negative $n$ | $d(a,n)$ | loss $\max(0,\,1 - d(a,n) + 1)$ | type |
|---|---|---|---|
| $(0, 2)$ | 2.0 | $0$ | easy |
| $(0, 1.5)$ | 1.5 | $0.5$ | semi-hard |
| $(0.5, 0)$ | 0.5 | $1.5$ | hard |

Only the last two give gradient; a batch of mostly easy triplets trains slowly, which is why mining exists.

Contrastive loss with $m = 1$ and $d = 0.3$: if the pair is similar, $\tfrac12 \cdot 0.09 = 0.045$ (small, already close); if dissimilar, $\tfrac12 (1 - 0.3)^2 = 0.245$ (pushed away).

Retrieval check: two queries, three documents, with the correct document ranked first for both: recall@1 $= 1.0$; if one of the two is ranked second, recall@1 $= 0.5$ but recall@2 may still be $1.0$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "In training with triplet loss, many triplets contribute zero gradient. Which strategy helps most?",
  "options": [
    "Lower the margin to zero",
    "Mine semi-hard or hard negatives (for example batch-hard) so that more triplets violate the margin",
    "Use fewer classes",
    "Remove normalisation"
  ],
  "answer": 1,
  "explanation": "Triplets whose negative is already further than the positive by the margin are inactive. Mining negatives that are close to the anchor supplies informative gradients; semi-hard is the stable choice early on."
}
```

```quiz
{
  "id": "q2",
  "question": "After you retrain your embedding model, what must you do with the vector index?",
  "options": [
    "Nothing; old and new vectors are compatible",
    "Only re-embed new items",
    "Re-embed all items and rebuild the index, since vectors from different model versions live in different spaces",
    "Switch from cosine to Euclidean distance"
  ],
  "answer": 2,
  "explanation": "Each training run defines its own coordinate system, so vectors from different versions cannot be compared. Re-embed everything (or run both indexes during a migration)."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement metric-learning pieces with numpy. `triplet_loss(a, p, n, margin=1.0)` = `max(0, ||a-p|| - ||a-n|| + margin)` with Euclidean norm. `triplet_kind(a, p, n, margin=1.0)` returns `'hard'` if `d(a,n) < d(a,p)`, `'easy'` if `d(a,n) >= d(a,p) + margin`, else `'semi-hard'`. `contrastive_loss(d, y, margin=1.0)` = `0.5*d**2` if `y == 1` else `0.5*max(0, margin-d)**2`. `recall_at_k(Q, D, relevant, k)`: for query row `Q[i]` rank documents `D` (rows) by cosine similarity and count a hit if `relevant[i]` is among the top `k` indices; return the hit fraction.",
  "setup": "import numpy as np",
  "packages": [
    "numpy"
  ],
  "starterCode": "import numpy as np\n\ndef triplet_loss(a, p, n, margin=1.0):\n    pass\n\ndef triplet_kind(a, p, n, margin=1.0):\n    pass\n\ndef contrastive_loss(d, y, margin=1.0):\n    pass\n\ndef recall_at_k(Q, D, relevant, k):\n    pass\n\na, p = np.array([0.0, 0.0]), np.array([1.0, 0.0])\nprint(triplet_loss(a, p, np.array([0.0, 1.5])), contrastive_loss(0.3, 0))",
  "tests": "a, p = np.array([0.0, 0.0]), np.array([1.0, 0.0])\nn_easy, n_semi, n_hard = np.array([0.0, 2.0]), np.array([0.0, 1.5]), np.array([0.5, 0.0])\nassert abs(triplet_loss(a, p, n_easy)) < 1e-12\nassert abs(triplet_loss(a, p, n_semi) - 0.5) < 1e-12\nassert abs(triplet_loss(a, p, n_hard) - 1.5) < 1e-12\nassert triplet_kind(a, p, n_easy) == 'easy'\nassert triplet_kind(a, p, n_semi) == 'semi-hard'\nassert triplet_kind(a, p, n_hard) == 'hard'\nassert abs(contrastive_loss(0.3, 1) - 0.045) < 1e-12\nassert abs(contrastive_loss(0.3, 0) - 0.245) < 1e-12\nassert contrastive_loss(1.5, 0) == 0\nQ = np.array([[1.0, 0.0], [0.0, 1.0]])\nD = np.array([[0.9, 0.1], [0.1, 0.9], [-1.0, 0.0]])\nassert recall_at_k(Q, D, [0, 1], 1) == 1.0\nassert recall_at_k(Q, D, [1, 0], 1) == 0.0\nassert recall_at_k(Q, D, [1, 0], 2) == 1.0\nassert abs(recall_at_k(Q, D, [0, 0], 1) - 0.5) < 1e-12",
  "solution": "import numpy as np\n\ndef triplet_loss(a, p, n, margin=1.0):\n    return float(max(0.0, np.linalg.norm(a - p) - np.linalg.norm(a - n) + margin))\n\ndef triplet_kind(a, p, n, margin=1.0):\n    dp = np.linalg.norm(a - p)\n    dn = np.linalg.norm(a - n)\n    if dn < dp:\n        return 'hard'\n    if dn >= dp + margin:\n        return 'easy'\n    return 'semi-hard'\n\ndef contrastive_loss(d, y, margin=1.0):\n    if y == 1:\n        return 0.5 * d ** 2\n    return 0.5 * max(0.0, margin - d) ** 2\n\ndef recall_at_k(Q, D, relevant, k):\n    Qn = Q / np.linalg.norm(Q, axis=1, keepdims=True)\n    Dn = D / np.linalg.norm(D, axis=1, keepdims=True)\n    sims = Qn @ Dn.T\n    hits = 0\n    for i in range(len(Q)):\n        top = np.argsort(-sims[i])[:k]\n        hits += int(relevant[i] in top)\n    return hits / len(Q)",
  "hints": [
    "Compute `dp` and `dn` once with `np.linalg.norm`, then branch.",
    "Order of checks for the kind: hard first, then easy, otherwise semi-hard.",
    "Normalise rows of both matrices so a matrix product gives cosine similarity; `np.argsort(-s)[:k]` gives the top-k indices."
  ]
}
```

> [!TIP] Interview tips
> - Write the triplet loss from memory, explain the margin, and describe easy, semi-hard and hard negatives with why mining is needed.
> - Compare contrastive, triplet and InfoNCE: pairwise absolute vs relative ordering vs many in-batch negatives. Mention temperature and normalisation.
> - Cover the system side: ANN index (HNSW/IVF-PQ), recall@k evaluation, re-embedding on model updates, cold-start.
