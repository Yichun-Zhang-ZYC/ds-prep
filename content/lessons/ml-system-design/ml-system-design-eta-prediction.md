---
id: ml-system-design-eta-prediction
title: "Design: ETA prediction for ride-hailing"
estimatedMinutes: 14
difficulty: medium
tags: [ml-system-design, eta, regression, ride-hailing, quantile-regression]
---

## Why it matters
"Design ETA prediction for a ride-hailing or delivery app" is a favorite at marketplace companies. ETA feeds pricing, dispatch, driver matching and the promise shown to the rider, so it tests regression framing, asymmetric costs, leakage and tight serving latency in one question. For a general regression and serving refresher see *Define ML objective and metrics* and *Serving and deployment*.

## Concept
**Clarify first.** Which ETA: *pickup ETA* (driver to rider), *trip ETA* (pickup to dropoff, shown before booking) or *en-route ETA* (updated live)? Who consumes it (rider UI, dispatch, pricing)? Dispatch may call the model for thousands of driver-rider pairs per request, so latency per call must be a few ms.

**Hybrid architecture (the standard answer).**
1. A **routing engine** runs shortest-path on the road graph with per-segment speeds (historical speed profiles plus live traffic) and gives a physics-style ETA $\hat t_{route}$.
2. An **ML model predicts the residual or ratio** of the true duration to $\hat t_{route}$. This is easier than learning geography from scratch, and the model corrects what the router misses: turns, signals, pickup-point friction, weather, events, local driver behavior. Published systems (for example Uber's DeepETA) follow this pattern, with the routing ETA as a key input feature.
3. A **post-processing layer** handles bounds, rounding and a range or confidence interval.

**Features.** Routing ETA and distance; origin/destination (geohash or H3 cell embeddings); hour-of-week; weather; live segment speed aggregates and incident counts (streaming); trip type and product tier; for pickups, driver's current heading and speed. Only use what is known at request time.

**Labels.** Actual trip duration from GPS traces, with map matching and outlier removal (cancelled trips, GPS jumps, driver idling). Watch for **leakage**: the realized route is not known at request time, so train on the predicted route, not the one driven. Also beware selection effects: trips in unusual conditions are cancelled more often.

**Loss.** MSE overweights rare very long trips. Use **MAE/Huber** for a central estimate. Costs are **asymmetric**: underestimating makes riders angry or drivers wait, overestimating loses bookings. Use an asymmetric Huber or a **quantile (pinball) loss** at $\tau>0.5$, or predict several quantiles for a range. Pinball loss: $L_\tau=\tau\,(y-p)$ if $y\ge p$, else $(1-\tau)(p-y)$.

**Metrics.** MAE, MAPE (unstable for short trips), **p90 absolute error**, signed **bias** (mean of prediction minus actual), underestimate rate, and **interval coverage**. Always slice by distance, city, hour and product, since a good average can hide a rush-hour bias. Online: conversion, cancellation rate, rider-reported lateness, dispatch efficiency (pickup time) via A/B or switchback tests, because marketplace effects interfere across units.

**Serving and operations.** Precompute segment speeds in a streaming job into a low-latency store; use compact models (GBDT or small DNN) with batched inference; cache by origin/destination cell pair; fall back to the routing ETA times a global ratio on timeout. Monitor bias per city/hour, retrain frequently, and keep a holdout for drift detection (new road closures, holidays).

## Worked example
Four trips with routing ETA $r=[10,20,30,40]$ min and actual $a=[12,19,36,38]$. Raw MAE: $(2+1+6+2)/4=2.75$ min.

After the model, the point predictions are $p=[11,20,33,38]$ (the 0.8 quantile model would shift these upward; here we evaluate the central one). Errors $y-p=[1,-1,3,0]$, MAE $=5/4=1.25$, bias $=\text{mean}(p-a)=(-1+1-3+0)/4=-0.75$ min (underestimates).

Pinball loss at $\tau=0.8$ for the raw routing ETA: errors $y-p=[2,-1,6,-2]$ give $0.8\cdot2=1.6$, $0.2\cdot1=0.2$, $0.8\cdot6=4.8$, $0.2\cdot2=0.4$; mean $=7.0/4=1.75$. Underestimates are penalized 4x more, which pushes the model to predict conservatively.

For an interval with 80% coverage, conformal calibration on held-out residuals takes the $\lceil (n+1)(1-\alpha)\rceil$-th smallest absolute residual as the half-width (n=9, $\alpha=0.2$: the 8th smallest).

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why predict the residual (or ratio) relative to the routing engine's ETA rather than the raw duration?",
  "options": [
    "The routing ETA is always exactly right",
    "The router already encodes road-graph geometry and live speeds, so the model only has to learn systematic corrections, which is easier and more accurate",
    "It removes the need for labels",
    "It makes the model slower but safer"
  ],
  "answer": 1,
  "explanation": "The hybrid design gives a strong baseline and a smaller learning problem. The ML model learns what the router misses, such as signals, pickup friction and local behavior."
}
```

```quiz
{
  "id": "q2",
  "question": "Riders are much more upset by underestimated ETAs than overestimated ones. Which training choice best reflects this?",
  "options": [
    "Plain MSE",
    "A quantile (pinball) loss at tau > 0.5 or an asymmetric Huber loss",
    "MAPE on short trips",
    "Dropping all long trips"
  ],
  "answer": 1,
  "explanation": "Asymmetric losses penalize underestimates more, shifting predictions toward a conservative quantile. MSE and MAE treat both directions equally."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `mae(pred, actual)`, `bias(pred, actual)` (mean of pred minus actual) and `pinball(pred, actual, tau)` (mean pinball loss: `tau*(y-p)` if `y>=p`, else `(1-tau)*(p-y)`).",
  "starterCode": "def mae(pred, actual):\n    pass\n\ndef bias(pred, actual):\n    pass\n\ndef pinball(pred, actual, tau):\n    pass\n\nprint(pinball([10, 20, 30, 40], [12, 19, 36, 38], 0.8))",
  "tests": "p = [10, 20, 30, 40]\na = [12, 19, 36, 38]\nassert abs(mae(p, a) - 2.75) < 1e-9\nassert abs(bias(p, a) - (-1.25)) < 1e-9\nassert abs(pinball(p, a, 0.8) - 1.75) < 1e-9\nassert abs(pinball(p, a, 0.5) - mae(p, a) / 2) < 1e-9",
  "solution": "def mae(pred, actual):\n    return sum(abs(p - y) for p, y in zip(pred, actual)) / len(pred)\n\ndef bias(pred, actual):\n    return sum(p - y for p, y in zip(pred, actual)) / len(pred)\n\ndef pinball(pred, actual, tau):\n    total = 0.0\n    for p, y in zip(pred, actual):\n        total += tau * (y - p) if y >= p else (1 - tau) * (p - y)\n    return total / len(pred)",
  "hints": [
    "Bias is signed: do not take absolute values.",
    "Pinball loss at tau=0.5 equals half the MAE."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Residual correction by time bucket. `fit_ratio(rows)` takes `(bucket, routing_eta, actual)` tuples and returns a dict mapping each bucket to the **median** of `actual / routing_eta`. `predict(ratios, bucket, eta)` returns `eta * ratio`, using ratio 1.0 for unseen buckets.",
  "starterCode": "import statistics\n\ndef fit_ratio(rows):\n    pass\n\ndef predict(ratios, bucket, eta):\n    pass\n\nrows = [('rush', 10, 13), ('rush', 20, 26), ('rush', 30, 36), ('night', 10, 9), ('night', 20, 18)]\nr = fit_ratio(rows)\nprint(r, predict(r, 'rush', 40))",
  "tests": "rows = [('rush', 10, 13), ('rush', 20, 26), ('rush', 30, 36), ('night', 10, 9), ('night', 20, 18)]\nr = fit_ratio(rows)\nassert abs(r['rush'] - 1.3) < 1e-9\nassert abs(r['night'] - 0.9) < 1e-9\nassert abs(predict(r, 'rush', 40) - 52.0) < 1e-9\nassert predict(r, 'weekend', 25) == 25",
  "solution": "import statistics\n\ndef fit_ratio(rows):\n    groups = {}\n    for b, eta, act in rows:\n        groups.setdefault(b, []).append(act / eta)\n    return {b: statistics.median(v) for b, v in groups.items()}\n\ndef predict(ratios, bucket, eta):\n    return eta * ratios.get(bucket, 1.0)",
  "hints": [
    "Group the ratios by bucket, then take statistics.median of each list.",
    "The median is robust to the occasional very long trip."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Conformal interval half-width. Given held-out signed `residuals` and miscoverage `alpha`, return the $k$-th smallest absolute residual with $k=\\lceil (n+1)(1-\\alpha)\\rceil$ (round the product to 9 decimals before the ceiling). If $k>n$, return `float('inf')`.",
  "starterCode": "import math\n\ndef conformal_halfwidth(residuals, alpha):\n    pass\n\nprint(conformal_halfwidth([1, -2, 3, -4, 5, -6, 7, -8, 9], 0.2))",
  "tests": "assert conformal_halfwidth([1, -2, 3, -4, 5, -6, 7, -8, 9], 0.2) == 8\nassert conformal_halfwidth([5, -1, 3], 0.5) == 3\nassert conformal_halfwidth([5, -1, 3], 0.1) == float('inf')",
  "solution": "import math\n\ndef conformal_halfwidth(residuals, alpha):\n    n = len(residuals)\n    k = math.ceil(round((n + 1) * (1 - alpha), 9))\n    if k > n:\n        return float('inf')\n    return sorted(abs(r) for r in residuals)[k - 1]",
  "hints": [
    "Sort the absolute residuals and index k-1.",
    "With n=3, alpha=0.5: k = ceil(4 * 0.5) = 2, the second smallest of [1, 3, 5] is 3."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Design the ETA model for a ride-hailing app.' Give a 2-minute answer.",
  "answer": "**Clarify**: pickup vs trip vs live ETA; consumers (rider UI, dispatch, pricing); scale (illustrative: 20M trips/day, dispatch calls ETA 100x per request), latency < 10 ms per call for dispatch, < 100 ms for UI.\n\n**Design**: routing engine on a road graph with live segment speeds gives a baseline ETA; a GBDT or small DNN predicts the ratio/residual using routing ETA, H3 cell embeddings, hour-of-week, weather, live traffic aggregates and product type. Output a point estimate at a conservative quantile plus a range.\n\n**Data**: GPS traces with map matching, outlier and cancellation filtering; train on the predicted route, not the driven one (leakage); time-based split; weight recent data.\n\n**Metrics**: MAE, p90 abs error, signed bias, underestimate rate and interval coverage, sliced by city, distance, hour. Online: switchback tests (A/B is contaminated by marketplace interference) on conversion, cancellations, pickup time.\n\n**Serving**: streaming speed aggregates in a key-value store, batched inference, cell-pair caching, fallback to routing ETA times a global ratio.\n\n**Risks**: holidays and road closures (drift), feedback (ETAs shown change rider and driver behavior), fairness across neighborhoods."
}
```

> [!TIP] Interview tips
> - Lead with the hybrid router plus residual-model design; it shows you know why not to learn geography from scratch.
> - Name the asymmetric cost and pick a quantile or asymmetric loss; report bias, not just MAE.
> - Call out leakage (realized route) and the marketplace interference that complicates A/B testing.
> - Distinguish dispatch-time latency (many calls) from UI latency (one call).
