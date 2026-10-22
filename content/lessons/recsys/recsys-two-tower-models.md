---
id: recsys-two-tower-models
title: "Two-tower models"
estimatedMinutes: 12
difficulty: medium
tags: [recsys, two-tower, retrieval, embeddings, ann, contrastive]
---

## Why it matters

Two-tower (dual encoder) models are the standard retrieval stage at YouTube, Google Play, Pinterest and most large recommenders. Interviewers ask why the architecture is shaped this way, how it is trained with in-batch negatives, and how it serves in milliseconds.

## Concept

Two separate networks map inputs into the same $d$-dimensional space: a **user (query) tower** $u = f(\text{user features, history, context})$ and an **item tower** $v = g(\text{item id, content, stats})$. The relevance score is a dot product or cosine, $s(u, v) = u^\top v$.

**Why this shape**: because the towers do not interact until the final dot product, **all item embeddings can be precomputed** and stored in an approximate nearest neighbor (ANN) index (HNSW, ScaNN, FAISS). At request time you run only the user tower once and do a sub-linear ANN lookup over millions of items. Cross-features such as user x item interactions are sacrificed for this speed, which is why a heavier ranker follows.

**Training**: treat clicks as positives and use a **sampled softmax** with in-batch negatives. For a batch of $B$ (user, item) pairs, logits are $S = U V^\top / \tau$ ($B \times B$), and the loss is cross-entropy with the diagonal as the label: $\mathcal{L} = -\frac1B \sum_b \log \frac{e^{S_{bb}}}{\sum_j e^{S_{bj}}}$. Popular items appear as negatives too often, so apply a **logQ correction** (subtract $\log p_j$ from logits) or mix in random negatives. Temperature $\tau$ controls sharpness.

**Pitfalls**: train-serve skew in features, stale item embeddings (re-index regularly), embedding drift between tower versions, false negatives in the batch, and a collapse toward popular items. Evaluate retrieval with recall@k against the ranker's candidate needs, not NDCG.

## Worked example

A batch of two pairs with perfectly aligned embeddings $U = V = I_2$ and $\tau = 1$ gives logits $\begin{bmatrix}1&0\\0&1\end{bmatrix}$. For each row the softmax probability of the diagonal is $e/(e+1) = 0.731$, so the loss is $-\log 0.731 = \log(1+e^{-1}) \approx 0.313$. With $\tau = 0.5$ the logits become 2 and 0 and the loss drops to $\log(1+e^{-2}) \approx 0.127$; a lower temperature sharpens the softmax.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What is the key serving advantage of a two-tower model?",
  "options": [
    "It can model user x item feature crosses",
    "Item embeddings can be precomputed and indexed for ANN search",
    "It needs no training data",
    "It gives calibrated click probabilities"
  ],
  "answer": 1,
  "explanation": "No interaction occurs before the dot product, so item vectors are computed offline and only the user tower runs per request."
}
```

```quiz
{
  "id": "q2",
  "question": "With in-batch negatives, why is a logQ (sampling-probability) correction often applied?",
  "options": [
    "Popular items appear as negatives too often, which would penalize them unfairly",
    "It speeds up the matmul",
    "It removes the need for a temperature",
    "It guarantees unique items in each batch"
  ],
  "answer": 0,
  "explanation": "Items are sampled proportionally to popularity, so the softmax over-penalizes popular items. Subtracting log of the sampling probability de-biases the logits."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "With numpy implement `retrieve(u, V, k)` returning the indices of the `k` items with the highest dot product with user vector `u` (descending score, ties by lower index), and `in_batch_softmax_loss(U, V, tau)` computing the mean cross-entropy of the logits `U @ V.T / tau` with the diagonal as the target.",
  "setup": "import numpy as np",
  "packages": [
    "numpy"
  ],
  "starterCode": "import numpy as np\n\ndef retrieve(u, V, k):\n    pass\n\ndef in_batch_softmax_loss(U, V, tau=1.0):\n    pass\n\nprint(retrieve(np.array([1.0, 0.0]), np.array([[1, 0], [0, 1], [0.5, 0.5], [2, 0]]), 2))\nprint(in_batch_softmax_loss(np.eye(2), np.eye(2)))",
  "tests": "import math\nV = np.array([[1.0, 0.0], [0.0, 1.0], [0.5, 0.5], [2.0, 0.0]])\nassert list(retrieve(np.array([1.0, 0.0]), V, 2)) == [3, 0]\nassert list(retrieve(np.array([0.0, 1.0]), V, 3)) == [1, 2, 0]\nassert abs(in_batch_softmax_loss(np.eye(2), np.eye(2)) - math.log(1 + math.exp(-1))) < 1e-9\nassert abs(in_batch_softmax_loss(np.eye(2), np.eye(2), 0.5) - math.log(1 + math.exp(-2))) < 1e-9\nU = np.array([[1.0, 0.0], [0.0, 1.0]])\nassert in_batch_softmax_loss(U, U[::-1]) > in_batch_softmax_loss(U, U)",
  "solution": "import numpy as np\n\ndef retrieve(u, V, k):\n    scores = V @ u\n    order = sorted(range(len(scores)), key=lambda i: (-scores[i], i))\n    return order[:k]\n\ndef in_batch_softmax_loss(U, V, tau=1.0):\n    S = U @ V.T / tau\n    S = S - S.max(axis=1, keepdims=True)\n    logp = S - np.log(np.exp(S).sum(axis=1, keepdims=True))\n    return float(-np.mean(np.diag(logp)))",
  "hints": [
    "Subtract the row max before exponentiating for a stable softmax.",
    "The target for row b is column b, so use np.diag of the log-probabilities."
  ]
}
```

> [!TIP] Interview tips
> - Explain the trade-off: speed and ANN-ability in exchange for no cross-features; a ranker re-scores the shortlist.
> - Know in-batch negatives, the logQ correction, temperature, and hard-negative mining.
> - Mention serving: offline item index refresh, online user tower, and keeping tower versions in sync.
