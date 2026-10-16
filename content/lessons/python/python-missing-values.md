---
id: python-missing-values
title: Missing values
estimatedMinutes: 10
difficulty: easy
tags: [python, pandas, missing-data, cleaning]
---

## Why it matters
Every real dataset has missing values, and pandas' handling (NaN, None, NaT, pd.NA) has quirks. Interviewers check that you detect, quantify and treat them deliberately, not with a blanket `dropna()`.

## Concept
```python
df.isna().sum()                     # missing count per column
df.isna().mean().sort_values()      # missing share per column
df.dropna(subset=["user_id"])       # drop rows missing key fields only
df.dropna(thresh=3)                 # keep rows with at least 3 non-null values
df["age"].fillna(df["age"].median())
df["city"].fillna("Unknown")
df.fillna({"age": 0, "city": "Unknown"})
df.groupby("region")["price"].transform(lambda s: s.fillna(s.median()))   # group-wise
df.sort_values("ts").groupby("user")["status"].ffill()                   # forward fill per user
df["price"].interpolate()           # linear interpolation for ordered data
df["age_missing"] = df["age"].isna().astype(int)                         # indicator
```

Semantics to know:
- `NaN` (float), `None` (object), `NaT` (datetime) and `pd.NA` (nullable dtypes) all count as missing for `isna()`.
- `NaN != NaN`; never test with `== np.nan`.
- Aggregations **skip NaN** by default (`mean`, `sum`); `sum` of an all-NaN column is 0. `count()` excludes NaN, `size()` doesn't.
- `groupby` drops NaN keys unless `dropna=False`.
- Empty strings, "N/A", -999 aren't NaN until you convert them: `df.replace({"": np.nan, "N/A": np.nan, -999: np.nan})` or `read_csv(na_values=[...])`.

## Worked example
A column of ages has 15% missing, concentrated in users who signed up via mobile. Dropping those rows would bias the data toward desktop users. Better: fill with the median within signup channel and add `age_missing`.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "`pd.Series([1, np.nan, 3]).mean()` returns?",
  "options": ["NaN", "2.0", "1.33", "Error"],
  "answer": 1,
  "explanation": "pandas skips NaN by default (skipna=True): (1 + 3) / 2 = 2."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `missing_report(df)` returning a Series of missing fraction per column, sorted descending. Write `clean(df)` that: converts '' and 'N/A' strings to NaN, fills numeric `price` with the **median price of its `region`**, fills `city` with 'Unknown', and adds `price_missing` (1 if price was originally missing after conversion, else 0). Don't modify the input.",
  "setup": "import pandas as pd\nimport numpy as np",
  "packages": ["pandas"],
  "starterCode": "import pandas as pd\nimport numpy as np\n\ndef missing_report(df):\n    pass\n\ndef clean(df):\n    pass\n",
  "tests": "df = pd.DataFrame({'region': ['E', 'E', 'E', 'W', 'W'], 'price': [10.0, np.nan, 30.0, 5.0, np.nan], 'city': ['NY', '', 'N/A', 'LA', None]})\nr = missing_report(df)\nassert r.index[0] == 'price' and abs(r['price'] - 0.4) < 1e-12\nc = clean(df)\nassert list(c['price']) == [10.0, 20.0, 30.0, 5.0, 5.0]\nassert list(c['city']) == ['NY', 'Unknown', 'Unknown', 'LA', 'Unknown']\nassert list(c['price_missing']) == [0, 1, 0, 0, 1]\nassert df['price'].isna().sum() == 2",
  "solution": "import pandas as pd\nimport numpy as np\n\ndef missing_report(df):\n    return df.isna().mean().sort_values(ascending=False)\n\ndef clean(df):\n    out = df.replace({'': np.nan, 'N/A': np.nan})\n    out['price_missing'] = out['price'].isna().astype(int)\n    out['price'] = out['price'].fillna(out.groupby('region')['price'].transform('median'))\n    out['city'] = out['city'].fillna('Unknown')\n    return out",
  "hints": ["df.replace returns a new DataFrame.", "Fill with groupby('region')['price'].transform('median') to get a per-row group median."]
}
```

> [!TIP] Interview tips
> - Quantify missingness per column first, and ask why it's missing.
> - Convert sentinel values ('', 'N/A', -999) to NaN before analysis.
> - Prefer targeted fills (group medians, forward-fill per entity) plus indicators over blanket dropna.
