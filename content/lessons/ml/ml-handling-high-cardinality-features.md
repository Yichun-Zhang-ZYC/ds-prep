---
id: ml-handling-high-cardinality-features
title: Handling high-cardinality features
estimatedMinutes: 10
difficulty: medium
tags: [ml, feature-engineering, categorical, embeddings]
---

## Why it matters
User IDs, zip codes, product SKUs, URLs and merchant names can have millions of values. One-hot encoding them is impossible or overfits, so interviewers ask what you'd do instead.

## Concept
Problems: huge sparse matrices, rare categories with too few rows to learn from, unseen categories at prediction time, and tree models that overfit by isolating individual categories.

Options, roughly from simplest to most powerful:
1. **Group rare categories**: keep the top-N or those with ≥ m rows; map the rest to "Other". Also handle unseen values in production this way.
2. **Frequency / count encoding**: the category's popularity is often predictive on its own.
3. **Target encoding** with **smoothing** and **out-of-fold** computation (see the encoding lesson).
4. **Hashing trick**: map to a fixed number of buckets with a hash function. Constant memory, handles new values; collisions add some noise.
5. **Hierarchy / domain features**: zip code → city, state, median income; URL → domain; SKU → category, brand, price band.
6. **Learned embeddings**: dense vectors trained in a neural net (or via matrix factorization / word2vec-style co-occurrence). Standard for users and items in recommenders.
7. **Native support**: CatBoost (ordered target stats), LightGBM categorical splits (with regularization like `min_data_per_group`).

Also ask whether the feature should be used at all: raw user IDs make a model memorize users and fail on new ones; aggregate behavioral features usually generalize better.

## Worked example
Merchant ID with 400k values in a fraud model: keep merchants with ≥ 100 transactions (8k), map the rest to "rare". Add out-of-fold smoothed fraud rate per merchant, merchant transaction count, and merchant category code (~500 values, one-hot or target encoded). Validation PR-AUC improves and new merchants still get sensible features through category and count.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What is a key advantage of the hashing trick for categorical features?",
  "options": ["No collisions", "Fixed memory and automatic handling of unseen categories without storing a vocabulary", "It makes features interpretable", "It removes the need for regularization"],
  "answer": 1,
  "explanation": "Any string hashes into one of B buckets; the cost is occasional collisions."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `group_rare(values, min_count)` that replaces categories appearing fewer than `min_count` times with `'Other'`. Then write `hash_bucket(value, n_buckets)` that returns a stable bucket using `zlib.crc32(value.encode()) % n_buckets` (Python's built-in `hash` is randomized per process, so don't use it).",
  "starterCode": "import zlib\nfrom collections import Counter\n\ndef group_rare(values, min_count):\n    pass\n\ndef hash_bucket(value, n_buckets):\n    pass\n\nprint(group_rare(['a', 'b', 'a', 'c', 'a', 'b'], 2), hash_bucket('merchant_42', 1000))",
  "tests": "import zlib\nassert group_rare(['a', 'b', 'a', 'c', 'a', 'b'], 2) == ['a', 'b', 'a', 'Other', 'a', 'b']\nassert group_rare(['x', 'y'], 1) == ['x', 'y']\nassert hash_bucket('merchant_42', 1000) == zlib.crc32(b'merchant_42') % 1000\nassert 0 <= hash_bucket('anything', 16) < 16\nassert hash_bucket('same', 50) == hash_bucket('same', 50)",
  "solution": "import zlib\nfrom collections import Counter\n\ndef group_rare(values, min_count):\n    counts = Counter(values)\n    return [v if counts[v] >= min_count else 'Other' for v in values]\n\ndef hash_bucket(value, n_buckets):\n    return zlib.crc32(value.encode()) % n_buckets",
  "hints": ["Count with Counter, then map.", "crc32 is deterministic across runs, unlike hash()."]
}
```

> [!TIP] Interview tips
> - List several options and choose by model type and data size: grouping, frequency, smoothed out-of-fold target encoding, hashing, embeddings.
> - Mention unseen categories in production and how each option handles them.
> - Question whether raw IDs should be features at all; aggregates generalize to new entities.
