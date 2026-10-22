---
id: time-series-acf-pacf
title: "ACF / PACF"
estimatedMinutes: 12
difficulty: medium
tags: [time-series, acf, pacf, autocorrelation]
---

## Why it matters
ACF and PACF plots are how you read a series' memory: they tell you whether it needs differencing, whether seasonality exists, and which AR/MA orders to try. "Look at the ACF/PACF" is a standard interview answer, so you must be able to interpret them.

## Concept
**Autocorrelation function (ACF)** at lag $k$: $\rho_k = \text{Corr}(y_t, y_{t-k})$, estimated by $r_k = \dfrac{\sum_{t=k+1}^{n}(y_t-\bar y)(y_{t-k}-\bar y)}{\sum_{t=1}^{n}(y_t-\bar y)^2}$.

**Partial autocorrelation (PACF)** at lag $k$: the correlation between $y_t$ and $y_{t-k}$ after removing the linear effect of the lags in between; equivalently the last coefficient $\phi_{kk}$ of an AR($k$) fit. It is computed with the Durbin-Levinson recursion on the ACF.

**Significance**: under white noise, $r_k \approx N(0, 1/n)$, so bars outside $\pm 1.96/\sqrt n$ are significant at 5%. Expect about 1 in 20 spurious spikes.

**Reading the plots** (for a stationary series):
| Process | ACF | PACF |
|---|---|---|
| AR($p$) | decays (geometric or damped sine) | cuts off after lag $p$ |
| MA($q$) | cuts off after lag $q$ | decays |
| ARMA($p,q$) | decays | decays |
| White noise | no spikes | no spikes |

**Other signals**: a very slow, nearly linear ACF decay means non-stationarity (difference). Spikes at multiples of $m$ (e.g. 12, 24) indicate seasonality, which suggests a seasonal AR/MA term or seasonal differencing. The **Ljung-Box test** checks whether a group of residual autocorrelations is jointly zero: $Q = n(n+2)\sum_{k=1}^h r_k^2/(n-k)$. Use it on model residuals; a small p-value means structure remains.

## Worked example
Series $1,2,3,4,5$: mean 3, deviations $-2,-1,0,1,2$, sum of squares $10$. Lag-1 products: $2+0+0+2 = 4$, so $r_1 = 0.4$ (the biased estimator shrinks, the sample being short). Lag 2: $0 -1 + 0 = -1$, so $r_2 = -0.1$. PACF lag 1 equals $r_1 = 0.4$; lag 2 is $\dfrac{r_2 - r_1^2}{1 - r_1^2} = \dfrac{-0.1 - 0.16}{0.84} \approx -0.31$. For an AR(1) with $\phi = 0.8$: ACF $= 0.8, 0.64, 0.51, \dots$; PACF $= 0.8$ at lag 1 and about 0 afterwards, so you pick $p = 1$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "The PACF cuts off sharply after lag 2 while the ACF decays gradually. Which model is suggested?",
  "options": [
    "MA(2)",
    "AR(2)",
    "ARMA(2,2)",
    "White noise"
  ],
  "answer": 1,
  "explanation": "A PACF that cuts off at lag p with a decaying ACF is the signature of an AR(p) process."
}
```

```quiz
{
  "id": "q2",
  "question": "With n = 400 observations, roughly what ACF magnitude is significant at 5% under white noise?",
  "options": [
    "0.02",
    "0.05",
    "0.10",
    "0.50"
  ],
  "answer": 2,
  "explanation": "1.96 / sqrt(400) = 0.098, about 0.10."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `acf(y, nlags)` (sample autocorrelation using the biased estimator: $r_k = \\sum_{t=k}^{n-1}(y_t-\\bar y)(y_{t-k}-\\bar y) / \\sum_t (y_t-\\bar y)^2$, returned as a list for lags 0..nlags) and `pacf(y, nlags)` via the Durbin-Levinson recursion (list for lags 0..nlags, `pacf[0] = 1`). Add `conf_band(n)` = the approximate 95% band $1.96/\\sqrt n$.",
  "setup": "import numpy as np",
  "starterCode": "def acf(y, nlags):\n    pass\n\ndef pacf(y, nlags):\n    pass\n\ndef conf_band(n):\n    pass\n\nprint(acf([1, 2, 3, 4, 5], 2))",
  "tests": "r = acf([1, 2, 3, 4, 5], 2)\nassert abs(r[0] - 1) < 1e-12 and abs(r[1] - 0.4) < 1e-12 and abs(r[2] + 0.1) < 1e-12\np = pacf([1, 2, 3, 4, 5], 2)\nassert abs(p[0] - 1) < 1e-12 and abs(p[1] - 0.4) < 1e-12\nassert abs(p[2] - (-0.1 - 0.16) / 0.84) < 1e-12\nassert abs(conf_band(100) - 0.196) < 1e-12\nrng = np.random.default_rng(1)\ne = rng.normal(size=3000)\ny = np.zeros(3000)\nfor t in range(1, 3000):\n    y[t] = 0.8 * y[t - 1] + e[t]\na = acf(y, 5)\nq = pacf(y, 5)\nassert abs(a[1] - 0.8) < 0.05 and abs(a[2] - 0.64) < 0.07\nassert abs(q[1] - 0.8) < 0.05\nassert all(abs(q[k]) < 2 * conf_band(3000) for k in range(2, 6))\nassert a[5] > 0.2",
  "solution": "def acf(y, nlags):\n    y = np.asarray(y, dtype=float)\n    d = y - y.mean()\n    c0 = d @ d\n    return [float(d[k:] @ d[:len(d) - k] / c0) for k in range(nlags + 1)]\n\ndef pacf(y, nlags):\n    r = acf(y, nlags)\n    out = [1.0]\n    phi_prev = []\n    for k in range(1, nlags + 1):\n        num = r[k] - sum(phi_prev[j] * r[k - 1 - j] for j in range(k - 1))\n        den = 1 - sum(phi_prev[j] * r[j + 1] for j in range(k - 1))\n        pk = num / den\n        phi = [phi_prev[j] - pk * phi_prev[k - 2 - j] for j in range(k - 1)] + [pk]\n        out.append(float(pk))\n        phi_prev = phi\n    return out\n\ndef conf_band(n):\n    return 1.96 / n ** 0.5",
  "packages": [
    "numpy"
  ],
  "hints": [
    "Center the series first; every lag uses the same denominator, the lag-0 sum of squares.",
    "Durbin-Levinson: phi_kk = (r_k - sum_j phi_{k-1,j} r_{k-j}) / (1 - sum_j phi_{k-1,j} r_j), then phi_kj = phi_{k-1,j} - phi_kk * phi_{k-1,k-j}."
  ]
}
```

> [!TIP] Interview tips
> - Memorize the table: AR cuts off in the PACF, MA cuts off in the ACF. Mixed ARMA is hard to read, so compare AIC/BIC across candidates.
> - Say that plots are a starting point; verify with residual ACF and Ljung-Box, and prefer auto-selection plus out-of-sample validation.
> - Pitfall: ACF on a non-stationary series is dominated by the trend; difference first.
