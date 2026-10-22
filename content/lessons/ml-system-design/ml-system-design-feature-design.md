---
id: ml-system-design-feature-design
title: Feature design
estimatedMinutes: 12
difficulty: medium
tags: [ml-system-design, framework, features, leakage]
---

## Why it matters
Features decide most of a model's ceiling and most of its production bugs. Interviewers look for a structured feature inventory, sensible encodings for high-cardinality data, and awareness of leakage and train/serve skew.

## Concept
**Feature inventory** (say these groups out loud): user (history, demographics, lifetime stats), item (content, price, popularity), context (time, device, location), and **interactions/crosses** (user × category affinity, CTR of this user on this item type).

**Encoding**
- Numeric: log/clip heavy tails, standardise for linear/NN models (trees don't need it), bucketise to capture non-linearity.
- Cyclic time (hour, weekday): $(\sin\frac{2\pi h}{24}, \cos\frac{2\pi h}{24})$ so 23h and 0h are close.
- Low-cardinality categoricals: one-hot. High-cardinality IDs: **embeddings**, hashing trick, or **target encoding** with smoothing, computed out-of-fold to avoid leakage: $\text{enc}(c) = \frac{n_c \bar y_c + m \bar y}{n_c + m}$ ($m$ = smoothing strength).
- Text/images: pretrained embeddings. Missing values: impute plus a "was missing" flag.
- Aggregates over windows (clicks in last 1h/7d/30d) capture recency and trend.

**Correctness is the real risk**
- **Point-in-time correctness**: a training row at time $t$ may only use data with timestamp $\le t$ (as-of join). Otherwise the model peeks at the future.
- **Train/serve skew**: the same feature code and definitions for offline and online (a feature store or shared transformation library); log served features for training.
- **Freshness tiers**: batch (daily), near-real-time (streaming counters), request-time (context). Each tier adds cost and latency; pay only where it moves the metric.
- Watch for features that proxy the label (e.g. "refund issued" for a fraud model) and for protected attributes.

## Worked example
Target-encode `merchant` for a fraud model. Global fraud rate $\bar y = 0.10$. Merchant A has $n = 5$ transactions, 3 of them fraud ($\bar y_A = 0.6$); smoothing $m = 20$.
$$\text{enc}(A) = \frac{5 \cdot 0.6 + 20 \cdot 0.10}{5 + 20} = \frac{3 + 2}{25} = 0.20.$$
The raw 0.6 is shrunk toward the prior because 5 samples are unreliable. A merchant with 2,000 transactions keeps nearly its own rate.

Point-in-time: a user's `avg_basket_30d` is recomputed daily. For an order at 2024-05-10 14:00 we must read the value as of 2024-05-10 00:00 (or earlier), never the 2024-05-11 value that includes the order itself.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why compute target encoding out-of-fold (or with a time split)?",
  "options": ["To make it faster", "A row's own label would otherwise leak into its feature, inflating training performance", "To reduce cardinality", "To handle missing values"],
  "answer": 1,
  "explanation": "Encoding with a category mean that includes the row's own label leaks the target; out-of-fold stats prevent that."
}
```

```quiz
{
  "id": "q2",
  "question": "Offline AUC is 0.92 but online performance is far lower. Which cause should you check first?",
  "options": ["Too many trees", "Train/serve skew or point-in-time leakage in features", "Learning rate", "Batch size"],
  "answer": 1,
  "explanation": "A large offline-online gap is classically caused by leaked or inconsistently computed features."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `smoothed_target_encoding(cats, y, m)` returning a dict category → (sum of y + m × global mean) / (count + m). Write `as_of_value(history, t, default=None)`: `history` is a list of `(timestamp, value)` sorted by timestamp; return the value of the latest entry with timestamp <= t, else `default`. Write `cyclic_encode(h, period)` returning `(sin, cos)` of 2πh/period.",
  "starterCode": "import math\nfrom bisect import bisect_right\n\ndef smoothed_target_encoding(cats, y, m):\n    pass\n\ndef as_of_value(history, t, default=None):\n    pass\n\ndef cyclic_encode(h, period):\n    pass\n",
  "tests": "enc = smoothed_target_encoding(['A'] * 5 + ['B'] * 5, [1, 1, 1, 0, 0, 0, 0, 0, 0, 0], 20)\nassert abs(enc['A'] - (5 * 0.6 + 20 * 0.3) / 25) < 1e-12\nassert abs(enc['B'] - (5 * 0 + 20 * 0.3) / 25) < 1e-12\nh = [(1, 'a'), (5, 'b'), (9, 'c')]\nassert as_of_value(h, 0) is None\nassert as_of_value(h, 0, 'x') == 'x'\nassert as_of_value(h, 5) == 'b'\nassert as_of_value(h, 8) == 'b'\nassert as_of_value(h, 100) == 'c'\ns, c = cyclic_encode(6, 24)\nassert abs(s - 1) < 1e-12 and abs(c) < 1e-12\ns0, c0 = cyclic_encode(0, 24)\ns23, c23 = cyclic_encode(23, 24)\nassert math.hypot(s0 - s23, c0 - c23) < 0.3",
  "solution": "import math\nfrom bisect import bisect_right\n\ndef smoothed_target_encoding(cats, y, m):\n    prior = sum(y) / len(y)\n    n, s = {}, {}\n    for c, yi in zip(cats, y):\n        n[c] = n.get(c, 0) + 1\n        s[c] = s.get(c, 0) + yi\n    return {c: (s[c] + m * prior) / (n[c] + m) for c in n}\n\ndef as_of_value(history, t, default=None):\n    i = bisect_right([ts for ts, _ in history], t)\n    return history[i - 1][1] if i else default\n\ndef cyclic_encode(h, period):\n    a = 2 * math.pi * h / period\n    return math.sin(a), math.cos(a)",
  "hints": ["(n·mean + m·prior)/(n + m) equals (sum + m·prior)/(n + m).", "bisect_right on the timestamp list gives the insertion point after entries <= t."]
}
```

> [!TIP] Interview tips
> - Organise features as user / item / context / cross, then discuss freshness (batch vs streaming vs request-time).
> - Raise point-in-time correctness and train/serve skew unprompted; they are the senior-level signals.
> - For high-cardinality IDs, offer embeddings or smoothed (out-of-fold) target encoding and explain the leakage risk.
