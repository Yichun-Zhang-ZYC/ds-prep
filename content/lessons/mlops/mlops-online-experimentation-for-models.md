---
id: mlops-online-experimentation-for-models
title: "Online experimentation for models (interleaving, bandits, shadow metrics)"
estimatedMinutes: 13
difficulty: hard
tags: [mlops, experimentation, interleaving, bandits, shadow]
---

## Why it matters
Model changes are tested online differently from UI changes: effects are small, metrics are noisy, rankers have many variants, and a bad model hurts real users. Interviewers expect you to pick the right tool: A/B test, interleaving, bandit, or shadow evaluation, and to know what each can and cannot tell you. See the Experimentation section for A/B basics and the Shadow deployment and Canary releases lessons for rollout mechanics.

## Concept
**Staged evaluation ladder**: offline metrics $\to$ **shadow** mode (no user impact) $\to$ interleaving or small A/B $\to$ full A/B with guardrails $\to$ ramp and holdout.

**Shadow metrics** (computed without exposing users): the candidate scores live traffic in parallel; log agreement with production, score and rank-shift distributions, latency and error rate, and coverage. With logged propensities you can add a counterfactual (IPS / doubly robust) estimate of the metric. Shadow catches crashes, skew and latency, not user reaction. **Surrogate (proxy) metrics**: short-term metrics (clicks, early engagement) used to predict long-term outcomes (retention); validate the link historically and re-check, since proxies can be gamed.

**Interleaving** (ranking and recommendations): merge two rankers' lists into one shown list and credit clicks to the ranker that contributed the item.
- **Team-draft**: each round a coin flip picks which ranker drafts first; each takes its best unused item. Credit clicks by team; the ranker with more clicks wins the impression; then test the win rate (sign test or bootstrap).
- Paired within-user design, so it is typically 10x to 100x more sensitive than A/B on the same traffic. Downsides: only relative preference, no absolute business metrics, not for non-list outputs, and implementation complexity. Use it to **screen** many rankers, then A/B the winner.

**Bandits**: allocate traffic adaptively to reduce regret (traffic spent on losers). **Epsilon-greedy**, **UCB** (optimism: mean $+\sqrt{2\ln t / n}$) and **Thompson sampling** (sample from each arm's posterior, play the best sample); **contextual bandits** (LinUCB) personalize. Good for many arms and short feedback loops; bad for delayed or long-term outcomes, strong guardrails, or when unbiased effect estimates are needed (adaptive allocation biases naive estimates and non-stationarity breaks assumptions).

**Other designs**: **switchback** tests (alternate treatment by time block) for marketplaces with interference; geo or cluster randomization; holdout groups to measure cumulative long-term impact; sequential testing to allow peeking safely.

## Worked example
**Team-draft by hand**: rankers $A = [1,2,3,4]$, $B = [2,1,4,3]$. Round 1, coin says A first: A picks 1, B picks 2. Round 2, coin says B first: B picks 4 (2 and 1 are used), A picks 3. Shown list: 1(A), 2(B), 4(B), 3(A). If the user clicks positions 1 and 4 (items 1 and 3), A gets 2 credits, B 0: A wins the impression.

**Test (illustrative)**: 1,000 impressions, 300 with clicks; A wins 180, B wins 100, 20 ties. Among decided impressions: win rate $= 180/280 = 0.643$. Under the null (0.5), the standard error of the count is $\sqrt{280 \times 0.25} = 8.37$ and the expected count is 140, so $z = (180 - 140)/8.37 = 4.8$, strongly significant. A conventional A/B test on CTR would need far more traffic for the same confidence.

**Bandit regret**: two arms with true rates 0.10 and 0.12, 100k visitors. A 50/50 A/B test wastes half the traffic on the worse arm for the duration; a bandit shifts most traffic to the better arm within the first few thousand visitors, but you pay with weaker, biased inference on the effect size.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why can interleaving detect a ranking improvement with far fewer users than an A/B test?",
  "options": [
    "It uses a bigger sample",
    "Both rankers are shown to the same user in the same list, so between-user variance cancels and each impression is a paired comparison",
    "It ignores clicks",
    "It removes position bias completely"
  ],
  "answer": 1,
  "explanation": "Interleaving is a within-user paired design, so user-level noise cancels. Reported sensitivity gains are often 10x to 100x in sample size. It measures preference between rankers (a relative signal), not absolute business metrics."
}
```

```quiz
{
  "id": "q2",
  "question": "When is a multi-armed bandit a poor replacement for a fixed-horizon A/B test?",
  "options": [
    "When arms are cheap to compare",
    "When you need an unbiased effect estimate and a clean decision on guardrails or long-term metrics, or rewards are delayed",
    "When you have two variants",
    "When traffic is large"
  ],
  "answer": 1,
  "explanation": "Adaptive allocation shifts traffic toward early winners, biasing naive estimates and shrinking data on the loser. Bandits suit short-feedback, low-regret-tolerance problems (headlines, ranking blends); use A/B for causal estimates with delayed outcomes."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Team-draft interleaving. `a` and `b` are two rankings (lists of item ids). In each round, `flips[round]` (`'A'` or `'B'`) says which team picks first; then the other team picks. A team picks its highest-ranked item not already in the list. Write `team_draft(a, b, flips, k)` returning a list of `(item, team)` of length up to `k`, stopping when `k` is reached, `flips` run out, or a team has nothing left to pick.",
  "starterCode": "def team_draft(a, b, flips, k):\n    pass\n\nprint(team_draft([1, 2, 3, 4], [2, 1, 4, 3], ['A', 'B'], 4))",
  "tests": "r = team_draft([1, 2, 3, 4], [2, 1, 4, 3], ['A', 'B'], 4)\nassert r == [(1, 'A'), (2, 'B'), (4, 'B'), (3, 'A')]\nr = team_draft([1, 2, 3, 4], [2, 1, 4, 3], ['B', 'A'], 4)\nassert r == [(2, 'B'), (1, 'A'), (3, 'A'), (4, 'B')]\nassert team_draft([1, 2, 3], [1, 2, 3], ['A', 'A', 'A'], 2) == [(1, 'A'), (2, 'B')]\nassert len(team_draft([1, 2], [3, 4], ['A'] * 5, 10)) == 4",
  "solution": "def team_draft(a, b, flips, k):\n    rank = {'A': a, 'B': b}\n    out, used = [], set()\n    def pick(team):\n        for it in rank[team]:\n            if it not in used:\n                used.add(it)\n                out.append((it, team))\n                return True\n        return False\n    for f in flips:\n        order = ['A', 'B'] if f == 'A' else ['B', 'A']\n        for team in order:\n            if len(out) >= k:\n                return out\n            if not pick(team):\n                return out\n    return out",
  "hints": [
    "Keep a `used` set shared by both teams.",
    "In each round the first team picks, then the second; check the length limit before each pick."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Scoring an interleaving test. Each impression is `(teams, clicked_positions)`, where `teams[i]` is the team of the item shown at position `i`. A team gets one credit per clicked item it owns; the team with more credits wins that impression. Impressions with no clicks are ignored. Write `interleave_result(impressions)` returning `(a_wins, b_wins, ties)`.",
  "starterCode": "def interleave_result(impressions):\n    pass\n\nprint(interleave_result([(['A', 'B', 'B', 'A'], [0, 3]), (['A', 'B', 'B', 'A'], [1]), (['A', 'B', 'B', 'A'], [0, 1]), (['A', 'B'], [])]))",
  "tests": "T = ['A', 'B', 'B', 'A']\nassert interleave_result([(T, [0, 3]), (T, [1]), (T, [0, 1]), (T, [])]) == (1, 1, 1)\nassert interleave_result([(T, [])]) == (0, 0, 0)\nassert interleave_result([(T, [1, 2]), (T, [2, 3])]) == (0, 1, 1)",
  "solution": "def interleave_result(impressions):\n    a_w = b_w = ties = 0\n    for teams, clicks in impressions:\n        if not clicks:\n            continue\n        a = sum(1 for p in clicks if teams[p] == 'A')\n        b = len(clicks) - a\n        if a > b:\n            a_w += 1\n        elif b > a:\n            b_w += 1\n        else:\n            ties += 1\n    return a_w, b_w, ties",
  "hints": [
    "Count clicked positions owned by A; the rest belong to B.",
    "Skip impressions with an empty click list before counting."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Bandit arm selection. Write `ucb1_choose(counts, sums, t)`: if any arm has `counts[i] == 0` return the lowest such index; otherwise return the arm maximizing `sums[i]/counts[i] + sqrt(2 * ln(t) / counts[i])` (lowest index on ties).",
  "starterCode": "import math\n\ndef ucb1_choose(counts, sums, t):\n    pass\n\nprint(ucb1_choose([10, 10, 2], [5, 6, 1], 22))",
  "tests": "assert ucb1_choose([10, 10, 2], [5, 6, 1], 22) == 2\nassert ucb1_choose([0, 5], [0, 3], 5) == 0\nassert ucb1_choose([50, 50, 50], [25, 30, 20], 150) == 1\nassert ucb1_choose([100, 100], [50, 50], 200) == 0",
  "solution": "import math\n\ndef ucb1_choose(counts, sums, t):\n    for i, c in enumerate(counts):\n        if c == 0:\n            return i\n    best, best_i = None, None\n    for i, (c, s) in enumerate(zip(counts, sums)):\n        u = s / c + math.sqrt(2 * math.log(t) / c)\n        if best is None or u > best + 1e-12:\n            best, best_i = u, i\n    return best_i",
  "hints": [
    "Unplayed arms are tried first.",
    "The bonus shrinks as an arm is pulled more, which is how UCB explores less over time."
  ]
}
```

> [!TIP] Interview tips
> - Present the ladder: offline, shadow, interleaving/A-B, ramp; say which risk each stage retires.
> - Know why interleaving is sensitive (paired, within-user) and its limits (relative, list outputs only).
> - Choose bandits for fast feedback and regret minimization; choose A/B when you need unbiased estimates, delayed outcomes or guardrails.
