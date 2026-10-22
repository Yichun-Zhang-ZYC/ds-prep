---
id: experimentation-case-ranking-algorithm-change
title: "Case: Testing a ranking or recommendation change"
estimatedMinutes: 14
difficulty: hard
tags: [experimentation, ranking, recommendations, interleaving, case-study]
---

## Why it matters
Search, feed and recommendation teams ship model changes constantly. Offline metrics rarely match online results, clicks can be gamed, and a change may only look good because of position bias. Interviewers want a funnel: offline, interleaving, A/B, then long-term checks.

## Concept
**Playbook**:
1. **Offline gate.** Replay logs and compute NDCG/recall/MAP on labeled or logged data. Offline is a cheap filter, not proof: logged data is biased by the *old* ranker (position and selection bias), so use it to discard bad candidates only.
2. **Interleaving for sensitivity.** Merge the two rankings into one list per query (e.g. **team-draft**: alternate picks, coin flip decides who goes first each round). Each click is credited to the team that contributed the item. A sign test over queries says which ranker users prefer. It usually needs **far fewer samples** than a split A/B, but it measures preference direction, not magnitude, and does not capture whole-page effects.
3. **A/B test for the real decision.** Randomize users (not queries) so a user sees one ranker consistently. Randomize at the user level also for personalization with per-user memory.
4. **Metrics**: clicks alone reward clickbait and position effects. Use a hierarchy: success per session (long click or dwell, add-to-cart, purchase), satisfaction/return rate, then diversity, coverage, creator/seller exposure, latency. Guardrails: abandonment, zero-result rate, complaint/dislike rate, p95 latency, ad revenue if relevant.
5. **Pitfalls**
   - *Position bias*: a better item in slot 1 gets more clicks regardless of quality; interleaving and counterfactual (inverse-propensity) metrics help.
   - *Feedback loops*: tomorrow's training data comes from today's ranker; a short test may not show long-term effects (see Long-term effects and holdouts).
   - *Novelty/exploration*: new rankings may spike clicks then fade.
   - *Interference*: shared inventory, creator-side effects, or a common candidate cache.

## Worked example
A marketplace tests ranker B against A (illustrative numbers). Offline NDCG@10 is +1.5% for B, so B passes the gate.

**Interleaving**: 10,000 interleaved queries with at least one click: B wins 2,900, A wins 2,500, 4,600 are ties. Excluding ties, B's win rate is $2900/5400 = 53.7\%$. Under the null, wins ~ Binomial(5400, 0.5): $z = (2900 - 2700)/\sqrt{5400 \times 0.25} = 200/36.7 = 5.4$. Strong preference for B at a small sample.

**A/B test** (the real decision, 2 weeks, 1M users per arm): clicks per session +2.0%, but purchases per session +0.4% (CI $-0.3\%$ to $+1.1\%$) and p95 latency +40 ms. Reading: B surfaces more clickable items without a clear purchase gain, and the latency cost may hurt. Decision: not a launch; iterate on latency and re-test with purchase as the primary metric. Add a 2% holdout after any later launch to watch for decay.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why can offline NDCG on logged data mislead when comparing a new ranker to the current one?",
  "options": [
    "NDCG cannot be computed on logs",
    "Logged clicks reflect what the old ranker chose to show (position and selection bias), so unshown good items look irrelevant",
    "NDCG ignores ranking order",
    "Logs contain too many users"
  ],
  "answer": 1,
  "explanation": "Items the old ranker never surfaced have no feedback, so offline metrics favor rankers similar to the incumbent. Use offline as a filter, then validate online."
}
```

```quiz
{
  "id": "q2",
  "question": "Team-draft interleaving is preferred to a split A/B test mainly because:",
  "options": [
    "It measures long-term retention",
    "Each user compares both rankers on the same query, which removes between-user variance and needs far fewer samples",
    "It gives the exact revenue effect",
    "It avoids all position bias"
  ],
  "answer": 1,
  "explanation": "It is a paired within-query comparison, hence very sensitive. It tells you the preference direction, not the size of business impact, so you still need an A/B test for the final decision."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `ndcg_at_k(rels, k)`: `rels` are graded relevances in ranked order. DCG = sum over the first k items of rel_i / log2(i + 2) for 0-based i; NDCG = DCG / DCG of the ideal (descending) order. Return 0.0 if the ideal DCG is 0.",
  "starterCode": "import math\n\ndef ndcg_at_k(rels, k):\n    pass\n\nprint(ndcg_at_k([3, 2, 0, 1], 4))",
  "tests": "import math\nd = 3 + 2 / math.log2(3) + 0 + 1 / math.log2(5)\nideal = 3 + 2 / math.log2(3) + 1 / math.log2(4)\nassert abs(ndcg_at_k([3, 2, 0, 1], 4) - d / ideal) < 1e-12\nassert abs(ndcg_at_k([3, 2, 1, 0], 4) - 1) < 1e-12\nassert ndcg_at_k([0, 0, 0], 3) == 0.0\nassert abs(ndcg_at_k([0, 3, 1], 1) - 0.0) < 1e-12",
  "solution": "import math\n\ndef _dcg(rels, k):\n    return sum(r / math.log2(i + 2) for i, r in enumerate(rels[:k]))\n\ndef ndcg_at_k(rels, k):\n    ideal = _dcg(sorted(rels, reverse=True), k)\n    if ideal == 0:\n        return 0.0\n    return _dcg(rels, k) / ideal",
  "hints": [
    "The ideal ranking sorts the same relevances in descending order.",
    "Slice to the first k items in both DCGs."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Implement team-draft interleaving. `team_draft(a, b, k, coins)`: in each round the team in `coins[r % len(coins)]` ('A' or 'B') picks first, the other second; a team picks its highest-ranked item not already in the list. Stop at k items or when no team can add an item. Return a list of `(item, team)`. Then write `credit(merged, clicked)` returning `(a_clicks, b_clicks)`: clicks on items in `clicked`, credited to the team that contributed each item.",
  "starterCode": "def team_draft(a, b, k, coins):\n    pass\n\ndef credit(merged, clicked):\n    pass\n\nm = team_draft([1, 2, 3], [2, 1, 4], 4, ['A', 'B'])\nprint(m, credit(m, {4, 3}))",
  "tests": "m = team_draft([1, 2, 3], [2, 1, 4], 4, ['A', 'B'])\nassert m == [(1, 'A'), (2, 'B'), (4, 'B'), (3, 'A')]\nassert credit(m, {4, 3, 9}) == (1, 1)\nassert credit(m, {1}) == (1, 0)\nm2 = team_draft([1], [1], 5, ['B'])\nassert m2 == [(1, 'B')]\nassert credit(m2, set()) == (0, 0)",
  "solution": "def team_draft(a, b, k, coins):\n    out, used, r = [], set(), 0\n    while len(out) < k:\n        order = ['A', 'B'] if coins[r % len(coins)] == 'A' else ['B', 'A']\n        r += 1\n        progressed = False\n        for team in order:\n            if len(out) >= k:\n                break\n            for item in (a if team == 'A' else b):\n                if item not in used:\n                    used.add(item)\n                    out.append((item, team))\n                    progressed = True\n                    break\n        if not progressed:\n            break\n    return out\n\ndef credit(merged, clicked):\n    a = sum(1 for item, t in merged if t == 'A' and item in clicked)\n    b = sum(1 for item, t in merged if t == 'B' and item in clicked)\n    return a, b",
  "hints": [
    "Round 0 with coin 'A': A picks 1, then B picks 2. Round 1 with coin 'B': B picks 4 (1 and 2 are used), A picks 3.",
    "Guard against an infinite loop: stop if a whole round adds nothing."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Write `interleave_sign_test(wins_a, wins_b)` returning the z-statistic $(w_B - n/2)/\\sqrt{n/4}$ where n = wins_a + wins_b (ties excluded), and `preference(wins_a, wins_b)` returning `'B'` if z > 1.96, `'A'` if z < -1.96, else `'none'`. Return 0.0 z when n == 0.",
  "starterCode": "import math\n\ndef interleave_sign_test(wins_a, wins_b):\n    pass\n\ndef preference(wins_a, wins_b):\n    pass\n\nprint(interleave_sign_test(2500, 2900), preference(2500, 2900))",
  "tests": "import math\nassert abs(interleave_sign_test(2500, 2900) - 200 / math.sqrt(1350)) < 1e-9\nassert preference(2500, 2900) == 'B'\nassert preference(2900, 2500) == 'A'\nassert preference(50, 55) == 'none'\nassert interleave_sign_test(0, 0) == 0.0",
  "solution": "import math\n\ndef interleave_sign_test(wins_a, wins_b):\n    n = wins_a + wins_b\n    if n == 0:\n        return 0.0\n    return (wins_b - n / 2) / math.sqrt(n / 4)\n\ndef preference(wins_a, wins_b):\n    z = interleave_sign_test(wins_a, wins_b)\n    if z > 1.96:\n        return 'B'\n    if z < -1.96:\n        return 'A'\n    return 'none'",
  "hints": [
    "Under the null, B wins with probability 0.5 among non-tied queries, so mean n/2 and variance n/4.",
    "2900 - 2700 = 200 and sqrt(1350) is about 36.7."
  ]
}
```

```reveal
{
  "prompt": "Interview: \"Our new feed ranking increases time spent by 5% in an A/B test. Should we launch?\"",
  "answer": "**Not yet.** Time spent is a proxy, and rankers can raise it through addictive or low-quality content.\n\n**Check the mechanism**: break down time by content type, creator, and session; look at the distribution (are a few heavy users driving it?). Confirm no sample ratio mismatch.\n\n**Check quality**: satisfaction surveys or \"not interested\"/hide rates, next-day and 28-day return rate, share of content from new creators (diversity), reports/complaints.\n\n**Check guardrails**: latency, crash rate, ad revenue, creator-side metrics (does exposure concentrate on a few creators?).\n\n**Check durability**: run at least 2 weeks and look at the lift by exposure day for novelty; keep a long-term holdout after launch.\n\n**Decision**: launch if time spent rises with neutral-or-better quality and retention; otherwise tune the objective toward satisfaction (e.g. optimize for predicted value rather than raw watch time)."
}
```

> [!TIP] Interview tips
> - Describe the funnel: offline gate, interleaving for sensitivity, A/B for the decision, long-term holdout.
> - Never accept clicks or time spent alone; ask for downstream success and satisfaction metrics.
> - Name position bias and the feedback loop between the ranker and its training data.
