---
id: ml-system-design-video-recommendation
title: "Design: Video recommendation (YouTube-style)"
estimatedMinutes: 15
difficulty: hard
tags: [ml-system-design, recommendation, video, two-tower, watch-time]
---

## Why it matters
This is the video-specific follow-up to the generic feed question (see *Recommendation feed*). Interviewers push past "funnel plus two-tower" into the details that make video different: watch time instead of clicks, training retrieval models with sampled negatives, freshness for new uploads, and diversity.

## Concept
**Objective.** Clicks reward clickbait. Optimize **expected satisfied watch time**: predict $P(\text{click})$, expected watch time, like/share and negative signals (dislike, "not interested", early abandon), plus survey-based satisfaction, then combine them:
$\text{score}=\sum_k w_k\,\hat y_k$ with weights tuned online. Guardrails: long-term retention, creator diversity, policy-safe content.

**Candidate generation (millions to ~1,000s).** Several sources merged and deduplicated: two-tower retrieval, item-to-item co-watch, subscriptions, trending/fresh, and session-based (what was just watched).
- **Two-tower training**: user tower (watch history embeddings, demographics, context) and video tower (id, title/audio/visual embeddings, uploader). Train with a softmax over the positive and sampled negatives. **In-batch negatives** are cheap but sample popular items more often, which over-penalizes them. Fix with the **logQ correction**: subtract $\ln q_j$ (the item's sampling probability) from each logit, $s_{ij}\to s_{ij}-\ln q_j$ (Yi et al., 2019). Add some hard negatives (impressed but skipped).
- Item embeddings go in an ANN index (rebuild or incrementally update; new uploads must appear within minutes).

**Ranking (1,000 to ~100).** Multi-task deep model (shared-bottom or mixture-of-experts such as MMoE) with user, video, context and cross features. **Watch time modeling**: the classic approach (YouTube, 2016) is **weighted logistic regression**: positive impressions weighted by watch time $T_i$, negatives weight 1. The learned odds approximate $E[T](1+P)\approx E[T]$ when $P$ is small, so serving $e^{\text{logit}}$ gives expected watch time. Alternatives: duration-bucket classification, or normalizing by video length because long videos naturally accrue more watch time (a bias toward long content).

**Freshness and cold start.** Add an "example age" feature during training (set to 0 at serving) so the model does not simply favor old popular items. Reserve exploration slots for new uploads (bandits), use content embeddings and uploader history for new videos.

**Re-ranking.** MMR or determinantal diversity, caps per uploader/topic, de-dup of already watched, ads and policy filters.

**Pitfalls.** Position and presentation bias (thumbnail, rank) in impression logs; feedback loops that narrow taste; autoplay inflating watch time without satisfaction; training/serving skew in watch-history features; label delay for long videos (watch time not final until the session ends).

**Evaluation.** Offline: recall@K for retrieval, AUC/log-loss with calibration for ranking, on a time split. Online A/B: watch time per user, sessions, 7/28-day retention, survey satisfaction, plus negative-feedback rate and creator-diversity guardrails. Long-term effects need long-running holdouts.

## Worked example
**Weighted LR.** 1,000 impressions, 100 clicks with mean watch 300 s (total 30,000 s), 900 non-clicks weighted 1. Odds $=30{,}000/900=33.3$. True expected watch per impression $=30{,}000/1{,}000=30$ s, and $E[T](1+P)=30\times1.1=33$. The odds are a good estimate of expected watch time.

**logQ correction.** Item A has in-batch sampling probability $q=0.01$, item B $q=0.0001$. Corrections to logits: $-\ln 0.01=+4.605$ for A, $-\ln 0.0001=+9.210$ for B. The rarely sampled item gets its logit raised more, so the loss no longer punishes popular items just for being sampled frequently.

**Funnel budget** (illustrative): retrieval 1,500 candidates in 30 ms, ranker on 1,500 in 70 ms, re-rank to 30 in 10 ms.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why apply the logQ correction when training a two-tower model with in-batch negatives?",
  "options": [
    "To make the embeddings unit length",
    "In-batch negatives are sampled in proportion to item popularity, so popular items are over-penalized as negatives; subtracting log sampling probability corrects the bias",
    "To speed up the ANN index",
    "To remove position bias"
  ],
  "answer": 1,
  "explanation": "Negatives drawn from the batch follow the popularity distribution. The correction approximates a softmax over the full corpus, restoring unbiased scores."
}
```

```quiz
{
  "id": "q2",
  "question": "Optimizing predicted watch time alone tends to favor which content, and what is a mitigation?",
  "options": [
    "Short clips; fix by removing watch time",
    "Long videos and autoplay chains; fix by normalizing by duration, adding satisfaction and negative-feedback heads, and guardrailing on surveys and retention",
    "Old videos; fix by deleting them",
    "Only new uploads; fix by blocking them"
  ],
  "answer": 1,
  "explanation": "Watch time grows with length and autoplay, which does not imply satisfaction. Multi-objective scoring with survey and negative signals aligns the model with user value."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `watch_odds(events)` for weighted logistic regression: `events` is a list of `(clicked, watch_seconds)`. Return (sum of watch seconds over clicked impressions) divided by the number of non-clicked impressions. Return `float('inf')` if there are no non-clicks.",
  "starterCode": "def watch_odds(events):\n    pass\n\nev = [(1, 300)] * 100 + [(0, 0)] * 900\nprint(watch_odds(ev))",
  "tests": "ev = [(1, 300)] * 100 + [(0, 0)] * 900\nassert abs(watch_odds(ev) - 30000 / 900) < 1e-9\nassert watch_odds([(1, 10), (1, 20)]) == float('inf')\nassert abs(watch_odds([(1, 60), (0, 0), (0, 0)]) - 30.0) < 1e-9",
  "solution": "def watch_odds(events):\n    pos = sum(w for c, w in events if c)\n    neg = sum(1 for c, w in events if not c)\n    return pos / neg if neg else float('inf')",
  "hints": [
    "Positives contribute their watch seconds; negatives contribute weight 1 each.",
    "Handle the zero-negatives case before dividing."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Implement `inbatch_loss(scores, q)`: `scores[i][j]` is the logit between user $i$ and item $j$ in a batch (the positive is $j=i$), `q[j]` is item $j$'s sampling probability. Apply the logQ correction $s_{ij}-\\ln q_j$, then return the mean softmax cross-entropy over rows.",
  "starterCode": "import math\n\ndef inbatch_loss(scores, q):\n    pass\n\nprint(inbatch_loss([[2.0, 1.0], [0.5, 1.5]], [0.5, 0.5]))",
  "tests": "assert abs(inbatch_loss([[2.0, 1.0], [0.5, 1.5]], [0.5, 0.5]) - 0.31326168751822303) < 1e-9\nassert abs(inbatch_loss([[2.0, 1.0], [0.5, 1.5]], [0.8, 0.2]) - 0.496407859015924) < 1e-9\nassert abs(inbatch_loss([[0.0, 0.0], [0.0, 0.0]], [0.5, 0.5]) - math.log(2)) < 1e-9",
  "solution": "import math\n\ndef inbatch_loss(scores, q):\n    total = 0.0\n    for i, row in enumerate(scores):\n        z = [s - math.log(q[j]) for j, s in enumerate(row)]\n        m = max(z)\n        lse = m + math.log(sum(math.exp(x - m) for x in z))\n        total += lse - z[i]\n    return total / len(scores)",
  "hints": [
    "Cross-entropy for row i is logsumexp(z) - z[i].",
    "Subtract the max before exponentiating for numerical stability."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Implement MMR re-ranking: `mmr(rel, sim, lam, k)` greedily selects `k` item indices. At each step pick the unselected item maximizing `lam*rel[i] - (1-lam)*max(sim[i][j] for j in selected)` (the redundancy term is 0 when nothing is selected yet). Break ties by lowest index.",
  "starterCode": "def mmr(rel, sim, lam, k):\n    pass\n\nrel = [0.9, 0.85, 0.5]\nsim = [[1, 0.9, 0.1], [0.9, 1, 0.1], [0.1, 0.1, 1]]\nprint(mmr(rel, sim, 0.5, 3))",
  "tests": "rel = [0.9, 0.85, 0.5]\nsim = [[1, 0.9, 0.1], [0.9, 1, 0.1], [0.1, 0.1, 1]]\nassert mmr(rel, sim, 0.5, 3) == [0, 2, 1]\nassert mmr(rel, sim, 1.0, 3) == [0, 1, 2]\nassert mmr(rel, sim, 0.5, 1) == [0]",
  "solution": "def mmr(rel, sim, lam, k):\n    chosen = []\n    remaining = list(range(len(rel)))\n    while remaining and len(chosen) < k:\n        best, best_s = None, None\n        for i in remaining:\n            red = max((sim[i][j] for j in chosen), default=0.0)\n            s = lam * rel[i] - (1 - lam) * red\n            if best_s is None or s > best_s + 1e-12:\n                best, best_s = i, s\n        chosen.append(best)\n        remaining.remove(best)\n    return chosen",
  "hints": [
    "For the first pick, the redundancy term is 0, so MMR picks the most relevant item.",
    "At lam=0.5, item 1 scores 0.425-0.45=-0.025 while item 2 scores 0.25-0.05=0.2."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Design video recommendations for a YouTube-like home page.' Give a model answer.",
  "answer": "**Requirements** (illustrative): 500M DAU, ~10 impression slots per page, p99 < 300 ms, goal = long-term satisfied watch time (not clicks), guardrails on negative feedback and creator diversity.\n\n**Funnel**: retrieval (two-tower with logQ-corrected in-batch negatives plus co-watch, subscriptions, trending and fresh-upload sources) -> ~1,500 candidates -> multi-task ranker (click, watch time via weighted LR or duration-normalized regression, like, share, dislike/not-interested) combined by tuned weights -> re-rank with MMR, per-uploader caps, de-dup, ads, safety.\n\n**Data**: impressions logged with position and serve-time features; positives from watch fraction thresholds and satisfaction surveys; negatives from skipped impressions and explicit feedback; time-based split.\n\n**Freshness**: example-age feature (0 at serving), minute-level index updates for new uploads, exploration slots via bandits.\n\n**Evaluation**: offline recall@K, AUC/log-loss, calibration; A/B on watch time, retention, survey satisfaction with a long-running holdout.\n\n**Risks**: clickbait, filter bubbles, autoplay inflation, feedback loops, cold start for new creators."
}
```

> [!TIP] Interview tips
> - Say "satisfied watch time, not clicks" and describe how you combine multiple heads.
> - Mention the logQ correction for in-batch negatives; it separates strong candidates.
> - Cover freshness (example age, fast index updates) and exploration for new uploads.
> - Normalize or guard watch time against long-video and autoplay bias.
