---
id: time-series-differencing
title: "Differencing"
estimatedMinutes: 9
difficulty: easy
tags: [time-series, differencing, stationarity, arima]
---

## Why it matters
Differencing is the standard tool for turning a trending or seasonal series into a stationary one, and it is the "I" in ARIMA. Interviewers ask when to difference, how many times, and how to get forecasts back to the original scale.

## Concept
**First difference**: $\nabla y_t = y_t - y_{t-1}$. It removes a linear trend and turns a random walk into white noise. **Second difference** $\nabla^2 y_t = y_t - 2y_{t-1} + y_{t-2}$ removes a quadratic trend; $d$ is rarely needed beyond 2.

**Seasonal difference** with period $m$: $\nabla_m y_t = y_t - y_{t-m}$. It removes a stable seasonal pattern (and part of a trend). If both are needed, apply the seasonal difference first, then check whether the first difference is still necessary.

**Backshift notation**: $B y_t = y_{t-1}$, so $\nabla = 1 - B$ and $\nabla_m = 1 - B^m$.

**How many times?** Use plots, ADF/KPSS and the ACF: a very slowly decaying ACF suggests more differencing. **Over-differencing** inflates variance (compare the variance after each step; it should drop, then rise when you overdo it) and produces a negative lag-1 ACF near $-0.5$ (an MA(1) unit-root signature).

**Other transforms**: log (stabilizes growing variance; differencing a log gives approximate % growth, $\Delta \log y_t \approx$ growth rate), Box-Cox, or regressing out a deterministic trend.

**Back-transforming**: forecasts of $\nabla y$ are cumulatively summed from the last observed level: $\hat y_{T+h} = y_T + \sum_{j=1}^h \widehat{\nabla y}_{T+j}$. Prediction intervals must be integrated too; their width grows with $h$.

## Worked example
Series: $10, 12, 15, 19, 24$. First difference: $2, 3, 4, 5$ (still trending). Second difference: $1, 1, 1$ (constant), so $d=2$ is enough. Suppose a model forecasts the next two first differences as $5$ and $6$. Starting at the last level 24, the level forecasts are $24+5=29$ and $29+6=35$. For quarterly data with $m=4$: $y=[10,12,15,11,13,17,19,14]$ gives $\nabla_4 y = [3,5,4,3]$, i.e. $13-10,\ 17-12,\ 19-15,\ 14-11$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A monthly series has a stable 12-month seasonal pattern and no clear trend. Which transform is most appropriate?",
  "options": [
    "First difference",
    "Seasonal difference with lag 12",
    "Second difference",
    "Square root only"
  ],
  "answer": 1,
  "explanation": "A lag-12 difference y_t - y_{t-12} removes a stable yearly pattern. A first difference does not remove seasonality."
}
```

```quiz
{
  "id": "q2",
  "question": "After differencing a series that was already stationary, the lag-1 autocorrelation of the result is typically:",
  "options": [
    "Close to +1",
    "Close to 0",
    "Negative, around -0.5",
    "Undefined"
  ],
  "answer": 2,
  "explanation": "Differencing white noise gives an MA(1) with theta = -1 whose lag-1 autocorrelation is -0.5: a classic over-differencing sign."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `difference(y, d=1, lag=1)` (apply lag-`lag` differencing `d` times; each pass drops `lag` points) and `undifference(dy, first, lag=1)`, which inverts a single pass: given the differenced list and the first `lag` original values, rebuild the original series. Also write `integrate_forecast(last, diff_forecasts)` that turns forecasts of the first difference back into level forecasts (cumulative sum starting from `last`).",
  "setup": "",
  "starterCode": "def difference(y, d=1, lag=1):\n    pass\n\ndef undifference(dy, first, lag=1):\n    pass\n\ndef integrate_forecast(last, diff_forecasts):\n    pass\n\nprint(difference([1, 4, 9, 16, 25], d=2))",
  "tests": "assert difference([1, 4, 9, 16, 25]) == [3, 5, 7, 9]\nassert difference([1, 4, 9, 16, 25], d=2) == [2, 2, 2]\nassert difference([1, 4, 9, 16, 25], d=0) == [1, 4, 9, 16, 25]\ny = [10, 12, 15, 11, 13, 17, 19, 14]\nassert difference(y, lag=4) == [3, 5, 4, 3]\nassert undifference(difference(y), y[:1]) == y\nassert undifference(difference(y, lag=4), y[:4], lag=4) == y\nassert integrate_forecast(100, [2, 3, -1]) == [102, 105, 104]\nassert integrate_forecast(5, []) == []",
  "solution": "def difference(y, d=1, lag=1):\n    y = list(y)\n    for _ in range(d):\n        y = [y[i] - y[i - lag] for i in range(lag, len(y))]\n    return y\n\ndef undifference(dy, first, lag=1):\n    y = list(first)\n    for i, v in enumerate(dy):\n        y.append(v + y[i])\n    return y\n\ndef integrate_forecast(last, diff_forecasts):\n    out = []\n    cur = last\n    for f in diff_forecasts:\n        cur += f\n        out.append(cur)\n    return out",
  "hints": [
    "y[i] - y[i - lag] for i in range(lag, len(y)).",
    "Inverting: original[t] = dy[t - lag] + original[t - lag]; with first = the first `lag` values, the new element at position i + lag equals dy[i] + y[i]."
  ]
}
```

> [!TIP] Interview tips
> - Differencing handles stochastic trends (unit roots); regression handles deterministic trends. Be able to say which one the series has.
> - Mention over-differencing symptoms (negative lag-1 ACF near $-0.5$, larger variance).
> - Always invert the differencing when reporting forecasts or computing errors in original units.
