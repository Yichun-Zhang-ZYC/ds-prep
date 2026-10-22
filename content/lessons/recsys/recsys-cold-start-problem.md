---
id: recsys-cold-start-problem
title: "Cold start problem"
estimatedMinutes: 11
difficulty: medium
tags: [recsys, cold-start, exploration, bandits]
---

## Why it matters

Every recommender has users and items with no history. Interviewers use cold start to test whether you can combine content features, popularity priors and exploration, and reason about the exploration cost.

## Concept

Three flavors: **new user** (no history), **new item** (no interactions), and **new system** (no data at all). Collaborative filtering and ID embeddings have nothing to learn from in all three.

**New users**: ask for onboarding preferences, use context (country, device, referrer, time), fall back to **popular or trending** items by segment, then switch to personalization as events arrive (confidence-weighted blending). **New items**: use **content features** (text, image, category, creator) through a content tower or a model that predicts the embedding from metadata, plus attributes of the uploader. **New system**: import data, use editorial/popularity rules, and bootstrap with exploration.

**Exploration** is the principled tool: a new item needs impressions to learn its quality, but showing it costs reward. Multi-armed bandits trade this off. **$\varepsilon$-greedy** picks a random arm with probability $\varepsilon$ and otherwise the arm with the best estimated mean; **UCB** adds an optimism bonus $\sqrt{2\ln t / n_a}$; **Thompson sampling** samples from each arm's posterior. Contextual bandits (LinUCB) add features.

**Practical rules**: reserve a small traffic slice for exploration, cap impressions for unproven items, give new items a freshness boost, and log the exploration policy and propensities so you can run unbiased offline evaluation. Fixed $\varepsilon$ wastes traffic forever; decay it or use UCB/Thompson.

## Worked example

Three new items have true click rates $[0.2, 0.5, 0.8]$ unknown to us. A pure greedy policy can lock onto item 0 after a lucky first click and never learn that item 2 is better. With $\varepsilon = 0.1$ over 3,000 impressions, about 10% (300) are spent exploring, but the estimates for all arms converge and 80% or more of traffic ends up on item 2. The exploration cost, roughly $0.1 \cdot (0.8 - 0.5)$ clicks per impression on average, buys robustness.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which is the best way to recommend a new item with no interactions?",
  "options": [
    "Wait until it gets 1,000 clicks",
    "Score it from content features (metadata, text, image) and give it exploration traffic",
    "Recommend it to every user",
    "Use item-based CF"
  ],
  "answer": 1,
  "explanation": "Content features give an initial score, and bandit-style exploration collects the interactions needed to learn its true quality."
}
```

```quiz
{
  "id": "q2",
  "question": "What is the downside of a constant epsilon in epsilon-greedy?",
  "options": [
    "It never explores",
    "It keeps wasting a fixed fraction of traffic on random arms even after estimates are accurate",
    "It cannot handle more than two arms",
    "It requires a neural network"
  ],
  "answer": 1,
  "explanation": "The random-exploration regret grows linearly forever; decaying epsilon or UCB/Thompson sampling explore less as uncertainty shrinks."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `epsilon_greedy(probs, eps, steps, seed)` using `random.Random(seed)`. Each step: draw `rng.random()`; if it is `< eps` pick a uniformly random arm via `int(rng.random() * n_arms)`, else pick the arm with the highest estimated mean (lowest index on ties). Then draw a reward `1.0 if rng.random() < probs[arm] else 0.0` and update that arm's count and incremental mean. Return `(counts, estimates)`.",
  "setup": "",
  "packages": [],
  "starterCode": "import random\n\ndef epsilon_greedy(probs, eps, steps, seed):\n    pass\n\ncounts, est = epsilon_greedy([0.2, 0.5, 0.8], 0.1, 3000, 0)\nprint(counts, [round(e, 2) for e in est])",
  "tests": "probs = [0.2, 0.5, 0.8]\nfor seed in range(5):\n    counts, est = epsilon_greedy(probs, 0.1, 3000, seed)\n    assert sum(counts) == 3000\n    assert counts[2] > 0.7 * 3000, (seed, counts)\n    assert abs(est[2] - 0.8) < 0.1\ncounts, est = epsilon_greedy(probs, 1.0, 3000, 1)\nassert all(800 < c < 1200 for c in counts), counts\nassert epsilon_greedy(probs, 0.1, 500, 7) == epsilon_greedy(probs, 0.1, 500, 7)",
  "solution": "import random\n\ndef epsilon_greedy(probs, eps, steps, seed):\n    rng = random.Random(seed)\n    n = len(probs)\n    counts = [0] * n\n    est = [0.0] * n\n    for _ in range(steps):\n        if rng.random() < eps:\n            a = int(rng.random() * n)\n        else:\n            a = max(range(n), key=lambda i: est[i])\n        r = 1.0 if rng.random() < probs[a] else 0.0\n        counts[a] += 1\n        est[a] += (r - est[a]) / counts[a]\n    return counts, est",
  "hints": [
    "max(range(n), key=...) returns the first index among ties.",
    "Incremental mean: est += (r - est) / count."
  ]
}
```

> [!TIP] Interview tips
> - Split cold start into new user, new item and new system, with a different answer for each.
> - Always pair content features with exploration; mention bandits (epsilon-greedy, UCB, Thompson) and their cost.
> - Log exploration propensities so offline evaluation (inverse propensity scoring) stays unbiased.
