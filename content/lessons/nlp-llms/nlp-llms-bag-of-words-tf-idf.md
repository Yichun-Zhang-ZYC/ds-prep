---
id: nlp-llms-bag-of-words-tf-idf
title: Bag of words, TF-IDF
estimatedMinutes: 10
difficulty: easy
tags: [nlp, tf-idf, bag-of-words, text-features]
---

## Why it matters
Bag of words and TF-IDF are the classic text-to-vector baselines, still strong for search, spam filters and small-data classification. Interviewers ask you to derive TF-IDF, explain why it beats raw counts, and say when embeddings win instead.

## Concept
**Bag of words (BoW)** represents a document as a vector of word counts over a fixed vocabulary of size $V$. Word order is discarded; vectors are sparse (most entries 0). **n-grams** (e.g. bigrams) recover a bit of local order at the cost of a larger vocabulary.

Raw counts over-weight common words (`the`, `is`). **TF-IDF** rescales them:

$$\text{tf-idf}(t, d) = \text{tf}(t, d) \cdot \text{idf}(t), \qquad \text{idf}(t) = \ln\frac{N}{\text{df}(t)}$$

- $\text{tf}(t,d)$: count of $t$ in $d$, often divided by $|d|$ (or $1 + \ln$ count, "sublinear tf").
- $\text{df}(t)$: number of documents containing $t$; $N$: total documents.
- A term in every document gets idf $= 0$; rare terms get large weights.

scikit-learn uses the smoothed $\text{idf}(t) = \ln\frac{1+N}{1+\text{df}(t)} + 1$ (never zero) and L2-normalizes each row, so the dot product of two rows is their cosine similarity.

**Use it for**: ranking and retrieval (BM25 is a refined TF-IDF with term-frequency saturation and length normalization), linear classifiers (logistic regression, linear SVM, Naive Bayes), keyword extraction.

**Limits**: no semantics (`car` and `automobile` are unrelated), huge sparse vectors, no word order, vocabulary fixed at fit time. **Fit the vectorizer on training data only**, or IDF leaks test information. Use `min_df`/`max_df` and hashing (`HashingVectorizer`) to control vocabulary size.

## Worked example
Corpus of $N = 3$ documents: d1 = `cat sat the mat`, d2 = `dog sat the`, d3 = `the cat`.

Document frequencies: `the` = 3, `cat` = 2, `sat` = 2, `mat` = 1, `dog` = 1. So idf(`the`) $= \ln 1 = 0$, idf(`cat`) $= \ln 1.5 \approx 0.405$, idf(`mat`) $= \ln 3 \approx 1.099$.

In d1 (4 tokens), tf $= 1/4$ for every word: tf-idf(`mat`) $= 0.25 \cdot 1.099 \approx 0.275$, tf-idf(`cat`) $\approx 0.101$, tf-idf(`the`) $= 0$. The rare word `mat` is the most characteristic term of d1.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "In a corpus of 1,000 documents, a word appears in all of them. What is its (unsmoothed) idf, and what does that imply?",
  "options": ["ln(1000) ≈ 6.9, a very informative word", "0, so its TF-IDF weight is 0 in every document", "1, so it keeps its raw count", "Undefined"],
  "answer": 1,
  "explanation": "idf = ln(N / df) = ln(1000/1000) = 0. Words present everywhere carry no discriminative power."
}
```

```quiz
{
  "id": "q2",
  "question": "Which is a correct way to avoid leakage when using TF-IDF in a train/test setup?",
  "options": ["Fit the vectorizer on all data, then split", "Fit the vectorizer on the training set only, then transform both sets", "Fit separate vectorizers on train and test", "Skip IDF for the test set"],
  "answer": 1,
  "explanation": "IDF statistics must come from training data only; the test set is transformed with the training vocabulary and idf values."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `tf_idf(docs)`, where `docs` is a list of token lists. For each document return a dict `{term: weight}` with $\\text{tf} = \\text{count} / \\text{len(doc)}$ and $\\text{idf} = \\ln(N / \\text{df})$ (unsmoothed, natural log).",
  "setup": "import math",
  "starterCode": "import math\n\ndef tf_idf(docs):\n    # docs: list of token lists; return a list of {term: weight} dicts\n    pass\n\ndocs = [['cat', 'sat', 'the', 'mat'], ['dog', 'sat', 'the'], ['the', 'cat']]\nprint(tf_idf(docs))",
  "tests": "docs = [['cat', 'sat', 'the', 'mat'], ['dog', 'sat', 'the'], ['the', 'cat']]\nw = tf_idf(docs)\nassert len(w) == 3\nassert abs(w[0]['mat'] - 0.25 * math.log(3)) < 1e-9\nassert abs(w[0]['cat'] - 0.25 * math.log(1.5)) < 1e-9\nassert w[0]['the'] == 0 and w[2]['the'] == 0\nassert abs(w[1]['dog'] - (1 / 3) * math.log(3)) < 1e-9\nassert abs(w[2]['cat'] - 0.5 * math.log(1.5)) < 1e-9\nassert set(w[1]) == {'dog', 'sat', 'the'}\nassert max(w[0], key=w[0].get) == 'mat'",
  "solution": "import math\nfrom collections import Counter\n\ndef tf_idf(docs):\n    n = len(docs)\n    df = Counter()\n    for d in docs:\n        df.update(set(d))\n    out = []\n    for d in docs:\n        counts = Counter(d)\n        out.append({t: (c / len(d)) * math.log(n / df[t]) for t, c in counts.items()})\n    return out",
  "hints": ["Build df by updating a Counter with set(doc) for each document.", "Weight for term t in doc d is (count / len(d)) * math.log(N / df[t])."]
}
```

> [!TIP] Interview tips
> - Write the TF-IDF formula from memory and explain the intuition: frequent in this document, rare across the corpus.
> - Pitfalls: fitting IDF on test data (leakage) and forgetting L2 normalization before cosine similarity.
> - Mention BM25 for search and sentence embeddings as the semantic alternative; hybrid retrieval often combines both.
