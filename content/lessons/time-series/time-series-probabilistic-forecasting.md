---
id: time-series-probabilistic-forecasting
title: Probabilistic forecasting and prediction intervals
estimatedMinutes: 12
difficulty: hard
tags: [time-series, probabilistic-forecasting, prediction-intervals, conformal, pinball-loss]
---

## Why it matters
Decisions consume uncertainty: safety stock, capacity, budgets and risk limits depend on how bad things can plausibly get, not on the mean. Interviewers ask how to produce prediction intervals, how to score them, and why intervals from a fitted model are usually too narrow.

## Concept
**Goal**: forecast the whole predictive distribution $P(y_{t+h} \mid \text{past})$, or a set of quantiles, rather than a point. A $(1-\alpha)$ **prediction interval** contains the future observation with probability $1-\alpha$; it is not a **confidence interval** for a parameter or the mean.

**How to get intervals**
- **Parametric**: assume errors $\sim N(0,\sigma_h^2)$: $\hat y \pm z_{1-\alpha/2}\sigma_h$. ARIMA/ETS give closed-form $\sigma_h$ growing with the horizon (random walk: $\sigma\sqrt h$; seasonal naive: $\sigma\sqrt{\lfloor (h-1)/m\rfloor + 1}$).
- **Bootstrap residuals**: simulate future paths by resampling in-sample residuals; take empirical quantiles; no normality assumption.
- **Quantile regression**: train a model per quantile $\tau$ (GBM, neural nets) with the **pinball loss**; TFT and many deep models output several quantiles; **DeepAR** outputs the parameters of a distribution (Gaussian, negative binomial, Student-t) and samples paths.
- **Conformal prediction**: wrap any point model. **Split conformal**: compute absolute residuals $r_i$ on a held-out calibration set, take $\hat q$ = the $\lceil (n+1)(1-\alpha)\rceil$-th smallest, and output $\hat y \pm \hat q$. It guarantees marginal coverage if calibration and test are **exchangeable**, which time series violate; use recent windows, adaptive/weighted variants (ACI, EnbPI) and re-check coverage online.
- **Ensembles / Bayesian / Monte Carlo dropout**: capture model uncertainty but are usually under-dispersed.

**Why intervals are too narrow**: in-sample residuals understate out-of-sample error; parameter and model-selection uncertainty are ignored; **structural breaks** and outliers; errors are autocorrelated and heteroscedastic. Always check **empirical coverage** in a backtest (see *Forecast evaluation and backtesting*).

**Scoring**
- **Coverage**: do nominal 80% intervals contain about 80% of actuals? Check by horizon and segment.
- **Pinball (quantile) loss** at level $\tau$: $\rho_\tau(y,q) = \tau (y-q)_+ + (1-\tau)(q-y)_+$. A proper score that is minimized by the true $\tau$-quantile. **CRPS** $\approx 2\times$ the mean pinball over a dense grid of $\tau$; **weighted quantile loss** (wQL) normalizes by total demand.
- **Winkler / interval score**: width plus penalty $\frac{2}{\alpha}\times$ distance outside the interval, rewarding sharp **and** calibrated intervals.
- Principle: **calibration first, then sharpness** (as narrow as possible subject to correct coverage).

**Pitfalls**: quantile crossing (sort the quantiles or use monotone parametrizations); **summing quantiles is not the quantile of the sum** (aggregating across items or horizons needs samples or copulas, see *Hierarchical forecasting and reconciliation*); a 95% interval is far more sensitive to tail assumptions than a 50% one.

## Worked example
**Pinball loss** at $\tau = 0.9$ with actual 100. A 90th-percentile forecast of 90 under-forecasts: loss $=0.9\times10 = 9$. A forecast of 110 over-forecasts: loss $=0.1\times10 = 1$. The asymmetry makes the minimizer the 90th percentile, because being low is 9 times more costly than being high.

**Split conformal**: with $n = 19$ calibration residuals and $\alpha = 0.1$, $k = \lceil 20 \times 0.9\rceil = 18$, so $\hat q$ is the 18th smallest absolute residual. If it equals 4.2 units, every 7-day forecast is reported as $\hat y \pm 4.2$. With $n = 3$ and $\alpha = 0.1$, $k = \lceil 3.6\rceil = 4 > n$ and the interval is infinite: you need more calibration data.

**Winkler** with actual 12 and a 90% interval $[8, 11]$: width 3 plus penalty $\frac{2}{0.1}\times(12-11) = 20$, score 23. A wider, covering interval $[8, 14]$ scores 6, so the penalty discourages overconfident narrow bands.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A 90% forecast interval covers only 72% of actuals in a backtest. What is the most likely cause and fix?",
  "options": [
    "Too much data; subsample",
    "Intervals are too narrow (in-sample residuals, ignored model uncertainty, drift); widen using out-of-sample residuals or conformal calibration",
    "The point forecast is unbiased, so nothing is wrong",
    "The metric is MAPE, which should be replaced by RMSE"
  ],
  "answer": 1,
  "explanation": "Under-coverage means too-narrow bands. Calibrate with out-of-sample errors (rolling residuals or conformal) and recheck coverage by horizon."
}
```

```quiz
{
  "id": "q2",
  "question": "Why is the pinball loss at $\\tau = 0.9$ minimized by the 90th percentile of the predictive distribution?",
  "options": [
    "It penalizes squared errors",
    "It is symmetric around the median",
    "Under-forecasts cost $\\tau$ per unit and over-forecasts cost $1-\\tau$, so the optimal quantile balances those expected costs at probability $\\tau$",
    "It ignores over-forecasts"
  ],
  "answer": 2,
  "explanation": "Setting the derivative of the expected loss to zero gives $P(y < q) = \\tau$, i.e. the $\\tau$-quantile."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `pinball_loss(y, q, tau)` (mean over observations of $\\tau(y-q)$ if $y \\ge q$ else $(\\tau-1)(y-q)$) and `coverage(y, lo, hi)` (fraction with `lo <= y <= hi`).",
  "starterCode": "def pinball_loss(y, q, tau):\n    pass\n\ndef coverage(y, lo, hi):\n    pass\n\nprint(pinball_loss([100], [90], 0.9))",
  "tests": "assert abs(pinball_loss([100], [90], 0.9) - 9.0) < 1e-12\nassert abs(pinball_loss([100], [110], 0.9) - 1.0) < 1e-12\nassert abs(pinball_loss([100, 100], [90, 110], 0.5) - 5.0) < 1e-12\nassert pinball_loss([5, 6], [5, 6], 0.3) == 0.0\nassert abs(coverage([1, 5, 9, 12], [0, 0, 0, 0], [10, 10, 10, 10]) - 0.75) < 1e-12\nassert coverage([1], [1], [1]) == 1.0",
  "solution": "def pinball_loss(y, q, tau):\n    total = 0.0\n    for yi, qi in zip(y, q):\n        e = yi - qi\n        total += tau * e if e >= 0 else (tau - 1) * e\n    return total / len(y)\n\ndef coverage(y, lo, hi):\n    return sum(l <= yi <= h for yi, l, h in zip(y, lo, hi)) / len(y)",
  "hints": [
    "Under-forecast (y > q) costs tau per unit; over-forecast costs (1 - tau).",
    "Coverage uses inclusive bounds."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Implement `conformal_qhat(abs_residuals, alpha)`: the $k$-th smallest value with $k = \\lceil (n+1)(1-\\alpha) \\rceil$, or `float('inf')` if $k > n$. Then `conformal_interval(point_forecasts, qhat)` returning `(lower_list, upper_list)`.",
  "starterCode": "import math\n\ndef conformal_qhat(abs_residuals, alpha):\n    pass\n\ndef conformal_interval(point_forecasts, qhat):\n    pass\n\nprint(conformal_qhat(list(range(1, 20)), 0.1))",
  "tests": "assert conformal_qhat(list(range(1, 20)), 0.1) == 18\nassert conformal_qhat([3, 1, 2], 0.5) == 2\nassert conformal_qhat([3, 1, 2], 0.1) == float('inf')\nassert conformal_qhat(list(range(1, 100)), 0.1) == 90\nassert conformal_interval([10, 20], 3) == ([7, 17], [13, 23])",
  "solution": "import math\n\ndef conformal_qhat(abs_residuals, alpha):\n    n = len(abs_residuals)\n    k = math.ceil((n + 1) * (1 - alpha) - 1e-9)\n    if k > n:\n        return float('inf')\n    return sorted(abs_residuals)[k - 1]\n\ndef conformal_interval(point_forecasts, qhat):\n    return [f - qhat for f in point_forecasts], [f + qhat for f in point_forecasts]",
  "hints": [
    "Sort first, then index k - 1.",
    "Guard against floating-point error in (n+1)(1-alpha) before taking the ceiling."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Implement `winkler(y, lo, hi, alpha)`: mean over observations of width plus $\\frac{2}{\\alpha}\\times$ distance by which $y$ falls outside $[lo, hi]$ (0 if inside). Also `fix_crossing(quantiles)` that returns the quantile list sorted ascending (rearrangement).",
  "starterCode": "import math\n\ndef winkler(y, lo, hi, alpha):\n    pass\n\ndef fix_crossing(quantiles):\n    pass\n\nprint(winkler([12], [8], [11], 0.1))",
  "tests": "assert abs(winkler([12], [8], [11], 0.1) - 23.0) < 1e-12\nassert abs(winkler([9], [8], [11], 0.1) - 3.0) < 1e-12\nassert abs(winkler([5], [8], [11], 0.2) - (3 + 10 * 3)) < 1e-12\nassert abs(winkler([9, 12], [8, 8], [11, 11], 0.1) - 13.0) < 1e-12\nassert fix_crossing([3, 1, 2]) == [1, 2, 3]\nassert fix_crossing([1, 2, 2]) == [1, 2, 2]",
  "solution": "import math\n\ndef winkler(y, lo, hi, alpha):\n    total = 0.0\n    for yi, l, h in zip(y, lo, hi):\n        s = h - l\n        if yi < l:\n            s += 2 / alpha * (l - yi)\n        elif yi > h:\n            s += 2 / alpha * (yi - h)\n        total += s\n    return total / len(y)\n\ndef fix_crossing(quantiles):\n    return sorted(quantiles)",
  "hints": [
    "Penalty only applies when y < lo or y > hi.",
    "Sorting quantiles preserves the multiset and removes crossings."
  ]
}
```

> [!TIP] Interview tips
> - Define the target (distribution or quantiles) and distinguish prediction intervals from confidence intervals.
> - List methods: parametric, residual bootstrap, quantile regression with pinball loss, DeepAR-style distributions, conformal.
> - Explain why model-based intervals under-cover and always verify empirical coverage by horizon in a rolling backtest.
> - Score with coverage plus pinball/CRPS/Winkler: calibration first, then sharpness; mention quantile crossing and non-additivity of quantiles.
