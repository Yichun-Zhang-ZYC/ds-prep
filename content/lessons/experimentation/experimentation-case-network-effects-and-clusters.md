---
id: experimentation-case-network-effects-and-clusters
title: "Case: Network effects and cluster randomization"
estimatedMinutes: 14
difficulty: hard
tags: [experimentation, network-effects, cluster-randomization, social-networks, case-study]
---

## Why it matters
Social, messaging and collaboration products are valuable because other people use them. Randomizing individual users breaks that: a treated user's new feature changes their friends' experience, and the friends may be in control. Interviewers expect you to quantify what user-level tests miss and what clustering costs.

## Concept
**Playbook** (theory in Network effects and interference and Cluster and switchback experiments):
1. **Define the estimand.** *Direct effect*: effect of treating me, holding friends fixed. *Spillover effect*: effect on me of my friends being treated. *Total (global) effect*: everyone treated vs nobody treated; this is what launching does, and it is the target.
2. **Why user-level tests fail.** At 50% assignment, treated and control users both have about 50% treated friends, so the difference only recovers the *direct* effect and misses spillover.
3. **Graph-cluster randomization.** Partition the graph into dense communities (Louvain, label propagation, balanced graph partitioning) and randomize clusters. Quality metrics: **leakage** (share of edges crossing clusters), cluster size balance, and the number of clusters. Balance leakage against power: fewer, larger clusters leak less but give fewer independent units.
4. **Power cost.** Variance inflation is about $1 + (m - 1)\rho$ for cluster size $m$ and intra-cluster correlation $\rho$. Reduce with stratified or matched-pair cluster assignment and CUPED-style covariates.
5. **Exposure mapping.** Record each user's *exposure*: fraction of neighbors treated (or "all/none/mixed"). Analyze outcomes by own treatment and exposure to estimate direct and spillover effects, accepting the model's assumptions.
6. **Two-stage (saturation) randomization.** Randomly give each cluster a treated share (e.g. 20% or 80%), then randomize users within it. Comparing *control* users in high vs low saturation clusters estimates spillover directly.
7. **Pitfalls**: clusters that are not communities (random clusters leak), tiny clusters that mean you have not solved interference, unequal sizes (use ratio estimators or weights), and analyzing as if users were independent (standard errors too small).

## Worked example
A messaging app tests group video calls (illustrative numbers). The graph has 2M users with about 100 friends each.

**User-level, 50/50**: a treated user has about 50 treated friends; so does a control user. The exposure contrast is about zero, so the test sees only the direct effect (+1.0% messages) and misses the network gains.

**Cluster design**: Louvain gives 2,000 communities of about 1,000 users, with **8%** of edges crossing clusters. Randomize 50/50. A treated user has $0.92 + 0.08 \times 0.5 = 96\%$ treated friends; a control user has $0.08 \times 0.5 = 4\%$. The exposure contrast is $92$ points, close to a launch.

**Cost**: with $\rho = 0.02$ and $m = 1000$, the design effect is $1 + 999 \times 0.02 = 20.98$, so the effective sample is $2{,}000{,}000 / 20.98 \approx 95{,}300$ users (about 2,000 independent units). The estimate is now +3.2% messages with a wide interval, a much larger and more honest estimate of the launch effect than +1.0%. Stratifying clusters on size and pre-period activity cuts variance further.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "In a 50/50 user-level test on a social network, why does the treated-minus-control difference typically miss spillover?",
  "options": [
    "Treated and control users have a similar share of treated friends, so the exposure contrast is near zero",
    "Spillover is always zero",
    "The sample is too small",
    "Control users are never connected to treated users"
  ],
  "answer": 0,
  "explanation": "Random assignment equalizes friends' treatment status across arms, so the difference isolates the direct effect and not what happens when the whole network adopts."
}
```

```quiz
{
  "id": "q2",
  "question": "You can use either 50 clusters with 2% leakage or 5,000 clusters with 25% leakage. What is the trade-off?",
  "options": [
    "The 50-cluster design reduces interference bias but has far less power; the 5,000-cluster design has more power but more residual interference",
    "Both are identical",
    "More clusters always reduce bias and increase power",
    "Leakage does not matter if clusters are randomized"
  ],
  "answer": 0,
  "explanation": "Few large clusters contain interference but give few independent units; many small clusters give more units but leak. Choose by the size of spillover and the MDE you need."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `leakage(edges, cluster_of)`: `edges` is a list of `(u, v)` pairs and `cluster_of` a dict user -> cluster. Return the fraction of edges whose endpoints are in different clusters (0.0 if there are no edges).",
  "starterCode": "def leakage(edges, cluster_of):\n    pass\n\nedges = [(1, 2), (2, 3), (3, 4), (1, 4)]\nprint(leakage(edges, {1: 'a', 2: 'a', 3: 'b', 4: 'b'}))",
  "tests": "edges = [(1, 2), (2, 3), (3, 4), (1, 4)]\nassert leakage(edges, {1: 'a', 2: 'a', 3: 'b', 4: 'b'}) == 0.5\nassert leakage(edges, {1: 'a', 2: 'a', 3: 'a', 4: 'a'}) == 0.0\nassert leakage([], {}) == 0.0",
  "solution": "def leakage(edges, cluster_of):\n    if not edges:\n        return 0.0\n    cut = sum(1 for u, v in edges if cluster_of[u] != cluster_of[v])\n    return cut / len(edges)",
  "hints": [
    "Edges (2, 3) and (1, 4) cross clusters a and b.",
    "Guard against dividing by zero when there are no edges."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `exposure_fraction(user, adj, treated)` returning the fraction of `user`'s neighbors (from the adjacency dict `adj`) that are in the set `treated` (0.0 if no neighbors). Then write `exposure_summary(users, adj, treated)` returning a dict with the mean exposure of treated users and of control users, keys `'treated'` and `'control'`.",
  "starterCode": "def exposure_fraction(user, adj, treated):\n    pass\n\ndef exposure_summary(users, adj, treated):\n    pass\n\nadj = {1: [2, 3], 2: [1], 3: [1, 4], 4: [3]}\nprint(exposure_fraction(1, adj, {2, 4}))",
  "tests": "adj = {1: [2, 3], 2: [1], 3: [1, 4], 4: [3]}\nassert exposure_fraction(1, adj, {2, 4}) == 0.5\nassert exposure_fraction(3, adj, {2, 4}) == 0.5\nassert exposure_fraction(5, adj, {2}) == 0.0\ns = exposure_summary([1, 2, 3, 4], adj, {2, 4})\nassert abs(s['treated'] - 0.0) < 1e-12 and abs(s['control'] - 0.5) < 1e-12\ns = exposure_summary([1, 2, 3, 4], adj, {1, 2})\nassert abs(s['treated'] - 0.75) < 1e-12 and abs(s['control'] - 0.25) < 1e-12",
  "solution": "def exposure_fraction(user, adj, treated):\n    nbrs = adj.get(user, [])\n    if not nbrs:\n        return 0.0\n    return sum(1 for n in nbrs if n in treated) / len(nbrs)\n\ndef exposure_summary(users, adj, treated):\n    t = [exposure_fraction(u, adj, treated) for u in users if u in treated]\n    c = [exposure_fraction(u, adj, treated) for u in users if u not in treated]\n    return {'treated': sum(t) / len(t) if t else 0.0, 'control': sum(c) / len(c) if c else 0.0}",
  "hints": [
    "Treated users 2 and 4 have neighbors 1 and 3, who are both untreated: exposure 0.",
    "Compute exposure for every user, then average within each arm."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Write `direct_and_spillover(records)` for a two-stage design. `records` is a list of `(saturation, treated, y)` with saturation `'low'` or `'high'` and treated 0/1. Return `(direct, spillover)`: direct = mean y of treated minus mean y of control within low-saturation clusters; spillover = mean y of control users in high-saturation clusters minus control users in low-saturation clusters.",
  "starterCode": "def direct_and_spillover(records):\n    pass\n\nrecs = [('low', 1, 12), ('low', 1, 10), ('low', 0, 8), ('low', 0, 6), ('high', 1, 15), ('high', 0, 9), ('high', 0, 11)]\nprint(direct_and_spillover(recs))",
  "tests": "recs = [('low', 1, 12), ('low', 1, 10), ('low', 0, 8), ('low', 0, 6), ('high', 1, 15), ('high', 0, 9), ('high', 0, 11)]\nd, s = direct_and_spillover(recs)\nassert abs(d - 4) < 1e-12 and abs(s - 3) < 1e-12\nrecs2 = [('low', 1, 5), ('low', 0, 5), ('high', 0, 5)]\nd, s = direct_and_spillover(recs2)\nassert d == 0 and s == 0",
  "solution": "def direct_and_spillover(records):\n    def mean(xs):\n        return sum(xs) / len(xs)\n    low_t = [y for s, t, y in records if s == 'low' and t == 1]\n    low_c = [y for s, t, y in records if s == 'low' and t == 0]\n    high_c = [y for s, t, y in records if s == 'high' and t == 0]\n    return mean(low_t) - mean(low_c), mean(high_c) - mean(low_c)",
  "hints": [
    "Direct effect: treated(low) 11 vs control(low) 7.",
    "Spillover compares only control users, in high (10) vs low (7) saturation clusters."
  ]
}
```

```reveal
{
  "prompt": "Interview: \"We are launching a new group-chat feature. A user-level A/B test shows +1% messages sent. The PM says that is the launch impact. Do you agree?\"",
  "answer": "**No: that is likely the direct effect only.** Group chats are valuable when your friends also use them, and in a 50/50 test treated and control users have similar shares of treated friends, so network gains are missed. The launch effect could be much larger.\n\n**Estimate the total effect**: run a graph-cluster randomized test. Build communities (e.g. Louvain), check leakage (target under 10-15%) and size balance, stratify by cluster size and pre-period activity, and randomize clusters. Analyze at the cluster level (or with cluster-robust SEs) and report the effective sample size.\n\n**Decompose**: add a two-stage saturation design (clusters at 20% vs 80% treated) to separate direct and spillover effects.\n\n**Check**: balance on pre-period metrics, leakage sensitivity (re-run with a coarser partition), and guardrails such as notification volume and message quality.\n\n**Communicate**: +1% is a lower bound for the direct effect; the cluster-level estimate is the launch forecast, with a wider interval."
}
```

> [!TIP] Interview tips
> - Define direct, spillover and total effect, then say which one a launch decision needs.
> - Quantify clustering: leakage on one side, design effect and effective sample size on the other.
> - Mention two-stage saturation designs and exposure mapping to show you can measure spillover, not only avoid it.
