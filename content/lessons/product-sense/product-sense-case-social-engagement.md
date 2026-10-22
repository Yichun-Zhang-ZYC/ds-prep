---
id: product-sense-case-social-engagement
title: "Case: Social engagement and feed metrics"
estimatedMinutes: 12
difficulty: medium
tags: [case-study, social, engagement, feed, guardrails]
---

## Why it matters
Meta, TikTok, X, LinkedIn and Reddit interviews love "how would you measure the success of the feed / a new reactions feature / Stories?" Engagement is easy to inflate and hard to interpret, so the test is whether you can separate healthy usage from compulsive or harmful usage. Compare with North star metric and Counter and guardrail metrics.

## Concept
**Layered metrics for a social product**:
- **Reach and habit**: DAU, MAU, **stickiness** = DAU / MAU, and the **L7 / L28 distribution** (how many of the last 7 or 28 days each user is active). The shape of the distribution matters more than the mean: a shift from L1 to L5 users is real habit formation.
- **Depth**: time spent, sessions per user, feed items viewed. Easy to move, and ambiguous (confused users also spend time).
- **Interaction quality**: **meaningful interactions** such as comments, replies, shares to friends and messages sent, which are valued more than passive likes or scrolls.
- **Supply side (creators)**: posters per DAU, posts per poster, creator retention, and whether creators get enough feedback to keep posting. A feed with no new content dies.
- **Network health**: connections formed, reciprocal interactions, share of content from people you know vs recommended.

**Negative signals and guardrails**: hides, "not interested", unfollows, reports, blocks, quick bounces after notifications, user-reported satisfaction surveys ("was this worth your time?"), content-policy violation prevalence, and well-being measures for teens.

**Pitfalls**:
- Optimising raw time spent rewards outrage and clickbait, as ranking on **predicted engagement** pushes content users click but regret.
- Likes per post can rise from more impressions, not better content. Normalise per impression or per DAU.
- Novelty effect: new features spike then decay. Run long enough and look at the retained effect.
- Network effects and interference: if treated users post more, control users see more content. Use cluster-randomised tests and measure the ecosystem.

**Shipping rule**: a ranking or feature change ships if the primary metric improves with no guardrail regressing beyond its tolerance, and the long-term holdout confirms it.

## Worked example
A social app (40M DAU, 100M MAU; illustrative) tests a new feed ranking that boosts predicted engagement. Results vs control after two weeks:

| Metric | Change |
|---|---|
| Time spent per DAU | +3.0% |
| Meaningful interactions per DAU (comments, shares, messages) | −1.0% |
| Hides + reports per 1,000 impressions | +8% (0.50 → 0.54) |
| Posts created per DAU | −2% |
| Day-14 retention | +0.1% (not significant) |

- Baseline stickiness = 40M / 100M = **40%**.
- Time spent rose, but all signals of value and health moved the wrong way: fewer meaningful interactions, more negative feedback, and fewer new posts, which starves the feed in the long run.
- The retention gain is flat, so the time-spent lift looks like consumption of passive, lower-quality content.

**Decision**: do not ship as is. Re-tune the ranking objective to weight meaningful interactions and negative feedback (for example, value = comments × 4 + shares × 6 − hides × 10 − reports × 30 per impression; weights are illustrative and should be fitted to long-term retention). Re-test with a longer window and a long-term holdout, and add creator-side guardrails so that creators keep receiving feedback.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A feed ranking change raises time spent by 3% but also raises hides and reports by 8% with flat retention. What is the best reading?",
  "options": [
    "Ship: time spent is the north star",
    "Do not ship yet: engagement was bought at the cost of quality signals, with no retention benefit",
    "Ship: hides are not important",
    "Run it for one more day"
  ],
  "answer": 1,
  "explanation": "A guardrail regressed and the long-term proxy (retention) did not move. Time spent alone is a poor proxy for user value."
}
```

```quiz
{
  "id": "q2",
  "question": "Which statement about DAU/MAU stickiness is correct?",
  "options": [
    "It is a causal measure of feed quality",
    "The same ratio can come from many different L28 distributions, so inspect the distribution",
    "A ratio of 100% is the goal for every product",
    "It is independent of the definition of an active user"
  ],
  "answer": 1,
  "explanation": "Stickiness of 40% could be many casual users or a few daily ones. The L-N histogram shows where change happens, and the ratio depends on the definition of an 'active' user."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `l_n_histogram(activity, n)`. `activity` is `{user: set_of_active_days}` where days are integers. Return a dict `{k: number_of_users_with_exactly_k_active_days}` for every k from 1 to n (include 0 counts). Then implement `stickiness(dau, mau)` = dau / mau.",
  "starterCode": "def l_n_histogram(activity, n):\n    pass\n\ndef stickiness(dau, mau):\n    pass\n\nact = {'u1': {0, 1, 2}, 'u2': {3}, 'u3': {0, 6}, 'u4': {1}}\nprint(l_n_histogram(act, 7), stickiness(40, 100))",
  "tests": "act = {'u1': {0, 1, 2}, 'u2': {3}, 'u3': {0, 6}, 'u4': {1}}\nh = l_n_histogram(act, 7)\nassert h == {1: 2, 2: 1, 3: 1, 4: 0, 5: 0, 6: 0, 7: 0}\nassert l_n_histogram({}, 3) == {1: 0, 2: 0, 3: 0}\nassert abs(stickiness(40, 100) - 0.4) < 1e-12",
  "solution": "def l_n_histogram(activity, n):\n    h = {k: 0 for k in range(1, n + 1)}\n    for days in activity.values():\n        k = len(days)\n        if k in h:\n            h[k] += 1\n    return h\n\ndef stickiness(dau, mau):\n    return dau / mau",
  "hints": [
    "Initialise every k from 1 to n with 0 so missing buckets still appear.",
    "`len(days)` is the number of distinct active days."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Implement `feed_quality(rows, w=None)`. Each row is `(impressions, likes, comments, shares, hides, reports)`. Sum across rows and return `{'engagement_rate': (likes + comments + shares) / impressions, 'negative_rate': (hides + reports) / impressions, 'value_per_impression': (1*likes + 4*comments + 6*shares - 10*hides - 30*reports) / impressions}`.",
  "starterCode": "def feed_quality(rows, w=None):\n    pass\n\nrows = [(1000, 50, 10, 5, 4, 1), (1000, 30, 6, 3, 2, 1)]\nprint(feed_quality(rows))",
  "tests": "rows = [(1000, 50, 10, 5, 4, 1), (1000, 30, 6, 3, 2, 1)]\nr = feed_quality(rows)\nassert abs(r['engagement_rate'] - 104 / 2000) < 1e-12\nassert abs(r['negative_rate'] - 8 / 2000) < 1e-12\nval = (80 + 4 * 16 + 6 * 8 - 10 * 6 - 30 * 2) / 2000\nassert abs(r['value_per_impression'] - val) < 1e-12",
  "solution": "def feed_quality(rows, w=None):\n    imp = sum(r[0] for r in rows)\n    likes = sum(r[1] for r in rows)\n    comments = sum(r[2] for r in rows)\n    shares = sum(r[3] for r in rows)\n    hides = sum(r[4] for r in rows)\n    reports = sum(r[5] for r in rows)\n    return {\n        'engagement_rate': (likes + comments + shares) / imp,\n        'negative_rate': (hides + reports) / imp,\n        'value_per_impression': (likes + 4 * comments + 6 * shares - 10 * hides - 30 * reports) / imp,\n    }",
  "hints": [
    "Aggregate counts first, then divide; do not average per-row rates.",
    "The weights are illustrative; the point is that negative actions carry large penalties."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Implement `ship_decision(primary_delta, guardrails)`. `primary_delta` is the relative change in the primary metric. `guardrails` is `{name: (delta, tolerance, higher_is_better)}`. A guardrail fails if `higher_is_better` and `delta < -tolerance`, or if not `higher_is_better` and `delta > tolerance`. Return `('ship', [])` if primary_delta > 0 and nothing fails, otherwise `('hold', sorted_failed_names)` (the list is empty if only the primary is not positive).",
  "starterCode": "def ship_decision(primary_delta, guardrails):\n    pass\n\ng = {'meaningful_interactions': (-0.01, 0.005, True), 'hides_reports': (0.08, 0.02, False)}\nprint(ship_decision(0.03, g))",
  "tests": "g = {'meaningful_interactions': (-0.01, 0.005, True), 'hides_reports': (0.08, 0.02, False)}\nassert ship_decision(0.03, g) == ('hold', ['hides_reports', 'meaningful_interactions'])\ng2 = {'meaningful_interactions': (-0.004, 0.005, True), 'hides_reports': (0.01, 0.02, False)}\nassert ship_decision(0.03, g2) == ('ship', [])\nassert ship_decision(0.0, g2) == ('hold', [])\nassert ship_decision(-0.01, {}) == ('hold', [])\nassert ship_decision(0.01, {}) == ('ship', [])",
  "solution": "def ship_decision(primary_delta, guardrails):\n    failed = []\n    for name, (delta, tol, hib) in guardrails.items():\n        if (hib and delta < -tol) or (not hib and delta > tol):\n            failed.append(name)\n    failed.sort()\n    if primary_delta > 0 and not failed:\n        return 'ship', []\n    return 'hold', failed",
  "hints": [
    "A guardrail only fails when it moves in the bad direction beyond tolerance.",
    "Sort the failed names so the output is deterministic."
  ]
}
```

> [!TIP] Interview tips
> - Structure the answer as reach, depth, interaction quality, creator supply and negative signals; then pick a primary metric and name guardrails.
> - Explain why raw time spent is risky and propose meaningful interactions or survey-based value as better proxies.
> - Mention interference and novelty effects: use cluster tests and a long-term holdout before declaring a win.
