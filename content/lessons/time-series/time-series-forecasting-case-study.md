---
id: time-series-forecasting-case-study
title: "Case: Building a demand forecast end to end"
estimatedMinutes: 15
difficulty: hard
tags: [time-series, case-study, demand-forecasting, retail, backtesting]
---

## Why it matters
"Walk me through building a demand forecast" is the most common open-ended time-series interview prompt. A strong answer starts from the decision, handles censored demand and hierarchies, validates with realistic backtests and ends with monitoring, rather than jumping to a favourite model.

## Concept
**Playbook** (state it in this order):
1. **Decision and cost of error**: what action consumes the forecast (replenishment, staffing, budget)? Over- vs under-forecast costs (waste vs lost sales) define the target quantile, granularity, horizon (at least lead time + review period) and refresh cadence.
2. **Data audit**: sales $\ne$ demand (**stockouts censor** demand, so flag and impute), promotions, price, holidays, new/discontinued items, outliers, missing dates, timezone/calendar shifts. Define the **forecast origin** and what is known at that time.
3. **Baselines**: naive, seasonal naive, moving average, ETS. They set the bar and are fallbacks (see *Moving averages and exponential smoothing*).
4. **Model choice**: few series with long history $\to$ ETS/ARIMA/Prophet per series; many related series $\to$ **global GBM or deep model** with lags, calendar and static features (see *ML for time series*, *Deep learning for time series*); sparse items $\to$ Croston/TSB or aggregation; coherent totals $\to$ reconciliation.
5. **Validation**: rolling-origin backtests at the deployed horizon, no leakage (features computed as of the origin), compare to baselines per segment (see *Forecast evaluation and backtesting*). Report bias alongside WAPE/MASE; sparse tails need RMSSE.
6. **Uncertainty**: quantiles or intervals feeding safety stock (see *Probabilistic forecasting and prediction intervals*); check coverage.
7. **Business simulation** of the downstream decision (fill rate, waste, cost) and a **live test** (A/B or switchback by store).
8. **Operate**: scheduled retraining, drift and bias monitors, fallbacks, override logging, versioned data and models, explainability for planners.

**Common pitfalls**: look-ahead leakage in rolling features; evaluating only aggregated error (cancelling hides store-level errors); optimizing MAPE on small numbers; ignoring promotions' cannibalization and post-promo dips; training on stockout-censored sales (forecasts bias low and become a self-fulfilling spiral); reporting a single average metric rather than by segment; shipping a complex model that does not beat seasonal naive.

## Worked example
Illustrative numbers for one store-SKU. A 3-day window (2-day lead time plus daily review) has forecast mean demand 36 units. Daily forecast-error standard deviation is $5.2$, treated as independent across days, so the 3-day error is $5.2\sqrt3 \approx 9.0$. For a 95% service level, $z = 1.645$: safety stock $=1.645 \times 9.0 \approx 14.8$ and the **order-up-to level** is $36 + 14.8 \approx 51$ units. Moving to a 99% service level ($z = 2.326$) raises it to about 57 units, a visible waste vs stockout trade-off for perishables.

Metric check on four days: actuals $[10, 0, 20, 30]$, forecasts $[12, 3, 15, 30]$. Absolute errors $2 + 3 + 5 + 0 = 10$ over total demand 60, so WAPE $=16.7\%$; total forecast also equals 60, so bias is 0%. MAPE would be undefined because of the zero-demand day. A forecast that is unbiased on average can still drive stockouts on high-demand days, which is why the quantile matters.

Backtest design: weekly seasonality, daily horizon 1-3, so use 8 rolling origins stepping a week, training only on data before each origin, and compare WAPE per fold with seasonal naive. If the model wins by 12% on average but loses on promo days, the next iteration targets promo features.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Last year's weekly sales in a store show many zero-sales days for a top SKU because it was out of stock. Training directly on sales will most likely...",
  "options": [
    "Improve the model since there are more zeros",
    "Bias forecasts low and can create a self-reinforcing stockout loop; flag stockout days and treat them as censored",
    "Have no effect because zeros average out",
    "Only affect the confidence intervals"
  ],
  "answer": 1,
  "explanation": "Observed sales are a censored measure of demand. Training on them underestimates demand, which leads to lower stock and more stockouts."
}
```

```quiz
{
  "id": "q2",
  "question": "Which backtest setup is correct for a daily forecast that is deployed to predict 7 days ahead each morning?",
  "options": [
    "Shuffled 5-fold cross-validation",
    "One random train/test split",
    "Rolling origins with data strictly before each origin, forecasting the next 7 days, averaged by horizon step",
    "Fit on all data and evaluate in-sample"
  ],
  "answer": 2,
  "explanation": "Time-ordered rolling-origin evaluation at the deployed horizon avoids leakage and matches how the model will be used."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `wape(y, f)` = $\\sum|y-f| / \\sum|y|$ and `bias_pct(y, f)` = $(\\sum f - \\sum y)/\\sum y$ (positive means over-forecasting).",
  "starterCode": "def wape(y, f):\n    pass\n\ndef bias_pct(y, f):\n    pass\n\nprint(wape([10, 0, 20, 30], [12, 3, 15, 30]))",
  "tests": "y, f = [10, 0, 20, 30], [12, 3, 15, 30]\nassert abs(wape(y, f) - 10 / 60) < 1e-12\nassert abs(bias_pct(y, f)) < 1e-12\nassert abs(bias_pct([10, 10], [12, 12]) - 0.2) < 1e-12\nassert abs(bias_pct([10, 10], [5, 5]) + 0.5) < 1e-12\nassert wape([5, 5], [5, 5]) == 0.0",
  "solution": "def wape(y, f):\n    return sum(abs(a - b) for a, b in zip(y, f)) / sum(abs(a) for a in y)\n\ndef bias_pct(y, f):\n    return (sum(f) - sum(y)) / sum(y)",
  "hints": [
    "Both are ratios of totals, so zero-demand days do not break them.",
    "A forecast can have 0 bias and a high WAPE if errors cancel."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Implement `order_up_to(mean_demand, daily_sigma, lead_days, service_level)`: mean demand over the protection window plus $z \\cdot \\sigma_d\\sqrt{\\text{lead\\_days}}$, with $z$ from `NormalDist().inv_cdf(service_level)` (daily errors assumed independent).",
  "starterCode": "import math\nfrom statistics import NormalDist\n\ndef order_up_to(mean_demand, daily_sigma, lead_days, service_level):\n    pass\n\nprint(order_up_to(12, 5.2, 3, 0.95))",
  "tests": "v = order_up_to(36, 9 / 3 ** 0.5, 3, 0.95)\nassert abs(v - (36 + 1.6448536 * 9)) < 1e-3\nassert abs(order_up_to(100, 10, 1, 0.5) - 100) < 1e-9\nassert order_up_to(100, 10, 4, 0.99) > order_up_to(100, 10, 4, 0.9)\nassert abs(order_up_to(50, 0, 3, 0.95) - 50) < 1e-9",
  "solution": "import math\nfrom statistics import NormalDist\n\ndef order_up_to(mean_demand, daily_sigma, lead_days, service_level):\n    sigma = daily_sigma * math.sqrt(lead_days)\n    return mean_demand + NormalDist().inv_cdf(service_level) * sigma",
  "hints": [
    "Standard deviation of a sum of independent days scales with the square root of the number of days.",
    "z for 50% is 0, so the result equals the mean."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Implement `rolling_origin_wape(y, season, n_folds, horizon)`: the last `n_folds * horizon` points are test folds. For fold `i` the origin is `n - (n_folds - i) * horizon`; the seasonal naive forecast for step `h` is `y[origin - season + (h % season)]` using only data before the origin; return the WAPE of each fold in order.",
  "starterCode": "def rolling_origin_wape(y, season, n_folds, horizon):\n    pass\n\nprint(rolling_origin_wape([1, 2, 3, 4, 5, 6, 7] * 3 + [2, 3, 4, 5, 6, 7, 8], 7, 2, 7))",
  "tests": "y = [1, 2, 3, 4, 5, 6, 7] * 3 + [2, 3, 4, 5, 6, 7, 8]\nr = rolling_origin_wape(y, 7, 2, 7)\nassert len(r) == 2 and abs(r[0]) < 1e-12 and abs(r[1] - 7 / 35) < 1e-12\nr2 = rolling_origin_wape([1, 2, 3, 4, 5, 6, 7] * 4, 7, 3, 7)\nassert r2 == [0.0, 0.0, 0.0]\nr3 = rolling_origin_wape([5, 5, 5, 5, 5, 5], 1, 2, 2)\nassert r3 == [0.0, 0.0]",
  "solution": "def rolling_origin_wape(y, season, n_folds, horizon):\n    n = len(y)\n    out = []\n    for i in range(n_folds):\n        origin = n - (n_folds - i) * horizon\n        actual = y[origin:origin + horizon]\n        fc = [y[origin - season + (h % season)] for h in range(horizon)]\n        out.append(sum(abs(a - b) for a, b in zip(actual, fc)) / sum(abs(a) for a in actual))\n    return out",
  "hints": [
    "Slice actuals as y[origin:origin + horizon].",
    "The (h % season) term lets the horizon exceed one season by repeating the last season."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'A grocery chain with 150 stores and 2,000 SKUs wants a demand forecast to drive replenishment. Walk me through how you would build it.' Outline your answer.",
  "answer": "**1. Clarify the decision.** Orders are placed daily with a 2-day supply lead time, so the relevant quantity is demand over lead time plus review period (3 days) per store-SKU, and the goal is a service level (say 95-98%) at minimum inventory and waste (perishables). That implies a daily grain, a 1-7 day horizon (plus weekly for promo planning) and **quantile** outputs, not just a mean.\n\n**2. Data and traps.** Sales are not demand: stockouts and delisted periods **censor** demand, so flag out-of-stock days and treat them as missing or impute. Collect price, promotions, holidays and events, weather, store attributes, product hierarchy and new-item launches. Check duplicates, returns and unit changes. Many series are intermittent (see the intermittent-demand lesson) and many are new (cold start, use category-level priors and similar items).\n\n**3. Baselines first.** Seasonal naive (same weekday last week) and a moving average with ETS. Anything fancier must beat them in a rolling-origin backtest.\n\n**4. Model.** One **global gradient-boosted model** (or a global deep model) across all series: lag and rolling features (lag 7, 14, 28 and rolling means that respect the forecast origin), calendar, price and promo flags (known in the future), static store/item embeddings. Use a count or Tweedie objective or log1p target, and quantile objectives (or residual-based intervals/conformal) for the service-level quantile. Use a separate approach for the sparse tail (Croston/TSB or aggregation) and **reconcile** across store/region/total if the planners need coherent numbers.\n\n**5. Validation.** Rolling-origin backtests matching the deployed horizon, with a gap if features lag; never shuffle. Metrics: WAPE and bias at store-SKU-day and aggregated levels, MASE/RMSSE for the tail, interval coverage and pinball loss, and a **replenishment simulation** (fill rate, waste, inventory cost) versus the incumbent. Slice by new items, promo days, slow movers and holidays.\n\n**6. Deployment and monitoring.** Daily batch scoring with fallbacks (seasonal naive if features are missing), forecast and data-drift monitors, coverage and bias tracked weekly, retrain on a schedule or on drift, and human overrides logged as a signal. Roll out with an A/B or store-level switchback test on waste and stockout rate, which is the true success metric."
}
```

> [!TIP] Interview tips
> - Open with the decision, the target quantile and the horizon (lead time plus review period), not the algorithm.
> - Mention censored demand, hierarchy, intermittency and cold start; give a baseline-first, global-model plan.
> - Validate with rolling origins, WAPE plus bias, coverage and a downstream inventory simulation; slice by segment.
> - Close with deployment: monitoring, fallback, retraining cadence and an online test on business outcomes.
