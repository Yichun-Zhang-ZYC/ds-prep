---
id: recsys-sequence-aware-recommenders
title: "Sequence-aware recommenders"
estimatedMinutes: 13
difficulty: hard
tags: [recsys, sequential, sasrec, session-based, transformers]
---

## Why it matters
Matrix factorization treats a user as a static bag of items. Real intent is ordered and short-lived: someone who just watched episode 3 wants episode 4, not the all-time favourite. Interviewers ask how to use recent behaviour, which sequence model to pick, and how to serve it within a latency budget.

## Concept
**Session-based** recommenders see only the current anonymous session; **sequential** recommenders use a user's longer history. Both predict the **next item** given an ordered prefix.

**Model ladder** (simplest first):
- **Item-to-item transitions / first-order Markov**: count how often $j$ follows $i$. Strong, cheap baseline; add **recency** and time-gap weighting. Session-kNN (match the current session to similar past sessions) is a famously hard baseline to beat.
- **GRU4Rec**: RNN over the item sequence with ranking losses (BPR, sampled softmax).
- **SASRec**: Transformer decoder with a **causal mask**, trained to predict item $t+1$ at every position $t$ with one sampled or in-batch negative per step. Attention weights adapt between long and short dependence.
- **BERT4Rec**: bidirectional, trained on masked items (Cloze). Often similar or stronger with long training, but heavier, and needs a mask token at inference.
- Hybrids: feed sequence-encoder output as the **user tower** of a two-tower retriever, or as features into the ranker (last-$N$ item embeddings, time since last event).

**Practicalities**:
- Truncate to the last $N$ events (50 to 200); attention cost is $O(N^2 d)$ per layer.
- Include **item side information** (category, price) and event type and timestamp embeddings so cold items can be encoded.
- **Serving**: recompute the user vector on each event (stream the last-$N$ list from a feature store), or cache it and refresh on a short TTL. Then ANN retrieval as usual.
- **Evaluation**: leave-last-out or a temporal split; train only on prefixes; avoid sampled-negative metrics (they can reorder models); watch **repeat consumption** (re-buying, re-listening), which Markov models handle poorly and should be modelled explicitly.

## Worked example
Four sessions (illustrative): $[1,2,3,4]$, $[1,2,3,4]$, $[2,3,4,5]$, $[1,2,3,5]$. Leave the last item out of each for training, giving $[1,2,3]$, $[1,2,3]$, $[2,3,4]$, $[1,2]$. Transition counts: $1\to2$: 3, $2\to3$: 3, $3\to4$: 1.

Evaluate on the held-out last items: sessions 1 and 2 have input 3 and target 4, and the model recommends 4 from 3: hits. Session 3 has input 4 and target 5: 4 was never followed by anything in training, miss. Session 4 has input 3 and target 5: recommends 4, miss. HitRate@1 $= 2/4 = 0.5$. Training on the full sessions would also count $3\to4$ from the test targets and inflate the number: that is the classic leakage bug.

Cost check: with $N = 50$ and $d = 64$, one attention layer is about $50^2 \cdot 64 = 160{,}000$ multiply-adds per user, cheap enough to run per request.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What is the main difference between SASRec and BERT4Rec training?",
  "options": [
    "SASRec uses CNNs",
    "SASRec is causal and predicts the next item at every position; BERT4Rec is bidirectional and predicts randomly masked items",
    "BERT4Rec cannot use item embeddings",
    "SASRec needs explicit ratings"
  ],
  "answer": 1,
  "explanation": "SASRec applies a causal mask (left-to-right next-item prediction), which matches serving. BERT4Rec uses a Cloze objective with bidirectional context, which can be stronger but needs the mask token at inference and costs more to train."
}
```

```quiz
{
  "id": "q2",
  "question": "Why is a random train/test split of interactions wrong for sequential recommenders?",
  "options": [
    "It makes the test set too small",
    "Future interactions land in training, leaking later behaviour; evaluate with a temporal or leave-last-out split",
    "It breaks the embeddings",
    "It only matters for explicit ratings"
  ],
  "answer": 1,
  "explanation": "Sequence models learn from order. A random split lets the model see events that happen after the test event, inflating metrics. Split by time (global cutoff) or hold out the last item per user, and beware sampled-negative metrics that distort rankings."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Build a first-order Markov recommender. Write `transition_counts(sessions)` returning a dict `item -> {next_item: count}` over consecutive pairs in each session, and `recommend_next(counts, item, k)` returning the top-`k` next items by count descending (ties by item id ascending; empty list if the item is unseen).",
  "starterCode": "def transition_counts(sessions):\n    pass\n\ndef recommend_next(counts, item, k):\n    pass\n\nc = transition_counts([[1, 2, 3], [1, 2, 4], [2, 3], [1, 2, 3]])\nprint(c, recommend_next(c, 2, 2))",
  "tests": "c = transition_counts([[1, 2, 3], [1, 2, 4], [2, 3], [1, 2, 3]])\nassert c[1] == {2: 3}\nassert c[2] == {3: 3, 4: 1}\nassert 3 not in c\nassert recommend_next(c, 2, 2) == [3, 4]\nassert recommend_next(c, 2, 1) == [3]\nassert recommend_next(c, 99, 3) == []\nassert recommend_next({5: {7: 1, 6: 1}}, 5, 2) == [6, 7]",
  "solution": "def transition_counts(sessions):\n    counts = {}\n    for s in sessions:\n        for a, b in zip(s, s[1:]):\n            counts.setdefault(a, {})\n            counts[a][b] = counts[a].get(b, 0) + 1\n    return counts\n\ndef recommend_next(counts, item, k):\n    nxt = counts.get(item, {})\n    return sorted(nxt, key=lambda j: (-nxt[j], j))[:k]",
  "hints": [
    "zip(s, s[1:]) yields consecutive pairs.",
    "Items that never appear before another item have no entry in the dict."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Leave-last-out evaluation without leakage. Write `hit_rate_loo(sessions, k)`. For every session with at least 2 items, the last item is the held-out target and the second-to-last item is the input. Train the Markov counts only on sessions with their last item removed (use the functions below, already provided). Return hits / number of evaluated sessions, where a hit means the target is in the top-`k` recommendations.",
  "starterCode": "def transition_counts(sessions):\n    counts = {}\n    for s in sessions:\n        for a, b in zip(s, s[1:]):\n            counts.setdefault(a, {})\n            counts[a][b] = counts[a].get(b, 0) + 1\n    return counts\n\ndef recommend_next(counts, item, k):\n    nxt = counts.get(item, {})\n    return sorted(nxt, key=lambda j: (-nxt[j], j))[:k]\n\ndef hit_rate_loo(sessions, k):\n    pass\n\nprint(hit_rate_loo([[1, 2, 3, 4], [1, 2, 3, 4], [2, 3, 4, 5], [1, 2, 3, 5]], 1))",
  "tests": "S = [[1, 2, 3, 4], [1, 2, 3, 4], [2, 3, 4, 5], [1, 2, 3, 5]]\nassert abs(hit_rate_loo(S, 1) - 0.5) < 1e-12\nassert abs(hit_rate_loo(S + [[9]], 1) - 0.5) < 1e-12\nassert hit_rate_loo([[1]], 1) == 0.0\nassert abs(hit_rate_loo(S, 5) - 0.5) < 1e-12",
  "solution": "def transition_counts(sessions):\n    counts = {}\n    for s in sessions:\n        for a, b in zip(s, s[1:]):\n            counts.setdefault(a, {})\n            counts[a][b] = counts[a].get(b, 0) + 1\n    return counts\n\ndef recommend_next(counts, item, k):\n    nxt = counts.get(item, {})\n    return sorted(nxt, key=lambda j: (-nxt[j], j))[:k]\n\ndef hit_rate_loo(sessions, k):\n    counts = transition_counts([s[:-1] for s in sessions])\n    hits = n = 0\n    for s in sessions:\n        if len(s) < 2:\n            continue\n        n += 1\n        if s[-1] in recommend_next(counts, s[-2], k):\n            hits += 1\n    return hits / n if n else 0.0",
  "hints": [
    "Train on `[s[:-1] for s in sessions]`, otherwise the test transition leaks into the counts.",
    "Sessions shorter than 2 items are skipped in the denominator."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Causal self-attention weights, as in SASRec. Given a square matrix `scores` (list of lists, `scores[i][j]` = how much position i attends to position j), write `causal_softmax(scores)`: for row `i`, apply softmax over columns `j <= i` only and set weights for `j > i` to 0.0.",
  "starterCode": "import math\n\ndef causal_softmax(scores):\n    pass\n\nprint(causal_softmax([[0, 9, 9], [2, 2, 9], [1, 1, 1]]))",
  "tests": "W = causal_softmax([[0, 9, 9], [2, 2, 9], [1, 1, 1]])\nassert W[0] == [1.0, 0.0, 0.0]\nassert abs(W[1][0] - 0.5) < 1e-12 and abs(W[1][1] - 0.5) < 1e-12 and W[1][2] == 0.0\nassert all(abs(w - 1 / 3) < 1e-12 for w in W[2])\nW2 = causal_softmax([[0, 0], [1000, 1001]])\nassert abs(sum(W2[1]) - 1) < 1e-12 and W2[1][1] > W2[1][0]",
  "solution": "import math\n\ndef causal_softmax(scores):\n    out = []\n    for i, row in enumerate(scores):\n        vals = row[:i + 1]\n        m = max(vals)\n        e = [math.exp(v - m) for v in vals]\n        z = sum(e)\n        out.append([x / z for x in e] + [0.0] * (len(row) - i - 1))\n    return out",
  "hints": [
    "Subtract the row maximum before exponentiating for numerical stability.",
    "Only the first i + 1 entries of row i take part in the softmax."
  ]
}
```

> [!TIP] Interview tips
> - Start with item-to-item / session-kNN as the baseline, then justify SASRec by its causal next-item objective matching serving.
> - Say how you avoid leakage: train on prefixes, temporal or leave-last-out split.
> - Mention serving: last-N from a feature store, user vector refreshed per event, ANN retrieval, and explicit handling of repeat consumption.
