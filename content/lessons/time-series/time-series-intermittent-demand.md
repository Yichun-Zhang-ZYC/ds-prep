---
id: time-series-intermittent-demand
title: Intermittent demand forecasting
estimatedMinutes: 12
difficulty: medium
tags: [time-series, intermittent-demand, croston, inventory, forecasting]
---

## Why it matters
Spare parts, slow-moving SKUs and long-tail retail items sell zero most days and occasionally a lump. Standard tools break: ARIMA and ETS assume continuous values, MAPE divides by zero, and a mean forecast of 0.4 units/day is a number that never happens. Interviewers use this to test whether you tie the forecast to the inventory decision.

## Concept
**What it is**: many periods with zero demand and non-zero sizes that vary. Describe a series with two numbers:
- **ADI** (average demand interval) $=\dfrac{\text{periods}}{\text{periods with demand}}$.
- $\text{CV}^2$ of the **non-zero** demand sizes $=(\sigma/\mu)^2$.

The **Syntetos-Boylan classification** uses cut-offs ADI $=1.32$ and $\text{CV}^2 = 0.49$: smooth (low, low), **erratic** (low ADI, high CV$^2$), **intermittent** (high ADI, low CV$^2$), **lumpy** (high, high).

**Croston's method** smooths two components separately, only when demand occurs:
- size $z_t = \alpha d_t + (1-\alpha) z_{t-1}$, interval $p_t = \alpha q_t + (1-\alpha) p_{t-1}$, where $q_t$ is the number of periods since the previous demand.
- Forecast $\hat d = z / p$ (expected demand per period), a **flat** line.
- Croston is biased upward; the **SBA** (Syntetos-Boylan approximation) multiplies by $1 - \alpha/2$. **TSB** (Teunter-Syntetos-Babai) instead updates the demand *probability* every period, so the forecast decays when demand stops, which handles obsolescence (Croston keeps the last rate forever).

**Alternatives**: simple exponential smoothing or a moving average are often as good as Croston in benchmarks; **aggregate** to weekly or monthly buckets or to a higher hierarchy level (see *Hierarchical forecasting and reconciliation*); **ADIDA/IMAPA** temporal aggregation; global GBM or deep models with count likelihoods (Poisson, **negative binomial**, Tweedie) across many items; **hurdle** models (P(demand) x size).

**Pick the right target**: replenishment needs the distribution of **lead-time demand**, not a per-period mean. Compute a quantile (service-level quantile) of the demand over lead time $L$ (+ review period): for a Poisson with rate $\lambda$ per period, lead-time demand is Poisson($\lambda L$); intermittent data is usually overdispersed, so use a negative binomial or bootstrap. Order-up-to level $=$ that quantile.

**Evaluation**: **MAPE and sMAPE are invalid** (zeros); MASE is unstable when the naive error is zero or tiny; use **RMSSE**, scaled MSE, bias (mean error) and, for decisions, **pinball loss** at the service-level quantile plus realized fill rate/stockouts and inventory cost in a simulation (see *Probabilistic forecasting and prediction intervals*). Note that MAE is minimized by the **median**, which is 0 for sparse series: a model that forecasts all zeros can look best on MAE.

## Worked example
Weekly-style example (illustrative): demand over 8 periods is `[0, 0, 5, 0, 0, 0, 4, 0]`. ADI $= 8/2 = 4$; non-zero sizes $[5, 4]$ have mean 4.5 and variance 0.25, so $\text{CV}^2 = 0.25/20.25 = 0.012$: **intermittent**.

Croston with $\alpha = 0.1$: initialize at the first demand (period 3): $z = 5$, $p = 3$. At period 7 (size 4, interval $7-3 = 4$): $z = 0.1\cdot4 + 0.9\cdot5 = 4.9$, $p = 0.1\cdot4 + 0.9\cdot3 = 3.1$. Forecast $4.9/3.1 = 1.58$ units/period; SBA gives $1.58 \times 0.95 = 1.50$. No period ever sells 1.58 units, so judge it by the inventory it implies.

Lead time 4 periods: mean lead-time demand $\approx 6.3$. With Poisson($6.32$), the cumulative probabilities are 0.892 at 9, 0.943 at 10 and 0.972 at 11, so a 95% service level needs an order-up-to level of about **11 units**, nearly twice the mean. (Real intermittent demand is overdispersed, so a negative binomial would require more.)

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why is Croston's forecast a flat line rather than showing spikes?",
  "options": [
    "It is a bug caused by smoothing",
    "Because the data has no seasonality",
    "It forecasts the expected demand per period (size divided by interval), which is a rate, not the timing of the next lump",
    "Because alpha is small"
  ],
  "answer": 2,
  "explanation": "Timing of individual orders is not predictable, so Croston estimates the average rate $z/p$. Decisions use the lead-time demand distribution built from that rate."
}
```

```quiz
{
  "id": "q2",
  "question": "A model forecasting 0 every day beats a Croston forecast on MAE for a very sparse item. What is the right reaction?",
  "options": [
    "Ship the zero forecast",
    "Recognise that MAE is minimized by the median (0), so use metrics aligned with the decision, such as RMSSE, bias or pinball loss at the service quantile",
    "Switch to MAPE",
    "Increase alpha"
  ],
  "answer": 1,
  "explanation": "For sparse data the median is zero, so MAE rewards degenerate forecasts that cause stockouts. Evaluate on decision-relevant measures."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `adi_cv2(demand)` returning `(ADI, CV2)` where ADI = periods / non-zero periods and CV2 = (population std / mean)^2 of the non-zero values, and `classify(demand)` using cut-offs ADI 1.32 and CV2 0.49: return 'smooth', 'erratic', 'intermittent' or 'lumpy'.",
  "starterCode": "def adi_cv2(demand):\n    pass\n\ndef classify(demand):\n    pass\n\nprint(adi_cv2([0, 0, 5, 0, 0, 0, 4, 0]))",
  "tests": "adi, cv2 = adi_cv2([0, 0, 5, 0, 0, 0, 4, 0])\nassert abs(adi - 4.0) < 1e-12 and abs(cv2 - 0.25 / 20.25) < 1e-12\nassert classify([0, 0, 5, 0, 0, 0, 4, 0]) == 'intermittent'\nassert classify([5, 6, 5, 7, 6, 5]) == 'smooth'\nassert classify([1, 20, 1, 30, 2, 0]) == 'erratic'\nassert classify([0, 1, 0, 0, 30, 0, 0, 2, 0, 0, 0, 25]) == 'lumpy'",
  "solution": "def adi_cv2(demand):\n    nz = [d for d in demand if d > 0]\n    adi = len(demand) / len(nz)\n    m = sum(nz) / len(nz)\n    var = sum((d - m) ** 2 for d in nz) / len(nz)\n    return adi, var / (m * m)\n\ndef classify(demand):\n    adi, cv2 = adi_cv2(demand)\n    if adi < 1.32:\n        return 'smooth' if cv2 < 0.49 else 'erratic'\n    return 'intermittent' if cv2 < 0.49 else 'lumpy'",
  "hints": [
    "Low ADI (< 1.32) means frequent demand; low CV2 (< 0.49) means stable sizes.",
    "Use the population variance (divide by n)."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Implement `croston(demand, alpha=0.1, sba=False)` returning the flat forecast $z/p$. Initialize at the first non-zero demand with $z = d$ and $p$ = its 1-based position; afterwards update only on demand periods with $q$ = periods since the previous demand. Return 0.0 if there is no demand. If `sba`, multiply by $1 - \\alpha/2$.",
  "starterCode": "def croston(demand, alpha=0.1, sba=False):\n    pass\n\nprint(croston([0, 0, 5, 0, 0, 0, 4, 0]))",
  "tests": "d = [0, 0, 5, 0, 0, 0, 4, 0]\nassert abs(croston(d) - 4.9 / 3.1) < 1e-12\nassert abs(croston(d, sba=True) - 4.9 / 3.1 * 0.95) < 1e-12\nassert abs(croston([0, 0, 5]) - 5 / 3) < 1e-12\nassert croston([0, 0, 0]) == 0.0\nassert abs(croston([3, 3, 3, 3]) - 3.0) < 1e-12\nassert abs(croston([2, 0, 4], alpha=0.5) - (0.5 * 4 + 0.5 * 2) / (0.5 * 2 + 0.5 * 1)) < 1e-12",
  "solution": "def croston(demand, alpha=0.1, sba=False):\n    z = p = None\n    last = -1\n    for t, d in enumerate(demand):\n        if d > 0:\n            if z is None:\n                z, p = float(d), float(t + 1)\n            else:\n                z = alpha * d + (1 - alpha) * z\n                p = alpha * (t - last) + (1 - alpha) * p\n            last = t\n    if z is None:\n        return 0.0\n    f = z / p\n    return f * (1 - alpha / 2) if sba else f",
  "hints": [
    "Track the index of the last demand to compute the interval.",
    "Zeros before the first demand count towards the first interval."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Implement `poisson_quantile(mu, q)`: the smallest integer $k$ with $P(X \\le k) \\ge q$ for $X \\sim \\text{Poisson}(\\mu)$ (build the CDF term by term, $P(k) = P(k-1)\\,\\mu/k$). Then `order_up_to(rate_per_period, lead_time, service_level)` = quantile of lead-time demand with mean `rate * lead_time`.",
  "starterCode": "import math\n\ndef poisson_quantile(mu, q):\n    pass\n\ndef order_up_to(rate_per_period, lead_time, service_level):\n    pass\n\nprint(poisson_quantile(2.0, 0.95))",
  "tests": "assert poisson_quantile(2.0, 0.95) == 5\nassert poisson_quantile(2.0, 0.9) == 4\nassert poisson_quantile(2.0, 0.5) == 2\nassert poisson_quantile(0.0, 0.99) == 0\nassert order_up_to(0.5, 4, 0.95) == 5\nassert order_up_to(1.58, 4, 0.95) == 11\nassert order_up_to(1.0, 1, 0.99) >= order_up_to(1.0, 1, 0.9)",
  "solution": "import math\n\ndef poisson_quantile(mu, q):\n    k = 0\n    term = math.exp(-mu)\n    cdf = term\n    while cdf < q - 1e-12:\n        k += 1\n        term *= mu / k\n        cdf += term\n    return k\n\ndef order_up_to(rate_per_period, lead_time, service_level):\n    return poisson_quantile(rate_per_period * lead_time, service_level)",
  "hints": [
    "Start with P(0) = exp(-mu) and accumulate until the CDF reaches q.",
    "Allow a tiny tolerance when comparing the CDF to q."
  ]
}
```

> [!TIP] Interview tips
> - Classify with ADI and CV$^2$, then explain Croston as separate smoothing of size and interval, with SBA/TSB fixes.
> - Say clearly that MAPE fails on zeros and that you evaluate with RMSSE, bias and pinball loss, ideally through inventory outcomes.
> - Tie the forecast to the decision: lead-time demand distribution and a service-level quantile, not a mean.
> - Mention aggregation, count-data likelihoods and global models as practical alternatives.
