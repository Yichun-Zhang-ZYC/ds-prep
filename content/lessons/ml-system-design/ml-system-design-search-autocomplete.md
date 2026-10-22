---
id: ml-system-design-search-autocomplete
title: "Design: Search autocomplete"
estimatedMinutes: 13
difficulty: medium
tags: [ml-system-design, autocomplete, search, ranking, latency]
---

## Why it matters
Autocomplete (query suggestion) looks simple but is a latency-critical, high-QPS system with a personalization, freshness and safety angle. It is a popular question because the first answer ("a trie") is only the start; strong candidates discuss ranking, metrics and update pipelines. It complements *Search ranking*, which scores full queries; here the input is a partial prefix.

## Concept
**Requirements.** Given a prefix typed so far, return ~5-10 suggestions in under ~50-100 ms end to end (the client sends a request nearly every keystroke), personalized when useful, fresh for trending topics, and free of offensive or sensitive suggestions.

**Candidate generation.**
- **Prefix index**: a trie, or a hash map from prefix to its precomputed top-$k$ completions (fast, memory-heavy but simple to serve and cache). Build it offline from query logs, keep only queries above a frequency threshold (also a privacy measure), and shard by prefix hash.
- **Fuzzy matching** for typos (edit-distance automata, n-gram index) and **semantic or generative completion** for rare prefixes: a small language model or seq2seq model conditioned on the prefix handles the long tail and unseen queries, with strict safety filtering.
- Context sources: the user's recent searches, the current page/category, location, and language.

**Ranking.** Start with popularity: $\text{score}=\log(\text{count}+1)$ over a time window. Then a learned ranker (GBDT/small NN) on features: prefix-query popularity, **recency-weighted trending score**, historical click-through for this (prefix, suggestion) pair, user affinity (past queries, purchases), locale, query length and match type. Exponentially decayed counts $\sum_i 0.5^{(t_{now}-t_i)/h}$ with half-life $h$ capture trends.

**Labels.** Log (prefix, suggestions shown, position, suggestion selected, final submitted query). Positives: selected suggestion (or the final query that typed prefixes lead to); negatives: shown but skipped. Position bias applies, as in any ranking system. For prefixes where the user ignored suggestions and typed the full query, the final query is still a positive label.

**Metrics.**
- Offline: **MRR@k** and hit rate of the final query among suggestions, per prefix length; **keystroke savings** $=1-\frac{\text{chars typed}}{\text{chars in final query}}$.
- Online: suggestion acceptance rate, keystrokes per search, time to submit, downstream search success (zero-result rate, clicks), and latency p99 as a guardrail. Beware that a better completion can reduce typing yet send users to worse queries, so check downstream outcomes.

**Serving architecture.** CDN/edge cache for short and popular prefixes (the first 1-3 characters have few distinct values and huge traffic), client-side debounce (~100 ms) and local caching of previous responses, prefix-sharded servers in memory, async personalization merge (blend global top-$k$ with a per-user list). Fall back to non-personalized results on timeout.

**Freshness pipeline.** Daily batch rebuild of the base index plus a streaming job (minutes) that updates trending counts for breaking news. Serve a blend and expire trends quickly.

**Safety and quality.** Blocklists plus a classifier for hate, adult, PII or defamation; remove suggestions that lead to low-quality or zero results; avoid leaking one user's private queries to others (aggregate thresholds, k-anonymity, differential privacy for the logs).

## Worked example
**Capacity.** 500M searches/day, about 4 autocomplete requests per search: $2\times10^9$ requests/day $/86{,}400\approx23{,}100$ QPS average; with a $3\times$ peak, about 70,000 QPS. Edge caching of the top short prefixes absorbs a large share of this.

**Metrics.** Three sessions with suggestion lists and final queries: target in position 2, target missing, target in position 1. $\text{MRR@5}=(\tfrac12+0+1)/3=0.5$. A user types "iph" (3 chars) and accepts "iphone 15" (9 chars): savings $=1-3/9=0.667$.

**Trending blend.** Query A had 1 hit just now; query B had 3 hits, all 20 minutes ago, half-life 10 minutes: A $=1$, B $=3\times0.25=0.75$. A ranks higher despite fewer total hits, because recent interest counts more.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why is a precomputed prefix -> top-k suggestions table preferred to ranking all completions at request time?",
  "options": [
    "It uses less memory than a trie",
    "Requests arrive on almost every keystroke at tens of thousands of QPS with a ~50-100 ms budget, so the heavy ranking is done offline and serving is a lookup",
    "It makes personalization unnecessary",
    "It improves the quality of the language model"
  ],
  "answer": 1,
  "explanation": "Latency and QPS force precomputation and caching. Personalization or a light re-ranker can still be applied to the small precomputed candidate list."
}
```

```quiz
{
  "id": "q2",
  "question": "Which metric best captures the user benefit of autocomplete, beyond whether the right suggestion appears?",
  "options": [
    "Number of suggestions returned",
    "Keystroke savings and time to submit, together with downstream search success",
    "Average query length",
    "Server CPU utilization"
  ],
  "answer": 1,
  "explanation": "Autocomplete should save effort without steering users to worse queries. Combine effort metrics with downstream outcomes such as zero-result rate and clicks."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `build_index(query_counts, k)`: given a dict `{query: count}`, return a dict mapping every non-empty prefix (including full queries) to the list of its top-`k` queries, ordered by count descending, ties broken alphabetically.",
  "starterCode": "def build_index(query_counts, k):\n    pass\n\nqc = {'apple': 5, 'app': 3, 'apply': 5, 'ape': 1}\nidx = build_index(qc, 2)\nprint(idx['ap'], idx['ape'])",
  "tests": "qc = {'apple': 5, 'app': 3, 'apply': 5, 'ape': 1}\nidx = build_index(qc, 2)\nassert idx['ap'] == ['apple', 'apply']\nassert idx['a'] == ['apple', 'apply']\nassert idx['app'] == ['apple', 'apply']\nassert idx['ape'] == ['ape']\nassert 'b' not in idx\nassert build_index(qc, 3)['app'] == ['apple', 'apply', 'app']",
  "solution": "def build_index(query_counts, k):\n    groups = {}\n    for q, c in query_counts.items():\n        for i in range(1, len(q) + 1):\n            groups.setdefault(q[:i], []).append((-c, q))\n    return {p: [q for _, q in sorted(v)[:k]] for p, v in groups.items()}",
  "hints": [
    "For each query, add it to every prefix bucket q[:1], q[:2], ..., q.",
    "Sort tuples (-count, query) to get count descending, then alphabetical."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Implement `mrr_at_k(cases, k)` where each case is `(suggestions, target)`: reciprocal rank (1-indexed) of the target within the first `k` suggestions, else 0, averaged over cases. Also implement `keystroke_saving(typed, target)` = 1 - len(typed)/len(target).",
  "starterCode": "def mrr_at_k(cases, k):\n    pass\n\ndef keystroke_saving(typed, target):\n    pass\n\ncases = [(['a', 'b', 'c'], 'b'), (['x', 'y'], 'z'), (['t'], 't')]\nprint(mrr_at_k(cases, 2), keystroke_saving('iph', 'iphone 15'))",
  "tests": "cases = [(['a', 'b', 'c'], 'b'), (['x', 'y'], 'z'), (['t'], 't')]\nassert abs(mrr_at_k(cases, 2) - 0.5) < 1e-9\nassert abs(mrr_at_k(cases, 1) - 1 / 3) < 1e-9\nassert mrr_at_k([], 3) == 0.0\nassert abs(keystroke_saving('iph', 'iphone 15') - (1 - 3 / 9)) < 1e-9",
  "solution": "def mrr_at_k(cases, k):\n    if not cases:\n        return 0.0\n    total = 0.0\n    for sugg, target in cases:\n        for i, s in enumerate(sugg[:k]):\n            if s == target:\n                total += 1 / (i + 1)\n                break\n    return total / len(cases)\n\ndef keystroke_saving(typed, target):\n    return 1 - len(typed) / len(target)",
  "hints": [
    "Only look at suggestions[:k].",
    "Return 0.0 for an empty case list to avoid dividing by zero."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Trending scores. Implement `decayed_score(timestamps, now, half_life)` = sum of `0.5 ** ((now - t) / half_life)`, and `top_trending(events, now, half_life, k)` where `events` maps query to a list of timestamps; return the top-`k` query names by decayed score descending (ties alphabetical).",
  "starterCode": "def decayed_score(timestamps, now, half_life):\n    pass\n\ndef top_trending(events, now, half_life, k):\n    pass\n\nprint(decayed_score([0, 10, 20], 20, 10))",
  "tests": "assert abs(decayed_score([0, 10, 20], 20, 10) - 1.75) < 1e-9\nev = {'a': [20], 'b': [0, 0, 0]}\nassert top_trending(ev, 20, 10, 2) == ['a', 'b']\nassert top_trending(ev, 20, 10, 1) == ['a']\nev2 = {'x': [0], 'y': [0]}\nassert top_trending(ev2, 5, 10, 2) == ['x', 'y']",
  "solution": "def decayed_score(timestamps, now, half_life):\n    return sum(0.5 ** ((now - t) / half_life) for t in timestamps)\n\ndef top_trending(events, now, half_life, k):\n    scored = [(-decayed_score(ts, now, half_life), q) for q, ts in events.items()]\n    scored.sort()\n    return [q for _, q in scored[:k]]",
  "hints": [
    "An event exactly one half-life old counts 0.5, two half-lives old counts 0.25.",
    "Sort on (-score, name) to break ties alphabetically."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Design search autocomplete for an e-commerce site.' Give a model answer.",
  "answer": "**Requirements** (illustrative): 500M searches/day, ~70k peak QPS of suggestion calls, p99 < 80 ms, 8 suggestions, personalization and trend freshness, safe content.\n\n**Candidates**: offline-built prefix -> top-50 table from 30 days of query logs (frequency threshold for privacy), sharded by prefix and held in memory; edge cache for prefixes of length 1-3; fuzzy matching for typos; user-history and category-aware candidates; a small generative model for rare prefixes behind safety filters.\n\n**Ranking**: light GBDT on popularity, decayed trend score, (prefix, query) CTR, user affinity, locale, match type; trained on logged (prefix, shown, selected, final query) with position-bias handling.\n\n**Freshness**: nightly rebuild plus a streaming job updating trend counts every few minutes.\n\n**Metrics**: MRR@k and keystroke savings offline; acceptance rate, keystrokes per search, time to submit, zero-result rate online, p99 latency guardrail; A/B test.\n\n**Safety/privacy**: blocklist plus classifier, k-anonymity thresholds, no private-query leakage.\n\n**Operations**: debounce and client caching, timeout fallback to the global list, monitor cache hit rate and suggestion diversity."
}
```

> [!TIP] Interview tips
> - Anchor on latency: the call fires per keystroke, so say "precomputed prefix table + edge cache + light re-ranker".
> - Discuss the freshness pipeline and decayed trending counts.
> - Use effort metrics (keystroke savings) plus downstream search success, not just click rate.
> - Mention safety and privacy of logged queries; interviewers like it.
