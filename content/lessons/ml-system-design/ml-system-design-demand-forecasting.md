---
id: ml-system-design-demand-forecasting
title: Demand forecasting
estimatedMinutes: 13
difficulty: medium
tags: [ml-system-design, time-series, forecasting, newsvendor]
---

## Why it matters
Demand forecasting (retail, ride-sharing, supply chain) is the standard time-series design question. Interviewers look for hierarchy, seasonality and promotions, correct validation, and the link from forecast error to inventory decisions.

## Concept
**Clarify the decision**: what is forecast (units of SKU x store x day? city x hour?), the horizon (next day vs next quarter), and what the forecast drives (replenishment, staffing, pricing). Over- and under-forecasting have different costs, so the target is often a **quantile**, not the mean.

**Data challenges**:
- **Censored demand**: sales are not demand. A stock-out hides true demand; model with availability flags or treat stock-out periods as missing.
- **Hierarchy and sparsity**: many SKUs sell rarely (intermittent demand). Forecast at several aggregation levels (SKU, category, store, region) and **reconcile** so they add up; use Croston/TSB or models with count likelihoods (Poisson, negative binomial) for intermittent series.
- **Calendar and events**: weekday, holidays, paydays, promotions, price, weather, competitor actions; **cold start** for new products via similar-item attributes.

**Models**: start with baselines (**seasonal naive**: same day last week; moving averages; ETS/ARIMA). Then gradient-boosted trees on lag/rolling features and calendar covariates (global model across all series, usually the strongest practical choice), and deep global models (DeepAR, TFT, N-BEATS, pretrained time-series foundation models) when there are many related series. Add exogenous features that will be **known at forecast time** (planned promotions, price), never future actuals.

**Validation**: **rolling-origin (backtesting) cross-validation**: train up to $t$, forecast the horizon, slide $t$ forward; never random k-fold. Evaluate per horizon step.

**Metrics**: MAE; **wMAPE** $=\sum|y-\hat y|/\sum y$ (robust to zeros, weights big sellers); bias $=\sum(\hat y-y)/\sum y$; MAPE explodes near zero; MASE scales error versus the naive forecast; **pinball (quantile) loss** for probabilistic forecasts: $L_\tau=\tau(y-q)$ if $y\ge q$ else $(1-\tau)(q-y)$.

**From forecast to decision (newsvendor)**: stock to the quantile at the **critical ratio** $\frac{C_u}{C_u+C_o}$, where $C_u$ is the cost of one unit short (lost margin) and $C_o$ the cost of one unit left over. Safety stock covers forecast uncertainty over the lead time.

**Operate**: batch forecasts nightly, versioned and monitored for bias and error vs naive, overrides by planners, and retraining on drift (new assortment, regime change).

## Worked example
Seasonal naive for a weekly pattern. Last week's units: $[20,22,25,30,45,60,40]$ (sum 242). This week's actuals: $[22,21,27,33,50,55,38]$ (sum 246).

Absolute errors: $2,1,2,3,5,5,2$, total 20. $\text{wMAPE}=20/246\approx8.1\%$. Bias $=(242-246)/246\approx-1.6\%$ (slightly under-forecasting).

Newsvendor: an item has demand $\sim\mathcal N(100,20^2)$. A missed sale costs \$4 margin ($C_u=4$) and a leftover costs \$1 ($C_o=1$), so the critical ratio is $4/5=0.8$. Stock the 80th percentile: $100+0.8416\times20\approx116.8\approx117$ units. Pinball loss at $\tau=0.8$ for forecast 117 against actual 100 is $0.2\times17=3.4$; against a forecast of 90 it would be $0.8\times10=8$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A model is evaluated with random 5-fold cross-validation on daily sales and looks excellent. What is wrong?",
  "options": [
    "Nothing; k-fold is standard",
    "Random folds leak future information (neighboring days, lags) into training; use rolling-origin backtesting",
    "The folds are too small",
    "Sales data cannot be cross-validated"
  ],
  "answer": 1,
  "explanation": "Time series require training strictly on the past of each forecast origin."
}
```

```quiz
{
  "id": "q2",
  "question": "Understocking costs $9 per unit and overstocking $1 per unit. Which demand quantile should you stock to?",
  "options": [
    "The mean (50th)",
    "The 90th percentile",
    "The 10th percentile",
    "The median of last week"
  ],
  "answer": 1,
  "explanation": "Critical ratio = 9 / (9 + 1) = 0.9."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `wmape(y, f)` = sum|y - f| / sum(y); `bias(y, f)` = (sum(f) - sum(y)) / sum(y); `seasonal_naive(history, season, horizon)` returning `horizon` forecasts that repeat the last `season` values of `history` cyclically; `pinball(y, q, tau)` = mean quantile loss over paired lists (loss = tau*(y-q) if y >= q else (1-tau)*(q-y)); and `critical_ratio(cu, co)` = cu / (cu + co).",
  "starterCode": "def wmape(y, f):\n    pass\n\ndef bias(y, f):\n    pass\n\ndef seasonal_naive(history, season, horizon):\n    pass\n\ndef pinball(y, q, tau):\n    pass\n\ndef critical_ratio(cu, co):\n    pass\n\nprint(seasonal_naive([1, 2, 3, 4, 5, 6], 3, 5))",
  "tests": "y = [22, 21, 27, 33, 50, 55, 38]\nf = [20, 22, 25, 30, 45, 60, 40]\nassert abs(wmape(y, f) - 20 / 246) < 1e-12\nassert abs(bias(y, f) - (-4 / 246)) < 1e-12\nassert seasonal_naive([1, 2, 3, 4, 5, 6], 3, 5) == [4, 5, 6, 4, 5]\nassert seasonal_naive(f, 7, 7) == f\nassert abs(pinball([100], [117], 0.8) - 3.4) < 1e-9\nassert abs(pinball([100], [90], 0.8) - 8.0) < 1e-9\nassert abs(pinball([100, 100], [117, 90], 0.8) - 5.7) < 1e-9\nassert abs(critical_ratio(4, 1) - 0.8) < 1e-12",
  "solution": "def wmape(y, f):\n    return sum(abs(a - b) for a, b in zip(y, f)) / sum(y)\n\ndef bias(y, f):\n    return (sum(f) - sum(y)) / sum(y)\n\ndef seasonal_naive(history, season, horizon):\n    last = history[-season:]\n    return [last[i % season] for i in range(horizon)]\n\ndef pinball(y, q, tau):\n    total = 0.0\n    for a, b in zip(y, q):\n        total += tau * (a - b) if a >= b else (1 - tau) * (b - a)\n    return total / len(y)\n\ndef critical_ratio(cu, co):\n    return cu / (cu + co)",
  "hints": [
    "Take the last `season` values, then index them with i % season.",
    "Pinball loss penalizes under-prediction by tau and over-prediction by (1 - tau)."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Design a demand forecasting system for a grocery chain with 2,000 stores and 30,000 SKUs.' Outline your answer.",
  "answer": "**Clarify**: forecast daily units per SKU x store for 1-14 days ahead to drive replenishment; perishable items have waste cost; stock-outs occur; promotions are planned in advance.\n\n**Data**: sales + inventory/availability, prices, promotions calendar, holidays, weather, store attributes, product hierarchy; fix censored demand using stock-out flags.\n\n**Models**: seasonal-naive and ETS baselines; one global LightGBM with lag/rolling/calendar/promo features (quantile objective for P50 and P90) and optional DeepAR/TFT for related series; hierarchical reconciliation; similar-item priors for new SKUs; Poisson/NB likelihood for slow movers.\n\n**Validation**: rolling-origin backtests by horizon step, wMAPE and bias at SKU-store, store-category and chain levels, pinball loss for quantiles, plus a business metric: simulated stock-outs vs waste.\n\n**Serving**: nightly batch (Airflow), forecasts to the replenishment system with order-up-to-quantile logic, planner overrides; monitor bias, error vs naive, data freshness; retrain weekly, backfill after outages.\n\n**Risks**: promotion effects confounded with demand, cannibalization, supply constraints, feedback from the ordering policy into observed sales."
}
```

> [!TIP] Interview tips
> - Link the forecast to the decision: cost asymmetry implies a quantile (newsvendor), not the mean.
> - Mention censored demand, hierarchy/intermittency and rolling-origin validation.
> - Always benchmark against seasonal naive; a fancy model that cannot beat it is not worth shipping.
> - Report wMAPE and bias together; low error with persistent bias still causes stock-outs or waste.
