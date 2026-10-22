---
id: recsys-search-ranking-basics
title: "Search ranking basics"
estimatedMinutes: 13
difficulty: medium
tags: [search, bm25, tf-idf, inverted-index, retrieval]
---

## Why it matters

Search and recommendation share the ranking stack, and "design a search ranker" is a common follow-up. You should know the inverted index, TF-IDF/BM25 scoring, and how learned rankers and embeddings plug in.

## Concept

**Retrieval** uses an **inverted index** mapping each term to a postings list of documents containing it (with term frequency and positions). A query looks up its terms and intersects or unions postings, avoiding a scan of all documents. First-stage lexical scoring is typically **BM25**; dense retrieval (embeddings + ANN) covers semantic matches; the two are often fused (hybrid search).

**TF-IDF** weights a term by how often it appears in the document (TF) and how rare it is in the corpus (IDF). **BM25** improves on it with term-frequency saturation and document-length normalization:
$$\text{score}(q, d) = \sum_{t \in q} \text{IDF}(t) \cdot \frac{f_{t,d}(k_1 + 1)}{f_{t,d} + k_1(1 - b + b\,|d|/\text{avgdl})}$$
with $\text{IDF}(t) = \ln\!\left(1 + \frac{N - n_t + 0.5}{n_t + 0.5}\right)$, typical $k_1 \in [1.2, 2]$ and $b = 0.75$. Repeating a word 20 times does not give 20x the score (saturation), and long documents are penalized.

**The ranking pipeline** mirrors recsys: query understanding (spelling, synonyms, intent) → retrieval (BM25 + ANN) → ranking with a learned model (LambdaMART or a neural cross-encoder) using text-match, behavioral (CTR, dwell), freshness, and quality features → re-ranking (diversity, business rules). Differences from recsys: an explicit query provides intent, so relevance dominates personalization; click logs have strong **position bias**; and metrics are NDCG@k, MRR and click or reformulation rates.

**Pitfalls**: tokenization and stemming choices change recall; stopwords and field boosts (title vs body) matter; head vs tail queries behave differently (head: use clicks; tail: lean on text and semantic matching); avoid training only on clicks, which learn presentation bias.

## Worked example

Corpus of three documents: $d_0$ = [red, shoes, red], $d_1$ = [blue, shoes], $d_2$ = [red, hat, for, sun, and, rain]; $N = 3$, avgdl $= 11/3 \approx 3.67$, $k_1 = 1.5$, $b = 0.75$. For the query "red": $n_t = 2$, $\text{IDF} = \ln(1 + 1.5/2.5) = 0.470$. Document $d_0$ has $f = 2$, $|d| = 3$: $0.470 \cdot 2 \cdot 2.5 / (2 + 1.5(0.25 + 0.75\cdot 0.818)) = 0.713$. Document $d_2$ has $f = 1$, $|d| = 6$: score $0.365$. $d_1$ has no "red" and scores 0. The doc that mentions "red" twice in a short text ranks first.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What do the BM25 parameters k1 and b control?",
  "options": [
    "Learning rate and regularization",
    "Term-frequency saturation and document-length normalization",
    "Index size and shard count",
    "Query length and stopwords"
  ],
  "answer": 1,
  "explanation": "k1 caps how much repeated terms can help (saturation); b scales how strongly long documents are penalized relative to the average length."
}
```

```quiz
{
  "id": "q2",
  "question": "Which is a key difference between search ranking and recommendation ranking?",
  "options": [
    "Search has no ranking stage",
    "Search has an explicit query expressing intent, so text relevance dominates over personalization",
    "Search never uses ML",
    "Recommendation has no position bias"
  ],
  "answer": 1,
  "explanation": "The query is a strong intent signal. Personalization helps, but relevance to the query is the first-order feature."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `bm25(query, doc, docs, k1=1.5, b=0.75)`. `query` and `doc` are lists of tokens, and `docs` is the corpus (list of token lists). For each query term, use `idf = ln(1 + (N - df + 0.5)/(df + 0.5))` where `df` counts documents containing the term, and add `idf * tf*(k1+1) / (tf + k1*(1 - b + b*len(doc)/avgdl))`. Terms with `tf = 0` contribute 0.",
  "setup": "",
  "packages": [],
  "starterCode": "import math\n\ndef bm25(query, doc, docs, k1=1.5, b=0.75):\n    pass\n\ndocs = [[\"red\", \"shoes\", \"red\"], [\"blue\", \"shoes\"], [\"red\", \"hat\", \"for\", \"sun\", \"and\", \"rain\"]]\nprint([round(bm25([\"red\"], d, docs), 3) for d in docs])",
  "tests": "docs = [[\"red\", \"shoes\", \"red\"], [\"blue\", \"shoes\"], [\"red\", \"hat\", \"for\", \"sun\", \"and\", \"rain\"]]\nassert abs(bm25([\"red\"], docs[0], docs) - 0.7131089547176678) < 1e-9\nassert bm25([\"red\"], docs[1], docs) == 0.0\nassert abs(bm25([\"red\"], docs[2], docs) - 0.3653738460567556) < 1e-9\nassert abs(bm25([\"red\", \"shoes\"], docs[1], docs) - bm25([\"shoes\"], docs[1], docs)) < 1e-12\nassert abs(bm25([\"red\", \"shoes\"], docs[0], docs) - 1.22499409548035) < 1e-9\nassert bm25([\"unknown\"], docs[0], docs) == 0.0",
  "solution": "import math\n\ndef bm25(query, doc, docs, k1=1.5, b=0.75):\n    N = len(docs)\n    avgdl = sum(len(d) for d in docs) / N\n    score = 0.0\n    for t in query:\n        tf = doc.count(t)\n        if tf == 0:\n            continue\n        df = sum(1 for d in docs if t in d)\n        idf = math.log(1 + (N - df + 0.5) / (df + 0.5))\n        score += idf * tf * (k1 + 1) / (tf + k1 * (1 - b + b * len(doc) / avgdl))\n    return score",
  "hints": [
    "Skip query terms with tf = 0 so unknown terms never divide by zero.",
    "avgdl is the mean document length over the whole corpus."
  ]
}
```

> [!TIP] Interview tips
> - Lay out the pipeline: inverted index + BM25 and/or ANN for retrieval, then learned ranker, then re-ranking.
> - Explain BM25 versus TF-IDF (saturation and length normalization) with the formula.
> - Raise position bias in click logs, head vs tail queries, and hybrid lexical + dense retrieval.
