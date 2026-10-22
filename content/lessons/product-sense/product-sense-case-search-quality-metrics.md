---
id: product-sense-case-search-quality-metrics
title: "Case: Search quality metrics"
estimatedMinutes: 13
difficulty: medium
tags: [case-study, search, ranking, ndcg, interleaving]
---

## Why it matters
"How would you measure search quality at Google, Amazon or Airbnb?" mixes product sense with ranking evaluation. Strong answers combine offline relevance metrics (NDCG, MRR), online behaviour (success, abandonment, reformulation) and a careful experiment design. For model-side details see the recommender evaluation lessons.

## Concept
**Offline (human or labelled relevance judgements)**:
- **Precision@k**: relevant results in the top $k$ / $k$.
- **MRR** (mean reciprocal rank): average of $1/\text{rank of the first relevant result}$. Good for navigational queries with one right answer.
- **NDCG@k**: handles graded relevance and position. With gain $rel_i$ at rank $i$,

$$DCG@k = \sum_{i=1}^{k} \frac{rel_i}{\log_2(i+1)},\qquad NDCG@k = \frac{DCG@k}{IDCG@k}$$

where IDCG is the DCG of the ideal ordering (some teams use $2^{rel}-1$ as the gain). It is in [0, 1] and comparable across queries.
- Caveats: judgement cost, rater disagreement, stale labels, and the query set must be representative (head, torso, tail).

**Online (behavioural)**:
- **Click-through rate** is noisy: a click is not satisfaction. Pair it with **dwell time** or **long clicks** (user does not bounce back).
- **Abandonment** (no click), **reformulation rate** (user rewrites the query), **time to first click**, **zero-result rate**, pogo-sticking.
- **Task success**: purchase, booking, or an explicit "this was helpful". For e-commerce also add-to-cart rate, conversion and revenue per search.
- Slice by query type (navigational, informational, transactional) and by head vs tail queries. Good abandonment (answer shown in the result page) looks like bad abandonment.

**Online experiments**:
- **A/B test** on user-level success metrics: reliable but needs lots of traffic.
- **Interleaving** (e.g. team-draft): mix both rankers' results into one list and credit the ranker whose results get clicked. It is far more sensitive (often 10-100x fewer queries) and good for ranker comparison, but does not measure absolute metrics or long-term effects.
- **Side-by-side** human evaluation for qualitative regressions.

**Guardrails**: latency (p95), ads or revenue per search, diversity, fairness across sellers, and safety.

## Worked example
**Offline.** For one query, a ranker returns four results with graded relevance $[3, 2, 0, 1]$ (3 = perfect).

- $DCG@4 = 3/\log_2 2 + 2/\log_2 3 + 0/\log_2 4 + 1/\log_2 5 = 3 + 1.2619 + 0 + 0.4307 = 4.6926$.
- Ideal order $[3, 2, 1, 0]$: $IDCG@4 = 3 + 1.2619 + 1/2 + 0 = 4.7619$.
- $NDCG@4 = 4.6926 / 4.7619 \approx$ **0.985**. Putting the 1 above the 0 would give 1.0.

**Online.** Of 100,000 searches (illustrative), 82,000 have a click (18% abandonment), 15,000 are reformulated within 30 seconds (15%), and 61,000 have a click with dwell above 30 seconds (success 61%).

A new ranker is tested with team-draft interleaving over 20,000 sessions with clicks: ranker B wins 5,600, ranker A wins 4,400, and 10,000 are ties. Excluding ties, B's win rate is 5,600 / 10,000 = **56%**. This is significantly above 50% (standard error about $\sqrt{0.25/10{,}000} = 0.5\%$, so z = 12).

**Reading**: B is preferred by users. Before shipping, confirm with an A/B test on success rate and check guardrails: latency, revenue per search, and the tail-query slice, where new rankers often regress.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why is interleaving preferred over a plain A/B test when comparing two rankers?",
  "options": [
    "It measures long-term retention",
    "Each user sees both rankers, removing between-user variance, so it needs far less traffic to detect a preference",
    "It needs no click data",
    "It gives absolute metric values"
  ],
  "answer": 1,
  "explanation": "Interleaving is a within-user comparison, so it is very sensitive. It tells you which ranker is preferred, not by how much business metrics move."
}
```

```quiz
{
  "id": "q2",
  "question": "Search abandonment rate rose from 18% to 22% after the result page started showing direct answer cards. What should you conclude first?",
  "options": [
    "Search quality has definitely fallen",
    "Some abandonment may be 'good abandonment' (answer satisfied the user); check reformulations, return rate and satisfaction",
    "Remove the answer cards",
    "Abandonment is meaningless"
  ],
  "answer": 1,
  "explanation": "Without a click, an answered user looks identical to a frustrated user. Distinguish them with reformulation, follow-up searches and surveys."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `mrr(results)` and `precision_at_k(rels, k)`. `results` is a list of ranked lists of binary relevance (1 = relevant), one per query; MRR averages `1 / rank` of the first relevant item (0 if none). `precision_at_k` returns the share of relevant items in the first k of one list.",
  "starterCode": "def mrr(results):\n    pass\n\ndef precision_at_k(rels, k):\n    pass\n\nprint(mrr([[0, 1, 0], [1, 0, 0], [0, 0, 0]]), precision_at_k([1, 0, 1, 1], 3))",
  "tests": "assert abs(mrr([[0, 1, 0], [1, 0, 0], [0, 0, 0]]) - (0.5 + 1 + 0) / 3) < 1e-12\nassert abs(mrr([[0, 0, 1]]) - 1 / 3) < 1e-12\nassert abs(precision_at_k([1, 0, 1, 1], 3) - 2 / 3) < 1e-12\nassert precision_at_k([0, 0], 2) == 0",
  "solution": "def mrr(results):\n    total = 0.0\n    for rels in results:\n        for i, r in enumerate(rels, start=1):\n            if r:\n                total += 1 / i\n                break\n    return total / len(results)\n\ndef precision_at_k(rels, k):\n    return sum(1 for r in rels[:k] if r) / k",
  "hints": [
    "Use `enumerate(rels, start=1)` so rank is 1-based; stop at the first hit.",
    "A query with no relevant result contributes 0 but still counts in the average."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Implement `ndcg_at_k(rels, k)` for graded relevance with linear gain: `DCG = sum(rel_i / log2(i + 1))` for ranks i = 1..k, and IDCG is the DCG of `rels` sorted in descending order (also cut at k). Return 0.0 if IDCG is 0.",
  "starterCode": "import math\n\ndef ndcg_at_k(rels, k):\n    pass\n\nprint(ndcg_at_k([3, 2, 0, 1], 4))",
  "tests": "assert abs(ndcg_at_k([3, 2, 0, 1], 4) - 0.98544) < 1e-4\nassert abs(ndcg_at_k([3, 2, 1, 0], 4) - 1.0) < 1e-12\nassert ndcg_at_k([0, 0, 0], 3) == 0.0\nd = 3 + 2 / math.log2(3)\nassert abs(ndcg_at_k([3, 2, 0, 1], 2) - 1.0) < 1e-12\nassert abs(ndcg_at_k([0, 3, 2], 2) - (3 / math.log2(3)) / d) < 1e-12",
  "solution": "import math\n\ndef _dcg(rels, k):\n    return sum(r / math.log2(i + 1) for i, r in enumerate(rels[:k], start=1))\n\ndef ndcg_at_k(rels, k):\n    ideal = _dcg(sorted(rels, reverse=True), k)\n    if ideal == 0:\n        return 0.0\n    return _dcg(rels, k) / ideal",
  "hints": [
    "The discount for rank i is log2(i + 1): rank 1 → 1, rank 2 → 1.585, rank 3 → 2.",
    "Compute the ideal ordering from the same list of judged results."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Implement `interleaving_result(sessions)`. Each session is a list of owners (`'A'` or `'B'`) of the results that were clicked in an interleaved list. A session is won by the ranker with more clicks (tie if equal, including empty sessions, which should be skipped entirely and not counted as ties). Return `(wins_a, wins_b, ties, win_rate_a)`, where win_rate_a = wins_a / (wins_a + wins_b) (0.5 if there are no decisive sessions).",
  "starterCode": "def interleaving_result(sessions):\n    pass\n\nprint(interleaving_result([['A', 'B', 'A'], ['B'], ['A', 'B'], []]))",
  "tests": "assert interleaving_result([['A', 'B', 'A'], ['B'], ['A', 'B'], []]) == (1, 1, 1, 0.5)\nr = interleaving_result([['B'], ['B', 'B'], ['A']])\nassert r[:3] == (1, 2, 0) and abs(r[3] - 1 / 3) < 1e-12\nassert interleaving_result([['A', 'B']]) == (0, 0, 1, 0.5)\nassert interleaving_result([]) == (0, 0, 0, 0.5)",
  "solution": "def interleaving_result(sessions):\n    a_w = b_w = ties = 0\n    for s in sessions:\n        if not s:\n            continue\n        a, b = s.count('A'), s.count('B')\n        if a > b:\n            a_w += 1\n        elif b > a:\n            b_w += 1\n        else:\n            ties += 1\n    dec = a_w + b_w\n    return a_w, b_w, ties, (a_w / dec if dec else 0.5)",
  "hints": [
    "Skip sessions with no clicks, since they carry no preference information.",
    "Win rate ignores ties."
  ]
}
```

> [!TIP] Interview tips
> - Combine three layers: offline relevance (NDCG, MRR), online behaviour (success, abandonment, reformulation) and experiments (A/B, interleaving).
> - Say why clicks alone mislead (position bias, clickbait, good abandonment) and propose dwell time or task success as better signals.
> - Slice by head and tail queries and by intent, and name guardrails like latency and revenue per search.
