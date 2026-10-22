---
id: ml-system-design-ad-click-prediction
title: Ad click prediction (CTR)
estimatedMinutes: 14
difficulty: hard
tags: [ml-system-design, ads, ctr, calibration]
---

## Why it matters
Ad click prediction is the classic revenue-critical ML system: billions of predictions a day over sparse, high-cardinality features, with probabilities (not just rankings) feeding an auction. Interviewers probe features, calibration, and online learning.

## Concept
**Problem**: for each ad request, predict $\text{pCTR}=P(\text{click}\mid\text{user, ad, context})$ (and often pCVR) for hundreds to thousands of candidate ads, then rank by **expected value per impression**. For cost-per-click ads: $\text{eCPM}=1000\times\text{pCTR}\times\text{bid}$. Latency budget for scoring is a few tens of ms.

**Why calibration matters**: eCPM multiplies the prediction by a bid, so a biased pCTR directly misprices the auction and misallocates budget. Measure **log loss**, **calibration (predicted vs observed CTR per slice)** and AUC; ranking alone is not enough. Common pitfalls: negative downsampling (re-calibrate), exploration traffic, and feedback loops.

**Features**: user (demographics, history, interests), ad (creative, advertiser, category), context (page, device, time, position), and **crosses** (user x category, ad x placement). Categorical IDs have millions of values, so use **embeddings** or **feature hashing** ($\text{bucket}=h(\text{field=value}) \bmod m$, which bounds memory and handles unseen values at the cost of collisions). Add **historical CTR** features with smoothing and leakage-safe windows, and **position** as a training feature (set to a fixed value at serving).

**Model family**: logistic regression with crosses (FTRL-Proximal online learning, sparse and fast) -> GBDT features into LR -> **factorization machines / DeepFM / Wide & Deep / DCN** that learn feature interactions -> large embedding-based deep models. Embedding tables dominate size, so shard them across parameter servers or use hash/compositional embeddings.

**Training and serving**: logs join impressions with clicks after an **attribution window** (click arrives seconds to minutes later; conversions days later): delayed feedback means recent positives are missing, so use waiting windows or delay-aware losses. Train continuously (hourly incremental updates) because ads and users churn fast; use time-based validation. **Cold start**: new ads/advertisers fall back to category-level priors plus an **exploration** budget (bandits such as Thompson sampling) so they can accumulate data.

**Metrics**: offline AUC, log loss, **Normalized Entropy** $\text{NE}=\text{logloss}/H(\bar p)$, where $H(\bar p)=-\bar p\ln\bar p-(1-\bar p)\ln(1-\bar p)$ and $\bar p$ is the background CTR (lower is better; <1 beats the constant predictor). Online: revenue per mille, CTR, advertiser ROI/conversion, and user-experience guardrails (ad load, complaints, retention).

## Worked example
Three ads for one request, bids are cost-per-click:

| Ad | pCTR | bid | eCPM = 1000 x pCTR x bid |
|---|---|---|---|
| A | 0.02 | \$1.50 | \$30 |
| B | 0.05 | \$0.50 | \$25 |
| C | 0.01 | \$4.00 | \$40 |

Ranking: C, A, B. The highest CTR (B) loses. Under a generalized second-price auction, the winner C pays just enough to beat A's eCPM: $\text{CPC}=\frac{30}{1000\times0.01}=\$3.00$ per click, below its \$4.00 bid.

Normalized entropy: with background CTR 2%, $H=0.0980$; a model with log loss 0.085 has $\text{NE}=0.085/0.0980\approx0.867$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You downsample non-clicks 10x to speed up CTR training. What must you do before using pCTR in an auction?",
  "options": [
    "Nothing; the ranking is unchanged so the auction is fine",
    "Re-calibrate the probabilities (prior correction or calibration on unsampled data), because the auction multiplies pCTR by bids",
    "Increase the learning rate",
    "Drop the bid term"
  ],
  "answer": 1,
  "explanation": "Downsampling inflates predicted probabilities. Ranking among ads may be fine, but pricing and cross-ad comparisons with bids need calibrated pCTR."
}
```

```quiz
{
  "id": "q2",
  "question": "Why use feature hashing for ad and user IDs?",
  "options": [
    "It makes the model more accurate",
    "It bounds the feature space and handles unseen IDs without a vocabulary, at the cost of collisions",
    "It removes the need for embeddings entirely in all cases",
    "It guarantees no collisions"
  ],
  "answer": 1,
  "explanation": "Hashing trades a small collision error for fixed memory and no dictionary maintenance."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `ecpm(pctr, bid)` = 1000 x pctr x bid; `rank_ads(ads)` where `ads` is a list of `(ad_id, pctr, bid)` returning ad ids by eCPM descending (ties by ad_id ascending); `gsp_cpc(winner_pctr, next_ecpm)` = next_ecpm / (1000 x winner_pctr); `normalized_entropy(y, p)` = mean log loss divided by the entropy of the average label; and `hash_feature(field, value, n_buckets)` = `zlib.crc32(f\"{field}={value}\".encode()) % n_buckets`.",
  "starterCode": "import math, zlib\n\ndef ecpm(pctr, bid):\n    pass\n\ndef rank_ads(ads):\n    pass\n\ndef gsp_cpc(winner_pctr, next_ecpm):\n    pass\n\ndef normalized_entropy(y, p):\n    pass\n\ndef hash_feature(field, value, n_buckets):\n    pass\n\nprint(rank_ads([('A', 0.02, 1.5), ('B', 0.05, 0.5), ('C', 0.01, 4.0)]))",
  "tests": "assert abs(ecpm(0.02, 1.5) - 30) < 1e-9\nassert rank_ads([('A', 0.02, 1.5), ('B', 0.05, 0.5), ('C', 0.01, 4.0)]) == ['C', 'A', 'B']\nassert rank_ads([('Z', 0.1, 1), ('A', 0.1, 1)]) == ['A', 'Z']\nassert abs(gsp_cpc(0.01, 30) - 3.0) < 1e-9\ny = [1] + [0] * 49\np = [0.02] * 50\nassert abs(normalized_entropy(y, p) - 1.0) < 1e-9\nbetter = [0.6] + [0.01] * 49\nassert normalized_entropy(y, better) < 0.5\nh = hash_feature('ad', 123, 1000)\nassert 0 <= h < 1000 and h == hash_feature('ad', 123, 1000)",
  "solution": "import math, zlib\n\ndef ecpm(pctr, bid):\n    return 1000 * pctr * bid\n\ndef rank_ads(ads):\n    return [a[0] for a in sorted(ads, key=lambda a: (-ecpm(a[1], a[2]), a[0]))]\n\ndef gsp_cpc(winner_pctr, next_ecpm):\n    return next_ecpm / (1000 * winner_pctr)\n\ndef normalized_entropy(y, p):\n    n = len(y)\n    ll = -sum(yi * math.log(pi) + (1 - yi) * math.log(1 - pi) for yi, pi in zip(y, p)) / n\n    bar = sum(y) / n\n    h = -(bar * math.log(bar) + (1 - bar) * math.log(1 - bar))\n    return ll / h\n\ndef hash_feature(field, value, n_buckets):\n    return zlib.crc32(f\"{field}={value}\".encode()) % n_buckets",
  "hints": [
    "Sort with key (-ecpm, ad_id) so ties break alphabetically.",
    "Use math.log (natural log) in both the log loss and the entropy so the units match."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Design an ad click prediction system for a social feed.' Outline your answer.",
  "answer": "**Requirements**: 500k ad requests/s peak, scoring p99 < 30 ms for ~500 candidates, objective = revenue with advertiser ROI and user guardrails; output must be calibrated pCTR.\n\n**Data**: impression/click logs joined by request id with a short attribution window; time-based splits; downsample negatives and correct the prior; log position and exploration flags.\n\n**Features**: sparse user/ad/context IDs (embeddings/hashing), smoothed historical CTRs, crosses, position (training only), freshness of creative; an online feature store for counters.\n\n**Model**: start with logistic regression (FTRL) as a baseline; move to DeepFM/DCN with sharded embedding tables; multi-task heads for click and conversion; calibrate with isotonic/Platt on recent data per slice.\n\n**Serving**: candidate generation by targeting rules -> pCTR scoring -> auction on eCPM with budget pacing -> logging; model updated hourly with canary checks.\n\n**Evaluation**: offline log loss/NE/AUC and calibration by slice; online A/B on revenue per mille with ROI and ad-load guardrails; monitor calibration drift and exploration for new ads."
}
```

> [!TIP] Interview tips
> - State the objective as eCPM so the need for calibration (not just AUC) is obvious.
> - Mention sparse features: hashing vs embeddings, crosses, and why logistic regression is still a strong baseline.
> - Cover delayed feedback, negative downsampling and cold-start exploration.
> - Name NE or log loss plus calibration-by-slice as offline metrics and revenue plus guardrails online.
