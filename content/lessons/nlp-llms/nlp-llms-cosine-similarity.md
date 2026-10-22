---
id: nlp-llms-cosine-similarity
title: Cosine similarity
estimatedMinutes: 8
difficulty: easy
tags: [nlp, embeddings, similarity, retrieval]
---

## Why it matters
Cosine similarity is the default way to compare embeddings in semantic search, RAG retrieval, recommendation and deduplication. Interviewers ask why it beats Euclidean distance for text, how it relates to the dot product, and how to compute it efficiently at scale.

## Concept
$$\cos(a, b) = \frac{a \cdot b}{\|a\|\,\|b\|} = \cos\theta \in [-1, 1]$$

- It measures the **angle** between vectors and ignores their **length**. Two documents with the same topic mix but different lengths point in the same direction.
- **Cosine distance** $= 1 - \cos(a, b)$. It is not a true metric (the triangle inequality can fail); angular distance $\arccos(\cos)/\pi$ is.
- **Unit-normalised vectors**: $\cos(a, b) = a \cdot b$ and $\|a - b\|^2 = 2 - 2\cos(a, b)$. Cosine ranking and Euclidean ranking are then identical, and a dot-product index (FAISS inner product) does cosine search after normalising once.
- Dot product keeps magnitude. Use it only when magnitude carries signal (e.g. popularity in a two-tower recommender) or the model was trained with it.
- **Sparse vectors** (TF-IDF) are non-negative, so $\cos \in [0, 1]$. **Dense embeddings** can be negative, but in practice most text pairs score well above 0 (anisotropy), so compare scores relative to each other, not to an absolute threshold.
- **Cost**: one pair is $O(d)$. Brute-force top-$k$ over $N$ vectors is $O(Nd)$; at scale use approximate nearest neighbour indexes (HNSW, IVF, product quantisation).
- **Pitfalls**: zero vectors (undefined, return 0 or skip); thresholds need tuning per model; high-dimensional embeddings concentrate, so scores bunch together.

## Worked example
Let $a = (3, 4)$ and $b = (4, 3)$. Then $a \cdot b = 12 + 12 = 24$ and $\|a\| = \|b\| = 5$, so $\cos = 24/25 = 0.96$ (angle about $16^\circ$).

Now compare $u = (1, 0)$, $v = (10, 0)$ and $w = (0, 1)$. $\cos(u, v) = 1$ although the Euclidean distance is 9; $\cos(u, w) = 0$ although the Euclidean distance is only $\sqrt 2 \approx 1.41$. Cosine says "same direction"; Euclidean says "nearby".

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Two unit-normalised embeddings have cosine similarity 0.8. What is their squared Euclidean distance?",
  "options": [
    "0.2",
    "0.4",
    "0.8",
    "1.6"
  ],
  "answer": 1,
  "explanation": "$\\|a-b\\|^2 = 2 - 2\\cos = 2 - 1.6 = 0.4$."
}
```

```quiz
{
  "id": "q2",
  "question": "Document A is document B pasted twice. Which statement is true?",
  "options": [
    "Cosine similarity is 0.5",
    "Cosine similarity is 1 for raw term-count vectors, but their Euclidean distance is large",
    "Cosine similarity is 0 because lengths differ",
    "Cosine and Euclidean agree that they are identical"
  ],
  "answer": 1,
  "explanation": "Doubling a vector's counts keeps its direction, so cosine is 1; the vectors differ in magnitude, so Euclidean distance is not 0."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `cosine(a, b)` for two equal-length lists (return 0.0 if either has zero norm) and `top_k(query, docs, k)` returning the indices of the `k` docs most similar to `query`, best first (break ties by lower index).",
  "starterCode": "import math\n\ndef cosine(a, b):\n    pass\n\ndef top_k(query, docs, k):\n    pass\n\nprint(cosine([3, 4], [4, 3]), top_k([1, 0], [[0, 1], [5, 1], [1, 0.1]], 2))",
  "tests": "assert abs(cosine([3, 4], [4, 3]) - 0.96) < 1e-12\nassert abs(cosine([1, 0], [10, 0]) - 1.0) < 1e-12\nassert abs(cosine([1, 0], [0, 1])) < 1e-12\nassert abs(cosine([1, 2], [-1, -2]) + 1.0) < 1e-12\nassert cosine([0, 0], [1, 2]) == 0.0\nassert top_k([1, 0], [[0, 1], [5, 1], [1, 0.1]], 2) == [2, 1]\nassert top_k([1, 1], [[1, 1], [2, 2], [-1, 0]], 3) == [0, 1, 2]",
  "solution": "import math\n\ndef cosine(a, b):\n    na = math.sqrt(sum(x * x for x in a))\n    nb = math.sqrt(sum(x * x for x in b))\n    if na == 0 or nb == 0:\n        return 0.0\n    return sum(x * y for x, y in zip(a, b)) / (na * nb)\n\ndef top_k(query, docs, k):\n    sims = [(-cosine(query, d), i) for i, d in enumerate(docs)]\n    return [i for _, i in sorted(sims)[:k]]",
  "hints": [
    "Compute the dot product and both norms, then divide; guard against zero norms.",
    "Sort on `(-similarity, index)` so ties fall back to the lower index."
  ]
}
```

> [!TIP] Interview tips
> - State the formula and the one-liner: cosine = dot product of unit vectors, so it ignores magnitude.
> - Mention that for normalised embeddings, cosine, dot product and Euclidean distance give the same ranking.
> - Know the scale story: normalise once, then use an ANN index (HNSW/IVF) instead of brute force.

