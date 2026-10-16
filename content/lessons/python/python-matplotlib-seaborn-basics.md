---
id: python-matplotlib-seaborn-basics
title: matplotlib / seaborn basics
estimatedMinutes: 10
difficulty: easy
tags: [python, visualization, matplotlib, seaborn]
---

## Why it matters
EDA, take-home assignments and model diagnostics all need quick, clean plots. Interviewers look for the object-oriented matplotlib API, labeled axes and sensible chart choices, not default-styled clutter.

## Concept
Use the **object-oriented** API: create a Figure and Axes, then call methods on the axes.

```python
import matplotlib.pyplot as plt
import seaborn as sns

fig, axes = plt.subplots(1, 2, figsize=(10, 4))
axes[0].hist(df["amount"], bins=50)
axes[0].set(title="Order amount", xlabel="USD", ylabel="Orders")
axes[1].plot(daily.index, daily.values, label="daily")
axes[1].plot(daily.index, daily.rolling(7).mean(), label="7-day avg")
axes[1].legend()
fig.tight_layout()
fig.savefig("eda.png", dpi=150)
```

**seaborn** builds statistical plots on top of matplotlib and works directly with DataFrames (long format):

```python
sns.histplot(df, x="amount", hue="plan", log_scale=True)
sns.boxplot(df, x="plan", y="amount")
sns.scatterplot(df, x="age", y="amount", hue="plan", alpha=0.3)
sns.lineplot(df, x="date", y="revenue", hue="region")       # aggregates + CI band
sns.heatmap(df.corr(numeric_only=True), annot=True, cmap="vlag", center=0)
sns.pairplot(df[cols]); sns.relplot(..., col="region")      # small multiples
```

Good habits:
- Always label axes with units and give a title that states the takeaway.
- Use `alpha` or hexbin for overplotting; log scales for skewed data.
- Start bar charts at zero; line charts may zoom.
- Use colorblind-friendly palettes and avoid unnecessary 3-D or pie charts.

## Worked example
Revenue per user is heavily skewed: a linear histogram shows one tall bar near 0. `sns.histplot(x="revenue", log_scale=True)` reveals a roughly log-normal shape and a separate cluster of high-value buyers worth investigating.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A scatter plot of 1M points is a solid blob. What's the best fix?",
  "options": ["Make the points bigger", "Use transparency (alpha), sampling, or a hexbin / 2-D histogram", "Switch to a pie chart", "Add a 3-D axis"],
  "answer": 1,
  "explanation": "Overplotting hides density; alpha or binning reveals it."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Plotting itself isn't checked here; practice preparing plot-ready data. Write `hist_bins(values, n_bins)` returning `(edges, counts)` for equal-width bins over [min, max] (the max value goes in the last bin), and `log_bins(lo, hi, n)` returning n + 1 log-spaced edges from lo to hi (use `numpy.logspace` with log10).",
  "setup": "import numpy as np",
  "packages": ["numpy"],
  "starterCode": "import numpy as np\n\ndef hist_bins(values, n_bins):\n    pass\n\ndef log_bins(lo, hi, n):\n    pass\n\nprint(hist_bins([1, 2, 2, 3, 4], 3), log_bins(1, 1000, 3))",
  "tests": "edges, counts = hist_bins([1, 2, 2, 3, 4], 3)\nassert np.allclose(edges, [1, 2, 3, 4]) and list(counts) == [1, 2, 2]\nc, e = np.histogram([1, 2, 2, 3, 4], bins=3)\nassert list(counts) == list(c)\nassert np.allclose(log_bins(1, 1000, 3), [1, 10, 100, 1000])",
  "solution": "import numpy as np\n\ndef hist_bins(values, n_bins):\n    v = np.asarray(values, dtype=float)\n    edges = np.linspace(v.min(), v.max(), n_bins + 1)\n    idx = np.clip(np.searchsorted(edges, v, side='right') - 1, 0, n_bins - 1)\n    counts = np.bincount(idx, minlength=n_bins)\n    return edges, counts\n\ndef log_bins(lo, hi, n):\n    return np.logspace(np.log10(lo), np.log10(hi), n + 1)",
  "hints": ["Edges: np.linspace(min, max, n_bins + 1).", "searchsorted(..., side='right') − 1 gives each value's bin; clip puts the max into the last bin."]
}
```

```reveal
{
  "prompt": "In a take-home, you're asked to show whether a new pricing page changed conversion across 5 countries. Which plots would you include?",
  "answer": "1. **Point estimates with confidence intervals per country** (dot or bar + error bars), sorted by effect size, with a zero line. This answers the question directly.\n2. **Daily conversion by variant** (line chart, small multiples by country) to check stability and novelty effects.\n3. **Sample size per country** (small bar chart or table) so readers know which estimates are noisy.\n\nLabel axes with units (percentage points), state the takeaway in each title, and avoid stacking 10 lines on one chart."
}
```

> [!TIP] Interview tips
> - Use `fig, ax = plt.subplots()` and set labels/titles on the axes.
> - Pick seaborn for quick statistical plots from DataFrames (hue, col for small multiples).
> - Mention log scales for skewed data and alpha/hexbin for overplotting.
