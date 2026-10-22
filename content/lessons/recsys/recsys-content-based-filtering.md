---
id: recsys-content-based-filtering
title: "Content-based filtering"
estimatedMinutes: 10
difficulty: easy
tags: [recsys, content-based, tf-idf, user-profile]
---

## Why it matters

Content-based filtering recommends items similar to what a user already liked, using item features instead of other users. It is the standard answer to "how do you recommend a brand-new item?", so it shows up in almost every recsys interview.

## Concept

Represent each item as a feature vector $x_i$: genre one-hot, TF-IDF of the description, category, price bucket, or a pretrained text/image embedding.

Build a **user profile** from the items the user interacted with, typically the (weighted) mean $\bar x_u = \frac{1}{|L_u|}\sum_{i\in L_u} w_i x_i$, where weights can be ratings or recency. Then score unseen items by similarity: $\text{score}(u, i) = \cos(\bar x_u, x_i)$ and return the top $k$. Alternatively train a per-user classifier on item features.

**Strengths**: no need for other users' data, works for **new items** the moment their features exist, explainable ("because you watched sci-fi"), no popularity bias. **Weaknesses**: over-specialization (a filter bubble of near-duplicates), needs good features, cannot discover cross-feature taste (a user who likes both horror and cooking), and still cold-starts new users.

Practical notes: normalize features (TF-IDF, L2 norm) so long descriptions don't dominate, exclude items the user already consumed, and add diversity re-ranking to fight over-specialization.

## Worked example

Items have features $[\text{action},\text{comedy},\text{scifi}]$: item 0 $[1,0,1]$, item 1 $[1,0,0]$, item 2 $[0,1,0]$, item 3 $[0,1,1]$, item 4 $[1,0,1]$. The user liked item 0, so the profile is $[1,0,1]$. Cosine to the others: item 1 $1/\sqrt2 \approx 0.707$, item 2 $0$, item 3 $1/2$, item 4 $1.0$. Top-2 unseen: items 4 and 1.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which problem does content-based filtering handle better than pure collaborative filtering?",
  "options": [
    "New items with no interactions yet",
    "Discovering surprising cross-genre tastes",
    "Users with no history",
    "Learning from other users' behaviour"
  ],
  "answer": 0,
  "explanation": "A new item has features from day one, so it can be scored immediately. A brand-new user is still a problem, since there is no profile."
}
```

```quiz
{
  "id": "q2",
  "question": "What is the typical failure mode of a purely content-based recommender?",
  "options": [
    "It recommends only popular items",
    "Over-specialization: results are all too similar to past consumption",
    "It cannot be explained",
    "It needs millions of users"
  ],
  "answer": 1,
  "explanation": "Similarity to the profile gives near-duplicates and no serendipity. Diversity re-ranking or hybrid models mitigate this."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `recommend(item_vecs, liked, k)`. Build the user profile as the mean of the liked items' vectors, rank all items **not** in `liked` by cosine similarity to the profile (descending; break ties by lower index) and return the top-`k` item indices. Treat similarity as 0 if a vector has zero norm.",
  "setup": "",
  "packages": [],
  "starterCode": "import math\n\ndef recommend(item_vecs, liked, k):\n    pass\n\nitems = [[1, 0, 1], [1, 0, 0], [0, 1, 0], [0, 1, 1], [1, 0, 1]]\nprint(recommend(items, [0], 2))",
  "tests": "items = [[1, 0, 1], [1, 0, 0], [0, 1, 0], [0, 1, 1], [1, 0, 1]]\nassert recommend(items, [0], 2) == [4, 1]\nassert recommend(items, [0], 10) == [4, 1, 3, 2]\nassert recommend(items, [2], 1) == [3]\nassert recommend(items, [0, 2], 2) == [3, 4]\nassert recommend(items, [0, 1, 2, 3, 4], 3) == []",
  "solution": "import math\n\ndef recommend(item_vecs, liked, k):\n    d = len(item_vecs[0])\n    prof = [sum(item_vecs[i][j] for i in liked) / len(liked) for j in range(d)]\n    npf = math.sqrt(sum(x * x for x in prof))\n    scored = []\n    for i, v in enumerate(item_vecs):\n        if i in liked:\n            continue\n        nv = math.sqrt(sum(x * x for x in v))\n        s = sum(a * b for a, b in zip(prof, v)) / (npf * nv) if npf and nv else 0.0\n        scored.append((-s, i))\n    scored.sort()\n    return [i for _, i in scored[:k]]",
  "hints": [
    "Profile = element-wise mean over the liked vectors.",
    "Sort tuples (-score, index) so ties resolve to the lower index."
  ]
}
```

> [!TIP] Interview tips
> - Frame it as the answer to new-item cold start, and as the content tower in hybrids.
> - Name the weaknesses: over-specialization, feature engineering, no cross-user signal.
> - Mention TF-IDF or learned embeddings for text/image items, and recency/rating weighting of the user profile.
