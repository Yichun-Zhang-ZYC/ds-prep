---
id: analytics-bi-case-customer-segmentation-rfm
title: "Case: Customer segmentation with RFM"
estimatedMinutes: 12
difficulty: medium
tags: [case-study, segmentation, rfm, crm]
---

## Why it matters
"Segment our customers and tell us what to do with each group" is a classic analytics take-home. RFM is the fast, explainable baseline every interviewer expects you to know, along with its limits.

## Concept
**RFM** describes each customer with three behavioural numbers from transaction history:
- **Recency**: days since last purchase (lower is better).
- **Frequency**: number of orders in the window.
- **Monetary**: total (or average) spend in the window.

**Recipe**:
1. Fix an as-of date and a window (e.g. last 12 months). Use one row per customer, and exclude refunds or test accounts.
2. Score each dimension 1-5 by quintile (for recency, invert so recent = 5). With ties or few distinct values (frequency is often 1 for most customers), rank first or use custom cut-offs.
3. Combine into segments, either the 3-digit code (e.g. 555) or named rules such as **Champions** (R and F high), **Loyal**, **New** (recent, F = 1), **At risk** (R low, F high: they used to buy often), **Lost** (R and F low).
4. Attach an action and a metric to each segment: reward champions, win back at-risk customers, nurture new ones, stop spending on lost ones.

**Strengths**: explainable, needs only order data, easy to run in SQL, directly actionable.

**Limits**:
- Quintiles are relative, so segment definitions drift as the base changes. Freeze cut-offs for tracking.
- F and M are correlated; the 125 combinations are redundant. Collapse to a handful of named segments.
- It describes the past and ignores product, channel and margin. For prediction, use churn or LTV models. For discovery, try k-means on log-scaled, standardised RFM (check stability, name the clusters).
- Segment differences are correlational. Test the actions, such as a win-back offer, with a holdout.

## Worked example
Six customers, as-of date fixed, tercile scores (1-3) for brevity (illustrative):

| Customer | Recency (days) | Orders | Spend | R | F | M |
|---|---|---|---|---|---|---|
| A | 5 | 12 | \$1,200 | 3 | 3 | 3 |
| B | 12 | 3 | \$150 | 3 | 2 | 2 |
| C | 30 | 8 | \$640 | 2 | 3 | 3 |
| D | 45 | 2 | \$90 | 2 | 1 | 1 |
| E | 90 | 6 | \$480 | 1 | 2 | 2 |
| F | 200 | 1 | \$40 | 1 | 1 | 1 |

Recency is inverted: the two most recent customers (A, B) get R = 3.

Reading the table:
- **A (333)** is a champion: protect with early access and loyalty perks, no discounts needed.
- **C (233)** is the valuable customer slipping away: 8 orders but silent for 30 days. A personal win-back nudge is worth the most per dollar here.
- **E (122)** and **F (111)** are mostly lost. A cheap automated email, then stop.
- **B (322)** is new-ish and growing: onboarding and second-purchase incentives.

Sizing the action: if C-type customers (say 2,000 of them) average \$640 a year and a win-back campaign costing \$2 each recovers 10% of a 30% yearly decline risk, the expected saved revenue is 2,000 × 0.30 × 0.10 × \$640 = \$38,400 against \$4,000 of cost. Validate with a holdout before scaling.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A customer has R = 1 (long inactive), F = 5, M = 5. Which segment and action fit best?",
  "options": [
    "Champion: send a loyalty reward",
    "At risk: targeted win-back, since past value is high",
    "New: onboarding emails",
    "Lost: stop contacting"
  ],
  "answer": 1,
  "explanation": "High historical frequency and spend with a long silence is the highest-value win-back target."
}
```

```quiz
{
  "id": "q2",
  "question": "Why is it risky to define RFM segments only by population quintiles when tracking segment sizes over time?",
  "options": [
    "Quintiles need normal data",
    "Quintile cut-offs move as the customer base changes, so a segment's meaning drifts and its size is fixed by construction",
    "Quintiles ignore recency",
    "SQL cannot compute quintiles"
  ],
  "answer": 1,
  "explanation": "Each quintile holds 20% of customers by construction, so you cannot see growth or decline. Freeze absolute thresholds for tracking."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `rfm_raw(orders, today)`. `orders` is a list of `(customer, 'YYYY-MM-DD', amount)`; `today` is a `'YYYY-MM-DD'` string. Return `{customer: (recency_days, frequency, monetary)}` where recency is days between `today` and the customer's latest order, frequency is the order count and monetary the total amount.",
  "starterCode": "from datetime import date\n\ndef rfm_raw(orders, today):\n    pass\n\norders = [('a', '2025-01-01', 50), ('a', '2025-03-01', 70), ('b', '2025-02-10', 20)]\nprint(rfm_raw(orders, '2025-03-11'))",
  "tests": "orders = [('a', '2025-01-01', 50), ('a', '2025-03-01', 70), ('b', '2025-02-10', 20)]\nr = rfm_raw(orders, '2025-03-11')\nassert r['a'] == (10, 2, 120)\nassert r['b'] == (29, 1, 20)\nassert len(r) == 2",
  "solution": "from datetime import date\n\ndef rfm_raw(orders, today):\n    t = date.fromisoformat(today)\n    out = {}\n    for c, d, amt in orders:\n        dd = date.fromisoformat(d)\n        last, n, tot = out.get(c, (None, 0, 0))\n        last = dd if last is None or dd > last else last\n        out[c] = (last, n + 1, tot + amt)\n    return {c: ((t - last).days, n, tot) for c, (last, n, tot) in out.items()}",
  "hints": [
    "`date.fromisoformat` parses `YYYY-MM-DD`; subtracting two dates gives a `timedelta` with `.days`.",
    "Track the latest date per customer, not the first one you see."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Implement `quantile_scores(values, k, low_is_good=False)`. `values` is `{customer: number}`. Sort customers by `(value, customer)` ascending; the customer at 0-based position `i` among `n` gets base score `1 + i * k // n`. If `low_is_good` (recency), return `k + 1 - base` instead so the lowest value scores `k`. Return `{customer: score}`.",
  "starterCode": "def quantile_scores(values, k, low_is_good=False):\n    pass\n\nprint(quantile_scores({'A': 5, 'B': 12, 'C': 30, 'D': 45, 'E': 90, 'F': 200}, 3, True))",
  "tests": "rec = {'A': 5, 'B': 12, 'C': 30, 'D': 45, 'E': 90, 'F': 200}\nassert quantile_scores(rec, 3, True) == {'A': 3, 'B': 3, 'C': 2, 'D': 2, 'E': 1, 'F': 1}\nfreq = {'A': 12, 'B': 3, 'C': 8, 'D': 2, 'E': 6, 'F': 1}\nassert quantile_scores(freq, 3) == {'A': 3, 'C': 3, 'B': 2, 'E': 2, 'D': 1, 'F': 1}\nassert quantile_scores({'x': 1}, 5) == {'x': 1}\ns = quantile_scores({str(i): i for i in range(10)}, 5)\nassert sorted(s.values()) == [1, 1, 2, 2, 3, 3, 4, 4, 5, 5]",
  "solution": "def quantile_scores(values, k, low_is_good=False):\n    order = sorted(values, key=lambda c: (values[c], c))\n    n = len(order)\n    out = {}\n    for i, c in enumerate(order):\n        base = 1 + i * k // n\n        out[c] = k + 1 - base if low_is_good else base\n    return out",
  "hints": [
    "Sort the keys by `(values[c], c)` so ties are broken deterministically.",
    "Use integer division `i * k // n` for the bucket."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Implement `segment(r, f)` for 1-5 scores, checking rules in this order: `'champions'` if r >= 4 and f >= 4; `'at_risk'` if r <= 2 and f >= 4; `'new'` if r >= 4 and f == 1; `'lost'` if r <= 2 and f <= 2; `'loyal'` if f >= 4; otherwise `'potential'`. Then implement `segment_sizes(scores)` taking a list of `(r, f)` pairs and returning `{segment: count}`.",
  "starterCode": "def segment(r, f):\n    pass\n\ndef segment_sizes(scores):\n    pass\n\nprint(segment(5, 5), segment(1, 4), segment_sizes([(5, 5), (1, 1), (1, 1)]))",
  "tests": "assert segment(5, 5) == 'champions'\nassert segment(4, 4) == 'champions'\nassert segment(1, 5) == 'at_risk'\nassert segment(5, 1) == 'new'\nassert segment(1, 1) == 'lost'\nassert segment(2, 2) == 'lost'\nassert segment(3, 4) == 'loyal'\nassert segment(3, 3) == 'potential'\nassert segment(4, 3) == 'potential'\nassert segment(2, 3) == 'potential'\nassert segment_sizes([(5, 5), (1, 1), (1, 1), (3, 3)]) == {'champions': 1, 'lost': 2, 'potential': 1}",
  "solution": "def segment(r, f):\n    if r >= 4 and f >= 4:\n        return 'champions'\n    if r <= 2 and f >= 4:\n        return 'at_risk'\n    if r >= 4 and f == 1:\n        return 'new'\n    if r <= 2 and f <= 2:\n        return 'lost'\n    if f >= 4:\n        return 'loyal'\n    return 'potential'\n\ndef segment_sizes(scores):\n    out = {}\n    for r, f in scores:\n        s = segment(r, f)\n        out[s] = out.get(s, 0) + 1\n    return out",
  "hints": [
    "Order matters: check the most specific rules first.",
    "`dict.get(key, 0) + 1` counts without a defaultdict."
  ]
}
```

> [!TIP] Interview tips
> - Define the as-of date, window and population first, then score, name segments and attach a concrete action and KPI to each.
> - Mention the limits: relative quintiles drift, F and M correlate, RFM is descriptive. Offer k-means or an LTV/churn model as next steps.
> - Close with how you would validate: a holdout on one segment's campaign, not just a before/after comparison.
