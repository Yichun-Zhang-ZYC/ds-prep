---
id: analytics-bi-eda
title: EDA
estimatedMinutes: 12
difficulty: easy
tags: [analytics, workflow, eda, pandas, outliers]
---

## Why it matters
EDA is how you learn what the data can and cannot say before building anything. Interviewers hand you a table and ask what you would look at first, how you spot outliers, and how you avoid being misled by averages and aggregates.

## Concept
A repeatable EDA routine:
1. **Shape and types**: rows, columns, grain, dtypes, date range.
2. **Univariate**: distribution of each variable. Numeric: min, quartiles, mean vs median, skew, histogram. Categorical: counts, cardinality, rare levels.
3. **Quality**: nulls, impossible values (negative ages), duplicates, spikes or gaps over time.
4. **Bivariate**: relationships (scatter, correlation, grouped means) and the target versus each feature.
5. **Time**: trend, seasonality (weekday, month), step changes.
6. **Segments**: split by key dimensions (platform, country, new vs returning).

**Outliers**: the **IQR rule** flags points outside $[Q_1 - 1.5\,\text{IQR},\; Q_3 + 1.5\,\text{IQR}]$ where $\text{IQR} = Q_3 - Q_1$. Robust to extremes, unlike z-scores, which are distorted by the outlier itself. Decide per case: error, rare real event, or heavy tail (then use medians, log scale or winsorizing).

**Mean vs median**: a mean far above the median signals right skew (revenue per user, session length). Report both, or the median and a percentile.

**Pitfalls**:
- **Simpson's paradox**: a trend in aggregate reverses within every segment because group mix differs.
- **Correlation is not causation**; confounders and reverse causality.
- **Survivorship and selection bias**: only seeing users who stayed.
- Averaging ratios: compute the ratio of sums, not the mean of per-row ratios.

## Worked example
Daily order values: 10, 12, 11, 13, 12, 95, 11, 10. Sorted: 10, 10, 11, 11, 12, 12, 13, 95.

- Mean $= 174 / 8 = 21.75$, median $= (11 + 12)/2 = 11.5$. The mean is almost double the median: skew.
- $Q_1 = 10.75$, $Q_3 = 12.25$ (linear interpolation), $\text{IQR} = 1.5$.
- Fences: $10.75 - 2.25 = 8.5$ and $12.25 + 2.25 = 14.5$. Only **95** is outside.

Next steps: is 95 a typo for 9.5, a bulk order, or a test purchase? Check the raw row. Reporting "average order value \$21.75" would be misleading; report the median \$11.50 and mention the one large order.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Overall, treatment has a higher conversion rate than control, but control is higher within both mobile and desktop. What is this called, and what is the likely cause?",
  "options": [
    "Regression to the mean; noise",
    "Simpson's paradox; the treatment group has a different segment mix (e.g. more desktop traffic)",
    "Selection bias; the sample is too small",
    "P-hacking; too many metrics"
  ],
  "answer": 1,
  "explanation": "Simpson's paradox: the aggregate trend reverses within segments because segment proportions differ. Compare within segments or reweight to a common mix."
}
```

```quiz
{
  "id": "q2",
  "question": "Why is the IQR rule preferred over a z-score > 3 rule for flagging outliers in small, skewed data?",
  "options": [
    "It is faster to compute",
    "Quartiles are robust: a single extreme value inflates the mean and standard deviation and can hide itself, but barely moves Q1 and Q3",
    "z-scores only work for categorical data",
    "IQR always removes more points"
  ],
  "answer": 1,
  "explanation": "A huge outlier inflates the standard deviation, shrinking its own z-score. Quartiles are barely affected."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `iqr_outliers(s)` that takes a pandas Series and returns a sorted list of values outside the 1.5 × IQR fences (use `s.quantile(0.25)` and `s.quantile(0.75)`). Write `mean_median_ratio(s)` returning mean / median. Write `ratio_of_sums(df, num, den)` returning `df[num].sum() / df[den].sum()`, the right way to aggregate a ratio such as revenue per visit.",
  "setup": "import pandas as pd\nimport numpy as np",
  "starterCode": "import pandas as pd\nimport numpy as np\n\ndef iqr_outliers(s):\n    pass\n\ndef mean_median_ratio(s):\n    pass\n\ndef ratio_of_sums(df, num, den):\n    pass\n",
  "tests": "s = pd.Series([10, 12, 11, 13, 12, 95, 11, 10])\nassert iqr_outliers(s) == [95]\nassert iqr_outliers(pd.Series([1, 2, 3, 4, 5])) == []\nassert iqr_outliers(pd.Series([-50, 10, 11, 12, 13, 14, 90])) == [-50, 90]\nassert abs(mean_median_ratio(s) - 21.75 / 11.5) < 1e-12\ndf = pd.DataFrame({'rev': [100.0, 10.0], 'visits': [10, 10]})\nassert abs(ratio_of_sums(df, 'rev', 'visits') - 5.5) < 1e-12",
  "solution": "import pandas as pd\nimport numpy as np\n\ndef iqr_outliers(s):\n    q1, q3 = s.quantile(0.25), s.quantile(0.75)\n    iqr = q3 - q1\n    lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr\n    return sorted(s[(s < lo) | (s > hi)].tolist())\n\ndef mean_median_ratio(s):\n    return float(s.mean() / s.median())\n\ndef ratio_of_sums(df, num, den):\n    return float(df[num].sum() / df[den].sum())",
  "packages": [
    "pandas",
    "numpy"
  ],
  "hints": [
    "Fences are Q1 - 1.5*IQR and Q3 + 1.5*IQR; select with a boolean mask.",
    "Ratio of sums = total numerator / total denominator, not the mean of row ratios."
  ]
}
```

> [!TIP] Interview tips
> - Describe a fixed routine (shape, univariate, quality, bivariate, time, segments) instead of "I'd look at the data".
> - Mention mean vs median and Simpson's paradox unprompted; they signal you know how aggregates mislead.
> - For ratios (conversion, ARPU), aggregate numerator and denominator separately before dividing.
